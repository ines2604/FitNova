import React, { useState } from "react";
import {
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import AppTextInput from "../components/AppTextInput";
import { useRouter } from "expo-router";
import * as authService from "../services/auth.service";

const ForgotPassword = () => {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const emailRegex = /\S+@\S+\.\S+/;

  const handleReset = async () => {
    setError("");
    setMessage("");

    if (!email) {
      setError("Email obligatoire");
      return;
    }

    if (!emailRegex.test(email)) {
      setError("Email invalide");
      return;
    }

    setLoading(true);

    try {
      const data = await authService.forgotPassword(email);
      setMessage("Un code de vérification a été envoyé par email 📩");
      setSent(true);

      if (data.userId) {
        setTimeout(() => {
          router.push({
            pathname: "/CodeOTP",
            params: { userId: String(data.userId), flow: "reset" },
          });
        }, 1200);
      }
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Mot de passe oublié</Text>

        <Text style={styles.subtitle}>
          Entrez votre email pour recevoir un lien de réinitialisation
        </Text>

        <View style={styles.imageWrapper}>
          <Image
            source={require("../../assets/images/Forgot password.png")}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        <AppTextInput
          placeholder="Email"
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}

        <TouchableOpacity
          style={[styles.button, (loading || sent) && { opacity: 0.6 }]}
          onPress={handleReset}
          disabled={loading || sent}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {sent ? "Email envoyé ✓" : "Envoyer le code de réinitialisation"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/login")}
          style={{ marginTop: 15 }}
        >
          <Text style={styles.link}>← Retour à la connexion</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ForgotPassword;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
  },

  content: {
    padding: 24,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1A1A2E",
    textAlign: "center",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 4,
  },

  imageWrapper: {
    alignItems: "center",
    marginVertical: 10,
  },

  image: {
    width: 220,
    height: 300,
  },

  button: {
    padding: 18,
    backgroundColor: "#407BFF",
    marginVertical: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#407BFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  link: {
    textAlign: "center",
    color: "#407BFF",
    fontWeight: "600",
    fontSize: 15,
  },

  error: {
    color: "#EF4444",
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
  },

  success: {
    color: "#407BFF",
    textAlign: "center",
    marginTop: 10,
    fontWeight: "600",
    fontSize: 14,
  },
});