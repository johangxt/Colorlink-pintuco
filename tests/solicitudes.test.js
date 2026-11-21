const { nuevaApp, token, USUARIOS } = require('./helpers');

describe('Flujo de solicitudes de servicio', () => {
  let http, repo, cliente, cliente2, pintor, pintor2;
  const nueva = (t, extra = {}) => http.post('/api/solicitudes').set('Authorization', t)
    .send({ pintura_id: 1, metros_cuadrados: 50, manos: 2, direccion: 'Cra 27 # 45-12', descripcion: 'Sala', ...extra });

  beforeEach(async () => {
    ({ http, repo } = nuevaApp());
    [cliente, cliente2, pintor, pintor2] = await Promise.all([USUARIOS.cliente, USUARIOS.cliente2, USUARIOS.pintor, USUARIOS.pintor2].map((e) => token(http, e)));
  });

  test('CP-30 flujo completo: crear → aceptar → iniciar → completar → calificar', async () => {
    const s = await nueva(cliente);
    expect(s.status).toBe(201);
    expect(s.body.galones).toBe(3);
    expect(s.body.estado).toBe('pendiente');
    expect((await repo.getById('pinturas', 1)).stock_galones).toBe(57);

    const disp = await http.get('/api/solicitudes/disponibles').set('Authorization', pintor);
    expect(disp.body.map((x) => x.id)).toContain(s.body.id);

    const a = await http.patch(`/api/solicitudes/${s.body.id}/aceptar`).set('Authorization', pintor);
    expect(a.body.estado).toBe('aceptada');
    expect(a.body.aceptada_at).toBeTruthy();
    expect((await http.patch(`/api/solicitudes/${s.body.id}/iniciar`).set('Authorization', pintor)).body.estado).toBe('en_proceso');
    expect((await http.patch(`/api/solicitudes/${s.body.id}/completar`).set('Authorization', pintor)).body.estado).toBe('completada');

    const c = await http.post(`/api/solicitudes/${s.body.id}/calificar`).set('Authorization', cliente).send({ puntuacion: 5, comentario: 'Excelente' });
    expect(c.status).toBe(201);
    const mis = await http.get('/api/solicitudes/mis').set('Authorization', pintor);
    expect(mis.body[0].calificacion.puntuacion).toBe(5);
  });

  test('CP-31 no se puede crear solicitud sin stock suficiente', async () => {
    const r = await nueva(cliente, { pintura_id: 8, metros_cuadrados: 500 });
    expect(r.status).toBe(409);
  });

  test('CP-32 dos pintores no pueden aceptar la misma solicitud', async () => {
    const s = await nueva(cliente);
    expect((await http.patch(`/api/solicitudes/${s.body.id}/aceptar`).set('Authorization', pintor)).status).toBe(200);
    expect((await http.patch(`/api/solicitudes/${s.body.id}/aceptar`).set('Authorization', pintor2)).status).toBe(409);
  });

  test('CP-33 un pintor no puede gestionar trabajos de otro', async () => {
    const s = await nueva(cliente);
    await http.patch(`/api/solicitudes/${s.body.id}/aceptar`).set('Authorization', pintor);
    expect((await http.patch(`/api/solicitudes/${s.body.id}/iniciar`).set('Authorization', pintor2)).status).toBe(403);
  });

  test('CP-34 no se puede saltar estados (completar sin iniciar)', async () => {
    const s = await nueva(cliente);
    await http.patch(`/api/solicitudes/${s.body.id}/aceptar`).set('Authorization', pintor);
    expect((await http.patch(`/api/solicitudes/${s.body.id}/completar`).set('Authorization', pintor)).status).toBe(409);
  });

  test('CP-35 cancelar devuelve la pintura al inventario', async () => {
    const s = await nueva(cliente);
    const r = await http.patch(`/api/solicitudes/${s.body.id}/cancelar`).set('Authorization', cliente);
    expect(r.body.estado).toBe('cancelada');
    expect((await repo.getById('pinturas', 1)).stock_galones).toBe(60);
  });

  test('CP-36 no se puede cancelar una solicitud ya aceptada ni ajena', async () => {
    const s = await nueva(cliente);
    expect((await http.patch(`/api/solicitudes/${s.body.id}/cancelar`).set('Authorization', cliente2)).status).toBe(403);
    await http.patch(`/api/solicitudes/${s.body.id}/aceptar`).set('Authorization', pintor);
    expect((await http.patch(`/api/solicitudes/${s.body.id}/cancelar`).set('Authorization', cliente)).status).toBe(409);
  });

  test('CP-37 calificación: solo completadas, una vez, rango 1-5, solo el dueño', async () => {
    const s = await nueva(cliente);
    expect((await http.post(`/api/solicitudes/${s.body.id}/calificar`).set('Authorization', cliente).send({ puntuacion: 4 })).status).toBe(409);
    for (const paso of ['aceptar', 'iniciar', 'completar']) await http.patch(`/api/solicitudes/${s.body.id}/${paso}`).set('Authorization', pintor);
    expect((await http.post(`/api/solicitudes/${s.body.id}/calificar`).set('Authorization', cliente).send({ puntuacion: 7 })).status).toBe(400);
    expect((await http.post(`/api/solicitudes/${s.body.id}/calificar`).set('Authorization', cliente2).send({ puntuacion: 4 })).status).toBe(403);
    expect((await http.post(`/api/solicitudes/${s.body.id}/calificar`).set('Authorization', cliente).send({ puntuacion: 4 })).status).toBe(201);
    expect((await http.post(`/api/solicitudes/${s.body.id}/calificar`).set('Authorization', cliente).send({ puntuacion: 3 })).status).toBe(409);
  });

  test('CP-38 validaciones de entrada de la solicitud', async () => {
    expect((await nueva(cliente, { metros_cuadrados: 0 })).status).toBe(400);
    expect((await nueva(cliente, { direccion: '' })).status).toBe(400);
    expect((await nueva(cliente, { pintura_id: 999 })).status).toBe(404);
    expect((await nueva(cliente, { fecha_deseada: 'no-fecha' })).status).toBe(400);
  });
});
