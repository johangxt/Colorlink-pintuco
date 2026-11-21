const { nuevaApp, token, USUARIOS } = require('./helpers');
const { construirPromptSistema, pistaCalculo } = require('../src/services/chatbot');

function fetchFalso(respuesta, { ok = true, status = 200 } = {}) {
  const fn = jest.fn(async () => ({ ok, status, json: async () => respuesta }));
  return fn;
}

describe('Chatbot con IA (API externa simulada)', () => {
  test('CP-50 sin clave de API responde 503 con mensaje claro', async () => {
    const { http } = nuevaApp();
    const t = await token(http, USUARIOS.cliente);
    const r = await http.post('/api/chat').set('Authorization', t).send({ mensaje: 'Hola' });
    expect(r.status).toBe(503);
    expect(r.body.error).toMatch(/OPENAI_API_KEY/);
    expect((await http.get('/api/chat/estado').set('Authorization', t)).body.disponible).toBe(false);
  });

  test('CP-52 Gemini (alternativo): envía catálogo en el prompt y guarda historial', async () => {
    const fake = fetchFalso({ candidates: [{ content: { parts: [{ text: 'Te recomiendo el Vinilo Tipo 1.' }] } }] });
    const { http } = nuevaApp({ config: { aiProvider: 'gemini', geminiKey: 'k-test' }, fetchImpl: fake });
    const t = await token(http, USUARIOS.cliente);
    const r = await http.post('/api/chat').set('Authorization', t).send({ mensaje: '¿Qué pintura uso para 30 m2?' });
    expect(r.status).toBe(200);
    expect(r.body.respuesta).toMatch(/Vinilo/);

    const [url, opts] = fake.mock.calls[0];
    expect(url).toMatch(/generativelanguage\.googleapis\.com/);
    expect(opts.headers['x-goog-api-key']).toBe('k-test');
    const body = JSON.parse(opts.body);
    expect(body.systemInstruction.parts[0].text).toMatch(/Vinilo Tipo 1 Blanco Hueso/);
    expect(body.contents.at(-1).parts[0].text).toMatch(/Dato calculado por el sistema para 30 m²/);

    const h = await http.get('/api/chat/historial').set('Authorization', t);
    expect(h.body.map((m) => m.rol)).toEqual(['user', 'assistant']);
  });

  test('CP-51 OpenAI (proveedor por defecto): formato de mensajes con rol system', async () => {
    const fake = fetchFalso({ choices: [{ message: { content: 'Hola, soy PintuBot.' } }] });
    const { http } = nuevaApp({ config: { openaiKey: 'sk-test' }, fetchImpl: fake });
    const t = await token(http, USUARIOS.pintor);
    const r = await http.post('/api/chat').set('Authorization', t).send({ mensaje: 'Hola' });
    expect(r.body.respuesta).toBe('Hola, soy PintuBot.');
    const [url, opts] = fake.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(opts.headers.Authorization).toBe('Bearer sk-test');
    expect(JSON.parse(opts.body).messages[0].role).toBe('system');
  });

  test('CP-53 error del proveedor de IA responde 502 y no guarda historial', async () => {
    const fake = fetchFalso({ error: { message: 'quota exceeded' } }, { ok: false, status: 429 });
    const { http } = nuevaApp({ config: { openaiKey: 'sk' }, fetchImpl: fake });
    const t = await token(http, USUARIOS.cliente);
    const r = await http.post('/api/chat').set('Authorization', t).send({ mensaje: 'Hola' });
    expect(r.status).toBe(502);
    expect(r.body.error).toMatch(/quota exceeded/);
    expect((await http.get('/api/chat/historial').set('Authorization', t)).body).toHaveLength(0);
  });

  test('CP-54 requiere sesión y mensaje no vacío', async () => {
    const { http } = nuevaApp({ config: { openaiKey: 'sk' }, fetchImpl: fetchFalso({}) });
    expect((await http.post('/api/chat').send({ mensaje: 'Hola' })).status).toBe(401);
    const t = await token(http, USUARIOS.cliente);
    expect((await http.post('/api/chat').set('Authorization', t).send({ mensaje: '   ' })).status).toBe(400);
  });

  test('CP-55 el prompt marca productos agotados y la pista calcula galones', () => {
    const pinturas = [{ id: 1, nombre: 'Vinilo X', tipo: 'vinilo', acabado: 'mate', uso: 'interior', precio_galon: 100000, rendimiento_m2_gal: 40, stock_galones: 0 }];
    expect(construirPromptSistema({ pinturas, usuario: { nombre: 'Ana', rol: 'cliente' }, desperdicio: 0.1 })).toMatch(/AGOTADO/);
    expect(pistaCalculo('pintar 80 metros con 3 manos', pinturas, 0.1)).toMatch(/Vinilo X: 7 galones/);
    expect(pistaCalculo('hola', pinturas, 0.1)).toBe('');
  });
});
