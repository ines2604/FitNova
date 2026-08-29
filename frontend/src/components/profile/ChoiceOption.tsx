import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
};

const ChoiceOption = ({ label, description, selected, onPress }: Props) => {
  return (
    <TouchableOpacity
      style={[styles.option, selected && styles.optionSelected]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.texts}>
        <Text style={[styles.label, selected && styles.labelSelected]}>
          {label}
        </Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
      </View>
    </TouchableOpacity>
  );
};

export default ChoiceOption;

const styles = StyleSheet.create({
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EAF0FF",
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  optionSelected: {
    backgroundColor: "#D7E4FF",
  },
  texts: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E293B",
  },
  labelSelected: {
    color: "#407BFF",
  },
  description: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#8FB0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    backgroundColor: "#407BFF",
    borderColor: "#407BFF",
  },
});
