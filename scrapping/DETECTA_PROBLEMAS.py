#Lógica

"""
##############################################################################
################                  ADVERTENCIA                 ################
##############################################################################
El archivo de salida SE BORRA Y SE VUELVE A CREAR en cada corrida del script.
Si quieres conservar resultados anteriores, copia o renombra el archivo
antes de volver a ejecutarlo.
#############################################################################
#############################################################################

DETECTA_PROBLEMAS: pasa las reseñas negativas de cada negocio a Gemini y
devuelve sus 3 problemas principales.

Requiere un archivo DETECTA_PROBLEMAS_inputs.json en la misma carpeta, con:
  API_KEY      : tu clave de Google AI Studio (cada usuario debe poner la suya)
  MODELO       : modelo de Gemini a utilizar
  RUTA_RESENAS : csv con las columnas ['place_id', 'texto', 'rating']
  RUTA_SALIDA  : csv donde se guardan los resultados
  MAX_RATING   : se conservan reseñas con rating menor a este valor (2.1 o 3.1)

Clasificaciones:
   - atención al cliente
   - calidad
   - precios y cobros
   - demoras
   - reembolsos y pagos
   - instalaciones
   - disponibilidad
   - limpieza
   - publicidad engañosa
   - postventa
   - negligencia
   - seguridad
   - otros

Salida:
Una fila por negocio, con las columnas

  place_id    : identificador del negocio (el mismo del csv de reseñas)
  grupo       : número del lote enviado a Gemini (uso interno, no tiene
                significado para el negocio)
  problema_1  : problema principal detectado (una de las 13 categorías,
                o "Ninguno")
  problema_2  : segundo problema (vacío si no hay)
  problema_3  : tercer problema (vacío si no hay)
  problemas   : lista completa en formato JSON, p. ej. ["limpieza", "demoras"]




"""

import json
import os
import pandas as pd
import sys
import time

from google import genai
from google.genai import types, errors
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Literal



# ---------- Inputs ----------
def cargar_inputs(nombre="DETECTA_PROBLEMAS_inputs.json"):
    carpeta = Path(__file__).parent if "__file__" in globals() else Path.cwd()
    ruta = carpeta / nombre
    if not ruta.exists():
        raise FileNotFoundError(f"No se encontró {ruta}. Debe estar junto al script.")

    cfg = json.loads(ruta.read_text(encoding="utf-8"))

    requeridas = ["API_KEY", "MODELO", "RUTA_RESENAS", "RUTA_SALIDA", "MAX_RATING"]
    faltan = [k for k in requeridas if k not in cfg]
    if faltan:
        raise KeyError(f"Faltan claves en {nombre}: {faltan}")

    clave = str(cfg["API_KEY"]).strip()
    if not clave or clave.startswith("PEGAR"):
        raise ValueError(f"Configura tu propia API_KEY en {nombre} (Google AI Studio).")
    return cfg


# ---------- Preparación de datos ----------
def preparar_datos(ruta_csv, K=20, max_resenas=5, rating_max=2.1):
    """
    Carga las reseñas, las filtra y devuelve un DataFrame en formato ancho
    (una fila por negocio) con una columna 'grupo' de tamaño K.

    Parámetros
    ----------
    ruta_csv : str
        CSV con las columnas place_id, texto y rating.
    K : int
        Cantidad de negocios por grupo (una consulta a Gemini por grupo).
    max_resenas : int
        Máximo de reseñas por negocio (columnas texto_1..texto_n).
    rating_max : float
        Se conservan las reseñas con rating estrictamente menor a este valor.
    """
    resenas = pd.read_csv(ruta_csv)[["place_id", "texto", "rating"]]
    resenas = resenas.query("rating < @rating_max").copy()
    if resenas.empty:
        raise ValueError(f"No hay reseñas con rating < {rating_max}.")

    resenas["id"] = pd.factorize(resenas["place_id"])[0] + 1
    resenas["n_resena"] = resenas.groupby("place_id").cumcount() + 1
    resenas = resenas.query("n_resena <= @max_resenas")

    df_ancho = resenas.pivot(
        index=["id", "place_id"], columns="n_resena", values="texto"
    ).reset_index()

    df_ancho.columns = ["id", "place_id"] + [f"texto_{i}" for i in df_ancho.columns[2:]]
    cols_texto = [f"texto_{i}" for i in range(1, max_resenas + 1)]
    df_ancho = df_ancho.reindex(columns=["id", "place_id"] + cols_texto)
    df_ancho[cols_texto] = df_ancho[cols_texto].fillna("")

    df_ancho = df_ancho.sort_values("id").reset_index(drop=True)
    df_ancho["grupo"] = df_ancho.index // K + 1
    return df_ancho


# ---------- Esquemas de salida ----------
Categoria = Literal[
    "atención al cliente",
    "calidad",
    "precios y cobros",
    "demoras",
    "reembolsos y pagos",
    "instalaciones",
    "disponibilidad",
    "limpieza",
    "publicidad engañosa",
    "postventa",
    "negligencia",
    "seguridad",
    "otros",
    "Ninguno",
]


class SinglePlaceAnalysis(BaseModel):
    place_id: str = Field(description="The unique identifier of the place, exactly as received.")
    main_problems: list[Categoria] = Field(
        description="Up to 3 main problems, one category each, taken only from the allowed list."
    )


class BatchAnalysisResponse(BaseModel):
    results: list[SinglePlaceAnalysis] = Field(
        description="List of analysis results, one per provided place."
    )


PROMPT_TEMPLATE = """
Analiza las reseñas negativas de los siguientes establecimientos.
Para cada establecimiento, identifica y resume los 3 problemas principales por los que se están quejando los clientes.
La cantidad de problemas puede ser menor a 3.
Si no encuentras ningún problema utiliza la categoría "Ninguno".

Clasifica cada problema en UNA de las siguientes categorías. Después de los dos puntos se indica su definición y, entre paréntesis, algunos ejemplos:

- atención al cliente: trato del personal y canales de contacto. (trato grosero, maltrato verbal, prepotencia, falta de empatía, desinterés, mala predisposición, falta de respuesta, canales de contacto que no funcionan, falta de explicaciones, información errónea, negativa a reclamos o devoluciones, falta de profesionalismo, desorganización, discriminación, favoritismo, presión de venta, exigencia de propinas)

- calidad: el producto o servicio recibido es deficiente. (producto defectuoso, incorrecto o incompleto, producto o comida en mal estado, mal sabor o temperatura, porciones escasas, trabajo mal hecho o incompleto, reparación deficiente, mal lavado o secado, daños materiales al vehículo o a prendas, servicio deficiente o mediocre, poca durabilidad, mal diagnóstico sin consecuencias graves, errores en estudios, análisis o resultados, medicamentos incorrectos sin daño grave, tratamiento ineficaz, procedimientos bruscos o mal realizados, falta de variedad, equipos o sistemas que no funcionan, plataforma web defectuosa)

- precios y cobros: lo que se cobra es excesivo o incorrecto. (precios elevados, sobreprecios, cobros excesivos, abusivos o indebidos, cargos adicionales, cargos con intereses, presupuestos inflados, cobro sin presupuesto previo, falta de información de precios, tarifas arbitrarias, multas injustificadas, cobros por daños no causados, cobros por servicios o exámenes innecesarios, cobros duplicados o erróneos, errores de facturación, no entrega de facturas o comprobantes, vueltos incorrectos, medios de pago limitados)

- demoras: el servicio o producto se recibe tarde o tras una espera excesiva. (tiempos de espera prolongados, esperas largas en recepción o urgencias, filas largas, atención lenta, trámites lentos, retrasos en citas o turnos, impuntualidad del profesional, retraso en la entrega de resultados o informes, retrasos en entregas o envíos, retrasos en reparaciones o entrega de vehículos, retrasos en cirugías, retrasos en autorizaciones o trámites con aseguradoras, demora en la atención telefónica, sistemas lentos o caídos)

- reembolsos y pagos: el establecimiento debe devolver o pagar dinero y no lo hace, o lo hace tarde. (reembolsos demorados o no realizados, devoluciones de dinero tardías, retención indebida de garantías o depósitos, reintegros pendientes, demoras en pagos de siniestros o liquidaciones, falta de pago por servicios, falta de pago a empleados, falta de devolución de dinero por cancelaciones, verificación lenta de pagos)

- instalaciones: estado, comodidad y equipamiento del local. (instalaciones viejas o deterioradas, falta de mantenimiento, defectos constructivos o filtraciones, baños en mal estado o sin agua ni luz, falta de agua caliente, falta de ventilación o calor excesivo, aire acondicionado deficiente, ruido excesivo, mala iluminación, espacio reducido, sobrepoblación o aglomeraciones, falta de sala de espera, sillas o camillas incómodas, falta de camas, falta de estacionamiento, ascensores insuficientes o fuera de servicio, falta de insumos básicos como sábanas, pañales o agua, equipos obsoletos o dañados, ubicación de difícil acceso, falta de accesibilidad, espacios exteriores descuidados)

- disponibilidad: el cliente no puede acceder al servicio o producto. (falta de stock, falta de vehículos o unidades, falta de cupos o turnos disponibles, reservas no respetadas, cancelación de reservas o turnos sin aviso, sobreventa de reservas, negativa de servicio)

- limpieza: higiene del local, del personal o del servicio entregado. (suciedad general, higiene deficiente, baños sucios, mal olor, olor a orina o humedad, moho, presencia de insectos o animales, presencia de pelos, sábanas o ropa de cama sucias, restos de fluidos o sangre, falta de protocolos de desinfección o asepsia, personal con manos sucias o que manipula sin guantes, áreas de espera sucias, vehículo entregado sucio)

- publicidad engañosa: lo anunciado no coincide con la realidad. (precios publicados distintos a los cobrados, precios falsos en carteles o en la web, precios o cargos ocultos, seguros obligatorios ocultos, letra pequeña, promociones, ofertas o descuentos falsos o no reconocidos, cambio de reglas en promociones, fotos o descripciones que no coinciden con la realidad, productos o servicios distintos a lo prometido, promesas falsas de planes, cobertura o plazos, servicio 24 horas falso, horarios incorrectos publicados, cierre anticipado sin aviso, dirección o ubicación errónea, falsas certificaciones, estafas, anuncios o redes sociales fraudulentas, alojamientos o paquetes inexistentes, cantidades menores a las anunciadas, información errónea sobre coberturas o seguros)

- postventa: problemas para resolver el producto o servicio después de la compra. (negativa o incumplimiento de garantía, pérdida de garantía, negativa de cambios o notas de crédito, falta de solución a reclamos posteriores a la compra, problemas con repuestos, talleres que causan daños adicionales, cobro por reparaciones que no correspondían, negativa a responder por daños o lesiones, mala gestión o negativa a pagar siniestros, cancelación de pólizas sin aviso, productos que no se envían, informes de inspección falsos, incumplimiento de acuerdos firmados)

- negligencia: errores o descuido que causan daño grave a la salud o integridad de personas o mascotas. (mala praxis, diagnósticos graves erróneos, errores en procedimientos, medicación o dosis, errores en la entrega de medicamentos, errores en órdenes médicas, falta de protocolos, mala técnica con daño al paciente, no revisar adecuadamente al paciente, infecciones, negativa a atender emergencias graves, procedimientos sin consentimiento, protocolos orientados al lucro y no a la salud, daño o muerte de mascotas, abandono de adultos mayores, escaras o falta de curación, desnutrición, sobremedicación o sedación excesiva, caídas por falta de cuidado, maltrato físico a residentes, contagios por falta de higiene)

- seguridad: robos, delincuencia y riesgos físicos para las personas o sus bienes. (robo de pertenencias, objetos personales, dinero o billeteras, robos dentro del vehículo o del local, intentos de robo, falta de sistemas de seguridad o de alarma, zona peligrosa o con delincuencia, falta de alumbrado, perros sueltos que atacan, clonación de tarjetas, exhibición o violación de datos personales, amenazas o conducta violenta o intimidante del personal, guardias que acosan, vehículos con fallas de seguridad como frenos o neumáticos en mal estado, conducción violenta o peligrosa, estacionamiento peligroso, brotes o contagios dentro del establecimiento)

- otros: solo para problemas que no encajan razonablemente en ninguna de las categorías anteriores. 

Reglas para decidir entre categorías parecidas:
- Recibir el servicio tarde -> demoras. No poder acceder al servicio o producto (sin stock, sin cupos, reserva cancelada) -> disponibilidad.
- Recuperar dinero que el establecimiento debe devolver -> reembolsos y pagos. Resolver el producto o servicio (garantía, cambio, reparación) -> postventa. Negarse a atender el reclamo -> atención al cliente.
- Es caro, o cobraron de más por error -> precios y cobros. Cobraron más de lo anunciado u ocultaron cargos -> publicidad engañosa.
- Grosería o maltrato verbal -> atención al cliente. Amenaza o intimidación física -> seguridad.
- Daño grave a la salud, muerte o abandono -> negligencia. Error menor o sin consecuencias graves -> calidad.
- Vehículo que vuelve sucio -> limpieza. Lavado mal hecho (vidrios manchados, rayones, mal secado) -> calidad.
- Robos y delincuencia -> seguridad, aunque ocurran dentro del establecimiento.
- Si un mismo comentario toca varias categorías, devuelve un problema por cada categoría (máximo 3 en total).

Devuelve exactamente un resultado por cada establecimiento conteniendo hasta 3 problemas, utiliza solo los nombres de las categorías y no los ejemplos ni las definiciones.
Algo como: limpieza, atención al cliente, seguridad.

Usa el mismo place_id que se te envía, sin modificarlo.
Aquí están los datos en formato JSON:
{payload}
"""


# ---------- Consulta de un grupo ----------
def _consultar_grupo(client, modelo, df_grupo, max_resenas, max_reintentos, temperatura):
    """Envía un grupo a Gemini y devuelve la lista de SinglePlaceAnalysis (o None si falla).

    Reintenta ante: límite de cuota (429), errores del servidor (5xx) y
    respuestas inválidas. Ante otros errores de cliente (clave inválida,
    modelo inexistente, etc.) corta de inmediato.
    """
    cols_texto = [f"texto_{i}" for i in range(1, max_resenas + 1)]

    payload = (
        df_grupo[["place_id"] + cols_texto]
        .astype({"place_id": str})
        .to_dict(orient="records")
    )
    ids_esperados = {p["place_id"] for p in payload}
    prompt = PROMPT_TEMPLATE.format(
        payload=json.dumps(payload, ensure_ascii=False, indent=2)
    )

    for intento in range(1, max_reintentos + 1):
        try:
            response = client.models.generate_content(
                model=modelo,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=BatchAnalysisResponse,
                    temperature=temperatura,
                ),
            )
            resultado = BatchAnalysisResponse.model_validate_json(response.text)

            ids_recibidos = {r.place_id for r in resultado.results}
            if ids_recibidos != ids_esperados:
                faltan = ids_esperados - ids_recibidos
                sobran = ids_recibidos - ids_esperados
                raise ValueError(f"IDs inconsistentes. Faltan: {faltan} | Sobran: {sobran}")

            return resultado.results

        except errors.ClientError as e:
            if e.code != 429:
                raise                      # error de configuración: no tiene sentido reintentar
            print(f"  Intento {intento}/{max_reintentos}: límite de cuota (429).")
            if intento < max_reintentos:
                time.sleep(20 * intento)

        except Exception as e:             # 5xx, JSON inválido, categorías inválidas, IDs inconsistentes
            print(f"  Intento {intento}/{max_reintentos} falló: {e}")
            if intento < max_reintentos:
                time.sleep(10 * intento)

    return None


def _limpiar_problemas(probs):
    """Quita duplicados, limita a 3 y descarta 'Ninguno' si hay otros problemas."""
    unicos = list(dict.fromkeys(probs))
    if len(unicos) > 1:
        unicos = [p for p in unicos if p != "Ninguno"]
    return unicos[:3]


# ---------- Función principal ----------
def analizar_por_grupos(
    data,
    api_key,
    modelo,
    ruta_salida="resultados.csv",
    reanudar=False,
    max_resenas=5,
    max_reintentos=6,
    temperatura=0.2,
    pausa_entre_grupos=1,
):
    """
    Recorre cada grupo de `data`, consulta a Gemini y guarda los resultados
    en `ruta_salida` después de cada grupo.

    Si reanudar=True y el CSV ya existe, se saltean los grupos ya procesados.
    Si reanudar=False, se borra el CSV previo y se empieza de cero.

    Retorna
    -------
    resultados : DataFrame (place_id, grupo, problema_1..3, problemas)
    grupos_fallidos : lista de grupos que no se pudieron procesar
    """
    client = genai.Client(api_key=api_key)

    grupos_hechos = set()
    if os.path.exists(ruta_salida):
        if reanudar:
            grupos_hechos = set(pd.read_csv(ruta_salida)["grupo"].unique())
            print(f"Reanudando: {len(grupos_hechos)} grupos ya procesados.")
        else:
            os.remove(ruta_salida)

    grupos_fallidos = []
    grupos = sorted(data["grupo"].unique())

    for g in grupos:
        if g in grupos_hechos:
            continue

        df_grupo = data[data["grupo"] == g]
        print(f"Grupo {g}/{grupos[-1]} ({len(df_grupo)} negocios)...")

        analisis = _consultar_grupo(
            client, modelo, df_grupo, max_resenas, max_reintentos, temperatura
        )

        if analisis is None:
            print(f"  -> Grupo {g} omitido tras {max_reintentos} intentos.")
            grupos_fallidos.append(g)
            continue

        filas = []
        for r in analisis:
            probs = _limpiar_problemas(r.main_problems)
            filas.append({
                "place_id": r.place_id,
                "grupo": g,
                "problema_1": probs[0] if len(probs) > 0 else None,
                "problema_2": probs[1] if len(probs) > 1 else None,
                "problema_3": probs[2] if len(probs) > 2 else None,
                "problemas": json.dumps(probs, ensure_ascii=False),
            })

        pd.DataFrame(filas).to_csv(
            ruta_salida,
            mode="a",
            header=not os.path.exists(ruta_salida),
            index=False,
            encoding="utf-8",
        )
        print(f"  -> Grupo {g} guardado en {ruta_salida}")

        time.sleep(pausa_entre_grupos)

    if os.path.exists(ruta_salida):
        resultados = pd.read_csv(ruta_salida)
        resultados["problemas"] = resultados["problemas"].apply(json.loads)
    else:
        resultados = pd.DataFrame(
            columns=["place_id", "grupo", "problema_1", "problema_2", "problema_3", "problemas"]
        )

    return resultados, grupos_fallidos


# ---------- Uso ----------
def main():
    cfg = cargar_inputs()

    data = preparar_datos(cfg["RUTA_RESENAS"], K=20, rating_max=cfg["MAX_RATING"])
    print(f"{len(data)} negocios en {data['grupo'].nunique()} grupos.")

    try:
        resultados, fallidos = analizar_por_grupos(
            data,
            api_key=cfg["API_KEY"],
            modelo=cfg["MODELO"],
            ruta_salida=cfg["RUTA_SALIDA"],
        )
    except errors.ClientError as e:
        print(f"\nError de configuración ({e.code}): {e}")
        print("Revisa tu API_KEY y el nombre del MODELO en el JSON.")
        sys.exit(1)

    print(f"\nListo. {len(resultados)} negocios analizados.")
    if fallidos:
        print(f"Grupos fallidos: {fallidos}. Vuelve a ejecutar para reintentarlos.")


if __name__ == "__main__":
    main()