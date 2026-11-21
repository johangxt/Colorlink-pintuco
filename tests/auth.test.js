const { nuevaApp, token, USUARIOS, PASS } = require('./helpers');

describe('Autenticación y roles', () => {
  let http, correos, repo;
  beforeEach(() => ({ http, correos, repo } = nuevaApp()));

  test('CP-10 login correcto devuelve token y no expone la contraseña', async () => {
    const r = await http.post('/api/auth/login').send({ email: USUARIOS.cliente, password: PASS });
    expect(r.status).toBe(200);
    expect(r.body.token).toBeTruthy();
    expect(r.body.usuario.rol).toBe('cliente');
    expect(r.body.usuario.password_hash).toBeUndefined();
  });

  test('CP-11 login con contraseña incorrecta responde 401', async () => {
    const r = await http.post('/api/auth/login').send({ email: USUARIOS.cliente, password: 'malaClave1' });
    expect(r.status).toBe(401);
  });

  test('CP-12 registro envía código al correo y la cuenta queda sin verificar', async () => {
    const r = await http.post('/api/auth/registro').send({ nombre: 'María Gómez', email: 'MARIA@test.com', password: 'secreta123', rol: 'cliente' });
    expect(r.status).toBe(201);
    expect(r.body.verificacion).toBe(true);
    expect(r.body.token).toBeUndefined();
    expect(correos).toHaveLength(1);
    expect(correos[0].para).toBe('maria@test.com');
    expect(correos[0].codigo).toMatch(/^\d{6}$/);
    const login = await http.post('/api/auth/login').send({ email: 'maria@test.com', password: 'secreta123' });
    expect(login.status).toBe(403);
    expect(login.body.requiereVerificacion).toBe(true);
  });

  test('CP-12b el código correcto verifica la cuenta y permite ingresar', async () => {
    await http.post('/api/auth/registro').send({ nombre: 'María Gómez', email: 'maria@test.com', password: 'secreta123' });
    const v = await http.post('/api/auth/verificar').send({ email: 'maria@test.com', codigo: correos[0].codigo });
    expect(v.status).toBe(200);
    expect(v.body.token).toBeTruthy();
    const me = await http.get('/api/auth/me').set('Authorization', `Bearer ${v.body.token}`);
    expect(me.body.usuario.nombre).toBe('María Gómez');
    expect((await http.post('/api/auth/login').send({ email: 'maria@test.com', password: 'secreta123' })).status).toBe(200);
    expect((await http.post('/api/auth/verificar').send({ email: 'maria@test.com', codigo: correos[0].codigo })).status).toBe(400);
  });

  test('CP-12c código incorrecto, bloqueo tras 5 intentos y código vencido', async () => {
    await http.post('/api/auth/registro').send({ nombre: 'Luis Pérez', email: 'luis@test.com', password: 'secreta123' });
    const bueno = correos[0].codigo;
    const malo = bueno === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      expect((await http.post('/api/auth/verificar').send({ email: 'luis@test.com', codigo: malo })).status).toBe(400);
    }
    expect((await http.post('/api/auth/verificar').send({ email: 'luis@test.com', codigo: bueno })).status).toBe(429);

    await http.post('/api/auth/registro').send({ nombre: 'Ana Vega', email: 'ana2@test.com', password: 'secreta123' });
    const u = await repo.findOne('usuarios', { email: 'ana2@test.com' });
    await repo.update('usuarios', u.id, { codigo_expira: new Date(Date.now() - 1000).toISOString() });
    expect((await http.post('/api/auth/verificar').send({ email: 'ana2@test.com', codigo: correos[1].codigo })).status).toBe(400);
  });

  test('CP-12d reenviar genera un código nuevo y respeta la espera de 60 s', async () => {
    await http.post('/api/auth/registro').send({ nombre: 'Luis Pérez', email: 'luis@test.com', password: 'secreta123' });
    expect((await http.post('/api/auth/reenviar').send({ email: 'luis@test.com' })).status).toBe(429);
    const u = await repo.findOne('usuarios', { email: 'luis@test.com' });
    await repo.update('usuarios', u.id, { codigo_enviado: new Date(Date.now() - 61000).toISOString() });
    expect((await http.post('/api/auth/reenviar').send({ email: 'luis@test.com' })).status).toBe(200);
    expect(correos).toHaveLength(2);
    const v = await http.post('/api/auth/verificar').send({ email: 'luis@test.com', codigo: correos[1].codigo });
    expect(v.status).toBe(200);
  });

  test('CP-12e si el correo no se puede enviar, la cuenta no queda creada', async () => {
    const { http: h2, repo: r2, correos: c2 } = nuevaApp();
    // reemplazamos el envío por uno que falla
    const { createApp } = require('../src/app');
    const request = require('supertest');
    const cfg = { ...require('../src/config'), dbProvider: 'memory', jwtSecret: 'test-secret' };
    const app = createApp({ repo: r2, config: cfg, mailer: { async enviarCodigo() { const e = new Error('fallo'); e.status = 503; throw e; } } });
    const r = await request(app).post('/api/auth/registro').send({ nombre: 'Pedro Sol', email: 'pedro2@test.com', password: 'secreta123' });
    expect(r.status).toBe(503);
    expect(await r2.findOne('usuarios', { email: 'pedro2@test.com' })).toBeNull();
    expect(c2).toHaveLength(0);
    expect(h2).toBeTruthy();
  });

  test('CP-13 no permite correos duplicados', async () => {
    const r = await http.post('/api/auth/registro').send({ nombre: 'Otra Ana', email: USUARIOS.cliente, password: 'secreta123' });
    expect(r.status).toBe(409);
  });

  test('CP-14 no permite registrarse como administrador', async () => {
    const r = await http.post('/api/auth/registro').send({ nombre: 'Hacker', email: 'h@x.com', password: 'secreta123', rol: 'admin' });
    expect(r.status).toBe(400);
  });

  test('CP-15 valida contraseña corta y correo inválido', async () => {
    expect((await http.post('/api/auth/registro').send({ nombre: 'Juan', email: 'j@x.com', password: '123' })).status).toBe(400);
    expect((await http.post('/api/auth/registro').send({ nombre: 'Juan', email: 'no-es-correo', password: 'secreta123' })).status).toBe(400);
  });

  test('CP-16 rutas protegidas exigen sesión y rol', async () => {
    expect((await http.get('/api/admin/pinturas')).status).toBe(401);
    expect((await http.get('/api/admin/pinturas').set('Authorization', 'Bearer token-falso')).status).toBe(401);
    const cliente = await token(http, USUARIOS.cliente);
    expect((await http.get('/api/admin/pinturas').set('Authorization', cliente)).status).toBe(403);
    expect((await http.get('/api/solicitudes/disponibles').set('Authorization', cliente)).status).toBe(403);
  });

  test('CP-17 un usuario desactivado no puede iniciar sesión', async () => {
    const admin = await token(http, USUARIOS.admin);
    await http.patch('/api/admin/usuarios/5/activo').set('Authorization', admin).send({ activo: false });
    expect((await http.post('/api/auth/login').send({ email: USUARIOS.cliente2, password: PASS })).status).toBe(401);
  });
});
