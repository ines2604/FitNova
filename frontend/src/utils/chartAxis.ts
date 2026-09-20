// Génère des graduations régulières pour l'axe vertical (Y) d'un graphique
// (valeurs brutes, à formater au moment de l'affichage selon le contexte :
// "72.5 kg", "1800 kcal", etc.).
export function buildYAxisTicks(
  minValue: number,
  maxValue: number,
  tickCount = 4
): number[] {
  if (maxValue <= minValue) {
    return [minValue];
  }
  const step = (maxValue - minValue) / (tickCount - 1);
  return Array.from({ length: tickCount }, (_, i) => minValue + step * i);
}
