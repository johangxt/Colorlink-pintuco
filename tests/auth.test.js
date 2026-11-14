const { nuevaApp, token, USUARIOS, PASS } = require('./helpers');

describe('Autenticación y roles', () => {
  let http;
  beforeEach(() => ({ http } = nuevaApp()));

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

  test('CP-12 registro de cliente nuevo', async () => {
    const r = await http.post('/api/auth/registro').send({ nombre: 'María Gómez', email: 'MARIA@test.com', password: 'secreta123', rol: 'cliente' });
    expect(r.status).toBe(201);
    expect(r.body.usuario.email).toBe('maria@test.com');
    const me = await http.get('/api/auth/me').set('Authorization', `Bearer ${r.body.token}`);
    expect(me.body.usuario.nombre).toBe('María Gómez');
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
