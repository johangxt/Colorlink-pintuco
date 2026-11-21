// Solicitudes de servicio de pintura (cliente -> pintor -> calificación)
const express = require('express');
const { calcularGalones } = require('../services/calculadora');
const { httpError, numero, texto } = require('../services/util');

module.exports = function solicitudesRoutes({ repo, auth, config }) {
  const r = express.Router();
  r.use(auth.requerirSesion);
  const soloCliente = auth.requerirRol('cliente');
  const soloPintor = auth.requerirRol('pintor');

  // Agrega nombres y calificación para mostrar en pantalla
  async function enriquecer(lista) {
    const [usuarios, pinturas, calificaciones] = await Promise.all([repo.select('usuarios'), repo.select('pinturas'), repo.select('calificaciones')]);
    const u = new Map(usuarios.map((x) => [x.id, x]));
    const p = new Map(pinturas.map((x) => [x.id, x]));
    return lista.map((s) => ({
      ...s,
      cliente: u.get(s.cliente_id) ? { nombre: u.get(s.cliente_id).nombre, telefono: u.get(s.cliente_id).telefono } : null,
      pintor: s.pintor_id && u.get(s.pintor_id) ? { nombre: u.get(s.pintor_id).nombre, telefono: u.get(s.pintor_id).telefono } : null,
      pintura: p.get(s.pintura_id) ? { nombre: p.get(s.pintura_id).nombre, color_hex: p.get(s.pintura_id).color_hex } : null,
      calificacion: calificaciones.find((c) => c.solicitud_id === s.id) || null,
    }));
  }

  async function obtener(id) {
    const s = await repo.getById('solicitudes', numero(id, 'id', { min: 1, entero: true }));
    if (!s) throw httpError(404, 'Solicitud no encontrada');
    return s;
  }

  // CLIENTE: crear solicitud calculando galones a partir de m²
  r.post('/', soloCliente, async (req, res) => {
    const pinturaId = numero(req.body.pintura_id, 'pintura_id', { min: 1, entero: true });
    const pintura = await repo.getById('pinturas', pinturaId);
    if (!pintura || pintura.activo === false) throw httpError(404, 'Pintura no encontrada');
    const direccion = texto(req.body.direccion, 'direccion', { min: 5, max: 300 });
    const descripcion = texto(req.body.descripcion, 'descripcion', { max: 1000, opcional: true });
    const fecha = req.body.fecha_deseada || null;
    if (fecha && Number.isNaN(Date.parse(fecha))) throw httpError(400, 'La fecha deseada no es válida');

    const calc = calcularGalones({
      metrosCuadrados: req.body.metros_cuadrados,
      manos: req.body.manos === undefined ? 2 : Number(req.body.manos),
      rendimiento: pintura.rendimiento_m2_gal,
      desperdicio: config.factorDesperdicio,
      precioGalon: pintura.precio_galon,
    });
    if (pintura.stock_galones < calc.galones) {
      throw httpError(409, `Stock insuficiente: se requieren ${calc.galones} galones y hay ${pintura.stock_galones}`);
    }
    // Se reserva la pintura descontándola del inventario
    await repo.update('pinturas', pintura.id, { stock_galones: pintura.stock_galones - calc.galones });
    const solicitud = await repo.insert('solicitudes', {
      cliente_id: req.usuario.id, pintor_id: null, pintura_id: pintura.id,
      metros_cuadrados: calc.metros_cuadrados, manos: calc.manos, galones: calc.galones,
      costo_pintura: calc.costo_estimado, direccion, descripcion, fecha_deseada: fecha,
      estado: 'pendiente', aceptada_at: null, completada_at: null,
    });
    res.status(201).json({ ...solicitud, calculo: calc });
  });

  // CLIENTE: sus solicitudes | PINTOR: las que tiene asignadas
  r.get('/mis', async (req, res) => {
    const filtro = req.usuario.rol === 'pintor' ? { pintor_id: req.usuario.id } : { cliente_id: req.usuario.id };
    const lista = await repo.select('solicitudes', filtro, { orderBy: 'created_at', ascending: false });
    res.json(await enriquecer(lista));
  });

  // PINTOR: solicitudes pendientes que puede tomar
  r.get('/disponibles', soloPintor, async (req, res) => {
    const lista = await repo.select('solicitudes', { estado: 'pendiente' }, { orderBy: 'created_at' });
    res.json(await enriquecer(lista));
  });

  // PINTOR: aceptar -> iniciar -> completar
  r.patch('/:id/aceptar', soloPintor, async (req, res) => {
    const s = await obtener(req.params.id);
    if (s.estado !== 'pendiente') throw httpError(409, 'La solicitud ya no está disponible');
    res.json(await repo.update('solicitudes', s.id, { estado: 'aceptada', pintor_id: req.usuario.id, aceptada_at: new Date().toISOString() }));
  });

  const transicion = (desde, hacia, extra = () => ({})) => async (req, res) => {
    const s = await obtener(req.params.id);
    if (s.pintor_id !== req.usuario.id) throw httpError(403, 'Esta solicitud no está asignada a usted');
    if (s.estado !== desde) throw httpError(409, `Solo se puede pasar a "${hacia}" desde "${desde}"`);
    res.json(await repo.update('solicitudes', s.id, { estado: hacia, ...extra() }));
  };
  r.patch('/:id/iniciar', soloPintor, transicion('aceptada', 'en_proceso'));
  r.patch('/:id/completar', soloPintor, transicion('en_proceso', 'completada', () => ({ completada_at: new Date().toISOString() })));

  // CLIENTE: cancelar mientras siga pendiente (devuelve la pintura al inventario)
  r.patch('/:id/cancelar', soloCliente, async (req, res) => {
    const s = await obtener(req.params.id);
    if (s.cliente_id !== req.usuario.id) throw httpError(403, 'Esta solicitud no le pertenece');
    if (s.estado !== 'pendiente') throw httpError(409, 'Solo se pueden cancelar solicitudes pendientes');
    const p = await repo.getById('pinturas', s.pintura_id);
    if (p) await repo.update('pinturas', p.id, { stock_galones: p.stock_galones + s.galones });
    res.json(await repo.update('solicitudes', s.id, { estado: 'cancelada' }));
  });

  // CLIENTE: calificar al pintor (1 a 5) una vez completado el trabajo
  r.post('/:id/calificar', soloCliente, async (req, res) => {
    const s = await obtener(req.params.id);
    if (s.cliente_id !== req.usuario.id) throw httpError(403, 'Esta solicitud no le pertenece');
    if (s.estado !== 'completada') throw httpError(409, 'Solo puede calificar trabajos completados');
    if (await repo.findOne('calificaciones', { solicitud_id: s.id })) throw httpError(409, 'Este servicio ya fue calificado');
    const puntuacion = numero(req.body.puntuacion, 'puntuacion', { min: 1, max: 5, entero: true });
    const comentario = texto(req.body.comentario, 'comentario', { max: 1000, opcional: true });
    const c = await repo.insert('calificaciones', { solicitud_id: s.id, cliente_id: s.cliente_id, pintor_id: s.pintor_id, puntuacion, comentario });
    res.status(201).json(c);
  });

  return r;
};
