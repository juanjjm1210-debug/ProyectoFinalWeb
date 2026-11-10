# RootTask

Organizador personal para crear una cuenta y guardar tareas con categoría, fecha límite y estado.

## Requisitos

- Node.js 20 o posterior
- npm

## Desarrollo local

```powershell
npm install
npm run dev
```

Abre la URL que muestra Vite (normalmente `http://localhost:5173`). Vite reenvía `/api` al servidor Express en el puerto 3000. La base SQLite se crea en `server/data/roottask.sqlite`.

En local, RootTask sigue usando SQLite automáticamente. Para probar con PostgreSQL, configura `DATABASE_URL` en el entorno del servidor antes de arrancarlo; el esquema se crea al iniciar.

## Producción local

```powershell
npm run build
$env:NODE_ENV = "production"
$env:SESSION_SECRET = "reemplazar-por-un-secreto-aleatorio-largo"
$env:DATABASE_URL = "cadena-de-conexion-postgresql"
npm start
```

Express sirve el frontend compilado desde `public` y la API desde el mismo origen. En producción, configura `NODE_ENV=production`, un `SESSION_SECRET` aleatorio y privado, y `DATABASE_URL` con una conexión PostgreSQL persistente. El backend se niega a iniciar en producción si falta `DATABASE_URL`, para evitar guardar cuentas en el disco temporal del hosting.

## Base de datos alojada sin costo

SQLite no cobra licencias ni requiere una cuenta de proveedor: en desarrollo, la base vive en `server/data/roottask.sqlite`. Ejecutar la aplicación en tu computadora no implica cargos por uso de base de datos.

Para publicar sin depender del disco temporal de Vercel, RootTask usa PostgreSQL en Neon. En su plan Free actual, Neon indica que no requiere tarjeta para empezar y limita cada proyecto a 1 GB de almacenamiento y 100 CU-horas al mes; el cómputo entra en reposo tras cinco minutos de inactividad. Son límites sujetos a cambios del proveedor. Revisa [los precios y límites de Neon](https://neon.com/pricing).

## Publicar en Vercel

Vercel ejecuta Express como una función y sirve los archivos estáticos que genera Vite desde `public`. Para desplegar:

1. Crea un proyecto PostgreSQL en Neon y copia la cadena de conexión **pooled** desde **Connect**. Mantén esa cadena privada; no la pegues en el código, el chat ni la subas a GitHub.
2. Crea un repositorio **privado** vacío en GitHub. Desde la terminal de PowerShell en la carpeta del proyecto, publica el código:

   ```powershell
   git init
   git add .
   git commit -m "Prepare RootTask for deployment"
   git branch -M main
   git remote add origin https://github.com/<usuario>/<repositorio>.git
   git push -u origin main
   ```

3. En Vercel, importa el repositorio privado de GitHub. Deja el directorio raíz como `./`; el proyecto incluye el comando `vercel-build`.
4. Antes de desplegar, agrega en **Project Settings → Environment Variables**:
   - `DATABASE_URL`: cadena pooled de Neon.
   - `SESSION_SECRET`: un valor aleatorio, largo y privado (por ejemplo, genera uno con `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`).
   - `NODE_ENV`: `production`.
   Aplícalas a Production (y también a Preview si vas a probar las vistas previas).
5. Despliega y abre el dominio que Vercel asigna. Prueba creando una cuenta, iniciando sesión y agregando una tarea. La ruta de verificación del backend es `/api/health`.

La aplicación crea las tablas de PostgreSQL al arrancar. Vercel no borra los datos guardados en Neon al reconstruir o desplegar el sitio: la base de datos es independiente del hosting. La SQLite local **no se copia automáticamente** a Neon; las cuentas y tareas que ya estaban en tu computadora siguen en `server/data/roottask.sqlite`. Neon conserva los datos dentro de los límites de su plan gratuito, que no ofrece garantías de disponibilidad para producción.

Puedes revisar la base remota con DBeaver Community u otro cliente PostgreSQL usando la cadena de conexión privada de Neon. DB Browser for SQLite solo abre la base local.

## Funcionalidad

- Registro e inicio de sesión; las contraseñas se almacenan derivadas con `scrypt`.
- Registro personalizado por ocupación (estudio, trabajo, independiente, ambos u otra) y área profesional; el panel adapta sus textos y ejemplos al perfil.
- Sesión firmada en cookie `HttpOnly`, con `SameSite=Lax` y uso de `Secure` en producción.
- Crear, listar, cambiar de estado (pendiente, en progreso o completada) y eliminar tareas. Cada persona solo puede acceder a sus propias tareas.
- Las tareas pendientes permanecen visibles hasta que se marcan como completadas; las fechas vencidas se destacan al volver al organizador.
- Validación de campos en el navegador y en la API.
- No se usa una hora de aviso ni se envían notificaciones del navegador.

## API principal

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/tasks`, `POST /api/tasks`, `PATCH /api/tasks/:id`, `DELETE /api/tasks/:id`
