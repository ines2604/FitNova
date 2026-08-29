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
import { useRouter } from "expo-router";
import * as authService from "../services/auth.service";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { navigateAfterAuth } from "../utils/authNavigation";

const isStrongPassword = (p: string) =>
  p.length >= 8 &&
  /[A-Z]/.test(p) &&
  /[0-9]/.test(p) &&
  /[^A-Za-z0-9]/.test(p);

const Register = () => {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const isStrong = isStrongPassword(password);

  const { loading: googleLoading, error: googleError, promptGoogleLogin } =
    useGoogleAuth(async () => {
      await navigateAfterAuth(router);
    });

  const validate = () => {
    let valid = true;
    let newErrors: any = {};
    const emailRegex = /\S+@\S+\.\S+/;

    if (!name) { newErrors.name = "Nom obligatoire"; valid = false; }
    if (!email) { newErrors.email = "Email obligatoire"; valid = false; }
    else if (!emailRegex.test(email)) { newErrors.email = "Email invalide"; valid = false; }
    if (!password) {
      newErrors.password = "Mot de passe obligatoire";
      valid = false;
    } else if (!isStrong) {
      newErrors.password = "Le mot de passe n'est pas assez fort";
      valid = false;
    }
    if (!confirmPassword) { newErrors.confirmPassword = "Confirmation obligatoire"; valid = false; }
    else if (confirmPassword !== password) { newErrors.confirmPassword = "Les mots de passe ne correspondent pas"; valid = false; }

    setErrors(newErrors);
    return valid;
  };

  const handleRegister = async () => {
    setServerError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const data = await authService.register(name, email, password);
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        router.push({
          pathname: "/CodeOTP",
          params: { userId: String(data.userId), flow: "register" },
        });
      }, 1500);
    } catch (e: any) {
      setServerError(e?.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>
            Rejoignez-nous et commencez votre expérience
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <AppTextInput placeholder="Nom complet" icon="person-outline" value={name} onChangeText={setName} />
          {errors.name && <Text style={styles.error}>{errors.name}</Text>}

          <AppTextInput placeholder="Email" icon="mail-outline" value={email} onChangeText={setEmail} />
          {errors.email && <Text style={styles.error}>{errors.email}</Text>}

          <AppTextInput placeholder="Mot de passe" icon="lock-closed-outline" isPassword value={password} onChangeText={setPassword} />
          {password.length > 0 && !isStrong && (
            <Text style={styles.hint}>
              Utilisez au moins 8 caractères avec une majuscule, un chiffre et un caractère spécial.
            </Text>
          )}
          {errors.password && <Text style={styles.error}>{errors.password}</Text>}

          <AppTextInput placeholder="Confirmer mot de passe" icon="lock-closed-outline" isPassword value={confirmPassword} onChangeText={setConfirmPassword} />
          {errors.confirmPassword && <Text style={styles.error}>{errors.confirmPassword}</Text>}
        </View>

        {serverError ? <Text style={styles.error}>{serverError}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>S'inscrire</Text>
          )}
        </TouchableOpacity>

        <View style={styles.row}>
          <Text style={styles.text}>Déjà un compte ? </Text>
          <TouchableOpacity onPress={() => router.push("/login")}>
            <Text style={styles.link}>Se connecter</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.socialContainer}>
          <Text style={styles.socialText}>Ou continuer avec</Text>
          {googleError ? <Text style={styles.error}>{googleError}</Text> : null}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={promptGoogleLogin}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#DB4437" />
            ) : (
              <>
                <Ionicons name="logo-google" size={22} color="#DB4437" />
                <Text style={styles.googleText}>S'inscrire avec Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Ionicons name="checkmark-circle" size={60} color="#407BFF" />
            <Text style={styles.modalTitle}>Compte créé !</Text>
            <Text style={styles.modalText}>
              Votre compte a été créé avec succès. Bienvenue 🎉
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Register;

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
    fontWeight: "400",
    textAlign: "center",
    color: "#575757",
    maxWidth: "80%",
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
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 18,
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

  socialContainer: {
    marginTop: 30,
  },

  socialText: {
    textAlign: "center",
    marginBottom: 10,
    color: "#575757",
    fontWeight: "600",
  },

  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eee",
    padding: 14,
    borderRadius: 10,
    gap: 10,
  },

  googleText: {
    fontWeight: "600",
    color: "#000",
  },

  error: {
    color: "red",
    marginLeft: 5,
    marginTop: 4,
    fontSize: 13,
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