// Cálculo de indicadores para el panel del administrador y el informe estadístico.
const ESTADOS = ['pendiente', 'aceptada', 'en_proceso', 'completada', 'cancelada'];

const redondear = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const media = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const desviacion = (arr) => {
  if (arr.length < 2) return 0;
  const m = media(arr);
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1));
};
const mediana = (arr) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const k = Math.floor(s.length / 2);
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
};

async function calcularEstadisticas(repo) {
  const [usuarios, pinturas, pedidos, items, solicitudes, calificaciones] = await Promise.all([
    repo.select('usuarios'), repo.select('pinturas'), repo.select('pedidos'),
    repo.select('pedido_items'), repo.select('solicitudes'), repo.select('calificaciones'),
  ]);

  const pedidosValidos = pedidos.filter((p) => p.estado !== 'cancelado');
  const idsValidos = new Set(pedidosValidos.map((p) => p.id));
  const itemsValidos = items.filter((i) => idsValidos.has(i.pedido_id));
  const ventasPedidos = pedidosValidos.reduce((s, p) => s + Number(p.total), 0);
  const solicitudesActivas = solicitudes.filter((s) => s.estado !== 'cancelada');
  const ventasSolicitudes = solicitudesActivas.reduce((s, x) => s + Number(x.costo_pintura), 0);

  // Galones vendidos por pintura (compras directas + solicitudes de servicio)
  const porPintura = new Map(pinturas.map((p) => [p.id, { pintura_id: p.id, nombre: p.nombre, galones: 0, ingresos: 0 }]));
  itemsValidos.forEach((i) => { const r = porPintura.get(i.pintura_id); if (r) { r.galones += i.cantidad; r.ingresos += Number(i.subtotal); } });
  solicitudesActivas.forEach((s) => { const r = porPintura.get(s.pintura_id); if (r) { r.galones += s.galones; r.ingresos += Number(s.costo_pintura); } });
  const topPinturas = [...porPintura.values()].filter((r) => r.galones > 0).sort((a, b) => b.galones - a.galones);

  // Ventas por día (últimos registros)
  const porDia = {};
  pedidosValidos.forEach((p) => { const d = p.created_at.slice(0, 10); porDia[d] = (porDia[d] || 0) + Number(p.total); });
  solicitudesActivas.forEach((s) => { const d = s.created_at.slice(0, 10); porDia[d] = (porDia[d] || 0) + Number(s.costo_pintura); });
  const ventasPorDia = Object.entries(porDia).sort(([a], [b]) => a.localeCompare(b)).map(([fecha, total]) => ({ fecha, total }));

  // Solicitudes por estado
  const solicitudesPorEstado = Object.fromEntries(ESTADOS.map((e) => [e, solicitudes.filter((s) => s.estado === e).length]));

  // Ranking de pintores
  const pintores = usuarios.filter((u) => u.rol === 'pintor');
  const rankingPintores = pintores.map((p) => {
    const notas = calificaciones.filter((c) => c.pintor_id === p.id).map((c) => c.puntuacion);
    const completadas = solicitudes.filter((s) => s.pintor_id === p.id && s.estado === 'completada').length;
    return { pintor_id: p.id, nombre: p.nombre, calificaciones: notas.length, promedio: redondear(media(notas)), completadas };
  }).sort((a, b) => b.promedio - a.promedio);

  // Distribución de calificaciones (1 a 5 estrellas)
  const notas = calificaciones.map((c) => c.puntuacion);
  const distribucionCalificaciones = [1, 2, 3, 4, 5].map((n) => ({ estrellas: n, cantidad: notas.filter((x) => x === n).length }));

  // Tiempos de atención (horas entre creación y aceptación)
  const horasAceptacion = solicitudes.filter((s) => s.aceptada_at)
    .map((s) => (new Date(s.aceptada_at) - new Date(s.created_at)) / 36e5).filter((h) => h >= 0);

  // Área solicitada (m²)
  const areas = solicitudes.map((s) => Number(s.metros_cuadrados));

  return {
    resumen: {
      clientes: usuarios.filter((u) => u.rol === 'cliente').length,
      pintores: pintores.length,
      productos_activos: pinturas.filter((p) => p.activo !== false).length,
      pedidos: pedidosValidos.length,
      solicitudes: solicitudes.length,
      ventas_pedidos: ventasPedidos,
      ventas_solicitudes: ventasSolicitudes,
      ventas_totales: ventasPedidos + ventasSolicitudes,
      ticket_promedio_pedido: redondear(media(pedidosValidos.map((p) => Number(p.total))), 0),
      tasa_completadas_pct: solicitudes.length ? redondear((solicitudesPorEstado.completada / solicitudes.length) * 100, 1) : 0,
      tasa_cancelacion_pct: solicitudes.length ? redondear((solicitudesPorEstado.cancelada / solicitudes.length) * 100, 1) : 0,
      calificacion_promedio: redondear(media(notas)),
      calificacion_desviacion: redondear(desviacion(notas)),
      total_calificaciones: notas.length,
    },
    area_m2: { media: redondear(media(areas)), mediana: redondear(mediana(areas)), desviacion: redondear(desviacion(areas)), min: areas.length ? Math.min(...areas) : 0, max: areas.length ? Math.max(...areas) : 0 },
    horas_hasta_aceptacion: { media: redondear(media(horasAceptacion)), mediana: redondear(mediana(horasAceptacion)), muestras: horasAceptacion.length },
    solicitudes_por_estado: solicitudesPorEstado,
    top_pinturas: topPinturas,
    ventas_por_dia: ventasPorDia,
    ranking_pintores: rankingPintores,
    distribucion_calificaciones: distribucionCalificaciones,
    stock_bajo: pinturas.filter((p) => p.activo !== false && p.stock_galones <= p.stock_minimo)
      .map((p) => ({ id: p.id, nombre: p.nombre, stock_galones: p.stock_galones, stock_minimo: p.stock_minimo })),
  };
}

module.exports = { calcularEstadisticas, media, mediana, desviacion };
