-- =====================================================================
--  Pasar de datos de ejemplo a uso real (ejecutar en Supabase > SQL Editor)
--  1) Primero cree SU cuenta desde la aplicación (botón de usuario > Crear cuenta).
--  2) Cambie el correo de abajo por el suyo y ejecute TODO el script.
-- =====================================================================

-- Convierte su cuenta en administradora
update usuarios set rol = 'admin' where email = lower('sebasj551@gmail.com');

-- Elimina los usuarios de demostración (@pintuco.test y @cliente.test) y todo su historial
delete from mensajes_chat  where usuario_id in (select id from usuarios where email like '%@pintuco.test' or email like '%@cliente.test');
delete from calificaciones where cliente_id in (select id from usuarios where email like '%@pintuco.test' or email like '%@cliente.test')
                              or pintor_id  in (select id from usuarios where email like '%@pintuco.test' or email like '%@cliente.test');
delete from solicitudes    where cliente_id in (select id from usuarios where email like '%@pintuco.test' or email like '%@cliente.test')
                              or pintor_id  in (select id from usuarios where email like '%@pintuco.test' or email like '%@cliente.test');
delete from pedido_items   where pedido_id  in (select p.id from pedidos p join usuarios u on u.id = p.cliente_id where u.email like '%@pintuco.test' or u.email like '%@cliente.test');
delete from pedidos        where cliente_id in (select id from usuarios where email like '%@pintuco.test' or email like '%@cliente.test');
delete from usuarios       where email like '%@pintuco.test' or email like '%@cliente.test';

-- Verificación: debe aparecer su cuenta con rol admin
select id, nombre, email, rol from usuarios order by id;
