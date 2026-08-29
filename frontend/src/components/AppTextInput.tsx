import React, { useState } from "react";
import {
  TextInput,
  TextInputProps,
  StyleSheet,
  View,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = TextInputProps & {
  icon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
};

const AppTextInput: React.FC<Props> = ({
  icon,
  isPassword,
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(isPassword);

  return (
    <View style={[styles.container, focused && styles.focused]}>
      
      {icon && (
        <Ionicons name={icon} size={20} color="#575757" />
      )}

      <TextInput
        {...props}
        secureTextEntry={hidden}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor="#575757"
        style={styles.input}
      />

      {isPassword && (
        <TouchableOpacity onPress={() => setHidden(!hidden)}>
          <Ionicons
            name={hidden ? "eye-off" : "eye"}
            size={20}
            color="#575757"
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default AppTextInput;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F6FF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginVertical: 10,
  },

  input: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    color: "#000",
  },

  focused: {
    borderWidth: 2,
    borderColor: "#407BFF",
  },
});