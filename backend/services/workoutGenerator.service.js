// Génération de séances par IA (Gemini) à partir du catalogue `exercises`.
//
// Principe : l'IA ne connaît que la liste réduite d'exercices que la BD lui
// fournit et ne renvoie que des id de cette liste + sets / durée / repos.
// Tout ce qu'elle renvoie est revalidé et borné (utils/workoutPlanner.js) avant
// d'être utilisé. Si l'IA est indisponible, trop lente ou répond n'importe
// quoi, on retombe sur la génération par règles : l'utilisateur obtient
// toujours une séance valide.

const { GoogleGenAI, Type } = require("@google/genai");
const exerciseModel = require("../models/exercise.model");
const { mediaUrl } = require("../utils/exerciseMedia");
const P = require("../utils/workoutPlanner");

const MODEL = process.env.GEMINI_WORKOUT_MODEL || "gemini-3.6-flash";
const AI_TIMEOUT_MS = 20000;

let client = null;
const getClient = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
};

const withTimeout = (promise, ms) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Délai de l'IA dépassé")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    exercises: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          exerciseId: { type: Type.STRING },
          sets: { type: Type.INTEGER },
          durationSeconds: { type: Type.INTEGER },
          restSeconds: { type: Type.INTEGER },
        },
        required: ["exerciseId", "sets", "durationSeconds", "restSeconds"],
      },
    },
  },
  required: ["name", "exercises"],
};

const parseAiJson = (text) => {
  const cleaned = String(text || "").replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
};

const askAi = async (pool, params) => {
  const ai = getClient();
  if (!ai) return null;

  const candidates = P.buildAiCandidates(pool, params);
  const response = await withTimeout(
    ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: P.buildAiPrompt(candidates, params) }] }],
      config: {
        systemInstruction:
          "Tu es un coach sportif. Tu réponds uniquement en JSON, en utilisant exclusivement les id d'exercices fournis.",
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.5,
        maxOutputTokens: 2048,
      },
    }),
    AI_TIMEOUT_MS
  );
  return parseAiJson(response.text);
};

/**
 * @param params  { goal, level, location, focus, durationMinutes } déjà validés
 * @param options { useAi = true }
 * @returns séance à prévisualiser : { name, source: "ai"|"rules", exercises:
 *   [{ exerciseId, name, image, bodyPart, equipment, sets, durationSeconds,
 *   restSeconds }], totalSeconds, targetSeconds, warnings }
 */
const generateWorkout = async (params, { useAi = true } = {}) => {
  const exercises = await exerciseModel.getAllForGenerator();
  const poolInfo = P.buildPoolWithFallback(exercises, params);

  let plan = null;
  if (useAi) {
    try {
      const aiPlan = await askAi(poolInfo.pool, params);
      if (aiPlan) {
        plan = P.sanitizeAiPlan(aiPlan, poolInfo.pool, params, [...poolInfo.warnings]);
      }
    } catch (error) {
      console.warn("Génération IA indisponible, repli sur les règles :", error.message);
    }
  }

  if (!plan) {
    plan = P.planWithRules(exercises, params, {
      poolInfo: { pool: poolInfo.pool, warnings: [...poolInfo.warnings] },
    });
  }

  return {
    ...plan,
    exercises: plan.exercises.map((e) => ({ ...e, image: mediaUrl(e.image) })),
  };
};

module.exports = { generateWorkout };
