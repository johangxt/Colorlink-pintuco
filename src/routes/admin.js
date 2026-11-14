const express = require('express');
const { httpError, numero, texto } = require('../services/util');
const { calcularEstadisticas } = require('../services/estadisticas');

const TIPOS = ['vinilo', 'esmalte', 'impermeabilizante', 'anticorrosivo', 'laca', 'otro'];
const ACABADOS = ['mate', 'satinado', 'brillante'];
const USOS = ['interior', 'exterior', 'mixto'];

function validarPintura(body, parcial = false) {
  const out = {};
  const campo = (k, fn) => { if (!parcial || body[k] !== undefined) out[k] = fn(body[k]); };
  const enLista = (lista, nombre) => (v) => { if (!lista.includes(v)) throw httpError(400, `"${nombre}" debe ser uno de: ${lista.join(', ')}`); return v; };
  campo('nombre', (v) => texto(v, 'nombre', { min: 3, max: 150 }));
  campo('tipo', enLista(TIPOS, 'tipo'));
  campo('acabado', enLista(ACABADOS, 'acabado'));
  campo('uso', enLista(USOS, 'uso'));
  campo('color', (v) => texto(v, 'color', { max: 60 }));
  campo('color_hex', (v) => { const s = String(v || '#FFFFFF'); if (!/^#[0-9a-fA-F]{6}$/.test(s)) throw httpError(400, 'color_hex debe tener formato #RRGGBB'); return s.toUpperCase(); });
  campo('precio_galon', (v) => numero(v, 'precio_galon', { min: 0, max: 10000000 }));
  campo('rendimiento_m2_gal', (v) => numero(v, 'rendimiento_m2_gal', { min: 1, max: 200 }));
  campo('stock_galones', (v) => numero(v, 'stock_galones', { min: 0, max: 100000, entero: true }));
  campo('stock_minimo', (v) => numero(v ?? 5, 'stock_minimo', { min: 0, max: 10000, entero: true }));
  campo('descripcion', (v) => texto(v, 'descripcion', { max: 1000, opcional: true }));
  if (body.activo !== undefined) out.activo = Boolean(body.activo);
  return out;
}

module.exports = function adminRoutes({ repo, auth }) {
  const r = express.Router();
  r.use(auth.requerirSesion, auth.requerirRol('admin'));

  // ----- Inventario -----
  r.get('/pinturas', async (req, res) => res.json(await repo.select('pinturas', {}, { orderBy: 'id' })));

  r.post('/pinturas', async (req, res) => {
    res.status(201).json(await repo.insert('pinturas', { ...validarPintura(req.body), activo: true }));
  });

  r.put('/pinturas/:id', async (req, res) => {
    const id = numero(req.params.id, 'id', { min: 1, entero: true });
    if (!(await repo.getById('pinturas', id))) throw httpError(404, 'Pintura no encontrada');
    res.json(await repo.update('pinturas', id, validarPintura(req.body, true)));
  });

  // Reabastecer o ajustar inventario: { cantidad: +20 } o { cantidad: -3 }
  r.patch('/pinturas/:id/stock', async (req, res) => {
    const id = numero(req.params.id, 'id', { min: 1, entero: true });
    const p = await repo.getById('pinturas', id);
    if (!p) throw httpError(404, 'Pintura no encontrada');
    const cantidad = numero(req.body.cantidad, 'cantidad', { min: -100000, max: 100000, entero: true });
    const nuevo = p.stock_galones + cantidad;
    if (nuevo < 0) throw httpError(400, 'El stock no puede quedar negativo');
    res.json(await repo.update('pinturas', id, { stock_galones: nuevo }));
  });

  // Eliminación lógica para conservar el historial de ventas
  r.delete('/pinturas/:id', async (req, res) => {
    const id = numero(req.params.id, 'id', { min: 1, entero: true });
    if (!(await repo.getById('pinturas', id))) throw httpError(404, 'Pintura no encontrada');
    await repo.update('pinturas', id, { activo: false });
    res.status(204).end();
  });

  // ----- Consultas -----
  r.get('/usuarios', async (req, res) => {
    const usuarios = await repo.select('usuarios', {}, { orderBy: 'id' });
    res.json(usuarios.map(({ password_hash, ...u }) => u));
  });

  r.patch('/usuarios/:id/activo', async (req, res) => {
    const id = numero(req.params.id, 'id', { min: 1, entero: true });
    if (id === req.usuario.id) throw httpError(400, 'No puede desactivar su propia cuenta');
    const u = await repo.update('usuarios', id, { activo: Boolean(req.body.activo) });
    if (!u) throw httpError(404, 'Usuario no encontrado');
    const { password_hash, ...pub } = u;
    res.json(pub);
  });

  r.get('/solicitudes', async (req, res) => res.json(await repo.select('solicitudes', {}, { orderBy: 'created_at', ascending: false })));
  r.get('/pedidos', async (req, res) => res.json(await repo.select('pedidos', {}, { orderBy: 'created_at', ascending: false })));
  r.get('/estadisticas', async (req, res) => res.json(await calcularEstadisticas(repo)));

  return r;
};
