// À ajouter à la fin de frontend/src/utils/chartPeriod.ts — même principe que
// averagePerMonthFasting juste au-dessus (regroupement par mois pour la vue
// "année").

// Point unique (date + minutes d'exercice ce jour-là), pour le graphique de
// durée d'exercice.
export type WorkoutPoint = {
  date: Date;
  minutes: number;
};

// Pour la vue "année" : regroupe par mois et calcule la moyenne journalière
// de minutes d'exercice de chaque mois (mêmes jours sans séance exclus de la
// moyenne, pour ne pas la tirer artificiellement vers 0 — même logique que
// pour le jeûne).
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
