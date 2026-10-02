-- Perfil del ingeniero firmante: sus datos y las imágenes de firma y sello
-- (data URL PNG o JPEG) que se copian a cada memoria que aprueba.

create table if not exists firmantes (
  id uuid primary key references perfiles (id),
  nombre text not null,
  cedula text not null,
  registro text not null,
  firma_imagen text check (firma_imagen is null or length(firma_imagen) <= 400000),
  sello_imagen text check (sello_imagen is null or length(sello_imagen) <= 400000),
  actualizado_en timestamptz not null default now()
);

alter table firmantes enable row level security;
grant select, insert, update on firmantes to service_role;
