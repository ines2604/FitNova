import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import { WeightRecord } from "@/types/dashboard";

type Props = {
  data: WeightRecord[];
};

const CHART_HEIGHT = 160;
const CHART_WIDTH = 300;
const PADDING = { top: 16, right: 16, bottom: 28, left: 36 };

export default function WeightProgressChart({ data }: Props) {
  const points = useMemo(() => {
    return [...data]
      .sort(
        (a, b) =>
          new Date(a.record_date).getTime() - new Date(b.record_date).getTime()
      )
      .slice(-8);
  }, [data]);

  if (points.length < 2) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Pas assez de données pour afficher la progression du poids.
        </Text>
      </View>
    );
  }

  const weights = points.map((p) => Number(p.weight_kg));
  const minWeight = Math.min(...weights) - 1;
  const maxWeight = Math.max(...weights) + 1;
  const range = maxWeight - minWeight || 1;

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const coords = points.map((point, index) => {
    const x =
      PADDING.left +
      (index / Math.max(points.length - 1, 1)) * plotWidth;
    const y =
      PADDING.top +
      plotHeight -
      ((Number(point.weight_kg) - minWeight) / range) * plotHeight;
    return { x, y, point };
  });

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Progression du poids</Text>
      <View style={styles.chartWrap}>
        <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
          <Line
            x1={PADDING.left}
            y1={PADDING.top + plotHeight}
            x2={CHART_WIDTH - PADDING.right}
            y2={PADDING.top + plotHeight}
            stroke="#E2E8F0"
            strokeWidth={1}
          />
          <Polyline
            points={polyline}
            fill="none"
            stroke="#407BFF"
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {coords.map(({ x, y, point }) => (
            <React.Fragment key={point.id}>
              <Circle cx={x} cy={y} r={5} fill="#407BFF" />
              <SvgText
                x={x}
                y={CHART_HEIGHT - 6}
                fontSize="9"
                fill="#94A3B8"
                textAnchor="middle"
              >
                {new Date(point.record_date).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                })}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendValue}>
          {Number(points[points.length - 1].weight_kg).toFixed(1)} kg
        </Text>
        <Text style={styles.legendLabel}>Poids actuel</Text>
      </View>
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
  empty: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  emptyText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 14,
  },
});
