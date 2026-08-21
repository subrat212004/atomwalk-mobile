import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen, BackHeader, ErrorBanner } from "@/components/Layout";
import { TextField } from "@/components/TextField";
import { PrimaryButton } from "@/components/Buttons";
import { LogoPill } from "@/components/Logo";
import { MetalHero } from "@/components/MetalHero";
import { NEUTRAL } from "@/theme/themes";
import { forgotPasswordRequestOtp } from "@/api/auth";
import { apiErrorMessage } from "@/api/client";
import { AuthStackParamList } from "@/navigation/types";

export function ForgotPasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!/^\d{10}$/.test(mobile.trim())) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await forgotPasswordRequestOtp(mobile.trim());
      navigation.navigate("ResetPassword", { mobile: mobile.trim(), devOtp: res.data?.debug_otp, otpMessage: res.message });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <BackHeader title="Reset password" onBack={() => navigation.goBack()} />
      <MetalHero compact curved style={styles.hero}>
        <View style={styles.heroInner}>
          <LogoPill size={44} />
        </View>
      </MetalHero>
      <View style={styles.header}>
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>Verify your mobile number to reset your patient portal password.</Text>
      </View>

      {!!error && <ErrorBanner message={error} />}

      <TextField
        label="Mobile number"
        placeholder="98xxxxxxxx"
        value={mobile}
        onChangeText={setMobile}
        keyboardType="number-pad"
        maxLength={10}
        error={undefined}
      />
      <PrimaryButton label="Continue" onPress={onSubmit} loading={loading} />

      <Text style={styles.help}>
        Mobile number not on file, or no longer have access to it? Contact support@atomwalk.com for help.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginBottom: 18 },
  heroInner: { alignItems: "center", paddingVertical: 4 },
  header: { alignItems: "center", marginBottom: 24 },
  title: { fontSize: 17, fontWeight: "600", color: NEUTRAL.textPrimary, marginTop: 10 },
  subtitle: { fontSize: 12, color: NEUTRAL.textSecondary, marginTop: 4, textAlign: "center", paddingHorizontal: 12 },
  help: { fontSize: 11.5, color: NEUTRAL.textSecondary, textAlign: "center", marginTop: 18 },
});
