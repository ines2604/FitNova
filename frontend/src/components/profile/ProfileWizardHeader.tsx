import React from "react";
import { StyleSheet, Text, View } from "react-native";
import ProfileProgress from "./ProfileProgress";

type Props = {
  title: string;
  current: number;
  total: number;
};

const ProfileWizardHeader = ({ title, current, total }: Props) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <ProfileProgress current={current} total={total} />
    </View>
  );
};

export default ProfileWizardHeader;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#407BFF",
    textAlign: "center",
  },
});
