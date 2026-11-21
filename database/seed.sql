-- Datos de ejemplo. Contraseña de todos los usuarios: Pintuco123*
-- Generado con: node scripts/generar-seed.js

insert into usuarios (nombre, email, password_hash, rol, telefono) values
  ('Administrador Pintuco', 'admin@pintuco.test', '$2b$10$GcUNTgWhwhwM8O/WlSWNaegvlXEJeD294ZHlo/vXXIsfMBQhQsHWe', 'admin', '3000000001'),
  ('Carlos Pintor', 'carlos@pintuco.test', '$2b$10$GcUNTgWhwhwM8O/WlSWNaegvlXEJeD294ZHlo/vXXIsfMBQhQsHWe', 'pintor', '3000000002'),
  ('Laura Pintora', 'laura@pintuco.test', '$2b$10$GcUNTgWhwhwM8O/WlSWNaegvlXEJeD294ZHlo/vXXIsfMBQhQsHWe', 'pintor', '3000000003'),
  ('Ana Cliente', 'ana@cliente.test', '$2b$10$GcUNTgWhwhwM8O/WlSWNaegvlXEJeD294ZHlo/vXXIsfMBQhQsHWe', 'cliente', '3000000004'),
  ('Pedro Cliente', 'pedro@cliente.test', '$2b$10$GcUNTgWhwhwM8O/WlSWNaegvlXEJeD294ZHlo/vXXIsfMBQhQsHWe', 'cliente', '3000000005');

insert into pinturas (nombre, tipo, acabado, uso, color, color_hex, precio_galon, rendimiento_m2_gal, stock_galones, stock_minimo, descripcion) values
  ('Vinilo Tipo 1 Blanco Hueso', 'vinilo', 'mate', 'interior', 'Blanco hueso', '#F2EBDD', 98000, 40, 60, 10, 'Vinilo lavable de alta cubrición para muros interiores.'),
  ('Vinilo Tipo 1 Gris Perla', 'vinilo', 'mate', 'interior', 'Gris perla', '#C9CCCE', 102000, 40, 35, 8, 'Color neutro, ideal para salas y oficinas.'),
  ('Vinilo Tipo 2 Azul Cielo', 'vinilo', 'mate', 'interior', 'Azul cielo', '#8EC5E8', 62000, 30, 25, 8, 'Vinilo económico para habitaciones y cielos rasos.'),
  ('Vinilo Fachadas Terracota', 'vinilo', 'satinado', 'exterior', 'Terracota', '#C4623A', 135000, 35, 20, 6, 'Resistente a la lluvia y a los rayos UV.'),
  ('Esmalte Sintético Negro', 'esmalte', 'brillante', 'mixto', 'Negro', '#1E1E1E', 145000, 45, 18, 5, 'Para puertas, rejas y superficies metálicas o de madera.'),
  ('Esmalte Base Agua Blanco', 'esmalte', 'satinado', 'interior', 'Blanco', '#FFFFFF', 128000, 40, 4, 5, 'Bajo olor, secado rápido. Ideal para carpintería.'),
  ('Impermeabilizante Techos Rojo', 'impermeabilizante', 'mate', 'exterior', 'Rojo teja', '#9E2B25', 158000, 12, 30, 8, 'Protección contra filtraciones en techos y terrazas.'),
  ('Anticorrosivo Gris', 'anticorrosivo', 'mate', 'mixto', 'Gris', '#7D7F80', 118000, 35, 3, 5, 'Base protectora para metales antes del esmalte.');
