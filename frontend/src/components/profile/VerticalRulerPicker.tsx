import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const TICK_HEIGHT = 10;

type Props = {
  min: number;
  max: number;
  value: number;
  unit: string;
  onChange: (value: number) => void;
};

const VerticalRulerPicker = ({ min, max, value, unit, onChange }: Props) => {
  const scrollRef = useRef<ScrollView>(null);
  const [height, setHeight] = useState(0);
  const values = useMemo(
    () => Array.from({ length: max - min + 1 }, (_, index) => max - index),
    [min, max]
  );

  useEffect(() => {
    if (!height) return;
    const index = max - value;
    scrollRef.current?.scrollTo({
      y: index * TICK_HEIGHT,
      animated: false,
    });
  }, [height]);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.y / TICK_HEIGHT);
    const next = Math.min(Math.max(max - index, min), max);
    onChange(next);
  };

  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <View style={styles.unitPill}>
          <Text style={styles.unitText}>{unit}</Text>
        </View>
        <Text style={styles.valueText}>
          {value} {unit.toLowerCase()}
        </Text>
      </View>

      <View
        style={styles.rulerWrap}
        onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={TICK_HEIGHT}
          decelerationRate="fast"
          bounces={false}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          contentContainerStyle={{
            paddingVertical: Math.max(height / 2 - TICK_HEIGHT / 2, 0),
          }}
        >
          {values.map((tick) => {
            const major = tick % 5 === 0;
            return (
              <View key={tick} style={styles.tickRow}>
                {major ? <Text style={styles.tickLabel}>{tick}</Text> : <View style={styles.tickSpacer} />}
                <View style={[styles.tick, major ? styles.tickMajor : styles.tickMinor]} />
              </View>
            );
          })}
        </ScrollView>
        <View style={styles.centerLine} />
        <View style={styles.pointer} />
      </View>
    </View>
  );
};

export default VerticalRulerPicker;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#EAF0FF",
    borderRadius: 28,
    minHeight: 280,
    flexDirection: "row",
    overflow: "hidden",
  },
  left: {
    flex: 1,
    padding: 22,
    justifyContent: "center",
  },
  unitPill: {
    alignSelf: "flex-start",
    backgroundColor: "#407BFF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  unitText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.6,
  },
  valueText: {
    fontSize: 34,
    fontWeight: "800",
    color: "#407BFF",
  },
  rulerWrap: {
    width: 92,
    justifyContent: "center",
  },
  tickRow: {
    height: TICK_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 16,
  },
  tickLabel: {
    fontSize: 11,
    color: "#64748B",
    marginRight: 8,
    width: 28,
    textAlign: "right",
  },
  tickSpacer: {
    width: 28,
    marginRight: 8,
  },
  tick: {
    height: 2,
    borderRadius: 2,
    backgroundColor: "#8FB0FF",
  },
  tickMajor: {
    width: 28,
    backgroundColor: "#407BFF",
  },
  tickMinor: {
    width: 14,
  },
  centerLine: {
    position: "absolute",
    right: 16,
    height: 2,
    width: 36,
    backgroundColor: "#407BFF",
    top: "50%",
    marginTop: -1,
  },
  pointer: {
    position: "absolute",
    right: 4,
    top: "50%",
    marginTop: -8,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 10,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderRightColor: "#407BFF",
  },
});
