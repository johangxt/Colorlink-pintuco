const config = require('./config');
const { createRepo } = require('./db');
const { createApp } = require('./app');

const app = createApp({ repo: createRepo(), config });
app.listen(config.port, () => {
  console.log(`ColorLink escuchando en http://localhost:${config.port}`);
  console.log(`Base de datos: ${config.dbProvider} | Chatbot IA: ${config.aiProvider}`);
  if (config.dbProvider === 'memory') console.log('Modo demostración: los datos se pierden al reiniciar. Usuarios: admin@pintuco.test / Pintuco123*');
});
