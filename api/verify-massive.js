// API optimizada para verificación masiva de permisos CRE (4,000+)
import fetch from "node-fetch";
import pLimit from "p-limit";
import NodeCache from "node-cache";

const CRE_API_URL = "https://api-creweb.cne.gob.mx/api/Permisos/ObtenerPermisosPaginados";

// Optimización extrema para grandes volúmenes
const MASSIVE_BATCH_SIZE = 100; // Lotes más grandes
const MASSIVE_CONCURRENCY = 15; // 15 consultas simultáneas (máximo sin sobrecargar)
const cache = new NodeCache({ stdTTL: 60 * 60 * 24 }); // Cache de 1 día para permisos masivos

const massiveLimit = pLimit(MASSIVE_CONCURRENCY);

async function consultarPermisoMasivo(numero) {
  const cacheKey = `permiso_masivo:${numero}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const payload = {
      parameters: {
        draw: 1,
        columns: [
          { 
            data: "Numero", 
            name: "", 
            searchable: true, 
            orderable: false, 
            search: { value: numero, regex: false } 
          },
          { 
            data: "Estado", 
            name: "", 
            searchable: true, 
            orderable: false, 
            search: { value: "", regex: false } 
          }
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
      "User-Agent": "Mozilla/5.0 (Consulta Masiva CRE)"
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
      resultado = { 
        permiso: numero, 
        estatus: "no_encontrado", 
        mensaje: "No se encontró." 
      };
    } else {
      const estado = (permiso.Estado || "").toLowerCase();
      const vigente = estado.includes("vigente") || estado.includes("autorizado");
      resultado = {
        permiso: numero,
        estatus: vigente ? "vigente" : "no_vigente",
        mensaje: vigente ? "Permiso vigente." : `Estado: ${permiso.Estado}`,
        detalle: {
          PermisoId: permiso.PermisoId,
          Numero: permiso.Numero,
          Persona: permiso.Persona,
          Estado: permiso.Estado
        }
      };
    }

    cache.set(cacheKey, resultado);
    return resultado;
  } catch (error) {
    console.error(`Error masivo con ${numero}:`, error);
    return { 
      permiso: numero, 
      estatus: "error", 
      mensaje: "Error al consultar la CRE." 
    };
  }
}

// Procesamiento optimizado para 4,000+ permisos
async function processMassiveBatch(batch) {
  return await Promise.all(
    batch.map((p) =>
      massiveLimit(async () => {
        return await consultarPermisoMasivo(p);
      })
    )
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }

  const { permits, jobId } = req.body || {};
  if (!Array.isArray(permits) || permits.length === 0) {
    return res.status(400).json({ error: "Debe enviar un arreglo 'permits' con los números de permisos." });
  }

  const totalPermits = permits.length;
  console.log(`🚀 INICIANDO VERIFICACIÓN MASIVA: ${totalPermits} permisos`);

  // Configurar respuesta inmediata para procesos largos
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const allResults = [];
    const batches = [];
    
    // Crear lotes de MASSIVE_BATCH_SIZE
    for (let i = 0; i < permits.length; i += MASSIVE_BATCH_SIZE) {
      batches.push(permits.slice(i, i + MASSIVE_BATCH_SIZE));
    }

    console.log(`📊 Divididos en ${batches.length} lotes de ${MASSIVE_BATCH_SIZE} permisos`);

    let processed = 0;
    let startTime = Date.now();
    
    // Procesar lotes secuencialmente con pausas
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      // Calcular progreso y tiempo estimado
      const progress = ((processed / totalPermits) * 100).toFixed(1);
      const elapsedTime = (Date.now() - startTime) / 1000;
      
      // Solo calcular tiempo estimado si ya hemos procesado algo
      let estimatedMinutes = "calculando...";
      if (processed > 0) {
        const estimatedTotalTime = (elapsedTime / processed) * totalPermits;
        const remainingTime = estimatedTotalTime - elapsedTime;
        estimatedMinutes = Math.ceil(remainingTime / 60);
      }
      
      console.log(`📦 Procesando lote ${i + 1}/${batches.length} (${batch.length} permisos)`);
      console.log(`📈 Progreso: ${progress}% - Tiempo restante: ~${estimatedMinutes} minutos`);

      // Procesar el lote actual
      const batchResults = await processMassiveBatch(batch);
      allResults.push(...batchResults);
      processed += batch.length;

      console.log(`✅ Lote ${i + 1} completado. Procesados: ${processed}/${totalPermits}`);

      // Pausa estratégica entre lotes (más larga para evitar rate limits)
      if (i < batches.length - 1) {
        const pauseTime = Math.max(200, Math.min(1000, processed / 10)); // Pausa dinámica
        await new Promise(resolve => setTimeout(resolve, pauseTime));
      }
    }

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`🎉 VERIFICACIÓN MASIVA COMPLETADA: ${totalPermits} permisos en ${Math.ceil(totalTime)} segundos`);

    return res.status(200).json({
      total: allResults.length,
      resultados: allResults,
      procesamiento: "masivo_optimizado",
      lotesProcesados: batches.length,
      tiempoTotal: `${Math.ceil(totalTime)} segundos`,
      tiempoPromedioPorPermiso: `${(totalTime / totalPermits).toFixed(3)} segundos`,
      cacheHitRate: `${Math.round((cache.stats.hits / (cache.stats.hits + cache.stats.misses)) * 100)}%`,
      estadisticas: {
        vigentes: allResults.filter(r => r.estatus === 'vigente').length,
        no_vigentes: allResults.filter(r => r.estatus === 'no_vigente').length,
        no_encontrados: allResults.filter(r => r.estatus === 'no_encontrado').length,
        errores: allResults.filter(r => r.estatus === 'error').length
      }
    });

  } catch (error) {
    console.error("❌ Error en verificación masiva:", error);
    return res.status(500).json({ 
      error: "Error interno del servidor en procesamiento masivo.",
      detalles: error.message 
    });
  }
}