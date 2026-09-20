import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from "react-native-svg";
import { WeightRecord } from "@/types/dashboard";
import PeriodFilterTabs from "./PeriodFilterTabs";
import { buildYAxisTicks } from "@/utils/chartAxis";
import {
  ChartPeriod,
  filterByPeriod,
  keepLastPerMonth,
  pickDefaultPeriod,
  toLocalDate,
} from "@/utils/chartPeriod";

type Props = {
  data: WeightRecord[];
};

const CHART_HEIGHT = 170;
const CHART_WIDTH = 300;
const PADDING = { top: 16, right: 16, bottom: 28, left: 40 };

export default function WeightProgressChart({ data }: Props) {
  // Les pesées sont triées une seule fois ; elles proviennent de
  // weight_bmi_history (via /dashboard -> weightProgress).
  const sortedData = useMemo(
    () =>
      [...data].sort(
        (a, b) =>
          toLocalDate(a.record_date).getTime() -
          toLocalDate(b.record_date).getTime()
      ),
    [data]
  );

  // Période initiale choisie automatiquement (Semaine si des pesées
  // récentes existent, sinon Mois, sinon Année) : le poids n'étant mis à
  // jour qu'occasionnellement, forcer "Semaine" par défaut affichait
  // souvent "pas assez de données" alors que l'historique existe bien.
  const [period, setPeriod] = useState<ChartPeriod>(() =>
    pickDefaultPeriod(sortedData, (p) => toLocalDate(p.record_date))
  );

  // Filtre les pesées selon la période choisie. Pour "année", on ne garde
  // que la dernière pesée de chaque mois pour garder un graphique lisible.
  const points = useMemo(() => {
    const filtered = filterByPeriod(sortedData, period, (p) =>
      toLocalDate(p.record_date)
    );
    return period === "year"
      ? keepLastPerMonth(filtered, (p) => toLocalDate(p.record_date))
      : filtered;
  }, [sortedData, period]);

  // Point sélectionné au clic, pour afficher sa valeur exacte.
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  useEffect(() => {
    setSelectedIndex(null);
  }, [period, data]);

  // Une seule pesée sur la période (ex : un poids par semaine ou par mois)
  // reste affichée : seule la ligne reliant les points est alors omise.
  const hasData = points.length >= 1;

  const formatLabel = (dateValue: string) => {
    const d = toLocalDate(dateValue);
    return period === "year"
      ? d.toLocaleDateString("fr-FR", { month: "short" })
      : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  };

  let chart: React.ReactNode = null;

  if (hasData) {
    const weights = points.map((p) => Number(p.weight_kg));
    const minWeight = Math.min(...weights) - 1;
    const maxWeight = Math.max(...weights) + 1;
    const range = maxWeight - minWeight || 1;

    const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
    const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    const toY = (value: number) =>
      PADDING.top + plotHeight - ((value - minWeight) / range) * plotHeight;

    const coords = points.map((point, index) => {
      const x =
        points.length === 1
          ? PADDING.left + plotWidth / 2
          : PADDING.left + (index / (points.length - 1)) * plotWidth;
      return { x, y: toY(Number(point.weight_kg)), point };
    });

    const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");
    const labelStep = Math.max(1, Math.ceil(coords.length / 6));
    const bandWidth =
      points.length > 1 ? plotWidth / points.length : plotWidth;
    const yTicks = buildYAxisTicks(minWeight, maxWeight, 4);
    const selected = selectedIndex !== null ? coords[selectedIndex] : null;

    chart = (
      <>
        <View style={styles.chartWrap}>
          <Svg
            width="100%"
            height={CHART_HEIGHT}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          >
            {/* Axe vertical : graduations du poids */}
            {/* Unité de l'axe vertical */}
            <SvgText
              x={PADDING.left - 6}
              y={9}
              fontSize="9"
              fontWeight="700"
              fill="#64748B"
              textAnchor="end"
            >
              kg
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
                    {tick.toFixed(1)}
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
                stroke="#407BFF"
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}

            {coords.map(({ x, y, point }, index) => (
              <React.Fragment key={point.id}>
                <Circle
                  cx={x}
                  cy={y}
                  r={selectedIndex === index ? 7 : 5}
                  fill="#407BFF"
                />
                {index % labelStep === 0 || index === coords.length - 1 ? (
                  <SvgText
                    x={x}
                    y={CHART_HEIGHT - 6}
                    fontSize="9"
                    fill="#94A3B8"
                    textAnchor="middle"
                  >
                    {formatLabel(point.record_date)}
                  </SvgText>
                ) : null}
              </React.Fragment>
            ))}

            {/* Zones tactiles élargies (plus faciles à toucher qu'un point de 5px) */}
            {coords.map(({ x }, index) => (
              <Rect
                key={`hit-${index}`}
                x={Math.max(
                  PADDING.left,
                  Math.min(x - bandWidth / 2, CHART_WIDTH - PADDING.right - bandWidth)
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
            ))}

            {/* Infobulle : valeur exacte du point sélectionné */}
            {selected
              ? (() => {
                  const label = `${Number(selected.point.weight_kg).toFixed(
                    1
                  )} kg`;
                  const boxWidth = 58;
                  const boxHeight = 22;
                  const boxX = Math.min(
                    Math.max(selected.x - boxWidth / 2, PADDING.left),
                    CHART_WIDTH - PADDING.right - boxWidth
                  );
                  const aboveY = selected.y - boxHeight - 10;
                  const boxY =
                    aboveY < PADDING.top - 4 ? selected.y + 10 : aboveY;
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
      <Text style={styles.title}>Progression du poids</Text>
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
    color: "#407BFF",
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
