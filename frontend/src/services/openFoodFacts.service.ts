import axios from "axios";
import {
  FoodProduct,
  FoodSearchFilters,
  FoodSearchResult,
  NutriScore,
} from "@/types/nutrition";

// =========================================================================
// POURQUOI CE FICHIER A ÉTÉ RÉÉCRIT
// -------------------------------------------------------------------------
// L'ancien endpoint /cgi/search.pl (utilisé pour la recherche texte/filtres)
// est l'ancienne infrastructure "legacy" d'Open Food Facts. Elle est
// officiellement en cours d'abandon au profit de Search-a-licious
// (search.openfoodfacts.org), et elle est limitée à 10 req/min/IP avec un
// 503 global dès que l'infra est sous tension — d'où les erreurs 500/503
// fréquentes qu'on observait sur l'écran "Aliments".
//
// On utilise donc maintenant Search-a-licious en priorité pour la
// recherche et le pool "à découvrir". Le lookup par code-barres (utilisé
// par le scanner) continue d'utiliser /api/v2/product/{barcode}.json, qui
// est un endpoint stable et qui fonctionnait déjà très bien.
//
// Comme Search-a-licious est encore en beta et pas toujours documentée à
// 100%, on garde un filet de sécurité : si l'appel à la nouvelle API
// échoue (réseau, 5xx, réponse inattendue), on retente automatiquement
// sur l'ancienne API avant d'abandonner. L'app ne devrait donc plus jamais
// se retrouver bloquée à cause d'un seul endpoint en panne.
// =========================================================================

const LEGACY_BASE_URL = "https://world.openfoodfacts.org";
const SEARCH_BASE_URL = "https://search.openfoodfacts.org";

const USER_AGENT = "FitNova/1.0 (contact@fitnova.app)";

// Client pour l'ancienne API (utilisée pour le code-barres + repli de secours)
const legacyApi = axios.create({
  baseURL: LEGACY_BASE_URL,
  timeout: 15000,
  headers: { "User-Agent": USER_AGENT },
});

// Client pour la nouvelle API de recherche (Search-a-licious)
const searchApi = axios.create({
  baseURL: SEARCH_BASE_URL,
  timeout: 15000,
  headers: { "User-Agent": USER_AGENT },
});

// Correspondance libellés « objectif régime » -> tag OFF (labels_tags)
export const DIET_OPTIONS: { value: string; label: string; tag: string }[] = [
  { value: "vegan", label: "Vegan", tag: "en:vegan" },
  { value: "vegetarian", label: "Végétarien", tag: "en:vegetarian" },
  { value: "gluten_free", label: "Sans gluten", tag: "en:gluten-free" },
  { value: "organic", label: "Bio", tag: "en:organic" },
  { value: "low_sugar", label: "Pauvre en sucre", tag: "en:low-sugar" },
  { value: "palm_oil_free", label: "Sans huile de palme", tag: "en:palm-oil-free" },
];

// Grandes familles d'aliments proposées comme filtres rapides
export const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "boissons", label: "Boissons" },
  { value: "snacks", label: "Snacks" },
  { value: "produits laitiers", label: "Produits laitiers" },
  { value: "viandes", label: "Viandes" },
  { value: "fruits et legumes", label: "Fruits & légumes" },
  { value: "cereales et pommes de terre", label: "Céréales & pommes de terre" },
  { value: "vegetal", label: "Végétal" },
  { value: "desserts", label: "Desserts" },
  { value: "pains", label: "Pains" },
  { value: "surgeles", label: "Surgelés" },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Table de repli pour retirer les accents quand String.prototype.normalize
// n'est pas disponible (certains moteurs Hermes ne l'exposent pas selon la
// version / la présence d'ICU complet — c'était la cause du crash
// "undefined is not a function" sur la recherche par nom).
const ACCENTS_MAP: Record<string, string> = {
  à: "a", â: "a", ä: "a", á: "a", ã: "a",
  ç: "c",
  é: "e", è: "e", ê: "e", ë: "e",
  î: "i", ï: "i", í: "i",
  ô: "o", ö: "o", ó: "o", õ: "o",
  ù: "u", û: "u", ü: "u", ú: "u",
  ñ: "n",
  œ: "oe", æ: "ae",
};

const stripAccentsManually = (s: string): string =>
  s.replace(/[àâäáãçéèêëîïíôöóõùûüúñœæ]/g, (char) => ACCENTS_MAP[char] ?? char);

// Normalise (minuscules + sans accents) pour des comparaisons texte fiables.
// Défensif : n'utilise .normalize("NFD") que si la méthode existe vraiment
// sur cet environnement, sinon repli sur la table manuelle ci-dessus.
const normalize = (s: string): string => {
  if (!s || typeof s !== 'string') return '';
  
  const lower = s.toLowerCase();
  
  try {
    // Vérifier si normalize existe et est une fonction
    if (typeof lower.normalize === 'function') {
      return lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
  } catch (error) {
    console.warn('normalize with NFD failed, using manual fallback:', error);
  }
  
  // Fallback manuel
  return stripAccentsManually(lower);
};

const textIncludes = (haystack: string | null | undefined, needle: string): boolean => {
  if (!haystack || !needle) return false;
  if (typeof haystack !== 'string' || typeof needle !== 'string') return false;
  try {
    // Vérifie si le texte commence par le terme recherché
    return normalize(haystack).startsWith(normalize(needle));
  } catch (error) {
    console.warn('textIncludes failed:', error);
    return false;
  }
};

// Nettoie un tag OFF du style "en:gluten-free" -> "gluten free"
const cleanTag = (tag: string): string => tag.replace(/^\w+:/, "").replace(/-/g, " ");

// =========================================================================
// RETRY AVEC BACKOFF
// -------------------------------------------------------------------------
// Réessaie automatiquement en cas d'erreur transitoire (503/502/504,
// timeout, coupure réseau) avec un délai croissant + un peu de hasard
// (jitter) pour éviter que plusieurs requêtes ne retentent toutes en même
// temps. On ne réessaie PAS sur les erreurs "normales" (ex: 404) pour ne
// pas perdre de temps inutilement.
// =========================================================================
const isRetryableError = (error: any): boolean => {
  const status = error?.response?.status;
  if (status && [502, 503, 504].includes(status)) return true;
  // Pas de réponse du tout = souci réseau/timeout -> on retente aussi
  if (!error?.response) return true;
  return false;
};

const withRetry = async <T,>(
  fn: () => Promise<T>,
  { retries = 2, baseDelayMs = 500 }: { retries?: number; baseDelayMs?: number } = {}
): Promise<T> => {
  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === retries;
      if (isLastAttempt || !isRetryableError(error)) {
        throw error;
      }
      const jitter = Math.random() * 200;
      await sleep(baseDelayMs * 2 ** attempt + jitter);
    }
  }
  throw lastError;
};

// =========================================================================
// PETIT CACHE CLIENT
// -------------------------------------------------------------------------
// Évite de retaper l'API pour une requête identique lancée deux fois de
// suite (ex: double montage en mode dev / re-render), ce qui réduit encore
// le risque de se faire rate-limiter.
// =========================================================================
const CACHE_TTL_MS = 60_000;
const searchCache = new Map<string, { timestamp: number; data: FoodSearchResult }>();

const getFromCache = (key: string): FoodSearchResult | null => {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return entry.data;
};

const setCache = (key: string, data: FoodSearchResult) => {
  searchCache.set(key, { timestamp: Date.now(), data });
  // On évite que le cache ne grossisse indéfiniment.
  if (searchCache.size > 40) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
};

/**
 * Vérification stricte côté client : on revérifie chaque produit contre
 * TOUS les filtres actifs, quelle que soit l'API utilisée en amont,
 * car aucune des deux ne garantit un ET strict entre plusieurs critères.
 */
const matchesAllFilters = (
  product: FoodProduct,
  filters: {
    query?: string;
    category?: string;
    dietLabel?: string;
    nutritionGrade?: string;
    minCalories?: number;
    maxCalories?: number;
  }
): boolean => {
  const { query, category, dietLabel, nutritionGrade, minCalories, maxCalories } = filters;

  if (query && query.trim()) {
    const q = query.trim();
    const matchesName = textIncludes(product.name, q) || textIncludes(product.brand, q);
    if (!matchesName) return false;
  }

  if (category) {
    const words = normalize(category).split(/\s+/).filter(Boolean);
    const productCategories = normalize(product.categories || "");
    const matchesCategory = words.every((w) => productCategories.includes(w));
    if (!matchesCategory) return false;
  }

  if (dietLabel) {
    const diet = DIET_OPTIONS.find((d) => d.value === dietLabel);
    if (diet) {
      const keyword = cleanTag(diet.tag); // "en:gluten-free" -> "gluten free"
      const matchesDiet =
        textIncludes(product.labels, keyword) || textIncludes(product.labels, diet.label);
      if (!matchesDiet) return false;
    }
  }

  if (nutritionGrade) {
    if ((product.nutriScore || "").toLowerCase() !== nutritionGrade.toLowerCase()) return false;
  }

  if (typeof minCalories === "number" || typeof maxCalories === "number") {
    const calories = product.caloriesPer100g;
    if (calories === null || calories === undefined) return false;
    if (typeof minCalories === "number" && calories < minCalories) return false;
    if (typeof maxCalories === "number" && calories > maxCalories) return false;
  }

  return true;
};

const asNutriScore = (grade: unknown): NutriScore => {
  const g = typeof grade === "string" ? grade.toLowerCase() : null;
  if (g === "a" || g === "b" || g === "c" || g === "d" || g === "e") return g;
  return null;
};

/**
 * Mapper unique et tolérant : fonctionne aussi bien avec la forme des
 * résultats de l'ancienne API (/cgi/search.pl, /api/v2/product) qu'avec
 * celle de Search-a-licious, dont les champs peuvent légèrement varier
 * (ex: `categories` en texte vs `categories_tags` en tableau).
 */
const mapProduct = (p: any): FoodProduct => {
  const categories =
    p.categories ??
    (Array.isArray(p.categories_tags)
      ? p.categories_tags.map(cleanTag).join(", ")
      : null);

  const labels =
    p.labels ??
    (Array.isArray(p.labels_tags) ? p.labels_tags.map(cleanTag).join(", ") : null);

  return {
    id: p.code || p._id || p.id || "",
    name: p.product_name || p.product_name_fr || p.generic_name || "Produit sans nom",
    brand: p.brands || null,
    imageUrl:
      p.image_front_small_url || p.image_url || p.image_small_url || p.image_front_url || null,
    quantity: p.quantity || null,
    categories,
    caloriesPer100g:
      p.nutriments?.["energy-kcal_100g"] ??
      (p.nutriments?.["energy_100g"] ? Math.round(p.nutriments["energy_100g"] / 4.184) : null),
    proteinPer100g: p.nutriments?.proteins_100g ?? null,
    carbsPer100g: p.nutriments?.carbohydrates_100g ?? null,
    fatPer100g: p.nutriments?.fat_100g ?? null,
    sugarsPer100g: p.nutriments?.sugars_100g ?? null,
    fiberPer100g: p.nutriments?.fiber_100g ?? null,
    saltPer100g: p.nutriments?.salt_100g ?? null,
    nutriScore: asNutriScore(p.nutriscore_grade || p.nutrition_grades),
    novaGroup: p.nova_group ?? null,
    ingredientsText: p.ingredients_text_fr || p.ingredients_text || null,
    allergens: (p.allergens_tags || []).map((a: string) => a.replace(/^\w+:/, "")),
    labels,
  };
};

const sortProducts = (
  products: FoodProduct[],
  sortBy: FoodSearchFilters["sortBy"]
): FoodProduct[] => {
  if (sortBy === "calories_asc") {
    return [...products].sort(
      (a, b) => (a.caloriesPer100g ?? Infinity) - (b.caloriesPer100g ?? Infinity)
    );
  }
  if (sortBy === "calories_desc") {
    return [...products].sort(
      (a, b) => (b.caloriesPer100g ?? -1) - (a.caloriesPer100g ?? -1)
    );
  }
  if (sortBy === "protein_desc") {
    return [...products].sort(
      (a, b) => (b.proteinPer100g ?? -1) - (a.proteinPer100g ?? -1)
    );
  }
  if (sortBy === "nutriscore") {
    const rank: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, e: 4 };
    return [...products].sort(
      (a, b) => (rank[a.nutriScore || "e"] ?? 5) - (rank[b.nutriScore || "e"] ?? 5)
    );
  }
  return products;
};

// =========================================================================
// SEARCH-A-LICIOUS (nouvelle API — chemin principal)
// =========================================================================

/**
 * Construit la requête texte envoyée à Search-a-licious. On reste volontairement
 * simple (pas de syntaxe de champs avancée type `categories_tags:xxx`, non
 * garantie stable pendant la beta) : on combine le texte cherché et les mots
 * du filtre catégorie/régime dans une seule recherche plein-texte, puis on
 * revérifie strictement chaque résultat côté client avec `matchesAllFilters`.
 * C'est plus robuste face aux évolutions de l'API que de parier sur une
 * syntaxe de requête non documentée à 100%.
 */
const buildSearchQuery = (filters: {
  query?: string;
  category?: string;
  dietLabel?: string;
}): string => {
  const parts: string[] = [];
  if (filters.query && filters.query.trim()) parts.push(filters.query.trim());
  if (filters.category) parts.push(filters.category);
  if (filters.dietLabel) {
    const diet = DIET_OPTIONS.find((d) => d.value === filters.dietLabel);
    if (diet) parts.push(diet.label);
  }
  return parts.join(" ").trim();
};

const fetchFromSearchALicious = async (params: {
  q: string;
  page: number;
  pageSize: number;
}): Promise<{ products: FoodProduct[]; totalCount: number }> => {
  const { data } = await withRetry(() =>
    searchApi.get("/search", {
      params: {
        q: params.q,
        langs: "fr,en",
        page: params.page,
        page_size: params.pageSize,
      },
    })
  );

  // La forme exacte de la réponse peut varier selon la version de
  // l'API (encore en beta) : on couvre les clés les plus probables.
  const rawHits: any[] = data?.hits ?? data?.products ?? [];
  const products = rawHits.map(mapProduct);
  const totalCount = Number(data?.count ?? data?.total ?? products.length) || products.length;

  return { products, totalCount };
};

// =========================================================================
// ANCIENNE API (repli de secours + lookup code-barres)
// =========================================================================

const fetchFromLegacySearch = async (filters: {
  query?: string;
  category?: string;
  dietLabel?: string;
  nutritionGrade?: string;
  page: number;
  pageSize: number;
}): Promise<{ products: FoodProduct[]; totalCount: number }> => {
  const params: any = { action: "process", page_size: filters.pageSize, page: filters.page, json: 1 };

  let tagSlot = 0;
  if (filters.category) {
    params[`tagtype_${tagSlot}`] = "categories";
    params[`tag_contains_${tagSlot}`] = "contains";
    params[`tag_${tagSlot}`] = filters.category;
    tagSlot += 1;
  }
  if (filters.query && filters.query.trim()) {
    params.search_terms = filters.query.trim();
  }
  if (filters.dietLabel) {
    const diet = DIET_OPTIONS.find((d) => d.value === filters.dietLabel);
    if (diet) {
      params[`tagtype_${tagSlot}`] = "labels";
      params[`tag_contains_${tagSlot}`] = "contains";
      params[`tag_${tagSlot}`] = diet.tag;
      tagSlot += 1;
    }
  }
  if (filters.nutritionGrade) {
    params.nutrition_grades = filters.nutritionGrade.toUpperCase();
  }

  const { data } = await withRetry(() => legacyApi.get("/cgi/search.pl", { params }));

  const products = Array.isArray(data.products) ? data.products.map(mapProduct) : [];
  const totalCount = Number(data.count) || products.length;

  return { products, totalCount };
};

/**
 * Recherche multi-critères d'aliments : Search-a-licious en priorité,
 * repli automatique sur l'ancienne API en cas d'échec.
 */
export const searchFood = async (
  filters: FoodSearchFilters
): Promise<FoodSearchResult> => {
  const {
    query,
    category,
    dietLabel,
    nutritionGrade,
    minCalories,
    maxCalories,
    sortBy = "relevance",
    page = 1,
    pageSize = 50,
  } = filters;

  const cacheKey = JSON.stringify({
    query,
    category,
    dietLabel,
    nutritionGrade,
    minCalories,
    maxCalories,
    sortBy,
    page,
    pageSize,
  });
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const clientFilters = { query, category, dietLabel, nutritionGrade, minCalories, maxCalories };

  let products: FoodProduct[] = [];
  let totalCount = 0;

  try {
    const q = buildSearchQuery({ query, category, dietLabel });
    const result = await fetchFromSearchALicious({ q, page, pageSize });
    products = result.products;
    totalCount = result.totalCount;
  } catch (searchError: any) {
    console.error(
      "Search-a-licious indisponible, repli sur l'ancienne API :",
      searchError?.response?.status,
      searchError?.message
    );
    try {
      const fallback = await fetchFromLegacySearch({
        query,
        category,
        dietLabel,
        nutritionGrade,
        page,
        pageSize,
      });
      products = fallback.products;
      totalCount = fallback.totalCount;
    } catch (legacyError: any) {
      console.error(
        "Ancienne API également indisponible :",
        legacyError?.response?.status,
        legacyError?.message
      );
      return { products: [], page, pageCount: 0, totalCount: 0 };
    }
  }

  // On revérifie systématiquement tous les filtres côté client, quelle
  // que soit l'API utilisée en amont (aucune des deux ne garantit un ET
  // strict entre plusieurs critères combinés).
  products = products.filter((p) => matchesAllFilters(p, clientFilters));
  products = sortProducts(products, sortBy);

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const result: FoodSearchResult = { products, page, pageCount, totalCount };
  setCache(cacheKey, result);
  return result;
};

/**
 * Récupère un lot de `count` (50 par défaut) aliments à afficher avant
 * toute recherche ("À découvrir"), et rejouable via le bouton refresh.
 * Search-a-licious en priorité, repli sur l'ancienne API si besoin.
 */
export const getRandomFoodsPool = async (count = 50): Promise<FoodProduct[]> => {
  const shuffle = (arr: FoodProduct[]): FoodProduct[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  try {
    const { data } = await withRetry(() =>
      searchApi.get("/search", {
        params: {
          q: "*",
          langs: "fr,en",
          page: Math.floor(Math.random() * 10) + 1,
          page_size: count,
        },
      })
    );
    const rawHits: any[] = data?.hits ?? data?.products ?? [];
    if (rawHits.length > 0) {
      return shuffle(rawHits.map(mapProduct)).slice(0, count);
    }
    throw new Error("Réponse Search-a-licious vide");
  } catch (searchError: any) {
    // Repli normal et attendu (pas un vrai bug) : on ne logue qu'en debug
    // pour ne pas polluer la console alors que le fallback fonctionne bien.
    if (__DEV__) {
      console.log(
        "[foods] Search-a-licious vide pour le pool aléatoire, repli sur l'ancienne API."
      );
    }
  }

  try {
    const randomPage = Math.floor(Math.random() * 10) + 1;
    const { data } = await withRetry(() =>
      legacyApi.get("/cgi/search.pl", {
        params: {
          action: "process",
          page_size: count,
          page: randomPage,
          json: 1,
          sort_by: "unique_scans_n",
        },
      })
    );
    const products = Array.isArray(data?.products) ? data.products.map(mapProduct) : [];
    return shuffle(products).slice(0, count);
  } catch (legacyError: any) {
    console.error("OFF random foods error (les deux API ont échoué) :", {
      status: legacyError?.response?.status,
      message: legacyError?.message,
    });
    return [];
  }
};

/** Récupère les informations complètes d'un produit via son code-barres. */
export const getProductByBarcode = async (
  barcode: string
): Promise<FoodProduct | null> => {
  try {
    const { data } = await withRetry(() =>
      legacyApi.get(`/api/v2/product/${encodeURIComponent(barcode)}.json`, {
        params: {
          fields:
            "code,product_name,product_name_fr,generic_name,brands,image_front_small_url,image_url,image_small_url,quantity,categories,nutriments,nutriscore_grade,nutrition_grades,nova_group,ingredients_text,ingredients_text_fr,allergens_tags,labels",
        },
      })
    );

    if (data.status !== 1 || !data.product) return null;
    return mapProduct(data.product);
  } catch (error) {
    console.error("Error fetching product by barcode:", error);
    return null;
  }
};