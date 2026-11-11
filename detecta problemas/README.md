# DETECTA_PROBLEMAS

Toma las reseñas negativas de cada negocio, se las envía a Gemini y devuelve sus
**3 problemas principales**, clasificados en categorías fijas.

## Requisitos

- Python 3.10 o superior
- Una API key propia de [Google AI Studio](https://aistudio.google.com/) (el plan gratuito alcanza)

```
pip install pandas google-genai pydantic
```

## Configuración

Copia la plantilla `DETECTA_PROBLEMAS_inputs.example.json`, renómbrala como
`DETECTA_PROBLEMAS_inputs.json` (junto al script) y completa tus valores:

```json
{
  "API_KEY": "PEGAR_TU_API_KEY_AQUI",
  "MODELO": "gemini-3.5-flash-lite",
  "RUTA_RESENAS": "resenas.csv",
  "RUTA_SALIDA": "resultados.csv",
  "MAX_RATING": 2.1
}
```

| Campo | Descripción |
|---|---|
| `API_KEY` | Tu clave de Google AI Studio. **Cada persona debe usar la suya.** |
| `MODELO` | Modelo de Gemini a utilizar. |
| `RUTA_RESENAS` | CSV con las reseñas. Debe tener las columnas `place_id`, `texto` y `rating`. |
| `RUTA_SALIDA` | CSV donde se guardan los resultados. |
| `MAX_RATING` | Se conservan las reseñas con rating **menor** a este valor. Se recomienda `2.1` (1 y 2 estrellas) o `3.1` (hasta 3 estrellas). |

> **Seguridad:** nunca subas `DETECTA_PROBLEMAS_inputs.json` a un repositorio,
> ni lo compartas por mail o chat. Si usas git, agrégalo al `.gitignore`.
> Si una clave se filtra, revócala en Google AI Studio y genera otra.

## Uso

```
python DETECTA_PROBLEMAS.py
```

El script procesa los negocios en grupos de 20 (una consulta a Gemini por grupo)
y va guardando los resultados después de cada grupo. Si un grupo falla tras
varios intentos, se informa al final.

## Salida

Una fila por negocio, con las columnas:

| Columna | Contenido |
|---|---|
| `place_id` | Identificador del negocio (el mismo del CSV de reseñas). |
| `grupo` | Número del lote enviado a Gemini. Es de uso interno y no tiene significado para el negocio. |
| `problema_1` | Problema principal detectado (una de las categorías, o `Ninguno`). |
| `problema_2` | Segundo problema (vacío si no hay). |
| `problema_3` | Tercer problema (vacío si no hay). |
| `problemas` | Lista completa en formato JSON, por ejemplo `["limpieza", "demoras"]`. |

> **ADVERTENCIA: el archivo de salida se borra y se vuelve a crear en cada
> corrida del script.** Si quieres conservar resultados anteriores, copia o
> renombra el archivo antes de volver a ejecutarlo.

## Categorías

| Categoría | Qué abarca |
|---|---|
| atención al cliente | Trato del personal y canales de contacto. |
| calidad | El producto o servicio recibido es deficiente. |
| precios y cobros | Lo que se cobra es excesivo o incorrecto. |
| demoras | El servicio o producto se recibe tarde o tras una espera excesiva. |
| reembolsos y pagos | El establecimiento debe devolver o pagar dinero y no lo hace, o lo hace tarde. |
| instalaciones | Estado, comodidad y equipamiento del local. |
| disponibilidad | El cliente no puede acceder al servicio o producto. |
| limpieza | Higiene del local, del personal o del servicio entregado. |
| publicidad engañosa | Lo anunciado no coincide con la realidad. |
| postventa | Problemas para resolver el producto o servicio después de la compra. |
| negligencia | Errores o descuido que causan daño grave a la salud o integridad de personas o mascotas. |
| seguridad | Robos, delincuencia y riesgos físicos para las personas o sus bienes. |
| otros | Problemas que no encajan razonablemente en ninguna de las anteriores. |

`Ninguno` aparece solo cuando no se detectó ningún problema en las reseñas.

## Cómo se crearon las categorías

Las categorías no se definieron de antemano, sino que surgieron de los datos:

1. **Muestra.** Se buscaron todos los negocios con calificación promedio entre
   1.5 y 3.5, de 100 rubros distintos elegidos arbitrariamente, en 5 de las
   ciudades más pobladas de América Latina.
2. **Reseñas.** De cada negocio se obtuvieron 5 reseñas (límite impuesto por
   Google) y se conservaron solo las de 1 o 2 estrellas.
3. **Extracción de problemas.** Se usó un LLM (`gemini-3.5-flash-lite`) para
   extraer los problemas de cada negocio.
4. **Agrupación.** Los problemas se agruparon por similitud en categorías
   generales, nuevamente con `gemini-3.5-flash-lite`.
5. **Revisión general.** Se revisó el resultado completo: en muchos casos se
   recalificaron problemas en nuevas categorías, y se le pidió al LLM que
   estableciera reglas claras para no repetir el mismo error y resolver las
   ambigüedades entre categorías parecidas.

Los problemas detectados en este dataset se conservan como **ejemplos dentro de
cada categoría** en el prompt (`PROMPT_TEMPLATE`), junto con las reglas para
decidir entre categorías parecidas.

## Limitaciones

- Se analizan como máximo 5 reseñas por negocio (`max_resenas`), por el límite
  de Google al obtenerlas.
- Las categorías provienen de una muestra de 5 ciudades y 100 rubros. Rubros o
  contextos muy distintos pueden generar problemas que terminen en `otros`.
- El plan gratuito de Gemini tiene límites de peticiones. Si ves avisos de
  "límite de cuota (429)", el script espera y reintenta; si ocurre seguido,
  aumenta `pausa_entre_grupos` o reduce `K`.
- El resultado lo produce un modelo de lenguaje: conviene revisar una muestra
  antes de tomar decisiones con él.
