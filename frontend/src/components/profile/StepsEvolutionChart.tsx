import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from "react-native-svg";
import { DailyStat } from "@/types/dashboard";
import PeriodFilterTabs from "./PeriodFilterTabs";
import { buildYAxisTicks } from "@/utils/chartAxis";
import {
  ChartPeriod,
  StepPoint,
  averagePerMonthSteps,
  filterByPeriod,
  toLocalDate,
} from "@/utils/chartPeriod";

type Props = {
  data: DailyStat[];
};

const CHART_HEIGHT = 170;
const CHART_WIDTH = 300;
const PADDING = { top: 16, right: 16, bottom: 28, left: 40 };
const STEPS_COLOR = "#0EA5E9"; // bleu ciel, distinct des couleurs poids/calories

export default function StepsEvolutionChart({ data }: Props) {
  const [period, setPeriod] = useState<ChartPeriod>("week");

  // Filtre les jours selon la période choisie. Pour "année", on regroupe
  // par mois et on affiche la moyenne journalière de pas de chaque mois
  // (même logique que le graphique des calories).
  const points = useMemo<StepPoint[]>(() => {
    const sorted: StepPoint[] = [...data]
      .map((d) => ({
        date: toLocalDate(d.date),
        steps: d.steps ?? 0,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const filtered = filterByPeriod(sorted, period, (p) => p.date);

    return period === "year" ? averagePerMonthSteps(filtered) : filtered;
  }, [data, period]);

  // Point sélectionné au clic, pour afficher sa valeur exacte.
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
    const maxValue = Math.max(...points.map((p) => p.steps), 1);

    const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
    const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    const toX = (index: number) =>
      points.length === 1
        ? PADDING.left + plotWidth / 2
        : PADDING.left + (index / (points.length - 1)) * plotWidth;
    const toY = (value: number) =>
      PADDING.top + plotHeight - (value / maxValue) * plotHeight;

    const coords = points.map((p, i) => ({ x: toX(i), y: toY(p.steps) }));
    const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");

    const labelStep = Math.max(1, Math.ceil(points.length / 6));
    const bandWidth = points.length > 1 ? plotWidth / points.length : plotWidth;
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
            {/* Axe vertical : graduations en nombre de pas */}
            {/* Unité de l'axe vertical */}
            <SvgText
              x={PADDING.left - 6}
              y={9}
              fontSize="9"
              fontWeight="700"
              fill="#64748B"
              textAnchor="end"
            >
              pas
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
              <Polyline
                points={polyline}
                fill="none"
                stroke={STEPS_COLOR}
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}

            {coords.map((c, i) => (
              <Circle
                key={`p-${i}`}
                cx={c.x}
                cy={c.y}
                r={selectedIndex === i ? 6 : 4}
                fill={STEPS_COLOR}
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

            {/* Zones tactiles élargies pour afficher la valeur au clic */}
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
                    setSelectedIndex((current) => (current === index ? null : index))
                  }
                />
              );
            })}

            {/* Infobulle : valeur exacte du point sélectionné */}
            {selected
              ? (() => {
                  const label = `${Math.round(selected.steps).toLocaleString("fr-FR")} pas`;
                  const boxWidth = 78;
                  const boxHeight = 22;
                  const boxX = Math.min(
                    Math.max(selectedX - boxWidth / 2, PADDING.left),
                    CHART_WIDTH - PADDING.right - boxWidth
                  );
                  const topY = toY(selected.steps);
                  const aboveY = topY - boxHeight - 10;
                  const boxY = aboveY < PADDING.top - 4 ? topY + 10 : aboveY;
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
                        y={boxY + boxHeight / 2 + 4}
                        fontSize="11"
                        fontWeight="700"
                        fill="#fff"
                        textAnchor="middle"
                      >
                        {label}
                      </SvgText>
                    </React.Fragment>
                  );
                })()
              : null}
          </Svg>
        </View>
      </>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Évolution des pas</Text>
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
    marginTop: 8,
    alignItems: "center",
  },
  legendValue: {
    fontSize: 22,
    fontWeight: "800",
    color: STEPS_COLOR,
  },
  legendLabel: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  emptyText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 14,
    paddingVertical: 12,
  },
});