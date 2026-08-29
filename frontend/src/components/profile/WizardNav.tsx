import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  isFirst: boolean;
  isLast: boolean;
  submitting?: boolean;
  onPrev: () => void;
  onNext: () => void;
};

const WizardNav = ({ isFirst, isLast, submitting, onPrev, onNext }: Props) => {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.button, styles.prevButton, isFirst && styles.disabled]}
        onPress={onPrev}
        disabled={isFirst || submitting}
      >
        <Text style={styles.prevText}>Précédent</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.nextButton, submitting && { opacity: 0.7 }]}
        onPress={onNext}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.nextText}>{isLast ? "Terminer" : "Suivant"}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default WizardNav;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  prevButton: {
    backgroundColor: "#EAF0FF",
  },
  nextButton: {
    backgroundColor: "#407BFF",
  },
  disabled: {
    opacity: 0.4,
  },
  prevText: {
    color: "#407BFF",
    fontWeight: "700",
    fontSize: 16,
  },
  nextText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
});
