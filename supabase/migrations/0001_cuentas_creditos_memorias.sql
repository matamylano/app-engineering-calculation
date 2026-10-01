-- Cuentas, créditos, memorias y pagos de la Suite de Ingeniería.
-- Solo el servidor de la app accede (con la service role key), así que RLS
-- queda activo sin políticas: nadie entra con la llave pública.

create table if not exists perfiles (
  id uuid primary key,
  email text not null unique,
  creado_en timestamptz not null default now()
);

create table if not exists movimientos_credito (
  id bigserial primary key,
  usuario_id uuid not null references perfiles (id),
  cantidad integer not null,
  motivo text not null,
  referencia text not null unique,
  creado_en timestamptz not null default now()
);
create index if not exists movimientos_credito_usuario on movimientos_credito (usuario_id);

create table if not exists memorias (
  folio text primary key,
  usuario_id uuid not null references perfiles (id),
  estudio text not null,
  estado text not null check (estado in ('borrador', 'en_revision', 'aprobada', 'rechazada')),
  version integer not null,
  creada_en timestamptz not null,
  actualizada_en timestamptz not null,
  datos jsonb not null,
  firma_pagada boolean not null default false,
  telefono_aviso text,
  notas_revision text,
  firma jsonb
);
create index if not exists memorias_usuario on memorias (usuario_id, creada_en desc);
create index if not exists memorias_estado on memorias (estado, actualizada_en);

-- Una memoria aprobada ya no cambia.
create or replace function memorias_congeladas() returns trigger language plpgsql as $$
begin
  if old.estado = 'aprobada' then
    raise exception 'La memoria % ya está aprobada y no se puede cambiar', old.folio;
  end if;
  return new;
end $$;
drop trigger if exists memorias_congeladas on memorias;
create trigger memorias_congeladas before update or delete on memorias
  for each row execute function memorias_congeladas();

create table if not exists pagos (
  id text primary key,
  usuario_id uuid not null references perfiles (id),
  tipo text not null check (tipo in ('creditos', 'firma')),
  monto_centavos integer not null,
  moneda text not null,
  paquete text,
  folio text references memorias (folio),
  creado_en timestamptz not null default now()
);

alter table perfiles enable row level security;
alter table movimientos_credito enable row level security;
alter table memorias enable row level security;
alter table pagos enable row level security;

create or replace function asegurar_usuario(p_id uuid, p_email text, p_creditos integer)
returns void language sql as $$
  insert into perfiles (id, email) values (p_id, p_email) on conflict (id) do nothing;
  insert into movimientos_credito (usuario_id, cantidad, motivo, referencia)
    values (p_id, p_creditos, 'bienvenida', 'bienvenida:' || p_id)
    on conflict (referencia) do nothing;
$$;

create or replace function saldo_creditos(p_usuario uuid)
returns integer language sql stable as $$
  select coalesce(sum(cantidad), 0)::integer from movimientos_credito where usuario_id = p_usuario;
$$;

create or replace function sumar_creditos(p_usuario uuid, p_cantidad integer, p_motivo text, p_referencia text)
returns void language sql as $$
  insert into movimientos_credito (usuario_id, cantidad, motivo, referencia)
    values (p_usuario, p_cantidad, p_motivo, p_referencia)
    on conflict (referencia) do nothing;
$$;

-- Gasta un crédito y crea la memoria en la misma transacción.
create or replace function crear_memoria_con_credito(p_memoria jsonb)
returns text language plpgsql as $$
declare
  v_usuario uuid := (p_memoria ->> 'usuario_id')::uuid;
begin
  perform pg_advisory_xact_lock(hashtext(v_usuario::text));
  if saldo_creditos(v_usuario) < 1 then
    return 'sin-creditos';
  end if;
  insert into movimientos_credito (usuario_id, cantidad, motivo, referencia)
    values (v_usuario, -1, 'memoria', 'memoria:' || (p_memoria ->> 'folio'));
  insert into memorias (folio, usuario_id, estudio, estado, version, creada_en, actualizada_en, datos, firma_pagada)
    values (
      p_memoria ->> 'folio', v_usuario, p_memoria ->> 'estudio', p_memoria ->> 'estado',
      (p_memoria ->> 'version')::integer, (p_memoria ->> 'creada_en')::timestamptz,
      (p_memoria ->> 'actualizada_en')::timestamptz, p_memoria -> 'datos',
      coalesce((p_memoria ->> 'firma_pagada')::boolean, false)
    );
  return 'ok';
end $$;

revoke all on function asegurar_usuario(uuid, text, integer) from public, anon, authenticated;
revoke all on function saldo_creditos(uuid) from public, anon, authenticated;
revoke all on function sumar_creditos(uuid, integer, text, text) from public, anon, authenticated;
revoke all on function crear_memoria_con_credito(jsonb) from public, anon, authenticated;

grant select, insert, update on perfiles, movimientos_credito, memorias, pagos to service_role;
grant usage on sequence movimientos_credito_id_seq to service_role;
grant execute on function asegurar_usuario(uuid, text, integer) to service_role;
grant execute on function saldo_creditos(uuid) to service_role;
grant execute on function sumar_creditos(uuid, integer, text, text) to service_role;
grant execute on function crear_memoria_con_credito(jsonb) to service_role;
