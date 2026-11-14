const { nuevaApp, token, USUARIOS } = require('./helpers');

describe('Catálogo y compras', () => {
  let http, repo, cliente;
  beforeEach(async () => { ({ http, repo } = nuevaApp()); cliente = await token(http, USUARIOS.cliente); });

  test('CP-20 catálogo público con filtros', async () => {
    const todas = await http.get('/api/pinturas');
    expect(todas.status).toBe(200);
    expect(todas.body.length).toBe(8);
    const vinilos = await http.get('/api/pinturas?tipo=vinilo');
    expect(vinilos.body.every((p) => p.tipo === 'vinilo')).toBe(true);
    const buscar = await http.get('/api/pinturas?q=terracota');
    expect(buscar.body).toHaveLength(1);
  });

  test('CP-21 endpoint de cálculo informa stock suficiente', async () => {
    const r = await http.post('/api/pinturas/calcular').send({ pintura_id: 1, metros_cuadrados: 50, manos: 2 });
    expect(r.status).toBe(200);
    expect(r.body.galones).toBe(3);
    expect(r.body.stock_suficiente).toBe(true);
  });

  test('CP-22 compra descuenta inventario y calcula total', async () => {
    const r = await http.post('/api/pedidos').set('Authorization', cliente)
      .send({ direccion_envio: 'Calle 1 # 2-3', items: [{ pintura_id: 1, cantidad: 2 }, { pintura_id: 5, cantidad: 1 }, { pintura_id: 1, cantidad: 1 }] });
    expect(r.status).toBe(201);
    expect(r.body.total).toBe(3 * 98000 + 145000);
    expect(r.body.items).toHaveLength(2);
    expect((await repo.getById('pinturas', 1)).stock_galones).toBe(57);
    const mis = await http.get('/api/pedidos/mis').set('Authorization', cliente);
    expect(mis.body[0].items[0].nombre).toBeTruthy();
  });

  test('CP-23 rechaza compra sin stock y no descuenta nada', async () => {
    const r = await http.post('/api/pedidos').set('Authorization', cliente)
      .send({ direccion_envio: 'Calle 1 # 2-3', items: [{ pintura_id: 1, cantidad: 1 }, { pintura_id: 8, cantidad: 10 }] });
    expect(r.status).toBe(409);
    expect((await repo.getById('pinturas', 1)).stock_galones).toBe(60);
  });

  test('CP-24 valida carrito vacío y cantidades inválidas', async () => {
    expect((await http.post('/api/pedidos').set('Authorization', cliente).send({ direccion_envio: 'Calle 1 # 2-3', items: [] })).status).toBe(400);
    expect((await http.post('/api/pedidos').set('Authorization', cliente).send({ direccion_envio: 'Calle 1 # 2-3', items: [{ pintura_id: 1, cantidad: -2 }] })).status).toBe(400);
  });

  test('CP-25 un pintor no puede comprar como cliente', async () => {
    const pintor = await token(http, USUARIOS.pintor);
    expect((await http.post('/api/pedidos').set('Authorization', pintor).send({})).status).toBe(403);
  });
});
