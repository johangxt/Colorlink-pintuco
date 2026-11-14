// Datos de ejemplo compartidos por el modo "memory" y por database/seed.sql
// Contraseña de todos los usuarios de demostración: Pintuco123*
const DEMO_PASSWORD = 'Pintuco123*';

const usuarios = [
  { nombre: 'Administrador Pintuco', email: 'admin@pintuco.test', rol: 'admin', telefono: '3000000001' },
  { nombre: 'Carlos Pintor', email: 'carlos@pintuco.test', rol: 'pintor', telefono: '3000000002' },
  { nombre: 'Laura Pintora', email: 'laura@pintuco.test', rol: 'pintor', telefono: '3000000003' },
  { nombre: 'Ana Cliente', email: 'ana@cliente.test', rol: 'cliente', telefono: '3000000004' },
  { nombre: 'Pedro Cliente', email: 'pedro@cliente.test', rol: 'cliente', telefono: '3000000005' },
];

const pinturas = [
  { nombre: 'Vinilo Tipo 1 Blanco Hueso', tipo: 'vinilo', acabado: 'mate', uso: 'interior', color: 'Blanco hueso', color_hex: '#F2EBDD', precio_galon: 98000, rendimiento_m2_gal: 40, stock_galones: 60, stock_minimo: 10, descripcion: 'Vinilo lavable de alta cubrición para muros interiores.' },
  { nombre: 'Vinilo Tipo 1 Gris Perla', tipo: 'vinilo', acabado: 'mate', uso: 'interior', color: 'Gris perla', color_hex: '#C9CCCE', precio_galon: 102000, rendimiento_m2_gal: 40, stock_galones: 35, stock_minimo: 8, descripcion: 'Color neutro, ideal para salas y oficinas.' },
  { nombre: 'Vinilo Tipo 2 Azul Cielo', tipo: 'vinilo', acabado: 'mate', uso: 'interior', color: 'Azul cielo', color_hex: '#8EC5E8', precio_galon: 62000, rendimiento_m2_gal: 30, stock_galones: 25, stock_minimo: 8, descripcion: 'Vinilo económico para habitaciones y cielos rasos.' },
  { nombre: 'Vinilo Fachadas Terracota', tipo: 'vinilo', acabado: 'satinado', uso: 'exterior', color: 'Terracota', color_hex: '#C4623A', precio_galon: 135000, rendimiento_m2_gal: 35, stock_galones: 20, stock_minimo: 6, descripcion: 'Resistente a la lluvia y a los rayos UV.' },
  { nombre: 'Esmalte Sintético Negro', tipo: 'esmalte', acabado: 'brillante', uso: 'mixto', color: 'Negro', color_hex: '#1E1E1E', precio_galon: 145000, rendimiento_m2_gal: 45, stock_galones: 18, stock_minimo: 5, descripcion: 'Para puertas, rejas y superficies metálicas o de madera.' },
  { nombre: 'Esmalte Base Agua Blanco', tipo: 'esmalte', acabado: 'satinado', uso: 'interior', color: 'Blanco', color_hex: '#FFFFFF', precio_galon: 128000, rendimiento_m2_gal: 40, stock_galones: 4, stock_minimo: 5, descripcion: 'Bajo olor, secado rápido. Ideal para carpintería.' },
  { nombre: 'Impermeabilizante Techos Rojo', tipo: 'impermeabilizante', acabado: 'mate', uso: 'exterior', color: 'Rojo teja', color_hex: '#9E2B25', precio_galon: 158000, rendimiento_m2_gal: 12, stock_galones: 30, stock_minimo: 8, descripcion: 'Protección contra filtraciones en techos y terrazas.' },
  { nombre: 'Anticorrosivo Gris', tipo: 'anticorrosivo', acabado: 'mate', uso: 'mixto', color: 'Gris', color_hex: '#7D7F80', precio_galon: 118000, rendimiento_m2_gal: 35, stock_galones: 3, stock_minimo: 5, descripcion: 'Base protectora para metales antes del esmalte.' },
];

module.exports = { DEMO_PASSWORD, usuarios, pinturas };
