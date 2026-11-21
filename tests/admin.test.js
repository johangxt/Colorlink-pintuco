const { nuevaApp, token, USUARIOS } = require('./helpers');

describe('Administración de inventario y estadísticas', () => {
  let http, admin;
  beforeEach(async () => { ({ http } = nuevaApp()); admin = await token(http, USUARIOS.admin); });

  const nueva = { nombre: 'Laca Transparente', tipo: 'laca', acabado: 'brillante', uso: 'interior', color: 'Transparente', color_hex: '#f5f5f5', precio_galon: 90000, rendimiento_m2_gal: 30, stock_galones: 12, stock_minimo: 3 };

  test('CP-40 crear, editar y desactivar una pintura', async () => {
    const c = await http.post('/api/admin/pinturas').set('Authorization', admin).send(nueva);
    expect(c.status).toBe(201);
    expect(c.body.color_hex).toBe('#F5F5F5');
    const e = await http.put(`/api/admin/pinturas/${c.body.id}`).set('Authorization', admin).send({ precio_galon: 95000 });
    expect(e.body.precio_galon).toBe(95000);
    expect(e.body.nombre).toBe(nueva.nombre);
    expect((await http.delete(`/api/admin/pinturas/${c.body.id}`).set('Authorization', admin)).status).toBe(204);
    const catalogo = await http.get('/api/pinturas');
    expect(catalogo.body.find((p) => p.id === c.body.id)).toBeUndefined();
  });

  test('CP-41 validaciones del producto', async () => {
    expect((await http.post('/api/admin/pinturas').set('Authorization', admin).send({ ...nueva, tipo: 'pintura-magica' })).status).toBe(400);
    expect((await http.post('/api/admin/pinturas').set('Authorization', admin).send({ ...nueva, precio_galon: -1 })).status).toBe(400);
    expect((await http.post('/api/admin/pinturas').set('Authorization', admin).send({ ...nueva, color_hex: 'rojo' })).status).toBe(400);
    expect((await http.put('/api/admin/pinturas/999').set('Authorization', admin).send({ precio_galon: 1 })).status).toBe(404);
  });

  test('CP-42 ajuste de stock positivo y negativo, sin quedar en negativo', async () => {
    expect((await http.patch('/api/admin/pinturas/8/stock').set('Authorization', admin).send({ cantidad: 20 })).body.stock_galones).toBe(23);
    expect((await http.patch('/api/admin/pinturas/8/stock').set('Authorization', admin).send({ cantidad: -3 })).body.stock_galones).toBe(20);
    expect((await http.patch('/api/admin/pinturas/8/stock').set('Authorization', admin).send({ cantidad: -100 })).status).toBe(400);
  });

  test('CP-43 listado de usuarios sin contraseñas', async () => {
    const r = await http.get('/api/admin/usuarios').set('Authorization', admin);
    expect(r.body).toHaveLength(5);
    expect(r.body.every((u) => u.password_hash === undefined)).toBe(true);
  });

  test('CP-44 estadísticas reflejan ventas, estados y alertas de stock', async () => {
    const cliente = await token(http, USUARIOS.cliente);
    const pintor = await token(http, USUARIOS.pintor);
    await http.post('/api/pedidos').set('Authorization', cliente).send({ direccion_envio: 'Calle 1 # 2-3', items: [{ pintura_id: 2, cantidad: 2 }] });
    const s = await http.post('/api/solicitudes').set('Authorization', cliente).send({ pintura_id: 1, metros_cuadrados: 50, manos: 2, direccion: 'Calle 9 # 9-9' });
    for (const p of ['aceptar', 'iniciar', 'completar']) await http.patch(`/api/solicitudes/${s.body.id}/${p}`).set('Authorization', pintor);
    await http.post(`/api/solicitudes/${s.body.id}/calificar`).set('Authorization', cliente).send({ puntuacion: 4 });

    const e = (await http.get('/api/admin/estadisticas').set('Authorization', admin)).body;
    expect(e.resumen.ventas_totales).toBe(2 * 102000 + 3 * 98000);
    expect(e.solicitudes_por_estado.completada).toBe(1);
    expect(e.resumen.calificacion_promedio).toBe(4);
    expect(e.ranking_pintores[0].nombre).toBe('Carlos Pintor');
    expect(e.stock_bajo.map((x) => x.id)).toEqual(expect.arrayContaining([6, 8]));
  });

  test('CP-45 el administrador no puede desactivarse a sí mismo', async () => {
    expect((await http.patch('/api/admin/usuarios/1/activo').set('Authorization', admin).send({ activo: false })).status).toBe(400);
  });
});
