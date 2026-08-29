import React, { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Href, useRouter } from "expo-router";
import ChoiceOption from "../components/profile/ChoiceOption";
import ProfileWizardHeader from "../components/profile/ProfileWizardHeader";
import WizardNav from "../components/profile/WizardNav";
import VerticalNumberPicker from "../components/profile/VerticalNumberPicker";
import HorizontalRulerPicker from "../components/profile/HorizontalRulerPicker";
import VerticalRulerPicker from "../components/profile/VerticalRulerPicker";
import WaterGoalPicker from "../components/profile/WaterGoalPicker";
import StepGoalPicker from "../components/profile/StepGoalPicker";
import { useCompleteProfile } from "../hooks/useCompleteProfile";
import { getAuthDestination } from "../utils/authNavigation";

const CompleteProfile = () => {
  const router = useRouter();
  const {
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
  } = useCompleteProfile();

  useEffect(() => {
    let cancelled = false;

    const guard = async () => {
      try {
        const destination = await getAuthDestination();
        if (cancelled) return;
        if (destination !== "/complete-profile") {
          router.replace(destination as Href);
        }
      } catch {
        // Le formulaire reste affiché ; l'envoi final revalidera la session.
      }
    };

    guard();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleNext = async () => {
    if (isLast) {
      const ok = await submit();
      if (ok) router.replace("/(tabs)/Home");
      return;
    }
    goNext();
  };

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
};

export default CompleteProfile;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F7FF",
  },
  topBand: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 46,
    backgroundColor: "#407BFF",
  },
  safe: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
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
