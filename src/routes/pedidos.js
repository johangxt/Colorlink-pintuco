const express = require('express');
const { httpError, numero, texto } = require('../services/util');

module.exports = function pedidosRoutes({ repo, auth }) {
  const r = express.Router();
  r.use(auth.requerirSesion, auth.requerirRol('cliente'));

  // Compra directa: { items: [{ pintura_id, cantidad }], direccion_envio }
  r.post('/', async (req, res) => {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) throw httpError(400, 'El carrito está vacío');
    if (items.length > 30) throw httpError(400, 'Máximo 30 productos por pedido');
    const direccion = texto(req.body.direccion_envio, 'direccion_envio', { min: 5, max: 300 });

    // Agrupar por producto y validar stock antes de descontar
    const cantidades = new Map();
    items.forEach((i) => {
      const id = numero(i.pintura_id, 'pintura_id', { min: 1, entero: true });
      const cant = numero(i.cantidad, 'cantidad', { min: 1, max: 500, entero: true });
      cantidades.set(id, (cantidades.get(id) || 0) + cant);
    });
    const lineas = [];
    for (const [id, cantidad] of cantidades) {
      const p = await repo.getById('pinturas', id);
      if (!p || p.activo === false) throw httpError(404, `La pintura ${id} no existe`);
      if (p.stock_galones < cantidad) throw httpError(409, `Stock insuficiente de "${p.nombre}" (disponible: ${p.stock_galones} galones)`);
      lineas.push({ pintura: p, cantidad, subtotal: cantidad * Number(p.precio_galon) });
    }

    const total = lineas.reduce((s, l) => s + l.subtotal, 0);
    const pedido = await repo.insert('pedidos', { cliente_id: req.usuario.id, total, estado: 'pagado', direccion_envio: direccion });
    const detalle = [];
    for (const l of lineas) {
      await repo.update('pinturas', l.pintura.id, { stock_galones: l.pintura.stock_galones - l.cantidad });
      detalle.push(await repo.insert('pedido_items', {
        pedido_id: pedido.id, pintura_id: l.pintura.id, cantidad: l.cantidad,
        precio_unitario: Number(l.pintura.precio_galon), subtotal: l.subtotal,
      }));
    }
    res.status(201).json({ ...pedido, items: detalle });
  });

  r.get('/mis', async (req, res) => {
    const pedidos = await repo.select('pedidos', { cliente_id: req.usuario.id }, { orderBy: 'created_at', ascending: false });
    const pinturas = new Map((await repo.select('pinturas')).map((p) => [p.id, p.nombre]));
    for (const p of pedidos) {
      p.items = (await repo.select('pedido_items', { pedido_id: p.id })).map((i) => ({ ...i, nombre: pinturas.get(i.pintura_id) }));
    }
    res.json(pedidos);
  });

  return r;
};
