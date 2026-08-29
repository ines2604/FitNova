import React from "react";
import { ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import ChoiceOption from "@/components/profile/ChoiceOption";
import ProfileWizardHeader from "@/components/profile/ProfileWizardHeader";
import WizardNav from "@/components/profile/WizardNav";
import VerticalNumberPicker from "@/components/profile/VerticalNumberPicker";
import HorizontalRulerPicker from "@/components/profile/HorizontalRulerPicker";
import VerticalRulerPicker from "@/components/profile/VerticalRulerPicker";
import WaterGoalPicker from "@/components/profile/WaterGoalPicker";
import StepGoalPicker from "@/components/profile/StepGoalPicker";
import { useEditProfile } from "@/hooks/useEditProfile";

export default function EditProfileScreen() {
  const router = useRouter();
  const {
    loading,
    step,
    stepIndex,
    totalSteps,
    values,
    error,
    submitting,
    isFirst,
    isLast,
    setField,
    goNext,
    goPrev,
    submit,
  } = useEditProfile();

  const handleNext = async () => {
    if (isLast) {
      const ok = await submit();
      if (ok) router.back();
      return;
    }
    goNext();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#407BFF" />
      </SafeAreaView>
    );
  }

  const currentValue = values[step.key];
  const numericValue = Number(currentValue) || 0;

  const renderInput = () => {
    if (step.key === "age") {
      return (
        <VerticalNumberPicker
          min={6}
          max={100}
          value={numericValue || 25}
          onChange={(value) => setField("age", String(value))}
        />
      );
    }

    if (step.key === "weightKg") {
      return (
        <HorizontalRulerPicker
          min={20}
          max={400}
          value={numericValue || 70}
          unit="KG"
          onChange={(value) => setField("weightKg", String(value))}
        />
      );
    }

    if (step.key === "heightCm") {
      return (
        <VerticalRulerPicker
          min={80}
          max={300}
          value={numericValue || 170}
          unit="CM"
          onChange={(value) => setField("heightCm", String(value))}
        />
      );
    }

    if (step.key === "dailyWaterGoalMl") {
      return (
        <WaterGoalPicker
          value={numericValue || 2000}
          onChange={(value) => setField("dailyWaterGoalMl", String(value))}
        />
      );
    }

    if (step.key === "dailyStepGoal") {
      return (
        <StepGoalPicker
          value={numericValue || 10000}
          onChange={(value) => setField("dailyStepGoal", String(value))}
        />
      );
    }

    if (step.inputType === "choice" && step.options) {
      return (
        <View>
          {step.options.map((option) => (
            <ChoiceOption
              key={option.value}
              label={option.label}
              description={option.description}
              selected={currentValue === option.value}
              onPress={() => setField(step.key, option.value)}
            />
          ))}
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={24} color="#1E293B" />
          </Pressable>
        </View>

        <ProfileWizardHeader
          title={step.headerTitle}
          current={stepIndex + 1}
          total={totalSteps}
        />

        <View style={styles.body}>
          <Text style={styles.question}>{step.title}</Text>
          <Text style={styles.subtitle}>{step.subtitle}</Text>
          <View style={styles.inputArea}>
            {step.inputType === "choice" ||
            step.inputType === "water" ||
            step.inputType === "steps" ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.choiceContent}
              >
                {renderInput()}
              </ScrollView>
            ) : (
              renderInput()
            )}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <WizardNav
          isFirst={isFirst}
          isLast={isLast}
          submitting={submitting}
          onPrev={goPrev}
          onNext={handleNext}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F7FF",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F7FF",
  },
  safe: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  question: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#64748B",
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  inputArea: {
    flex: 1,
    justifyContent: "center",
  },
  choiceContent: {
    paddingBottom: 12,
  },
  error: {
    color: "#EF4444",
    textAlign: "center",
    marginTop: 12,
    fontSize: 13,
  },
});
