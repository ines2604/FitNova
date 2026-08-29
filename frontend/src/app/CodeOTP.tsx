import React, { useState, useRef, useEffect } from "react";
import {
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Image,
  TextInput,
  Modal,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as authService from "../services/auth.service";
import { navigateAfterAuth } from "../utils/authNavigation";

// flow = "register"  -> vérification de l'email après inscription
// flow = "reset"      -> vérification du code envoyé par "mot de passe oublié"
type Flow = "register" | "reset";

const OTPVerification = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId: string; flow?: string }>();

  const userId = Number(params.userId);
  const flow: Flow = params.flow === "reset" ? "reset" : "register";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
    });

    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const handleChange = (text: string, index: number) => {
    if (!/^\d*$/.test(text)) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    setError("");

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");

    if (code.length < 6) {
      setError("Veuillez entrer les 6 chiffres du code");
      return;
    }
    if (!userId) {
      setError("Session invalide, veuillez recommencer");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (flow === "register") {
        // Vérifie le code ET connecte automatiquement l'utilisateur
        await authService.verifyEmail(userId, code);
        setShowSuccessModal(true);
        setTimeout(async () => {
          setShowSuccessModal(false);
          await navigateAfterAuth(router);
        }, 1500);
      } else {
        // Vérifie le code de réinitialisation, puis direction "nouveau mot de passe"
        await authService.verifyResetOtp(userId, code);
        setShowSuccessModal(true);
        setTimeout(() => {
          setShowSuccessModal(false);
          router.push({
            pathname: "/reset-password",
            params: { userId: String(userId), code },
          });
        }, 1000);
      }
    } catch (e: any) {
      setError(e?.message || "Code invalide ou expiré");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!userId) return;

    setOtp(["", "", "", "", "", ""]);
    setError("");
    setResending(true);

    try {
      await authService.resendOtp(
        userId,
        flow === "register" ? "email_verification" : "password_reset"
      );
      inputs.current[0]?.focus();
    } catch (e: any) {
      setError(e?.message || "Erreur lors du renvoi du code");
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>

      <View
        style={[
          styles.content,
          keyboardVisible ? styles.contentTop : styles.contentCenter,
        ]}
      >

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Vérification OTP</Text>
          <Text style={styles.subtitle}>
            Entrez le code à 6 chiffres envoyé à votre adresse email
          </Text>
        </View>

        {!keyboardVisible && (
          <View style={styles.imageWrapper}>
            <Image
              source={require("../../assets/images/OTPCode.png")}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        )}

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputs.current[index] = ref;
              }}
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : null,
              ]}
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="numeric"
              maxLength={1}
              textAlign="center"
              selectionColor="#407BFF"
            />
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.resendRow}>
          <Text style={styles.resendText}>
            Vous n'avez pas reçu l'email ?{" "}
          </Text>
          <TouchableOpacity onPress={handleResend} disabled={resending}>
            {resending ? (
              <ActivityIndicator size="small" color="#407BFF" />
            ) : (
              <Text style={styles.resendLink}>Renvoyer</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Vérifier</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/login")}
          style={styles.backRow}
        >
          <Ionicons name="arrow-back-outline" size={16} color="#407BFF" />
          <Text style={styles.backLink}>Retour à la connexion</Text>
        </TouchableOpacity>

      </View>

      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Ionicons name="checkmark-circle" size={60} color="#407BFF" />
            <Text style={styles.modalTitle}>Code vérifié !</Text>
            <Text style={styles.modalText}>
              {flow === "register"
                ? "Votre identité a été confirmée avec succès."
                : "Vous pouvez maintenant choisir un nouveau mot de passe."}
            </Text>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default OTPVerification;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  content: {
    flex: 1,
    padding: 24,
  },

  contentCenter: {
    justifyContent: "center",
  },

  contentTop: {
    justifyContent: "flex-start",
    paddingTop: 60,
  },

  titleContainer: {
    alignItems: "center",
    marginBottom: 10,
  },

  title: {
    fontSize: 30,
    color: "#407BFF",
    fontWeight: "bold",
    marginVertical: 20,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 15,
    textAlign: "center",
    color: "#575757",
    maxWidth: "80%",
    lineHeight: 22,
  },

  imageWrapper: {
    alignItems: "center",
    marginVertical: 10,
  },

  image: {
    width: 200,
    height: 200,
  },

  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 8,
  },

  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    fontSize: 22,
    fontWeight: "bold",
    color: "#1A1A2E",
    backgroundColor: "#F9FAFB",
  },

  otpInputFilled: {
    borderColor: "#407BFF",
    backgroundColor: "#EAF0FF",
  },

  error: {
    color: "red",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
  },

  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },

  resendText: {
    color: "#575757",
    fontSize: 14,
  },

  resendLink: {
    color: "#407BFF",
    fontWeight: "bold",
    fontSize: 14,
  },

  button: {
    padding: 18,
    backgroundColor: "#407BFF",
    marginVertical: 24,
    borderRadius: 10,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 18,
  },

  backRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  backLink: {
    color: "#407BFF",
    fontWeight: "bold",
    fontSize: 14,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalBox: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 25,
    alignItems: "center",
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
    color: "#407BFF",
  },

  modalText: {
    marginTop: 8,
    textAlign: "center",
    color: "#555",
    lineHeight: 20,
  },
});
