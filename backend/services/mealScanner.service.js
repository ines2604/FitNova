// Service d'analyse nutritionnelle d'une photo de repas
// Basé sur l'API Gemini (vision), même client que chatbot.service.js
// Configure GEMINI_API_KEY dans le .env

const fs = require("fs");
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const SYSTEM_PROMPT = `
Tu es un expert en nutrition. On te fournit une photo d'une assiette ou d'un repas.

Ta tâche :
1. Identifie chaque aliment visible sur la photo.
2. Estime la quantité/portion de chaque aliment (en grammes ou en unité approximative, ex: "150 g", "1 portion", "2 tranches").
3. Estime les calories et macronutriments (protéines, glucides, lipides en grammes) de chaque aliment, en te basant sur la portion estimée.
4. Calcule les totaux du repas.
5. Donne un score de confiance global ("low", "medium" ou "high") selon la qualité de la photo et la difficulté d'identification.

Règles strictes :
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant/après, sans balises markdown.
- Si la photo ne contient clairement aucun aliment/repas, renvoie items: [] et note l'expliquant.
- Les valeurs numériques sont des estimations : reste raisonnable et cohérent (pas de valeurs aberrantes).
- Utilise le français pour les noms d'aliments et la note.

Format JSON attendu exactement :
{
  "items": [
    {
      "name": "string",
      "quantity": "string",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number
    }
  ],
  "totalCalories": number,
  "totalProtein": number,
  "totalCarbs": number,
  "totalFat": number,
  "confidence": "low" | "medium" | "high",
  "note": "string"
}
`;

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

// Analyse une photo de repas (chemin local du fichier uploadé par multer)
// et retourne les informations nutritionnelles estimées.
const analyzeMealPhoto = async (filePath, mimeType) => {
  try {
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString("base64");

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: mimeType || "image/jpeg", data: base64Image } },
            { text: "Analyse ce repas et renvoie le JSON demandé." },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 2048,
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    });

    const raw = response.text || "";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Réponse Gemini non-JSON:", raw);
      throw new Error("Impossible d'interpréter l'analyse du repas.");
    }

    // Normalisation défensive : on s'assure que tous les champs attendus existent
    const items = Array.isArray(parsed.items)
      ? parsed.items.map((item) => ({
          name: String(item.name || "Aliment"),
          quantity: item.quantity ? String(item.quantity) : null,
          calories: Number(item.calories) || 0,
          protein: Number(item.protein) || 0,
          carbs: Number(item.carbs) || 0,
          fat: Number(item.fat) || 0,
        }))
      : [];

    const sum = (key) => items.reduce((acc, it) => acc + it[key], 0);

    return {
      items,
      totalCalories: Number(parsed.totalCalories) || Math.round(sum("calories")),
      totalProtein: Number(parsed.totalProtein) || Math.round(sum("protein")),
      totalCarbs: Number(parsed.totalCarbs) || Math.round(sum("carbs")),
      totalFat: Number(parsed.totalFat) || Math.round(sum("fat")),
      confidence: ["low", "medium", "high"].includes(parsed.confidence)
        ? parsed.confidence
        : "medium",
      note: parsed.note ? String(parsed.note) : "",
    };
  } catch (error) {
    console.error("Erreur Gemini Meal Scanner:", error);
    throw new Error(
      "Erreur lors de l'analyse de la photo du repas."
    );
  }
};

module.exports = {
  analyzeMealPhoto,
  MIME_TYPES,
};