import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { AntDesign } from "@expo/vector-icons";

type Props = {
    onPress: () => void;
    isLast?: boolean;
};

const NextButton = ({ onPress, isLast }: Props) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.button, isLast && styles.buttonLast]}
        >
            {isLast ? (
                <Text style={styles.text}>Commencer</Text>
            ) : (
                <AntDesign name="right" size={32} color="#fff" />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        width: 64,
        height: 64,
        backgroundColor: "#407BFF",
        borderRadius: 100,
        justifyContent: "center",
        alignItems: "center",
    },

    buttonLast: {
        width: 160,      
        height: 50,     
        borderRadius: 25, 
    },

    text: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
});

export default NextButton;