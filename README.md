# S10-26-equipo-23

RepuSense - Radar de Reputación en Crisis

## Cómo ejecutar el proyecto

### Requisitos

- [Node.js](https://nodejs.org) 24.15 o superior
- [PostgreSQL](https://www.postgresql.org/download/) en ejecución
- [Python](https://www.python.org/downloads/) 3.14
- Google Chrome (lo usa el scraper)

### 1. Scraper (Python)

```bash
cd scrapping
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Backend (NestJS + Prisma)

1. Crea una base de datos vacía en PostgreSQL, por ejemplo `repusense`.
2. Copia el archivo de variables de entorno y complétalo:

   ```bash
   cd backend
   copy .env.example .env
   ```

   | Variable           | Valor                                                                                                  |
   | ------------------ | ------------------------------------------------------------------------------------------------------ |
   | `DATABASE_URL`     | Conexión a tu PostgreSQL: `postgresql://USUARIO:CLAVE@localhost:5432/repusense`                        |
   | `PORT`             | Puerto del backend (por defecto `3000`)                                                                |
   | `LOG_LEVEL`        | Nivel de detalle de los logs (por defecto `info`)                                                      |
   | `SCRAPER_DIR`      | Ruta absoluta a la carpeta `scrapping`                                                                 |
   | `SCRAPER_PYTHON`   | Ruta absoluta al Python del entorno virtual: `...\scrapping\.venv\Scripts\python.exe`                  |
   | `SCRAPER_NOTEBOOK` | `11_scraping_leads_maps.ipynb`                                                                         |
   | `GEMINI_API_KEY`   | Clave de Gemini                                                                                        |
   | `GEMINI_MODELO`    | Modelo de Gemini que detecta los problemas y redacta los correos (por defecto `gemini-3.5-flash-lite`) |

   Opcionales, para los correos de primer contacto que redacta Gemini (si no las defines se usan los valores por defecto):

   | Variable                 | Valor                                                                                   |
   | ------------------------ | --------------------------------------------------------------------------------------- |
   | `CORREOS_REMITENTE`      | Nombre de quien firma el correo (por defecto `Equipo RepuSense`)                        |
   | `CORREOS_EMPRESA`        | Nombre de la empresa (por defecto `RepuSense`)                                          |
   | `CORREOS_OFERTA`         | Qué servicio se ofrece, en una o dos frases                                             |
   | `CORREOS_LLAMADA_ACCION` | Qué se le pide al negocio (por defecto `Agendar una llamada de 15 minutos esta semana`) |
   | `CORREOS_TONO`           | Tono del correo (por defecto el de `GENERA_MAILS.py`)                                   |
   | `CORREOS_FIRMA`          | Firma, con `\n` entre líneas (por defecto el remitente y la empresa)                    |

3. Instala las dependencias, genera el cliente de Prisma y crea las tablas:

   ```bash
   npm install
   npx prisma generate --config prisma7.config.ts
   npx prisma migrate deploy --config prisma7.config.ts
   npx prisma db seed --config prisma7.config.ts
   ```

4. Levanta el servidor:

   ```bash
   npm run start:dev
   ```

   La API queda en `http://localhost:3000/api` y la documentación Swagger en `http://localhost:3000/api/docs`.

### 3. Frontend (React + Vite)

En otra terminal, con el backend corriendo:

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`. Las peticiones a `/api` se redirigen al backend en el puerto 3000.

### 4. Cargar datos de ejemplo (opcional)

Para ver la app con datos sin ejecutar el scraper:

1. En la pantalla de búsquedas, abre **Importar CSV**.
2. Elige los archivos de la carpeta `importar/`:

   | Campo    | Archivo                  |
   | -------- | ------------------------ |
   | Negocios | `negocios_11_limpio.csv` |
   | Fichas   | `fichas_11_limpio.csv`   |
   | Reseñas  | `resenas_11_limpio.csv`  |
   | Leads    | `leads_11_limpio.csv`    |

3. Pulsa **Importar búsquedas**. Se crea una búsqueda por rubro y queda en curso mientras Gemini detecta los problemas de sus leads y redacta su correo de primer contacto. Al terminar pasa a completada.

### Scripts de Gemini

El backend ejecuta los scripts del equipo de IA con el Python del scraper (`SCRAPER_PYTHON`) y la clave de `backend/.env`. No hace falta completar sus archivos `*_inputs.json`:

| Carpeta              | Script                 | Qué hace en la app                                                                                      |
| -------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `detecta problemas/` | `DETECTA_PROBLEMAS.py` | Clasifica las reseñas negativas de cada lead en hasta 3 problemas                                       |
| `genera mails/`      | `GENERA_MAILS.py`      | Redacta el correo de primer contacto de cada lead. Se ve en el detalle del negocio y en el CSV de leads |

Los correos son borradores: revísalos antes de enviarlos. La app no envía correos.

Si Gemini no responde al redactar los correos (por ejemplo, error 503 por saturación), la búsqueda se completa igual con los correos que sí se redactaron. Los que falten se piden después desde el detalle del negocio con **Redactar correo**, que también sirve para volver a redactar uno que no convenza.

### Si ya tenías el proyecto instalado

Después de actualizar el repositorio, pon al día el backend antes de levantarlo (hay una tabla nueva para los correos):

```bash
cd backend
npm install
npx prisma generate --config prisma7.config.ts
npx prisma migrate deploy --config prisma7.config.ts
```
