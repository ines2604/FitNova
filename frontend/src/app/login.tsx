import React, { useState } from "react";
import {
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppTextInput from "../components/AppTextInput";
import { useRouter } from "expo-router";
import * as authService from "../services/auth.service";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { navigateAfterAuth } from "../utils/authNavigation";

const Login = () => {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const { loading: googleLoading, error: googleError, promptGoogleLogin } =
    useGoogleAuth(async () => {
      await navigateAfterAuth(router);
    });

  const validate = () => {
    let valid = true;
    let newErrors: { email?: string; password?: string } = {};

    const emailRegex = /\S+@\S+\.\S+/;

    if (!email) {
      newErrors.email = "Email obligatoire";
      valid = false;
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Email invalide";
      valid = false;
    }

    if (!password) {
      newErrors.password = "Mot de passe obligatoire";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleLogin = async () => {
    setServerError("");
    if (!validate()) return;

    setLoading(true);
    try {
      await authService.login(email, password);
      await navigateAfterAuth(router);
    } catch (e: any) {
      // 403 email non vérifié avec userId renvoyé par le backend
      if (e?.status === 403 && e?.response?.data?.userId) {
        router.push({
          pathname: "/CodeOTP",
          params: {
            userId: String(e.response.data.userId),
            flow: "register",
          },
        });
        return;
      }
      setServerError(e?.message || "Email ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Se connecter</Text>
          <Text style={styles.subtitle}>
            Ravi de vous revoir ! Vous nous avez manqué.
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <AppTextInput
            placeholder="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
          />
          {errors.email && (
            <Text style={styles.error}>{errors.email}</Text>
          )}

          <AppTextInput
            placeholder="Mot de passe"
            icon="lock-closed-outline"
            isPassword
            value={password}
            onChangeText={setPassword}
          />
          {errors.password && (
            <Text style={styles.error}>{errors.password}</Text>
          )}
        </View>

        {serverError ? <Text style={styles.error}>{serverError}</Text> : null}

        <TouchableOpacity onPress={() => router.push("/forgot-password")}>
          <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Se connecter</Text>
          )}
        </TouchableOpacity>

        <View style={styles.row}>
          <Text style={styles.text}>Vous n’avez pas de compte ? </Text>
          <TouchableOpacity onPress={() => router.push("/register")}>
            <Text style={styles.link}>Créer un compte</Text>
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
                <Text style={styles.googleText}>
                  Se connecter avec Google
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
  },

  content: {
    paddingHorizontal: 24,
  },

  titleContainer: {
    alignItems: "center",
    marginBottom: 30,
  },

  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#64748B",
    maxWidth: "80%",
    lineHeight: 24,
  },

  inputContainer: {
    marginBottom: 10,
  },

  forgotText: {
    textAlign: "right",
    color: "#407BFF",
    fontWeight: "600",
    marginTop: 8,
  },

  button: {
    backgroundColor: "#407BFF",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 25,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },

  row: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },

  text: {
    color: "#64748B",
    fontSize: 15,
  },

  link: {
    color: "#407BFF",
    fontWeight: "bold",
    fontSize: 15,
  },

  socialContainer: {
    marginTop: 40,
  },

  socialText: {
    textAlign: "center",
    color: "#64748B",
    marginBottom: 15,
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
    color: "#EF4444",
    marginTop: 5,
    marginLeft: 5,
    fontSize: 13,
  },
});