import fetch from "node-fetch";
import pLimit from "p-limit";
import NodeCache from "node-cache";

const CRE_API_URL = "https://api-creweb.cne.gob.mx/api/Permisos/ObtenerPermisosPaginados";

// Optimización para grandes volúmenes
const BATCH_SIZE = 50; // Procesar en lotes de 50
const CONCURRENT_REQUESTS = 10; // 10 consultas simultáneas (aumentado de 3)
const cache = new NodeCache({ stdTTL: 60 * 60 }); // cache 1 hora

// Crear múltiples limitadores para diferentes niveles de concurrencia
const lowLimit = pLimit(3); // Para consultas individuales
const highLimit = pLimit(CONCURRENT_REQUESTS); // Para procesamiento masivo

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

// Manejar procesamiento por lotes para grandes volúmenes
async function handleBatchProcessing(res, permits) {
  const total = permits.length;
  console.log(`Iniciando procesamiento por lotes para ${total} permisos`);
  
  const batches = [];
  for (let i = 0; i < permits.length; i += BATCH_SIZE) {
    batches.push(permits.slice(i, i + BATCH_SIZE));
  }
  
  const allResults = [];
  let processed = 0;
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Procesando lote ${i + 1}/${batches.length} (${batch.length} permisos)`);
    
    try {
      const batchResults = await Promise.all(
        batch.map((p) =>
          highLimit(async () => {
            try {
              return await consultarPermiso(p);
            } catch (err) {
              console.error(`Error con ${p}:`, err);
              return { permiso: p, estatus: "error", mensaje: "Error al consultar la CRE." };
            }
          })
        )
      );
      
      allResults.push(...batchResults);
      processed += batch.length;
      
      console.log(`Completado lote ${i + 1}/${batches.length}. Total procesado: ${processed}/${total}`);
      
      // Pequeño descanso entre lotes para evitar sobrecargar la API
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Error procesando lote ${i + 1}:`, error);
      // Continuar con los siguientes lotes
    }
  }
  
  return res.status(200).json({
    total: allResults.length,
    resultados: allResults,
    procesamiento: "por_lotes",
    lotesProcesados: batches.length,
    tiempoEstimado: "completado"
  });
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
    // Si hay más de 100 permisos, usar procesamiento por lotes
    if (permits.length > 100) {
      return await handleBatchProcessing(res, permits);
    }
    
    // Para menos de 100 permisos, usar procesamiento simultáneo optimizado
    const resultados = await Promise.all(
      permits.map((p) =>
        highLimit(async () => {
          try {
            return await consultarPermiso(p);
          } catch (err) {
            console.error(`Error con ${p}:`, err);
            return { permiso: p, estatus: "error", mensaje: "Error al consultar la CRE." };
          }
        })
      )
    );

    return res.status(200).json({
      total: resultados.length,
      resultados,
      procesamiento: "simultaneo",
      tiempoEstimado: "completado"
    });
  } catch (error) {
    console.error("Error general:", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
}
