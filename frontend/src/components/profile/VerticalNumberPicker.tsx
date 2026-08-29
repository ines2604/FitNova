import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from "react-native";

const ITEM_HEIGHT = 56;
const VISIBLE_ITEMS = 5;

type Props = {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
};

const VerticalNumberPicker = ({ min, max, value, onChange }: Props) => {
  const listRef = useRef<FlatList<number>>(null);
  const data = useMemo(
    () => Array.from({ length: max - min + 1 }, (_, index) => min + index),
    [min, max]
  );

  const selectedIndex = Math.min(Math.max(value - min, 0), data.length - 1);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const spacer = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

  useEffect(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({
        offset: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
    });
  }, []);

  const updateFromOffset = (offsetY: number) => {
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.min(Math.max(index, 0), data.length - 1);
    setActiveIndex(clamped);
    return clamped;
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    updateFromOffset(event.nativeEvent.contentOffset.y);
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const clamped = updateFromOffset(event.nativeEvent.contentOffset.y);
    onChange(data[clamped]);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.highlight} />
      <View style={styles.pointer} />
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item) => String(item)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        bounces={false}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        contentContainerStyle={{ paddingVertical: spacer }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        renderItem={({ item, index }) => {
          const distance = Math.abs(index - activeIndex);
          return (
            <View style={styles.item}>
              <Text
                style={[
                  styles.itemText,
                  distance === 0 && styles.selectedText,
                  distance === 1 && styles.nearText,
                ]}
              >
                {item}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
};

export default VerticalNumberPicker;

const styles = StyleSheet.create({
  wrapper: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    justifyContent: "center",
  },
  highlight: {
    position: "absolute",
    left: 28,
    right: 28,
    height: ITEM_HEIGHT,
    borderRadius: 28,
    backgroundColor: "#EAF0FF",
  },
  pointer: {
    position: "absolute",
    left: 12,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 12,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#407BFF",
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 20,
    color: "#CBD5E1",
    fontWeight: "600",
  },
  nearText: {
    fontSize: 26,
    color: "#94A3B8",
  },
  selectedText: {
    fontSize: 36,
    color: "#407BFF",
    fontWeight: "800",
  },
});
