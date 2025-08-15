const OpenAI = require("openai");

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { profile = {}, data = {}, lines = [], totals = {} } = body || {};

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const rules = (lines || [])
      .map((l) => `${l.desc || ""} x ${l.qty || 0} à €${l.price || 0}`)
      .join("\n");

    const userContent =
      `Bedrijf: ${profile.company || ""}\n` +
      `Klant: ${data.client || ""}\n` +
      `Omschrijving: ${data.description || ""}\n` +
      `Uren: ${data.hours || 0} à €${data.rate || 0}\n` +
      `Regels:\n${rules}\n` +
      `Totaal incl. btw: €${totals.inc || 0}`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content:
            "Schrijf een korte, professionele offerte-inleiding (max 120 woorden). Benadruk kwaliteit, levertijd en volgende stap. Taal: Nederlands.",
        },
        { role: "user", content: userContent },
      ],
    });

    const text =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Bedankt voor uw aanvraag. Hieronder vindt u onze offerte.";

    return res.status(200).json({ intro: text });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: err?.message || "Onbekende serverfout" });
  }
};
