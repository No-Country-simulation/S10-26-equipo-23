"""
GENERA_MAILS : redacta con Gemini un correo de primer contacto (cold email)
para cada negocio, ofreciendo servicios para mejorar su reputación online.

Requiere un archivo GENERA_MAILS_inputs.json en la misma carpeta, con:
  API_KEY        : tu clave de Google AI Studio (cada usuario debe poner la suya)
  MODELO         : modelo de Gemini a utilizar
  RUTA_NEGOCIOS  : csv con los negocios (ver columnas más abajo)
  RUTA_SALIDA    : csv donde se guardan los correos
  REMITENTE      : nombre de quien firma el correo
  EMPRESA        : nombre de tu empresa
  OFERTA         : qué servicio ofreces, en una o dos frases
  LLAMADA_ACCION : qué quieres que haga el negocio (p. ej. "agendar una llamada de 15 minutos")
Opcionales:
  TONO           : por defecto "profesional, cálido y breve; trato de usted"
  FIRMA          : por defecto "REMITENTE" y "EMPRESA" en dos líneas
  TEXTO_BAJA     : línea para darse de baja (español)
  TEXTO_BAJA_PT  : línea para darse de baja (portugués, se usa para Brasil)
  TAMANO_LOTE    : negocios por consulta a Gemini (por defecto 10)

# ENTRADA (RUTA_NEGOCIOS, csv)
Una fila por negocio, con las columnas:
  nombre, ciudad, pais, rubro, n_resenas, rating, problemas
  - problemas: lista de categorías, por ejemplo ["limpieza", "demoras"]
    (formato JSON, el que genera DETECTA_PROBLEMAS) o separadas por coma.
    Puede estar vacío o decir "Ninguno".
Opcionales (se copian a la salida): place_id, email

# SALIDA (RUTA_SALIDA, csv)
Una fila por negocio: id, place_id, email, nombre, ciudad, pais, asunto, cuerpo, grupo.
El cuerpo ya incluye la firma y la línea de baja.

# USO
  python GENERA_MAILS.py                 # procesa todos los negocios
  python GENERA_MAILS.py --prueba 3      # solo los 3 primeros, guarda en *_prueba.csv
  python GENERA_MAILS.py --reanudar      # continúa una corrida interrumpida

ADVERTENCIA: el archivo de salida SE BORRA Y SE VUELVE A CREAR en cada corrida
(salvo que uses --reanudar). Copia o renombra los resultados que quieras conservar.
Revisa siempre los borradores antes de enviarlos.
"""

import os
import sys
import ast
import json
import time
import argparse
from pathlib import Path

import pandas as pd
from google import genai
from google.genai import types, errors
from pydantic import BaseModel, Field


NOMBRE_INPUTS = "GENERA_MAILS_inputs.json"
COLUMNAS_REQUERIDAS = ["nombre", "ciudad", "pais", "descripcion", "n_resenas", "rating", "problemas"]

BAJA_ES = ("Si prefiere no recibir más mensajes de nuestra parte, responda a este "
           "correo con la palabra NO y no volveremos a escribirle.")
BAJA_PT = ("Se preferir não receber mais mensagens nossas, responda a este e-mail "
           "com a palavra NÃO e não voltaremos a escrever.")


# ---------- Inputs ----------
def cargar_inputs(nombre=NOMBRE_INPUTS):
    carpeta = Path(__file__).parent if "__file__" in globals() else Path.cwd()
    ruta = carpeta / nombre
    if not ruta.exists():
        raise FileNotFoundError(f"No se encontró {ruta}. Debe estar junto al script.")

    cfg = json.loads(ruta.read_text(encoding="utf-8"))

    requeridas = ["API_KEY", "MODELO", "RUTA_NEGOCIOS", "RUTA_SALIDA",
                  "REMITENTE", "EMPRESA", "OFERTA", "LLAMADA_ACCION"]
    faltan = [k for k in requeridas if k not in cfg]
    if faltan:
        raise KeyError(f"Faltan claves en {nombre}: {faltan}")

    clave = str(cfg["API_KEY"]).strip()
    if not clave or clave.startswith("PEGAR"):
        raise ValueError(f"Configura tu propia API_KEY en {nombre} (Google AI Studio).")

    cfg.setdefault("TONO", "profesional, cálido y breve; trato de usted")
    cfg.setdefault("FIRMA", f"{cfg['REMITENTE']}\n{cfg['EMPRESA']}")
    cfg.setdefault("TEXTO_BAJA", BAJA_ES)
    cfg.setdefault("TEXTO_BAJA_PT", BAJA_PT)
    cfg.setdefault("TAMANO_LOTE", 10)

    if not isinstance(cfg["TAMANO_LOTE"], int) or cfg["TAMANO_LOTE"] < 1:
        raise ValueError("TAMANO_LOTE debe ser un número entero mayor o igual a 1.")
    return cfg


# ---------- Preparación de datos ----------
def _parsear_problemas(valor):
    """Convierte la celda 'problemas' en una lista limpia de categorías."""
    if isinstance(valor, (list, tuple)):
        lista = [str(x) for x in valor]
    elif valor is None or (not isinstance(valor, str) and pd.isna(valor)):
        lista = []
    else:
        s = str(valor).strip()
        lista = []
        if s:
            for parser in (json.loads, ast.literal_eval):
                try:
                    v = parser(s)
                    if isinstance(v, (list, tuple)):
                        lista = [str(x) for x in v]
                        break
                except (ValueError, SyntaxError):
                    continue
            else:
                lista = [p.strip(" []'\"") for p in s.replace(";", ",").split(",")]

    lista = [p.strip() for p in lista if p.strip() and p.strip().lower() != "ninguno"]
    return list(dict.fromkeys(lista))


def preparar_negocios(ruta_csv, K=5, limite=0):
    """Carga los negocios y les asigna un id corto y un grupo de tamaño K."""
    df = pd.read_csv(ruta_csv)
    faltan = [c for c in COLUMNAS_REQUERIDAS if c not in df.columns]
    if faltan:
        raise KeyError(f"Faltan columnas en {ruta_csv}: {faltan}")

    df = df.dropna(subset=["nombre"]).reset_index(drop=True)
    if limite:
        df = df.head(limite).copy()
    if df.empty:
        raise ValueError("No hay negocios para procesar.")

    df["n_resenas"] = pd.to_numeric(
        df["n_resenas"].astype(str).str.replace(",", ".", regex=False), errors="coerce")
    df["rating"] = pd.to_numeric(
        df["rating"].astype(str).str.replace(",", ".", regex=False), errors="coerce")
    df["problemas_lista"] = df["problemas"].apply(_parsear_problemas)

    df["id"] = df.index + 1                    # id corto: evita errores al copiar place_id largos
    df["grupo"] = df.index // K + 1
    return df


# ---------- Esquemas de salida ----------
class Borrador(BaseModel):
    id: str = Field(description="El id del negocio, exactamente como se recibió.")
    asunto: str = Field(description="Asunto del correo, máximo 8 palabras.")
    cuerpo: str = Field(description="Cuerpo del correo, sin firma.")


class LoteBorradores(BaseModel):
    results: list[Borrador] = Field(description="Un borrador por cada negocio recibido.")


PROMPT_TEMPLATE = """
Eres un redactor comercial experto en correos de primer contacto (cold email) para
pequeños y medianos negocios de América Latina.

Escribe un correo para CADA negocio de la lista, en nombre de este remitente:
- Remitente: {remitente}, de {empresa},
- Qué ofrecemos: {oferta}
- Llamada a la acción: {llamada_accion}
- Tono: {tono}

De cada negocio recibes: nombre, ciudad, país, rubro, cantidad de reseñas, rating
promedio y problemas detectados en sus reseñas negativas (categorías generales).

Reglas:
1. Idioma: el predominante del país del negocio (portugués para Brasil, español para el resto).
2. Longitud: cuerpo de 80 a 130 palabras. Asunto de máximo 8 palabras, sin signos de
   exclamación ni palabras como "gratis", "urgente" u "oferta".
3. Estructura: saludo breve con el nombre del negocio; una línea que muestre que conocemos
   el negocio (rubro, ciudad o reseñas); el valor que ofrecemos; UNA sola llamada a la
   acción simple; cierre cordial. No incluyas firma ni línea de baja: se agregan después.
4. Problemas detectados: úsalos con mucho tacto y solo como oportunidad de mejora, nunca
   como acusación. Menciona como máximo uno o dos, de forma general (por ejemplo, "algunos
   clientes mencionan los tiempos de espera"), sin citar reseñas ni inventar detalles.
   Si la lista está vacía, no menciones problemas y destaca en su lugar la reputación
   que ya tienen y cómo aprovecharla.
5. Rating y reseñas: menciónalos solo si ayudan al mensaje (un rating alto con muchas
   reseñas es un activo). Si el rating es bajo, no lo señales de forma negativa.
6. Veracidad: usa solo los datos entregados. No inventes cifras, resultados, clientes,
   casos de éxito ni promesas. Nunca prometas eliminar reseñas, subir el rating a un valor
   concreto ni generar reseñas falsas.
7. Evita frases de spam ("estimado cliente", "tenemos la solución perfecta"), el tono
   alarmista y la presión ("última oportunidad").
8. Cada correo debe sonar distinto: varía la apertura y la estructura entre negocios.
9. No uses corchetes ni marcadores de posición como [Nombre].
10. Usa el id exactamente como se envía.

Devuelve exactamente un borrador por cada negocio.
Aquí están los datos en formato JSON:
{payload}
"""


# ---------- Consulta de un lote ----------
def _txt(v):
    return "" if v is None or (not isinstance(v, str) and pd.isna(v)) else str(v).strip()


def _armar_prompt(cfg, df_grupo):
    payload = []
    for _, r in df_grupo.iterrows():
        payload.append({
            "id": str(r["id"]),
            "nombre": _txt(r["nombre"]),
            "ciudad": _txt(r["ciudad"]),
            "pais": _txt(r["pais"]),
            "rubro": _txt(r["descripcion"]),
            "n_resenas": None if pd.isna(r["n_resenas"]) else int(r["n_resenas"]),
            "rating": None if pd.isna(r["rating"]) else round(float(r["rating"]), 1),
            "problemas": r["problemas_lista"],
        })
    ids_esperados = {p["id"] for p in payload}
    prompt = PROMPT_TEMPLATE.format(
        remitente=cfg["REMITENTE"], empresa=cfg["EMPRESA"], oferta=cfg["OFERTA"],
        llamada_accion=cfg["LLAMADA_ACCION"], tono=cfg["TONO"],
        payload=json.dumps(payload, ensure_ascii=False, indent=2),
    )
    return prompt, ids_esperados


def _consultar_lote(client, modelo, prompt, ids_esperados, max_reintentos, temperatura):
    """Envía un lote a Gemini y devuelve la lista de Borrador (o None si falla).

    Reintenta ante: límite de cuota (429), errores del servidor (5xx) y respuestas
    inválidas. Ante otros errores de cliente (clave inválida, modelo inexistente)
    corta de inmediato.
    """
    for intento in range(1, max_reintentos + 1):
        try:
            response = client.models.generate_content(
                model=modelo,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=LoteBorradores,
                    temperature=temperatura,
                ),
            )
            resultado = LoteBorradores.model_validate_json(response.text)

            ids_recibidos = {b.id for b in resultado.results}
            if ids_recibidos != ids_esperados:
                faltan = ids_esperados - ids_recibidos
                sobran = ids_recibidos - ids_esperados
                raise ValueError(f"IDs inconsistentes. Faltan: {faltan} | Sobran: {sobran}")

            for b in resultado.results:
                if not b.asunto.strip() or not b.cuerpo.strip():
                    raise ValueError(f"Borrador vacío para el id {b.id}")
                if "[" in b.asunto or "[" in b.cuerpo:
                    raise ValueError(f"Marcador de posición sin completar en el id {b.id}")

            return resultado.results

        except errors.ClientError as e:
            if e.code != 429:
                raise                      # error de configuración: no tiene sentido reintentar
            print(f"  Intento {intento}/{max_reintentos}: límite de cuota (429).")
            if intento < max_reintentos:
                time.sleep(20 * intento)

        except Exception as e:             # 5xx, JSON inválido, IDs inconsistentes, etc.
            print(f"  Intento {intento}/{max_reintentos} falló: {e}")
            if intento < max_reintentos:
                time.sleep(10 * intento)

    return None


def _es_brasil(pais):
    return _txt(pais).lower() in {"brasil", "brazil"}


def _correo_final(cuerpo, cfg, pais):
    baja = cfg["TEXTO_BAJA_PT"] if _es_brasil(pais) else cfg["TEXTO_BAJA"]
    return f"{cuerpo.strip()}\n\n{cfg['FIRMA'].strip()}\n\n--\n{baja}"


# ---------- Función principal ----------
def generar_mails(
    data,
    cfg,
    ruta_salida,
    reanudar=False,
    max_reintentos=6,
    temperatura=0.7,
    pausa_entre_grupos=1,
):
    """
    Recorre cada grupo de `data`, pide los borradores a Gemini y guarda los
    resultados en `ruta_salida` después de cada grupo.

    Si reanudar=False y el CSV ya existe, se borra y se empieza de cero.
    Si reanudar=True, se saltean los grupos ya procesados.

    Retorna
    -------
    resultados : DataFrame con los correos generados
    grupos_fallidos : lista de grupos que no se pudieron procesar
    """
    client = genai.Client(api_key=cfg["API_KEY"])

    grupos_hechos = set()
    if os.path.exists(ruta_salida):
        if reanudar:
            grupos_hechos = set(pd.read_csv(ruta_salida, encoding="utf-8-sig")["grupo"].unique())
            print(f"Reanudando: {len(grupos_hechos)} grupos ya procesados.")
        else:
            print(f"AVISO: {ruta_salida} será borrado y reemplazado.")
            os.remove(ruta_salida)

    grupos_fallidos = []
    grupos = sorted(data["grupo"].unique())

    for g in grupos:
        if g in grupos_hechos:
            continue

        df_grupo = data[data["grupo"] == g]
        print(f"Grupo {g}/{grupos[-1]} ({len(df_grupo)} negocios)...")

        prompt, ids_esperados = _armar_prompt(cfg, df_grupo)
        borradores = _consultar_lote(
            client, cfg["MODELO"], prompt, ids_esperados, max_reintentos, temperatura
        )

        if borradores is None:
            print(f"  -> Grupo {g} omitido tras {max_reintentos} intentos.")
            grupos_fallidos.append(g)
            continue

        por_id = {str(r["id"]): r for _, r in df_grupo.iterrows()}
        filas = []
        for b in borradores:
            r = por_id[b.id]
            filas.append({
                "id": int(r["id"]),
                "place_id": r["place_id"] if "place_id" in data.columns else None,
                "email": r["email"] if "email" in data.columns else None,
                "nombre": r["nombre"],
                "ciudad": r["ciudad"],
                "pais": r["pais"],
                "asunto": b.asunto.strip(),
                "cuerpo": _correo_final(b.cuerpo, cfg, r["pais"]),
                "grupo": g,
            })

        primera_escritura = not os.path.exists(ruta_salida)
        pd.DataFrame(filas).to_csv(
            ruta_salida,
            mode="a",
            header=primera_escritura,
            index=False,
            encoding="utf-8-sig" if primera_escritura else "utf-8",   # BOM solo una vez (Excel)
        )
        print(f"  -> Grupo {g} guardado en {ruta_salida}")

        time.sleep(pausa_entre_grupos)

    if os.path.exists(ruta_salida):
        resultados = pd.read_csv(ruta_salida, encoding="utf-8-sig")
    else:
        resultados = pd.DataFrame(columns=["id", "place_id", "email", "nombre", "ciudad",
                                           "pais", "asunto", "cuerpo", "grupo"])
    return resultados, grupos_fallidos


# ---------- Uso ----------
def main():
    parser = argparse.ArgumentParser(description="Genera correos de contacto en frío con Gemini.")
    parser.add_argument("--prueba", type=int, default=0, metavar="N",
                        help="procesa solo los primeros N negocios y guarda en un archivo *_prueba.csv")
    parser.add_argument("--reanudar", action="store_true",
                        help="continúa una corrida interrumpida sin borrar la salida")
    args = parser.parse_args()

    cfg = cargar_inputs()
    ruta_salida = Path(cfg["RUTA_SALIDA"])
    if args.prueba:
        ruta_salida = ruta_salida.with_name(f"{ruta_salida.stem}_prueba{ruta_salida.suffix}")

    data = preparar_negocios(cfg["RUTA_NEGOCIOS"], K=cfg["TAMANO_LOTE"], limite=args.prueba)
    print(f"{len(data)} negocios en {data['grupo'].nunique()} lotes "
          f"de hasta {cfg['TAMANO_LOTE']} (una consulta a Gemini por lote).")

    try:
        resultados, fallidos = generar_mails(
            data, cfg, ruta_salida=str(ruta_salida), reanudar=args.reanudar
        )
    except errors.ClientError as e:
        print(f"\nError de configuración ({e.code}): {e}")
        print("Revisa tu API_KEY y el nombre del MODELO en el JSON.")
        sys.exit(1)

    print(f"\nListo. {len(resultados)} correos generados en {ruta_salida}.")
    if fallidos:
        print(f"Grupos fallidos: {fallidos}. Vuelve a ejecutar con --reanudar para reintentarlos.")


if __name__ == "__main__":
    main()