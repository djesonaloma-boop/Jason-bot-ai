// JASONBOT AI — Proxy sécurisé vers DAVBOT
// Vercel déploie automatiquement les fichiers JavaScript du dossier /api.
const DAVBOT_URL = "https://davbot.pages.dev/api/intelligence-artificielle/ask";

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée. Utilise POST." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    if (!body.message && !body.image) {
      return res.status(400).json({ error: "Le champ message ou image est obligatoire." });
    }

    // Transmet les champs attendus à DAVBOT sans exposer de clé secrète côté navigateur.
    const payload = {
      message: String(body.message || "Analyse cette image."),
      knowledge: String(body.knowledge || ""),
      rules: String(body.rules || ""),
      history: Array.isArray(body.history) ? body.history.slice(-20) : []
    };
    if (typeof body.image === "string" && body.image.startsWith("data:image/")) {
      if (body.image.length > 8 * 1024 * 1024) {
        return res.status(413).json({ error: "Image trop volumineuse." });
      }
      payload.image = body.image;
    }

    const upstream = await fetch(DAVBOT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    });

    const raw = await upstream.text();
    let data;
    try { data = JSON.parse(raw); }
    catch (_) { data = { message: raw }; }

    return res.status(upstream.status).json(data);
  } catch (error) {
    console.error("JASONBOT proxy error:", error);
    return res.status(502).json({
      error: "Impossible de joindre le service DAVBOT.",
      detail: error && error.message ? error.message : "Erreur inconnue"
    });
  }
};
