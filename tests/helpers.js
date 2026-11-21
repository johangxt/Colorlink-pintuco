const request = require('supertest');
const { createApp } = require('../src/app');
const { createMemoryRepo } = require('../src/db/memory');
const baseConfig = require('../src/config');

const PASS = 'Pintuco123*';

function nuevaApp({ config = {}, fetchImpl } = {}) {
  const repo = createMemoryRepo();
  const cfg = { ...baseConfig, dbProvider: 'memory', jwtSecret: 'test-secret', aiProvider: 'openai', aiModel: undefined, geminiKey: undefined, openaiKey: undefined, factorDesperdicio: 0.1, ...config };
  // Correo simulado: guarda los códigos enviados en lugar de usar Gmail
  const correos = [];
  const mailer = { async enviarCodigo(para, nombre, codigo) { correos.push({ para, nombre, codigo }); } };
  const app = createApp({ repo, config: cfg, fetchImpl, mailer });
  return { app, repo, http: request(app), correos };
}

async function token(http, email) {
  const r = await http.post('/api/auth/login').send({ email, password: PASS });
  if (r.status !== 200) throw new Error(`login falló para ${email}: ${r.status}`);
  return `Bearer ${r.body.token}`;
}

const USUARIOS = { admin: 'admin@pintuco.test', pintor: 'carlos@pintuco.test', pintor2: 'laura@pintuco.test', cliente: 'ana@cliente.test', cliente2: 'pedro@cliente.test' };

module.exports = { nuevaApp, token, USUARIOS, PASS };
