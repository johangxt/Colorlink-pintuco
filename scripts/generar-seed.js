// Genera database/seed.sql a partir de src/db/seedData.js (con contraseñas cifradas)
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { DEMO_PASSWORD, usuarios, pinturas } = require('../src/db/seedData');

const q = (v) => (v === null || v === undefined ? 'null' : typeof v === 'number' ? v : `'${String(v).replace(/'/g, "''")}'`);
const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);

let sql = `-- Datos de ejemplo. Contraseña de todos los usuarios: ${DEMO_PASSWORD}\n-- Generado con: node scripts/generar-seed.js\n\n`;
sql += 'insert into usuarios (nombre, email, password_hash, rol, telefono) values\n';
sql += usuarios.map((u) => `  (${q(u.nombre)}, ${q(u.email)}, ${q(hash)}, ${q(u.rol)}, ${q(u.telefono)})`).join(',\n') + ';\n\n';
const cols = ['nombre', 'tipo', 'acabado', 'uso', 'color', 'color_hex', 'precio_galon', 'rendimiento_m2_gal', 'stock_galones', 'stock_minimo', 'descripcion'];
sql += `insert into pinturas (${cols.join(', ')}) values\n`;
sql += pinturas.map((p) => `  (${cols.map((c) => q(p[c])).join(', ')})`).join(',\n') + ';\n';

fs.writeFileSync(path.join(__dirname, '..', 'database', 'seed.sql'), sql);
console.log('database/seed.sql generado');
