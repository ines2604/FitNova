import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from "react-native-svg";
import { DailyStat } from "@/types/dashboard";
import PeriodFilterTabs from "./PeriodFilterTabs";
import { buildYAxisTicks } from "@/utils/chartAxis";
import {
  CaloriePoint,
  ChartPeriod,
  averagePerMonth,
  filterByPeriod,
  toLocalDate,
} from "@/utils/chartPeriod";

type Props = {
  data: DailyStat[];
};

const CHART_HEIGHT = 170;
const CHART_WIDTH = 300;
const PADDING = { top: 16, right: 16, bottom: 28, left: 40 };
const CONSUMED_COLOR = "#F97316"; // même orange que la carte "objectif calories"
const BURNED_COLOR = "#22C55E";

export default function CaloriesEvolutionChart({ data }: Props) {
  const [period, setPeriod] = useState<ChartPeriod>("week");

  // Filtre les jours selon la période choisie. Pour "année", on regroupe
  // par mois et on affiche la moyenne journalière de chaque mois.
  const points = useMemo<CaloriePoint[]>(() => {
    const sorted: CaloriePoint[] = [...data]
      .map((d) => ({
        date: toLocalDate(d.date),
        consumed: d.calories_consumed ?? 0,
        burned: d.calories_burned ?? 0,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const filtered = filterByPeriod(sorted, period, (p) => p.date);

    return period === "year" ? averagePerMonth(filtered) : filtered;
  }, [data, period]);

  // Point sélectionné au clic, pour afficher ses valeurs exactes.
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  useEffect(() => {
    setSelectedIndex(null);
  }, [period, data]);

  // Un seul jour sur la période reste affiché : seule la ligne reliant les
  // points est alors omise.
  const hasData = points.length >= 1;

  const formatLabel = (date: Date) =>
    period === "year"
      ? date.toLocaleDateString("fr-FR", { month: "short" })
      : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

  let chart: React.ReactNode = null;

  if (hasData) {
    const allValues = points.flatMap((p) => [p.consumed, p.burned]);
    const maxValue = Math.max(...allValues, 1);

    const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
    const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    const toX = (index: number) =>
      points.length === 1
        ? PADDING.left + plotWidth / 2
        : PADDING.left + (index / (points.length - 1)) * plotWidth;
    const toY = (value: number) =>
      PADDING.top + plotHeight - (value / maxValue) * plotHeight;

    const consumedCoords = points.map((p, i) => ({
      x: toX(i),
      y: toY(p.consumed),
    }));
    const burnedCoords = points.map((p, i) => ({
      x: toX(i),
      y: toY(p.burned),
    }));

    const consumedLine = consumedCoords.map((c) => `${c.x},${c.y}`).join(" ");
    const burnedLine = burnedCoords.map((c) => `${c.x},${c.y}`).join(" ");

    const labelStep = Math.max(1, Math.ceil(points.length / 6));
    const bandWidth =
      points.length > 1 ? plotWidth / points.length : plotWidth;
    const yTicks = buildYAxisTicks(0, maxValue, 4);
    const last = points[points.length - 1];
    const selected = selectedIndex !== null ? points[selectedIndex] : null;
    const selectedX = selectedIndex !== null ? toX(selectedIndex) : 0;

    chart = (
      <>
        <View style={styles.chartWrap}>
          <Svg
            width="100%"
            height={CHART_HEIGHT}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          >
            {/* Axe vertical : graduations en kcal */}
            {/* Unité de l'axe vertical */}
            <SvgText
              x={PADDING.left - 6}
              y={9}
              fontSize="9"
              fontWeight="700"
              fill="#64748B"
              textAnchor="end"
            >
              kcal
            </SvgText>
            {yTicks.map((tick, i) => {
              const y = toY(tick);
              return (
                <React.Fragment key={`tick-${i}`}>
                  <Line
                    x1={PADDING.left}
                    y1={y}
                    x2={CHART_WIDTH - PADDING.right}
                    y2={y}
                    stroke="#F1F5F9"
                    strokeWidth={1}
                  />
                  <SvgText
                    x={PADDING.left - 6}
                    y={y + 3}
                    fontSize="9"
                    fill="#94A3B8"
                    textAnchor="end"
                  >
                    {Math.round(tick)}
                  </SvgText>
                </React.Fragment>
              );
            })}

            <Line
              x1={PADDING.left}
              y1={PADDING.top + plotHeight}
              x2={CHART_WIDTH - PADDING.right}
              y2={PADDING.top + plotHeight}
              stroke="#E2E8F0"
              strokeWidth={1}
            />

            {points.length > 1 ? (
              <>
                <Polyline
                  points={burnedLine}
                  fill="none"
                  stroke={BURNED_COLOR}
                  strokeWidth={3}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <Polyline
                  points={consumedLine}
                  fill="none"
                  stroke={CONSUMED_COLOR}
                  strokeWidth={3}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </>
            ) : null}

            {burnedCoords.map((c, i) => (
              <Circle
                key={`b-${i}`}
                cx={c.x}
                cy={c.y}
                r={selectedIndex === i ? 6 : 4}
                fill={BURNED_COLOR}
              />
            ))}
            {consumedCoords.map((c, i) => (
              <Circle
                key={`c-${i}`}
                cx={c.x}
                cy={c.y}
                r={selectedIndex === i ? 6 : 4}
                fill={CONSUMED_COLOR}
              />
            ))}

            {points.map((p, i) =>
              i % labelStep === 0 || i === points.length - 1 ? (
                <SvgText
                  key={`l-${i}`}
                  x={toX(i)}
                  y={CHART_HEIGHT - 6}
                  fontSize="9"
                  fill="#94A3B8"
                  textAnchor="middle"
                >
                  {formatLabel(p.date)}
                </SvgText>
              ) : null
            )}

            {/* Zones tactiles élargies pour afficher les valeurs au clic */}
            {points.map((_, index) => {
              const x = toX(index);
              return (
                <Rect
                  key={`hit-${index}`}
                  x={Math.max(
                    PADDING.left,
                    Math.min(
                      x - bandWidth / 2,
                      CHART_WIDTH - PADDING.right - bandWidth
                    )
                  )}
                  y={PADDING.top}
                  width={bandWidth}
                  height={plotHeight}
                  fill="#000"
                  fillOpacity={0}
                  onPress={() =>
                    setSelectedIndex((current) =>
                      current === index ? null : index
                    )
                  }
                />
              );
            })}

            {/* Infobulle : valeurs exactes du jour sélectionné */}
            {selected
              ? (() => {
                  const boxWidth = 108;
                  const boxHeight = 36;
                  const topY = Math.min(
                    toY(selected.consumed),
                    toY(selected.burned)
                  );
                  const boxX = Math.min(
                    Math.max(selectedX - boxWidth / 2, PADDING.left),
                    CHART_WIDTH - PADDING.right - boxWidth
                  );
                  const aboveY = topY - boxHeight - 10;
                  const boxY = aboveY < PADDING.top - 4 ? topY + 14 : aboveY;
                  return (
                    <React.Fragment>
                      <Rect
                        x={boxX}
                        y={boxY}
                        width={boxWidth}
                        height={boxHeight}
                        rx={6}
                        fill="#1E293B"
                      />
                      <SvgText
                        x={boxX + boxWidth / 2}
                        y={boxY + 15}
                        fontSize="10"
                        fontWeight="700"
                        fill={CONSUMED_COLOR}
                        textAnchor="middle"
                      >
                        Conso. {Math.round(selected.consumed)} kcal
                      </SvgText>
                      <SvgText
                        x={boxX + boxWidth / 2}
                        y={boxY + 28}
                        fontSize="10"
                        fontWeight="700"
                        fill={BURNED_COLOR}
                        textAnchor="middle"
                      >
                        Brûlées {Math.round(selected.burned)} kcal
                      </SvgText>
                    </React.Fragment>
                  );
                })()
              : null}
          </Svg>
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: CONSUMED_COLOR }]} />
            <Text style={styles.legendLabel}>Calories consommées</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: BURNED_COLOR }]} />
            <Text style={styles.legendLabel}>Calories brûlées</Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Évolution des calories</Text>
      <PeriodFilterTabs value={period} onChange={setPeriod} />
      {hasData ? (
        chart
      ) : (
        <Text style={styles.emptyText}>Aucune donnée pour cette période.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  chartWrap: {
    alignItems: "center",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  legendValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
  },
  emptyText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 14,
    paddingVertical: 12,
  },
});
