import React, { useState } from "react";
import {
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Image,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppTextInput from "../components/AppTextInput";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as authService from "../services/auth.service";

const isStrongPassword = (p: string) =>
  p.length >= 8 &&
  /[A-Z]/.test(p) &&
  /[0-9]/.test(p) &&
  /[^A-Za-z0-9]/.test(p);

const ResetPassword = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId: string; code: string }>();
  const userId = Number(params.userId);
  const code = params.code || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<any>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const isStrong = isStrongPassword(password);

  const validate = () => {
    let valid = true;
    let newErrors: any = {};

    if (!password) {
      newErrors.password = "Mot de passe obligatoire";
      valid = false;
    } else if (!isStrong) {
      newErrors.password = "Le mot de passe n'est pas assez fort";
      valid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Confirmation obligatoire";
      valid = false;
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleReset = async () => {
    setServerError("");
    if (!validate()) return;

    if (!userId || !code) {
      setServerError("Session invalide, veuillez recommencer la procédure");
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(userId, code, password);
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        router.replace("/login");
      }, 1500);
    } catch (e: any) {
      setServerError(e?.message || "Erreur lors de la réinitialisation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Nouveau mot de passe</Text>
          <Text style={styles.subtitle}>
            Choisissez un mot de passe sécurisé pour votre compte
          </Text>
        </View>

        <View style={styles.imageWrapper}>
          <Image
            source={require("../../assets/images/Resetpassword.png")}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        <View style={styles.inputContainer}>
          <AppTextInput
            placeholder="Nouveau mot de passe"
            icon="lock-closed-outline"
            isPassword
            value={password}
            onChangeText={setPassword}
          />

          {password.length > 0 && !isStrong && (
            <Text style={styles.hint}>
              Utilisez au moins 8 caractères avec une majuscule, un chiffre
              et un caractère spécial.
            </Text>
          )}

          {errors.password && (
            <Text style={styles.error}>{errors.password}</Text>
          )}

          <AppTextInput
            placeholder="Confirmer mot de passe"
            icon="lock-closed-outline"
            isPassword
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          {errors.confirmPassword && (
            <Text style={styles.error}>{errors.confirmPassword}</Text>
          )}
        </View>

        {serverError ? <Text style={styles.error}>{serverError}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleReset}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Réinitialiser</Text>
          )}
        </TouchableOpacity>

        <View style={styles.row}>
          <Text style={styles.text}>Vous vous souvenez ? </Text>
          <TouchableOpacity onPress={() => router.push("/login")}>
            <Text style={styles.link}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Ionicons name="checkmark-circle" size={60} color="#407BFF" />
            <Text style={styles.modalTitle}>Succès !</Text>
            <Text style={styles.modalText}>
              Mot de passe réinitialisé avec succès
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ResetPassword;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
  },

  content: {
    padding: 20,
  },

  titleContainer: {
    alignItems: "center",
    marginBottom: 10,
  },

  title: {
    fontSize: 30,
    color: "#407BFF",
    fontWeight: "bold",
    marginVertical: 25,
  },

  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#575757",
    maxWidth: "80%",
  },

  imageWrapper: {
    alignItems: "center",
    marginVertical: 10,
  },

  image: {
    width: 220,
    height: 200,
  },

  inputContainer: {
    marginTop: 15,
    marginBottom: 10,
  },

  hint: {
    color: "#F59E0B",
    fontSize: 13,
    marginTop: 6,
    marginLeft: 5,
    lineHeight: 18,
  },

  button: {
    padding: 18,
    backgroundColor: "#407BFF",
    marginVertical: 25,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },

  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
  },

  row: {
    flexDirection: "row",
    justifyContent: "center",
  },

  text: {
    color: "#575757",
  },

  link: {
    color: "#407BFF",
    fontWeight: "bold",
  },

  error: {
    color: "red",
    fontSize: 13,
    marginTop: 4,
    marginLeft: 5,
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
  },
});