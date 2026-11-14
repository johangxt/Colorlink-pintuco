// Genera los resultados estadísticos del sistema.
//  - Con DB_PROVIDER=supabase: lee los datos REALES de la base de datos.
//  - Sin Supabase (o con --simular): crea un escenario simulado de 30 días con semilla fija
//    (reproducible) usando las mismas reglas de negocio de la aplicación.
// Salida: docs/estadisticas/resultados.json y archivos .csv  (gráficos: python scripts/graficos.py)
const fs = require('fs');
const path = require('path');
const config = require('../src/config');
const { createRepo } = require('../src/db');
const { createMemoryRepo } = require('../src/db/memory');
const { calcularGalones } = require('../src/services/calculadora');
const { calcularEstadisticas } = require('../src/services/estadisticas');

const OUT = path.join(__dirname, '..', 'docs', 'estadisticas');
const simular = process.argv.includes('--simular') || config.dbProvider !== 'supabase';

// Generador pseudoaleatorio con semilla (mulberry32) para resultados reproducibles
function prng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

async function escenarioSimulado() {
  const rnd = prng(2026);
  const entre = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const repo = createMemoryRepo();
  // Inventario amplio para la simulación
  for (const p of await repo.select('pinturas')) await repo.update('pinturas', p.id, { stock_galones: p.stock_galones + 400 });

  const clientes = [];
  for (let i = 1; i <= 40; i++) clientes.push(await repo.insert('usuarios', { nombre: `Cliente ${i}`, email: `c${i}@sim.test`, rol: 'cliente', password_hash: 'x', activo: true }));
  // Pintores con distinta "habilidad" (probabilidad de buena calificación)
  const pintores = (await repo.select('usuarios', { rol: 'pintor' })).map((p, i) => ({ ...p, habilidad: [0.85, 0.65][i] }));
  for (const [n, h] of [['Diego Pintor', 0.75], ['Sofía Pintora', 0.9], ['Andrés Pintor', 0.55], ['Valentina Pintora', 0.8]]) {
    pintores.push({ ...(await repo.insert('usuarios', { nombre: n, email: `${n.split(' ')[0].toLowerCase()}@sim.test`, rol: 'pintor', password_hash: 'x', activo: true })), habilidad: h });
  }
  const pinturas = await repo.select('pinturas');
  // Popularidad relativa de cada producto (vinilos interiores más vendidos)
  const pesos = [26, 14, 16, 12, 8, 7, 10, 7];
  const elegir = () => { let r = rnd() * pesos.reduce((a, b) => a + b, 0); for (let i = 0; i < pesos.length; i++) { r -= pesos[i]; if (r <= 0) return pinturas[i]; } return pinturas[0]; };
  const inicio = new Date('2026-10-15T08:00:00-05:00').getTime();
  const fechaDia = (d) => new Date(inicio + d * 864e5 + entre(0, 10) * 36e5 + entre(0, 59) * 6e4);

  for (let dia = 0; dia < 30; dia++) {
    const finde = [5, 6].includes(new Date(inicio + dia * 864e5).getDay());
    // Compras directas
    for (let k = 0, n = entre(finde ? 3 : 1, finde ? 7 : 4); k < n; k++) {
      const cli = clientes[entre(0, clientes.length - 1)];
      const lineas = Array.from({ length: entre(1, 3) }, () => ({ p: elegir(), cant: entre(1, 5) }));
      const total = lineas.reduce((s, l) => s + l.cant * l.p.precio_galon, 0);
      const ped = await repo.insert('pedidos', { cliente_id: cli.id, total, estado: rnd() < 0.04 ? 'cancelado' : 'pagado', direccion_envio: 'Sim', created_at: fechaDia(dia).toISOString() });
      for (const l of lineas) await repo.insert('pedido_items', { pedido_id: ped.id, pintura_id: l.p.id, cantidad: l.cant, precio_unitario: l.p.precio_galon, subtotal: l.cant * l.p.precio_galon });
    }
    // Solicitudes de servicio
    for (let k = 0, n = entre(1, finde ? 4 : 3); k < n; k++) {
      const cli = clientes[entre(0, clientes.length - 1)];
      const p = elegir();
      const m2 = Math.round((15 + Math.abs(rnd() + rnd() + rnd() - 1.5) * 90 + rnd() * 20) * 10) / 10;
      const manos = rnd() < 0.75 ? 2 : rnd() < 0.5 ? 1 : 3;
      const c = calcularGalones({ metrosCuadrados: m2, manos, rendimiento: p.rendimiento_m2_gal, desperdicio: config.factorDesperdicio, precioGalon: p.precio_galon });
      const creada = fechaDia(dia);
      const s = { cliente_id: cli.id, pintura_id: p.id, metros_cuadrados: m2, manos, galones: c.galones, costo_pintura: c.costo_estimado, direccion: 'Sim', estado: 'pendiente', pintor_id: null, created_at: creada.toISOString(), aceptada_at: null, completada_at: null };
      const r = rnd();
      const reciente = dia >= 27;
      if (r < 0.07) s.estado = 'cancelada';
      else if (!(reciente && r < 0.5)) {
        const pin = pintores[entre(0, pintores.length - 1)];
        s.pintor_id = pin.id;
        s.aceptada_at = new Date(creada.getTime() + (0.5 + rnd() * rnd() * 30) * 36e5).toISOString();
        s.estado = reciente ? (rnd() < 0.5 ? 'aceptada' : 'en_proceso') : 'completada';
        if (s.estado === 'completada') s.completada_at = new Date(new Date(s.aceptada_at).getTime() + entre(1, 4) * 864e5).toISOString();
        s._hab = pin.habilidad;
      }
      const hab = s._hab; delete s._hab;
      const sol = await repo.insert('solicitudes', s);
      if (sol.estado === 'completada' && rnd() < 0.85) {
        const x = rnd();
        const punt = x < hab ? (rnd() < 0.6 ? 5 : 4) : x < hab + (1 - hab) * 0.6 ? 3 : rnd() < 0.6 ? 2 : 1;
        await repo.insert('calificaciones', { solicitud_id: sol.id, cliente_id: sol.cliente_id, pintor_id: sol.pintor_id, puntuacion: punt, comentario: null });
      }
    }
  }
  return repo;
}

function aCSV(filas) {
  if (!filas.length) return '';
  const cols = Object.keys(filas[0]);
  return [cols.join(','), ...filas.map((f) => cols.map((c) => JSON.stringify(f[c] ?? '')).join(','))].join('\n') + '\n';
}

(async () => {
  const repo = simular ? await escenarioSimulado() : createRepo();
  const est = await calcularEstadisticas(repo);
  const solicitudes = await repo.select('solicitudes');
  // Precisión de la calculadora: galones comprados vs. galones teóricos sin desperdicio
  const pinturas = new Map((await repo.select('pinturas')).map((p) => [p.id, p]));
  const holgura = solicitudes.map((s) => {
    const teorico = (s.metros_cuadrados * s.manos) / pinturas.get(s.pintura_id).rendimiento_m2_gal;
    return Math.round(((s.galones - teorico) / teorico) * 1000) / 10;
  });
  est.holgura_calculadora_pct = { media: Math.round((holgura.reduce((a, b) => a + b, 0) / holgura.length) * 10) / 10, min: Math.min(...holgura), max: Math.max(...holgura) };
  est.metadatos = { fuente: simular ? 'simulación reproducible (semilla 2026, 30 días, 40 clientes, 6 pintores)' : 'base de datos Supabase', generado: new Date().toISOString() };

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'resultados.json'), JSON.stringify(est, null, 2));
  fs.writeFileSync(path.join(OUT, 'solicitudes.csv'), aCSV(solicitudes.map(({ direccion, descripcion, ...s }) => s)));
  fs.writeFileSync(path.join(OUT, 'ventas_por_dia.csv'), aCSV(est.ventas_por_dia));
  fs.writeFileSync(path.join(OUT, 'ranking_pintores.csv'), aCSV(est.ranking_pintores));
  console.log(`Fuente: ${est.metadatos.fuente}`);
  console.log(JSON.stringify(est.resumen, null, 2));
  console.log('Archivos en docs/estadisticas/. Gráficos: python scripts/graficos.py');
})().catch((e) => { console.error(e); process.exit(1); });
