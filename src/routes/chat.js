const express = require('express');
const { texto } = require('../services/util');

module.exports = function chatRoutes({ repo, auth, chatbot }) {
  const r = express.Router();
  r.use(auth.requerirSesion);

  r.get('/estado', (req, res) => res.json({ disponible: chatbot.disponible, proveedor: chatbot.provider, modelo: chatbot.model }));

  r.get('/historial', async (req, res) => {
    const msgs = await repo.select('mensajes_chat', { usuario_id: req.usuario.id }, { orderBy: 'id' });
    res.json(msgs.slice(-40));
  });

  r.post('/', async (req, res) => {
    const mensaje = texto(req.body.mensaje, 'mensaje', { max: 1000 });
    const previos = (await repo.select('mensajes_chat', { usuario_id: req.usuario.id }, { orderBy: 'id' })).slice(-10);
    const pinturas = await repo.select('pinturas', { activo: true }, { orderBy: 'nombre' });

    const respuesta = await chatbot.responder({ mensaje, historial: previos, pinturas, usuario: req.usuario });
    await repo.insert('mensajes_chat', { usuario_id: req.usuario.id, rol: 'user', contenido: mensaje });
    await repo.insert('mensajes_chat', { usuario_id: req.usuario.id, rol: 'assistant', contenido: respuesta });
    res.json({ respuesta });
  });

  r.delete('/historial', async (req, res) => {
    const msgs = await repo.select('mensajes_chat', { usuario_id: req.usuario.id });
    for (const m of msgs) await repo.remove('mensajes_chat', m.id);
    res.status(204).end();
  });

  return r;
};
