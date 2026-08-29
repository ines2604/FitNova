import {
  Dimensions,
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React from "react";
import { useRouter } from "expo-router";

const { height } = Dimensions.get("window");

const welcome = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>

        <ImageBackground
          style={{ height: height / 2.5, width: "100%" }}
          resizeMode="contain"
          source={require("../../assets/images/logo.png")}
        />

        <View style={{ paddingHorizontal: 40, paddingTop: 20 }}>
          <Text style={styles.title}>Obtiens la meilleure version de ton corps</Text>

          <Text style={styles.subtitle}>
              Suis tes progrès, suis ton plan et transforme ton mode de vie.
          </Text>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            onPress={() => router.push("/login")}
            style={styles.loginBtn}
          >
            <Text style={styles.loginText}>Se connecter</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/register")}
            style={styles.registerBtn}
          >
            <Text style={styles.registerText}>S'inscrire</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    color: "#407BFF",
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#575757",
    textAlign: "center",
    marginTop: 20,
  },
  buttonsContainer: {
    paddingHorizontal: 20,
    paddingTop: 60,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  loginBtn: {
    backgroundColor: "#407BFF",
    paddingVertical: 15,
    width: "48%",
    borderRadius: 10,
    shadowColor: "#407BFF",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  registerBtn: {
    paddingVertical: 15,
    width: "48%",
    borderRadius: 10,
  },
  loginText: {
    fontWeight: "bold",
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
  },
  registerText: {
    fontWeight: "bold",
    color: "#575757",
    fontSize: 18,
    textAlign: "center",
  },
});

export default welcome;