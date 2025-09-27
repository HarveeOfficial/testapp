import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// app/+not-found.tsx

export default function NotFoundScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Text style={styles.code}>:/</Text>
            <Text style={styles.title}>Page Not Found</Text>
            <Text style={styles.subtitle}>
                The page you are looking for does not exist or has moved.
            </Text>

            <View style={styles.actions}>
                <Pressable
                    accessibilityRole="button"
                    onPress={() => router.back()}
                    style={({ pressed }) => [styles.button, pressed && styles.pressed]}
                >
                    <Text style={styles.buttonText}>Go Back</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0e1116'
    },
    code: {
        fontSize: 72,
        fontWeight: '800',
        color: '#4f85ff',
        letterSpacing: 2
    },
    title: {
        marginTop: 8,
        fontSize: 28,
        fontWeight: '700',
        color: '#ffffff'
    },
    subtitle: {
        marginTop: 8,
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 340,
        color: '#b4bcc7'
    },
    actions: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 32
    },
    button: {
        backgroundColor: '#4f85ff',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 10
    },
    pressed: {
        opacity: 0.8
    },
    buttonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 16
    },
    buttonSecondary: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#4f85ff'
    },
    pressedSecondary: {
        backgroundColor: 'rgba(79,133,255,0.12)'
    },
    buttonSecondaryText: {
        color: '#4f85ff',
        fontWeight: '600',
        fontSize: 16
    }
});