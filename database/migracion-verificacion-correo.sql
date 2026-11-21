-- Ejecutar UNA vez en Supabase (SQL Editor) sobre la base ya existente.
-- Los usuarios actuales quedan como verificados (default true); solo los nuevos registros públicos pasan por el código.
alter table usuarios
  add column if not exists email_verificado    boolean     not null default true,
  add column if not exists codigo_verificacion text,
  add column if not exists codigo_expira       timestamptz,
  add column if not exists codigo_intentos     integer     not null default 0,
  add column if not exists codigo_enviado      timestamptz;
