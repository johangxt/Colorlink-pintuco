const express = require('express');
const { calcularGalones } = require('../services/calculadora');
const { httpError, numero } = require('../services/util');

module.exports = function pinturasRoutes({ repo, config }) {
  const r = express.Router();

  // Catálogo público con filtros opcionales: ?tipo=vinilo&uso=interior&q=blanco
  r.get('/', async (req, res) => {
    let pinturas = await repo.select('pinturas', { activo: true }, { orderBy: 'nombre' });
    const { tipo, uso, q } = req.query;
    if (tipo) pinturas = pinturas.filter((p) => p.tipo === tipo);
    if (uso) pinturas = pinturas.filter((p) => p.uso === uso || p.uso === 'mixto');
    if (q) {
      const t = String(q).toLowerCase();
      pinturas = pinturas.filter((p) => `${p.nombre} ${p.color} ${p.tipo}`.toLowerCase().includes(t));
    }
    res.json(pinturas);
  });

  r.get('/:id', async (req, res) => {
    const p = await repo.getById('pinturas', req.params.id);
    if (!p || p.activo === false) throw httpError(404, 'Pintura no encontrada');
    res.json(p);
  });

  // Calculadora pública: m² -> galones
  r.post('/calcular', async (req, res) => {
    const id = numero(req.body.pintura_id, 'pintura_id', { min: 1, entero: true });
    const p = await repo.getById('pinturas', id);
    if (!p || p.activo === false) throw httpError(404, 'Pintura no encontrada');
    const resultado = calcularGalones({
      metrosCuadrados: req.body.metros_cuadrados,
      manos: req.body.manos === undefined ? 2 : Number(req.body.manos),
      rendimiento: p.rendimiento_m2_gal,
      desperdicio: config.factorDesperdicio,
      precioGalon: p.precio_galon,
    });
    res.json({ ...resultado, pintura: { id: p.id, nombre: p.nombre, stock_galones: p.stock_galones }, stock_suficiente: p.stock_galones >= resultado.galones });
  });

  return r;
};
