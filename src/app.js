const path = require('path');
const express = require('express');
const defaultConfig = require('./config');
const { crearAuth } = require('./middleware/auth');
const { createChatbot } = require('./services/chatbot');
const { createMailer } = require('./services/correo');

// Fábrica de la aplicación: permite inyectar repositorio y fetch (útil en pruebas)
function createApp({ repo, config = defaultConfig, fetchImpl, mailer } = {}) {
  if (!repo) throw new Error('createApp requiere un repositorio de datos');
  const app = express();
  const auth = crearAuth({ config, repo });
  const chatbot = createChatbot({ config, fetchImpl: fetchImpl || globalThis.fetch });
  const deps = { repo, config, auth, chatbot, mailer: mailer || createMailer({ config }) };

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/salud', (req, res) => res.json({ ok: true, db: config.dbProvider, ia: chatbot.provider }));
  app.use('/api/auth', require('./routes/auth')(deps));
  app.use('/api/pinturas', require('./routes/pinturas')(deps));
  app.use('/api/pedidos', require('./routes/pedidos')(deps));
  app.use('/api/solicitudes', require('./routes/solicitudes')(deps));
  app.use('/api/admin', require('./routes/admin')(deps));
  app.use('/api/chat', require('./routes/chat')(deps));

  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  // Manejo centralizado de errores
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
    const status = err.status || 500;
    if (status >= 500 && process.env.NODE_ENV !== 'test') console.error(err);
    res.status(status).json({ error: status >= 500 && status !== 502 && status !== 503 ? 'Error interno del servidor' : err.message });
  });

  return app;
}

module.exports = { createApp };
