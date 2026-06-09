# TLA People Service Management

Aplicacion administrativa React + TypeScript + Vite + Tailwind + Supabase para gestionar branding institucional y preparar el sistema de perfiles ministeriales.

## Incluido

- Login con Google via Supabase Auth.
- Layout responsive con sidebar, header y dashboard.
- Seccion admin **Configuracion de Organizacion**.
- Branding global para logo, nombre, direccion y telefono.
- Upload y reemplazo de logo en Supabase Storage.
- Migracion SQL para `users`, `organization_settings`, RLS y bucket `organization-assets`.
- Modo demo automatico cuando faltan variables de Supabase.

## Configuracion

1. Instala dependencias:

```bash
npm install
```

2. Crea `.env` desde `.env.example`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

3. Ejecuta la migracion en Supabase:

```bash
supabase db push
```

Tambien puedes copiar el SQL de `supabase/migrations/0001_organization_settings.sql` y ejecutarlo en el SQL editor de Supabase.

4. Activa Google como provider en Supabase Auth.

5. Crea el primer administrador despues de que el usuario inicie sesion con Google. Usa el `id` de `auth.users`:

```sql
insert into public.users (id, full_name, email, role)
values (
  'AUTH_USER_ID',
  'Nombre Admin',
  'admin@example.com',
  'admin'
);
```

## Desarrollo

```bash
npm run dev
```

## Nota de permisos

La app lee el rol desde `public.users`. Si un usuario entra con Google pero no existe en esa tabla, vera una pantalla de acceso pendiente.

Si `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` no existen, la app entra en modo demo con `osvaldo801@gmail.com` como administrador.
