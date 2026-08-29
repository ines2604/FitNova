import React from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  current: number;
  total: number;
};

const ProfileProgress = ({ current, total }: Props) => {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[styles.dash, index < current ? styles.dashActive : styles.dashIdle]}
        />
      ))}
    </View>
  );
};

export default ProfileProgress;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },
  dash: {
    flex: 1,
    height: 6,
    borderRadius: 6,
  },
  dashActive: {
    backgroundColor: "#407BFF",
  },
  dashIdle: {
    backgroundColor: "#C5D4FF",
  },
});
