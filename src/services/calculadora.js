// Calculadora de pintura: convierte metros cuadrados en galones necesarios.
// Fórmula:  galones = (m² × manos ÷ rendimiento m²/galón) × (1 + desperdicio)
// El resultado se redondea hacia arriba porque la pintura se vende por galón completo.
const LITROS_POR_GALON = 3.785;

function calcularGalones({ metrosCuadrados, manos = 2, rendimiento, desperdicio = 0.1, precioGalon = 0 }) {
  const m2 = Number(metrosCuadrados);
  const n = Number(manos);
  const r = Number(rendimiento);
  if (!Number.isFinite(m2) || m2 <= 0) throw crearError('Los metros cuadrados deben ser un número mayor que 0');
  if (m2 > 100000) throw crearError('El área máxima por solicitud es 100.000 m²');
  if (!Number.isInteger(n) || n < 1 || n > 5) throw crearError('El número de manos debe estar entre 1 y 5');
  if (!Number.isFinite(r) || r <= 0) throw crearError('El rendimiento de la pintura no es válido');

  const galonesExactos = (m2 * n / r) * (1 + Number(desperdicio));
  const galones = Math.max(1, Math.ceil(galonesExactos - 1e-9));
  return {
    metros_cuadrados: m2,
    manos: n,
    rendimiento_m2_gal: r,
    desperdicio_pct: Math.round(Number(desperdicio) * 100),
    galones_exactos: Math.round(galonesExactos * 100) / 100,
    galones,
    litros: Math.round(galones * LITROS_POR_GALON * 100) / 100,
    costo_estimado: galones * Number(precioGalon || 0),
  };
}

function crearError(msg) {
  const e = new Error(msg);
  e.status = 400;
  return e;
}

module.exports = { calcularGalones, LITROS_POR_GALON };
