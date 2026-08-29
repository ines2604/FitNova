// Service du chatbot santé/fitness/bien-être
// Basé sur l'API Gemini
// Configure GEMINI_API_KEY dans le .env

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const SYSTEM_PROMPT = `
Tu es l'assistant santé, fitness et bien-être de l'application FitNova.

Tu réponds principalement aux questions liées à :
- nutrition
- calories
- alimentation
- activité physique
- fitness
- perte ou prise de poids
- sommeil
- hydratation
- bien-être général

Règles :
- Réponds en français sauf si l'utilisateur utilise une autre langue.
- Reste bienveillant, clair et naturel.
- Sois complet : ne coupe jamais une explication ou une liste en plein milieu, va jusqu'au bout de ton idée.
- Donne des conseils pratiques et faciles à comprendre.
- Pour les calories et les besoins énergétiques, donne des estimations et précise
  qu'elles peuvent varier selon la personne et les portions.
- Ne pose jamais de diagnostic médical.
- Ne prescris jamais de médicaments ou de traitements.
- Pour un problème médical sérieux ou des symptômes inquiétants,
  recommande de consulter un professionnel de santé.
- Si la question n'est pas liée à la santé, au fitness, à la nutrition,
  au sommeil, à l'hydratation ou au bien-être, invite poliment l'utilisateur
  à poser une question dans le domaine de FitNova.
`;

// Envoie l'historique de conversation à Gemini
// et retourne la réponse du chatbot.
const getChatbotReply = async (conversationHistory) => {
  try {
    /*
      conversationHistory :
      [
        { sender: "user", content: "Bonjour" },
        { sender: "bot", content: "Bonjour ! Comment puis-je vous aider ?" },
        { sender: "user", content: "Combien de calories..." }
      ]
    */

    const contents = conversationHistory.map((message) => ({
      role: message.sender === "bot" ? "model" : "user",
      parts: [
        {
          text: message.content,
        },
      ],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 2048,
        temperature: 0.7,
      },
    });

    return (
      response.text ||
      "Désolé, je n'ai pas pu générer une réponse."
    );
  } catch (error) {
    console.error("Erreur Gemini Chatbot:", error);

    throw new Error(
      "Erreur lors de la communication avec le chatbot."
    );
  }
};

module.exports = {
  getChatbotReply,
};