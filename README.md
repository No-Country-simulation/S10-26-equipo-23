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

   | Variable           | Valor                                                                                         |
   | ------------------ | --------------------------------------------------------------------------------------------- |
   | `DATABASE_URL`     | Conexión a tu PostgreSQL: `postgresql://USUARIO:CLAVE@localhost:5432/repusense`               |
   | `PORT`             | Puerto del backend (por defecto `3000`)                                                       |
   | `LOG_LEVEL`        | Nivel de detalle de los logs (por defecto `info`)                                             |
   | `SCRAPER_DIR`      | Ruta absoluta a la carpeta `scrapping`                                                        |
   | `SCRAPER_PYTHON`   | Ruta absoluta al Python del entorno virtual: `...\scrapping\.venv\Scripts\python.exe`         |
   | `SCRAPER_NOTEBOOK` | `11_scraping_leads_maps.ipynb`                                                                |
   | `GEMINI_API_KEY`   | Clave de Gemini                                                                               |
   | `GEMINI_MODELO`    | Modelo de Gemini que detecta los problemas de cada lead (por defecto `gemini-3.5-flash-lite`) |

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

3. Pulsa **Importar búsquedas**. Se crea una búsqueda por rubro y queda en curso mientras Gemini detecta los problemas de sus leads y al terminar pasa a completada.
