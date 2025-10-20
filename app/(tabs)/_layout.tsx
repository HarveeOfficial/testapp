import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useTheme } from "../../utils/ThemeContext";

export default function TabsLayout() {
    const { theme } = useTheme();
    
    return (
        <Tabs
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: theme.colors.card,
                    borderTopColor: theme.colors.border,
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textSecondary,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    headerTitle: "Home",
                    tabBarIcon: ({ focused, color }) => (
                        <Ionicons
                            name={focused ? "home-sharp" : "home-outline"}
                            size={24}
                            color={color}
                        />
                    ),
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="about"
                options={{
                    headerTitle: "About Us",
                        tabBarIcon: ({ focused, color }) => (
                        <Ionicons
                            name={
                                focused
                                    ? "information-circle-sharp"
                                    : "information-circle-outline"
                            }
                            size={24}
                            color={color}
                        />
                    ),
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    headerTitle: "Settings",
                    tabBarIcon: ({ focused, color }) => (
                        <Ionicons
                            name={focused ? "settings-sharp" : "settings-outline"}
                            size={24}
                            color={color}
                        />
                    ),
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="+not-found"
                options={{ headerTitle: "Not Found", headerShown: false }}
            />
        </Tabs>
    );
}
