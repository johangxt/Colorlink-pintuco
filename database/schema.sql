-- =====================================================================
--  Pintuco App - Esquema de base de datos (PostgreSQL / Supabase)
--  Ejecutar en: Supabase > SQL Editor > New query > Run
--  Después ejecutar database/seed.sql para cargar datos de ejemplo.
-- =====================================================================

-- Limpieza (permite re-ejecutar el script)
drop table if exists mensajes_chat cascade;
drop table if exists calificaciones cascade;
drop table if exists solicitudes cascade;
drop table if exists pedido_items cascade;
drop table if exists pedidos cascade;
drop table if exists pinturas cascade;
drop table if exists usuarios cascade;

-- ---------------------------------------------------------------------
-- USUARIOS: clientes, pintores y administradores
-- ---------------------------------------------------------------------
create table usuarios (
  id            bigint generated always as identity primary key,
  nombre        varchar(120) not null,
  email         varchar(160) not null unique,
  password_hash text         not null,
  rol           varchar(20)  not null check (rol in ('cliente', 'pintor', 'admin')),
  telefono      varchar(30),
  activo        boolean      not null default true,
  created_at    timestamptz  not null default now()
);

-- ---------------------------------------------------------------------
-- PINTURAS: inventario gestionado por el administrador
-- rendimiento_m2_gal = metros cuadrados que cubre 1 galón en 1 mano
-- ---------------------------------------------------------------------
create table pinturas (
  id                 bigint generated always as identity primary key,
  nombre             varchar(150) not null,
  tipo               varchar(40)  not null,          -- vinilo, esmalte, impermeabilizante, anticorrosivo...
  acabado            varchar(30)  not null,          -- mate, satinado, brillante
  uso                varchar(20)  not null check (uso in ('interior', 'exterior', 'mixto')),
  color              varchar(60)  not null,
  color_hex          varchar(7)   not null default '#FFFFFF',
  precio_galon       numeric(12,2) not null check (precio_galon >= 0),
  rendimiento_m2_gal numeric(6,2)  not null check (rendimiento_m2_gal > 0),
  stock_galones      integer      not null default 0 check (stock_galones >= 0),
  stock_minimo       integer      not null default 5 check (stock_minimo >= 0),
  descripcion        text,
  activo             boolean      not null default true,
  created_at         timestamptz  not null default now()
);

-- ---------------------------------------------------------------------
-- PEDIDOS: compras directas de pintura realizadas por el cliente
-- ---------------------------------------------------------------------
create table pedidos (
  id               bigint generated always as identity primary key,
  cliente_id       bigint       not null references usuarios(id),
  total            numeric(14,2) not null check (total >= 0),
  estado           varchar(20)  not null default 'pagado'
                   check (estado in ('pagado', 'enviado', 'entregado', 'cancelado')),
  direccion_envio  text,
  created_at       timestamptz  not null default now()
);

create table pedido_items (
  id              bigint generated always as identity primary key,
  pedido_id       bigint        not null references pedidos(id) on delete cascade,
  pintura_id      bigint        not null references pinturas(id),
  cantidad        integer       not null check (cantidad > 0),
  precio_unitario numeric(12,2) not null,
  subtotal        numeric(14,2) not null
);

-- ---------------------------------------------------------------------
-- SOLICITUDES: servicio de pintura por m² (cliente -> pintor)
-- Flujo: pendiente -> aceptada -> en_proceso -> completada
--        pendiente -> cancelada
-- ---------------------------------------------------------------------
create table solicitudes (
  id                bigint generated always as identity primary key,
  cliente_id        bigint        not null references usuarios(id),
  pintor_id         bigint        references usuarios(id),
  pintura_id        bigint        not null references pinturas(id),
  metros_cuadrados  numeric(10,2) not null check (metros_cuadrados > 0),
  manos             integer       not null default 2 check (manos between 1 and 5),
  galones           integer       not null check (galones > 0),
  costo_pintura     numeric(14,2) not null,
  direccion         text          not null,
  descripcion       text,
  fecha_deseada     date,
  estado            varchar(20)   not null default 'pendiente'
                    check (estado in ('pendiente', 'aceptada', 'en_proceso', 'completada', 'cancelada')),
  created_at        timestamptz   not null default now(),
  aceptada_at       timestamptz,
  completada_at     timestamptz
);

-- ---------------------------------------------------------------------
-- CALIFICACIONES: el cliente califica al pintor (1 por solicitud)
-- ---------------------------------------------------------------------
create table calificaciones (
  id            bigint generated always as identity primary key,
  solicitud_id  bigint      not null unique references solicitudes(id),
  cliente_id    bigint      not null references usuarios(id),
  pintor_id     bigint      not null references usuarios(id),
  puntuacion    integer     not null check (puntuacion between 1 and 5),
  comentario    text,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- MENSAJES_CHAT: historial del chatbot con IA
-- ---------------------------------------------------------------------
create table mensajes_chat (
  id          bigint generated always as identity primary key,
  usuario_id  bigint      not null references usuarios(id),
  rol         varchar(12) not null check (rol in ('user', 'assistant')),
  contenido   text        not null,
  created_at  timestamptz not null default now()
);

-- Índices para las consultas más frecuentes
create index idx_solicitudes_estado    on solicitudes(estado);
create index idx_solicitudes_cliente   on solicitudes(cliente_id);
create index idx_solicitudes_pintor    on solicitudes(pintor_id);
create index idx_pedidos_cliente       on pedidos(cliente_id);
create index idx_items_pedido          on pedido_items(pedido_id);
create index idx_calificaciones_pintor on calificaciones(pintor_id);
create index idx_chat_usuario          on mensajes_chat(usuario_id);

-- ---------------------------------------------------------------------
-- Seguridad: el backend Express usa la SERVICE ROLE KEY (nunca expuesta
-- al navegador). Se activa RLS sin políticas para que la clave pública
-- (anon) NO pueda leer ni escribir directamente las tablas.
-- ---------------------------------------------------------------------
alter table usuarios       enable row level security;
alter table pinturas       enable row level security;
alter table pedidos        enable row level security;
alter table pedido_items   enable row level security;
alter table solicitudes    enable row level security;
alter table calificaciones enable row level security;
alter table mensajes_chat  enable row level security;

-- Vista útil para reportes: promedio de calificación por pintor
create or replace view v_ranking_pintores with (security_invoker = true) as
select u.id as pintor_id,
       u.nombre,
       count(c.id)                    as total_calificaciones,
       round(avg(c.puntuacion)::numeric, 2) as promedio
from usuarios u
left join calificaciones c on c.pintor_id = u.id
where u.rol = 'pintor'
group by u.id, u.nombre
order by promedio desc nulls last;
