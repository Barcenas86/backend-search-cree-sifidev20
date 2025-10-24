import fetch from "node-fetch";
import pLimit from "p-limit";
import NodeCache from "node-cache";

const CRE_API_URL = "https://api-creweb.cne.gob.mx/api/Permisos/ObtenerPermisosPaginados";
const limit = pLimit(3);
const cache = new NodeCache({ stdTTL: 60 * 60 }); // cache 1 hora

async function consultarPermiso(numero) {
  const cacheKey = `permiso:${numero}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const payload = {
    parameters: {
      draw: 1,
      columns: [
        { data: "Numero", name: "", searchable: true, orderable: false, search: { value: numero, regex: false } },
        { data: "Estado", name: "", searchable: true, orderable: false, search: { value: "", regex: false } }
      ],
      order: [],
      start: 0,
      length: 10,
      search: { value: "", regex: false }
    }
  };

  const headers = {
    "Content-Type": "application/json",
    Origin: "https://www.cre.gob.mx",
    Referer: "https://www.cre.gob.mx/",
    "User-Agent": "Mozilla/5.0 (Consulta Permisos CRE Bulk)"
  };

  const resp = await fetch(CRE_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  const data = await resp.json().catch(() => null);
  const permiso = data?.data?.[0] ?? null;

  let resultado;
  if (!permiso) {
    resultado = { permiso: numero, estatus: "no_encontrado", mensaje: "No se encontró." };
  } else {
    const estado = (permiso.Estado || "").toLowerCase();
    const vigente = estado.includes("vigente") || estado.includes("autorizado");
    resultado = {
      permiso: numero,
      estatus: vigente ? "vigente" : "no_vigente",
      mensaje: vigente ? "Permiso vigente." : `Estado: ${permiso.Estado}`,
      detalle: permiso
    };
  }

  cache.set(cacheKey, resultado);
  return resultado;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }

  const { permits } = req.body || {};
  if (!Array.isArray(permits) || permits.length === 0) {
    return res.status(400).json({ error: "Debe enviar un arreglo 'permits' con los números de permisos." });
  }

  try {
    const resultados = await Promise.all(
      permits.map((p) =>
        limit(async () => {
          try {
            return await consultarPermiso(p);
          } catch (err) {
            console.error(`Error con ${p}:`, err);
            return { permiso: p, estatus: "error", mensaje: "Error al consultar la CRE." };
          }
        })
      )
    );

    return res.status(200).json({ total: resultados.length, resultados });
  } catch (error) {
    console.error("Error general:", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
}
