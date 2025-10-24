import fetch from "node-fetch";

const CRE_API_URL = "https://api-creweb.cne.gob.mx/api/Permisos/ObtenerPermisosPaginados";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }

  const { permitNumber } = req.body || {};
  if (!permitNumber) {
    return res.status(400).json({ error: "Falta el campo permitNumber." });
  }

  if (permitNumber === "TEST-CONNECTION") {
    return res.status(200).json({
      permiso: "TEST-CONNECTION",
      estatus: "ok",
      mensaje: "Servidor verificador operativo en Vercel."
    });
  }

  try {
    const payload = {
      parameters: {
        draw: 1,
        columns: [
          { data: "Numero", name: "", searchable: true, orderable: false, search: { value: permitNumber, regex: false } },
          { data: "Estado", name: "", searchable: true, orderable: false, search: { value: "", regex: false } },
          { data: "Persona", name: "", searchable: true, orderable: false, search: { value: "", regex: false } },
          { data: "AliasProyecto", name: "", searchable: true, orderable: false, search: { value: "", regex: false } },
          { data: "ResolucionesAsociadas", name: "", searchable: true, orderable: false, search: { value: "", regex: false } },
          { data: "AnexosAsociados", name: "", searchable: true, orderable: false, search: { value: "", regex: false } }
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
      "User-Agent": "Mozilla/5.0 (Consulta Permisos CRE)"
    };

    const resp = await fetch(CRE_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      throw new Error(`Error HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const permiso = data?.data?.[0] ?? null;

    if (!permiso) {
      return res.status(200).json({
        permiso: permitNumber,
        estatus: "no_encontrado",
        mensaje: "No se encontró información en la CRE."
      });
    }

    const estado = (permiso.Estado || "").toLowerCase();
    const vigente = estado.includes("vigente") || estado.includes("autorizado");

    return res.status(200).json({
      permiso: permitNumber,
      estatus: vigente ? "vigente" : "no_vigente",
      mensaje: vigente ? "Permiso vigente." : `Estado: ${permiso.Estado}`,
      detalle: permiso
    });
  } catch (error) {
    console.error("Error consultando la CRE:", error);
    return res.status(500).json({
      permiso: permitNumber,
      estatus: "error_conexion",
      mensaje: "No se pudo conectar con la CRE o hubo un error inesperado."
    });
  }
}
