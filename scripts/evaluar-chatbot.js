// Evaluación cuantitativa del chatbot con la API REAL de OpenAI.
// Uso:  OPENAI_API_KEY=sk-... npm run eval:chatbot
// Mide: precisión del cálculo de galones, apego al catálogo, rechazo de temas ajenos y latencia.
// Salida: docs/estadisticas/evaluacion_chatbot.json
const fs = require('fs');
const path = require('path');
const config = require('../src/config');
const { createChatbot } = require('../src/services/chatbot');
const { calcularGalones } = require('../src/services/calculadora');
const { pinturas: semilla } = require('../src/db/seedData');

const pinturas = semilla.map((p, i) => ({ id: i + 1, ...p }));
const usuario = { nombre: 'Evaluador', rol: 'cliente' };
const p = (nombre) => pinturas.find((x) => x.nombre === nombre);
const gal = (pin, m2, manos = 2) => calcularGalones({ metrosCuadrados: m2, manos, rendimiento: pin.rendimiento_m2_gal, desperdicio: config.factorDesperdicio }).galones;

// Casos con respuesta verificable
const CASOS = [
  ...[[20, 2], [35, 2], [45, 2], [60, 1], [80, 3], [120, 2]].map(([m2, manos]) => ({
    tipo: 'calculo', pregunta: `¿Cuántos galones de Vinilo Tipo 1 Blanco Hueso necesito para ${m2} m2 con ${manos} manos?`, esperado: gal(p('Vinilo Tipo 1 Blanco Hueso'), m2, manos),
  })),
  ...[[30, 2], [50, 2]].map(([m2, manos]) => ({
    tipo: 'calculo', pregunta: `Voy a impermeabilizar un techo de ${m2} metros con ${manos} manos usando el Impermeabilizante Techos Rojo, ¿cuántos galones compro?`, esperado: gal(p('Impermeabilizante Techos Rojo'), m2, manos),
  })),
  { tipo: 'recomendacion', pregunta: '¿Qué pintura me sirve para una fachada exterior?', debeMencionar: ['Fachadas'] },
  { tipo: 'recomendacion', pregunta: 'Quiero pintar una reja metálica, ¿qué productos necesito?', debeMencionar: ['Anticorrosivo', 'Esmalte'] },
  { tipo: 'recomendacion', pregunta: 'Tengo goteras en la terraza, ¿qué me recomiendas?', debeMencionar: ['Impermeabilizante'] },
  { tipo: 'recomendacion', pregunta: 'Busco algo económico para pintar el cuarto de mi hijo de azul', debeMencionar: ['Azul Cielo'] },
  { tipo: 'app', pregunta: '¿Cómo contrato un pintor en la aplicación?', debeMencionar: ['Solicitar servicio'] },
  { tipo: 'app', pregunta: '¿Puedo calificar al pintor?', debeMencionar: ['calific'] },
  { tipo: 'fuera_de_tema', pregunta: '¿Quién ganó el último mundial de fútbol?', debeMencionar: ['pintura'] },
  { tipo: 'fuera_de_tema', pregunta: 'Escríbeme un poema sobre el mar', debeMencionar: ['pintura'] },
];

async function evaluar(chatbot) {
  const resultados = [];
  for (const c of CASOS) {
    const t0 = Date.now();
    let respuesta = '';
    let error = null;
    try { respuesta = await chatbot.responder({ mensaje: c.pregunta, historial: [], pinturas, usuario }); } catch (e) { error = e.message; }
    const ms = Date.now() - t0;
    let correcto = false;
    if (!error) {
      if (c.tipo === 'calculo') correcto = new RegExp(`(^|[^\\d.,])${c.esperado}\\s*galon`, 'i').test(respuesta);
      else correcto = c.debeMencionar.every((w) => respuesta.toLowerCase().includes(w.toLowerCase()));
    }
    resultados.push({ tipo: c.tipo, pregunta: c.pregunta, esperado: c.esperado ?? c.debeMencionar, correcto, ms, error, respuesta });
    process.stdout.write(correcto ? '✔' : '✘');
  }
  const por = {};
  resultados.forEach((r) => { por[r.tipo] = por[r.tipo] || { casos: 0, correctos: 0 }; por[r.tipo].casos++; if (r.correcto) por[r.tipo].correctos++; });
  Object.values(por).forEach((v) => { v.precision_pct = Math.round((v.correctos / v.casos) * 1000) / 10; });
  const lat = resultados.filter((r) => !r.error).map((r) => r.ms).sort((a, b) => a - b);
  return {
    proveedor: chatbot.provider, modelo: chatbot.model, fecha: new Date().toISOString(),
    total_casos: resultados.length,
    precision_global_pct: Math.round((resultados.filter((r) => r.correcto).length / resultados.length) * 1000) / 10,
    por_tipo: por,
    latencia_ms: { media: Math.round(lat.reduce((a, b) => a + b, 0) / (lat.length || 1)), mediana: lat[Math.floor(lat.length / 2)] || 0, p90: lat[Math.floor(lat.length * 0.9)] || 0 },
    errores: resultados.filter((r) => r.error).length,
    resultados,
  };
}

if (require.main === module) {
  const chatbot = createChatbot({ config });
  if (!chatbot.disponible) { console.error('Configure OPENAI_API_KEY en .env para ejecutar la evaluación.'); process.exit(1); }
  evaluar(chatbot).then((r) => {
    const out = path.join(__dirname, '..', 'docs', 'estadisticas', 'evaluacion_chatbot.json');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(r, null, 2));
    console.log(`\nPrecisión global: ${r.precision_global_pct}% | Latencia media: ${r.latencia_ms.media} ms`);
    console.log(JSON.stringify(r.por_tipo, null, 2));
    console.log(`Guardado en ${out}`);
  });
}

module.exports = { evaluar, CASOS };
