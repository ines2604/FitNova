import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const TICK_WIDTH = 12;

type Props = {
  min: number;
  max: number;
  value: number;
  unit: string;
  onChange: (value: number) => void;
};

const HorizontalRulerPicker = ({ min, max, value, unit, onChange }: Props) => {
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const values = useMemo(
    () => Array.from({ length: max - min + 1 }, (_, index) => min + index),
    [min, max]
  );

  useEffect(() => {
    if (!width) return;
    scrollRef.current?.scrollTo({
      x: (value - min) * TICK_WIDTH,
      animated: false,
    });
  }, [width]);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / TICK_WIDTH);
    const next = Math.min(Math.max(min + index, min), max);
    onChange(next);
  };

  return (
    <View style={styles.card}>
      <View style={styles.unitPill}>
        <Text style={styles.unitText}>{unit}</Text>
      </View>

      <Text style={styles.valueText}>
        {value} {unit.toLowerCase()}
      </Text>

      <View
        style={styles.rulerWrap}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={TICK_WIDTH}
          decelerationRate="fast"
          bounces={false}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          contentContainerStyle={{
            paddingHorizontal: Math.max(width / 2 - TICK_WIDTH / 2, 0),
          }}
        >
          {values.map((tick) => {
            const major = tick % 5 === 0;
            return (
              <View key={tick} style={styles.tickCol}>
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

export default HorizontalRulerPicker;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#EAF0FF",
    borderRadius: 28,
    paddingTop: 18,
    paddingBottom: 12,
    alignItems: "center",
    overflow: "hidden",
  },
  unitPill: {
    backgroundColor: "#407BFF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 10,
  },
  unitText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.6,
  },
  valueText: {
    fontSize: 36,
    fontWeight: "800",
    color: "#407BFF",
    marginBottom: 12,
  },
  rulerWrap: {
    width: "100%",
    height: 78,
    justifyContent: "flex-end",
  },
  tickCol: {
    width: TICK_WIDTH,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  tickLabel: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 6,
  },
  tickSpacer: {
    height: 20,
    marginBottom: 6,
  },
  tick: {
    width: 2,
    borderRadius: 2,
    backgroundColor: "#8FB0FF",
  },
  tickMajor: {
    height: 28,
    backgroundColor: "#407BFF",
  },
  tickMinor: {
    height: 16,
  },
  centerLine: {
    position: "absolute",
    alignSelf: "center",
    width: 2,
    height: 36,
    backgroundColor: "#407BFF",
    bottom: 10,
    left: "50%",
    marginLeft: -1,
  },
  pointer: {
    position: "absolute",
    bottom: 0,
    left: "50%",
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#407BFF",
  },
});
