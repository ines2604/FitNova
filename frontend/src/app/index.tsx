import { useAuthBootstrap } from "../hooks/useAuthBootstrap";
import { ActivityIndicator, Text, TouchableOpacity, View, StyleSheet } from "react-native";

export default function Index() {
    const { error, retry } = useAuthBootstrap();

    return (
        <View style={styles.container}>
            {error ? (
                <>
                    <Text style={styles.error}>{error}</Text>
                    <TouchableOpacity style={styles.button} onPress={retry}>
                        <Text style={styles.buttonText}>Réessayer</Text>
                    </TouchableOpacity>
                </>
            ) : (
                <>
                    <ActivityIndicator size="large" color="#407BFF" />
                    <Text style={styles.loading}>Chargement...</Text>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
    },
    loading: {
        marginTop: 12,
        color: "#64748B",
        fontSize: 16,
    },
    error: {
        color: "#EF4444",
        textAlign: "center",
        marginBottom: 16,
        fontSize: 15,
    },
    button: {
        backgroundColor: "#407BFF",
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 12,
    },
    buttonText: {
        color: "#FFFFFF",
        fontWeight: "bold",
        fontSize: 16,
    },
});
