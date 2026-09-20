// Utilitaires partagés pour filtrer les données des graphiques du profil
// (poids et calories) par période : semaine / mois / année en cours.
//
// Convention : on manipule des dates en "midi local" (T12:00:00) pour éviter
// les décalages liés au fuseau horaire lors du parsing d'une simple date SQL
// (YYYY-MM-DD), comme déjà pratiqué côté backend (voir dashboard.controller.js).

export type ChartPeriod = "week" | "month" | "year";

export const PERIOD_LABELS: Record<ChartPeriod, string> = {
  week: "Semaine",
  month: "Mois",
  year: "Année",
};

// Convertit une valeur de date (string "YYYY-MM-DD", ISO string ou Date) en
// objet Date fixé à midi local, pour éviter tout décalage de jour.
export function toLocalDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const datePart = value.slice(0, 10);
  return new Date(`${datePart}T12:00:00`);
}

// Renvoie le début (minuit local) de la période courante :
// - "week"  -> lundi de la semaine en cours
// - "month" -> 1er jour du mois en cours
// - "year"  -> 1er janvier de l'année en cours
export function getPeriodStart(period: ChartPeriod): Date {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === "week") {
    const day = start.getDay(); // 0 = dimanche
    const diffToMonday = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diffToMonday);
  } else if (period === "month") {
    start.setDate(1);
  } else {
    start.setMonth(0, 1);
  }
  return start;
}

// Filtre un tableau d'éléments datés pour ne garder que ceux appartenant à
// la période sélectionnée.
export function filterByPeriod<T>(
  items: T[],
  period: ChartPeriod,
  getDateFn: (item: T) => Date
): T[] {
  const start = getPeriodStart(period);
  return items.filter((item) => getDateFn(item).getTime() >= start.getTime());
}

// Pour la vue "année" : ne garde que le dernier enregistrement de chaque
// mois (ex. dernière pesée du mois), afin de ne pas surcharger le graphique.
export function keepLastPerMonth<T>(
  items: T[],
  getDateFn: (item: T) => Date
): T[] {
  const byMonth = new Map<string, T>();
  for (const item of items) {
    const d = getDateFn(item);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const existing = byMonth.get(key);
    if (!existing || getDateFn(existing).getTime() < d.getTime()) {
      byMonth.set(key, item);
    }
  }
  return Array.from(byMonth.values()).sort(
    (a, b) => getDateFn(a).getTime() - getDateFn(b).getTime()
  );
}

// Choisit automatiquement la période initiale la plus pertinente : la plus
// courte parmi Semaine / Mois / Année qui contient au moins 2 points. Cela
// évite d'afficher "Pas assez de données" par défaut simplement parce que
// la dernière pesée enregistrée dans weight_bmi_history date de plus d'une
// semaine (le poids n'est mis à jour qu'à la création du profil ou lors
// d'une modification, contrairement aux calories suivies au quotidien).
export function pickDefaultPeriod<T>(
  sortedItems: T[],
  getDateFn: (item: T) => Date
): ChartPeriod {
  if (filterByPeriod(sortedItems, "week", getDateFn).length >= 2) {
    return "week";
  }
  if (filterByPeriod(sortedItems, "month", getDateFn).length >= 2) {
    return "month";
  }
  const yearPoints = keepLastPerMonth(
    filterByPeriod(sortedItems, "year", getDateFn),
    getDateFn
  );
  if (yearPoints.length >= 2) {
    return "year";
  }
  return "week";
}

// Point journalier pour le graphique des calories (consommées / brûlées).
export type CaloriePoint = {
  date: Date;
  consumed: number;
  burned: number;
};

// Pour la vue "année" sur les calories : regroupe par mois et calcule la
// moyenne journalière consommée/brûlée de chaque mois.
export function averagePerMonth(items: CaloriePoint[]): CaloriePoint[] {
  const byMonth = new Map<
    string,
    { date: Date; sumConsumed: number; sumBurned: number; count: number }
  >();

  for (const item of items) {
    const key = `${item.date.getFullYear()}-${item.date.getMonth()}`;
    const entry = byMonth.get(key) || {
      date: new Date(item.date.getFullYear(), item.date.getMonth(), 1),
      sumConsumed: 0,
      sumBurned: 0,
      count: 0,
    };
    entry.sumConsumed += item.consumed;
    entry.sumBurned += item.burned;
    entry.count += 1;
    byMonth.set(key, entry);
  }

  return Array.from(byMonth.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((entry) => ({
      date: entry.date,
      consumed: Math.round(entry.sumConsumed / entry.count),
      burned: Math.round(entry.sumBurned / entry.count),
    }));
}

// Point unique (date + valeur) pour un graphique à une seule courbe, comme
// pour le nombre de pas.
export type StepPoint = {
  date: Date;
  steps: number;
};

// Pour la vue "année" sur les pas : regroupe par mois et calcule la
// moyenne journalière de pas de chaque mois (même logique que les calories).
export function averagePerMonthSteps(items: StepPoint[]): StepPoint[] {
  const byMonth = new Map<string, { date: Date; sumSteps: number; count: number }>();

  for (const item of items) {
    const key = `${item.date.getFullYear()}-${item.date.getMonth()}`;
    const entry = byMonth.get(key) || {
      date: new Date(item.date.getFullYear(), item.date.getMonth(), 1),
      sumSteps: 0,
      count: 0,
    };
    entry.sumSteps += item.steps;
    entry.count += 1;
    byMonth.set(key, entry);
  }

  return Array.from(byMonth.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((entry) => ({
      date: entry.date,
      steps: Math.round(entry.sumSteps / entry.count),
    }));
}

// Point unique (date + heures de jeûne tenues), pour le graphique du jeûne.
export type FastingPoint = {
  date: Date;
  hours: number;
};

// Pour la vue "année" sur le jeûne : regroupe par mois et calcule la moyenne
// journalière d'heures de jeûne tenues de chaque mois (mêmes jours sans
// jeûne exclus de la moyenne, pour ne pas la tirer artificiellement vers 0).
export function averagePerMonthFasting(items: FastingPoint[]): FastingPoint[] {
  const byMonth = new Map<string, { date: Date; sumHours: number; count: number }>();

  for (const item of items) {
    const key = `${item.date.getFullYear()}-${item.date.getMonth()}`;
    const entry = byMonth.get(key) || {
      date: new Date(item.date.getFullYear(), item.date.getMonth(), 1),
      sumHours: 0,
      count: 0,
    };
    entry.sumHours += item.hours;
    entry.count += 1;
    byMonth.set(key, entry);
  }

  return Array.from(byMonth.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((entry) => ({
      date: entry.date,
      hours: Math.round((entry.sumHours / entry.count) * 10) / 10,
    }));
}

export type WorkoutPoint = {
  date: Date;
  minutes: number;
};

// Vue "année" : moyenne journalière de minutes d'exercice par mois
// (jours sans séance exclus, comme pour le jeûne).
export function averagePerMonthWorkout(items: WorkoutPoint[]): WorkoutPoint[] {
  const byMonth = new Map<string, { date: Date; sumMinutes: number; count: number }>();

  for (const item of items) {
    const key = `${item.date.getFullYear()}-${item.date.getMonth()}`;
    const entry = byMonth.get(key) || {
      date: new Date(item.date.getFullYear(), item.date.getMonth(), 1),
      sumMinutes: 0,
      count: 0,
    };
    entry.sumMinutes += item.minutes;
    entry.count += 1;
    byMonth.set(key, entry);
  }

  return Array.from(byMonth.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((entry) => ({
      date: entry.date,
      minutes: Math.round(entry.sumMinutes / entry.count),
    }));
}