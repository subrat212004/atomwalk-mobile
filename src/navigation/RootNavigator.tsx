import React from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "@/context/AuthContext";
import { AuthStack } from "./AuthStack";
import { AppStack } from "./AppStack";
import { NEUTRAL } from "@/theme/themes";
import { useAppTheme } from "@/context/ThemeContext";

export function RootNavigator() {
  const { isLoading, isAuthenticated } = useAuth();
  const { theme } = useAppTheme();

  // This is the one moment a saved session actually shows a spinner —
  // just long enough to check for a stored token before deciding whether
  // to resume straight into the app or show the login screen.
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: NEUTRAL.bg }}>
        <ActivityIndicator size="large" color={theme.fill} />
      </View>
    );
  }

  return <NavigationContainer>{isAuthenticated ? <AppStack /> : <AuthStack />}</NavigationContainer>;
}
