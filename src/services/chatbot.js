// Chatbot con IA: envía la conversación a una API externa (Google Gemini u OpenAI)
// junto con el catálogo actualizado de la tienda como contexto.
const { calcularGalones } = require('./calculadora');

const MODELOS_POR_DEFECTO = { gemini: 'gemini-2.5-flash', openai: 'gpt-4o-mini' };
const fmt = (n) => '$' + Number(n).toLocaleString('es-CO');

function construirPromptSistema({ pinturas, usuario, desperdicio }) {
  const catalogo = pinturas
    .map((p) => `- [ID ${p.id}] ${p.nombre} | ${p.tipo}, acabado ${p.acabado}, uso ${p.uso} | ${fmt(p.precio_galon)} por galón | rinde ${p.rendimiento_m2_gal} m²/galón por mano | ${p.stock_galones > 0 ? `${p.stock_galones} galones disponibles` : 'AGOTADO'}`)
    .join('\n');

  return `Eres "PintuBot", el asistente virtual de ColorLink, la plataforma web de la tienda de pinturas Pintuco.
Hablas en español, con tono amable, claro y breve (máximo 120 palabras salvo que pidan detalle).
El usuario se llama ${usuario.nombre} y su rol en la aplicación es "${usuario.rol}".

TUS FUNCIONES:
1. Recomendar pinturas del catálogo según el espacio (interior/exterior, metal, madera, techos, humedad).
2. Calcular cuántos galones necesita el cliente con esta fórmula:
   galones = (m² × manos ÷ rendimiento) × ${1 + desperdicio}  → redondear SIEMPRE hacia arriba.
   Si no indica manos, asume 2 manos. Muestra el cálculo y el costo (galones × precio).
3. Explicar cómo usar la aplicación:
   - Comprar: pestaña "Catálogo" → agregar al carrito → "Finalizar compra".
   - Contratar pintor: pestaña "Solicitar servicio" → elegir pintura, m² y manos → "Enviar solicitud".
     Un pintor la acepta, la ejecuta y al finalizar el cliente puede calificarlo de 1 a 5 estrellas.
4. Dar consejos básicos de preparación de superficies y aplicación.

REGLAS:
- Solo recomienda productos del catálogo y usa sus precios exactos. No inventes productos ni descuentos.
- Si un producto está AGOTADO, dilo y sugiere una alternativa.
- Si preguntan algo ajeno a pinturas o a la tienda, indica amablemente que solo puedes ayudar con eso.
- No pidas datos de pago ni contraseñas.

CATÁLOGO ACTUAL:
${catalogo || '(sin productos disponibles)'}`;
}

// Si el mensaje menciona un área (ej. "40 m2", "25 metros"), se precalcula como ayuda para el modelo
function pistaCalculo(mensaje, pinturas, desperdicio) {
  const m = mensaje.toLowerCase().match(/(\d+(?:[.,]\d+)?)\s*(m2|m²|mts?2?|metros?)/);
  if (!m || !pinturas.length) return '';
  const area = Number(m[1].replace(',', '.'));
  const manosMatch = mensaje.toLowerCase().match(/(\d)\s*manos?/);
  const manos = manosMatch ? Number(manosMatch[1]) : 2;
  try {
    const lineas = pinturas.slice(0, 8).map((p) => {
      const c = calcularGalones({ metrosCuadrados: area, manos, rendimiento: p.rendimiento_m2_gal, desperdicio, precioGalon: p.precio_galon });
      return `  ${p.nombre}: ${c.galones} galones (${fmt(c.costo_estimado)})`;
    });
    return `\n\n[Dato calculado por el sistema para ${area} m² y ${manos} manos:\n${lineas.join('\n')}]`;
  } catch {
    return '';
  }
}

async function llamarGemini({ apiKey, model, system, historial, fetchImpl }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: historial.map((m) => ({ role: m.rol === 'assistant' ? 'model' : 'user', parts: [{ text: m.contenido }] })),
      generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw errorIA(json?.error?.message || `HTTP ${res.status}`);
  const texto = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  if (!texto) throw errorIA('La IA no devolvió respuesta');
  return texto.trim();
}

async function llamarOpenAI({ apiKey, model, system, historial, fetchImpl }) {
  const res = await fetchImpl('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 800,
      messages: [{ role: 'system', content: system }, ...historial.map((m) => ({ role: m.rol, content: m.contenido }))],
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw errorIA(json?.error?.message || `HTTP ${res.status}`);
  const texto = json?.choices?.[0]?.message?.content || '';
  if (!texto) throw errorIA('La IA no devolvió respuesta');
  return texto.trim();
}

function errorIA(detalle) {
  const e = new Error(`El servicio de IA no respondió correctamente: ${detalle}`);
  e.status = 502;
  return e;
}

function createChatbot({ config, fetchImpl = globalThis.fetch }) {
  const provider = config.aiProvider === 'gemini' ? 'gemini' : 'openai';
  const apiKey = provider === 'openai' ? config.openaiKey : config.geminiKey;
  const model = config.aiModel || MODELOS_POR_DEFECTO[provider];

  return {
    provider,
    model,
    disponible: Boolean(apiKey),
    async responder({ mensaje, historial = [], pinturas = [], usuario }) {
      if (!apiKey) {
        const e = new Error(`El chatbot no está configurado: agregue ${provider === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY'} al archivo .env`);
        e.status = 503;
        throw e;
      }
      const desperdicio = config.factorDesperdicio;
      const system = construirPromptSistema({ pinturas, usuario, desperdicio });
      const conversacion = [...historial, { rol: 'user', contenido: mensaje + pistaCalculo(mensaje, pinturas, desperdicio) }];
      const fn = provider === 'openai' ? llamarOpenAI : llamarGemini;
      return fn({ apiKey, model, system, historial: conversacion, fetchImpl });
    },
  };
}

module.exports = { createChatbot, construirPromptSistema, pistaCalculo };
