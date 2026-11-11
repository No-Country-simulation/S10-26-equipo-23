# GENERA_MAILS

Redacta con Gemini un **correo de primer contacto** (cold email) para cada negocio,
ofreciendo servicios para mejorar su reputación online. Usa los datos del negocio
y los problemas detectados en sus reseñas.

## Requisitos

- Python 3.10 o superior
- Una API key propia de [Google AI Studio](https://aistudio.google.com/) (el plan gratuito alcanza)

## Configuración

Copia la plantilla, renómbrala como
`GENERA_MAILS_inputs.json` (junto al script) y completa tus valores:

```json
{
  "API_KEY": "PEGAR_TU_API_KEY_AQUI",
  "MODELO": "gemini-3.5-flash-lite",
  "RUTA_NEGOCIOS": "negocios.csv",
  "RUTA_SALIDA": "mails.csv",
  "REMITENTE": "Tu nombre",
  "EMPRESA": "Nombre de tu empresa",
  "OFERTA": "Ayudamos a negocios locales a gestionar su reputación online...",
  "LLAMADA_ACCION": "Agendar una llamada de 15 minutos esta semana",
  "TAMANO_LOTE": 10,
  "TONO": "profesional, cálido y breve; trato de usted",
  "FIRMA": "Tu nombre\nNombre de tu empresa\ntu@correo.com"
}
```

| Campo | Obligatorio | Descripción |
|---|---|---|
| `API_KEY` | Sí | Tu clave de Google AI Studio. **Cada persona debe usar la suya.** |
| `MODELO` | Sí | Modelo de Gemini a utilizar. |
| `RUTA_NEGOCIOS` | Sí | CSV con los negocios (ver más abajo). |
| `RUTA_SALIDA` | Sí | CSV donde se guardan los correos. |
| `REMITENTE` | Sí | Nombre de quien firma el correo. |
| `EMPRESA` | Sí | Nombre de tu empresa. |
| `OFERTA` | Sí | Qué servicio ofreces, en una o dos frases. Es lo que el correo presenta como propuesta de valor. |
| `LLAMADA_ACCION` | Sí | Qué quieres que haga el negocio al leer el correo (una sola acción simple). |
| `TAMANO_LOTE` | No | Negocios por consulta a Gemini. Por defecto 10. |
| `TONO` | No | Por defecto: "profesional, cálido y breve; trato de usted". |
| `FIRMA` | No | Por defecto: remitente y empresa en dos líneas. |
| `TEXTO_BAJA` | No | Línea para darse de baja (español). Ya trae un texto por defecto. |
| `TEXTO_BAJA_PT` | No | Línea para darse de baja (portugués). Se usa para negocios de Brasil. |

> **Seguridad:** nunca subas `GENERA_MAILS_inputs.json` a un repositorio, ni lo
> compartas por mail o chat. Si usas git, agrégalo al `.gitignore`.
> Si una clave se filtra, revócala en Google AI Studio y genera otra.

## Entrada

Un CSV con una fila por negocio y estas columnas:

| Columna | Contenido |
|---|---|
| `nombre` | Nombre del negocio. |
| `ciudad` | Ciudad. |
| `pais` | País (si es Brasil, el correo se escribe en portugués). |
| `rubro` | Rubro o tipo de negocio. |
| `n_resenas` | Cantidad de reseñas. |
| `rating` | Calificación promedio. |
| `problemas` | Problemas detectados: lista JSON como `["limpieza", "demoras"]` (el formato que genera la fase 1) o categorías separadas por coma. Puede estar vacío o decir `Ninguno`. |

Columnas opcionales, que se copian a la salida: `place_id` y `email`.

```python
negocios = leads.merge(resultados[["place_id", "problemas"]], on="place_id")
negocios[["place_id", "nombre", "ciudad", "pais", "rubro",
          "n_resenas", "rating", "problemas", "email"]].to_csv("negocios.csv", index=False)
```

## Uso

```
python GENERA_MAILS.py                 # procesa todos los negocios
python GENERA_MAILS.py --prueba 10     # solo los 10 primeros, guarda en mails_prueba.csv
python GENERA_MAILS.py --reanudar      # continúa una corrida interrumpida
```

**Recomendación:** empieza siempre con `--prueba` y lee los borradores. Si salen
muy parecidos entre sí o mezclan datos de distintos negocios, baja `TAMANO_LOTE` a 5.

El script envía los negocios a Gemini en lotes (por defecto, 10 por consulta) y
guarda los resultados después de cada lote. Si un lote falla tras varios intentos,
se informa al final y puedes reintentarlo con `--reanudar`.

## Salida

Una fila por negocio, con las columnas:

| Columna | Contenido |
|---|---|
| `id` | Número del negocio en el CSV de entrada (de 1 en adelante). |
| `place_id` | Identificador del negocio (si estaba en la entrada). |
| `email` | Email de contacto (si estaba en la entrada). |
| `nombre`, `ciudad`, `pais` | Datos del negocio. |
| `asunto` | Asunto del correo (máximo 8 palabras). |
| `cuerpo` | Cuerpo del correo, **ya con la firma y la línea de baja incluidas**. |
| `grupo` | Número del lote enviado a Gemini (uso interno). |

> **ADVERTENCIA: el archivo de salida se borra y se vuelve a crear en cada
> corrida del script** (salvo que uses `--reanudar`). Si quieres conservar
> resultados anteriores, copia o renombra el archivo antes de volver a ejecutarlo.

El CSV se guarda con una codificación que Excel abre bien (tildes y ñ).

## Cómo se redactan los correos

El modelo recibe los datos de cada negocio y la información de quién escribe
(remitente, empresa, oferta, llamada a la acción y tono). El prompt establece
estas reglas:

- **Idioma:** el predominante del país del negocio (portugués para Brasil).
- **Formato:** cuerpo de 80 a 130 palabras, asunto breve y sin lenguaje de spam
  (sin signos de exclamación ni palabras como "gratis" o "urgente").
- **Una sola llamada a la acción**, simple.
- **Problemas detectados con tacto:** se mencionan como máximo uno o dos, de forma
  general y como oportunidad de mejora, nunca como acusación, y sin citar reseñas.
  Si el negocio no tiene problemas detectados, el correo destaca su reputación actual.
- **Veracidad:** usa solo los datos entregados. No inventa cifras, clientes ni casos
  de éxito, y **nunca promete eliminar reseñas, subir el rating a un valor concreto
  ni generar reseñas falsas**.
- **Variedad:** cada correo debe sonar distinto (apertura y estructura).

La firma y la línea para darse de baja no las escribe el modelo: las agrega el
código al final de cada correo, para que siempre aparezcan sin alteraciones.

Si un borrador sale vacío o con marcadores sin completar (como `[Nombre]`), el
lote completo se reintenta automáticamente.

## Antes de enviar

- **Revisa los borradores.** Son generados por un modelo de lenguaje y pueden
  equivocar el tono o mencionar algo que no encaja con el rubro del negocio.
- **Normativa:** cada país tiene reglas sobre mensajes comerciales no solicitados
  (por ejemplo, la LGPD en Brasil o las leyes de protección de datos de Argentina,
  México y Colombia). Como mínimo, identifícate y ofrece una forma real de darse
  de baja. Si alguien responde "NO", respétalo. Verifica la regla vigente de cada
  país donde envíes.
- **Entregabilidad:** enviar cientos de correos de golpe desde un dominio nuevo
  suele terminar en la carpeta de spam. Envía de a poco y desde una cuenta propia.
- Este script **solo redacta**: no envía los correos.

## Limitaciones

- El plan gratuito de Gemini tiene límites de peticiones. Si ves avisos de
  "límite de cuota (429)", el script espera y reintenta; si ocurre seguido,
  reduce el volumen por día o usa lotes más grandes (menos consultas).
- Los problemas son categorías generales (por ejemplo "demoras"), no citas de
  reseñas, por lo que los correos no pueden ser más específicos que eso.
- La línea de baja solo está disponible en español y portugués.
- Se asume que `pais` está escrito de forma reconocible (por ejemplo "Brasil" o
  "Brazil") para elegir el idioma.
