import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen, BackHeader, ErrorBanner } from "@/components/Layout";
import { TextField } from "@/components/TextField";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import { LogoPill } from "@/components/Logo";
import { MetalHero } from "@/components/MetalHero";
import { NEUTRAL } from "@/theme/themes";
import { forgotPasswordVerifyOtp, forgotPasswordReset, forgotPasswordRequestOtp } from "@/api/auth";
import { apiErrorMessage } from "@/api/client";
import { AuthStackParamList } from "@/navigation/types";

type Step = "otp" | "password";

export function ResetPasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const route = useRoute<RouteProp<AuthStackParamList, "ResetPassword">>();
  const { mobile } = route.params;

  const [step, setStep] = useState<Step>("otp");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  // See RegisterScreen's devOtp comment — same reasoning, only ever set
  // when the backend has no SMTP configured.
  const [devOtp, setDevOtp] = useState(route.params.devOtp || "");
  // The backend's own message already contains the masked email
  // ("A verification code has been sent to ga***...@gmail.com.") — show
  // that instead of a generic placeholder that never actually told the
  // patient where to look.
  const [otpMessage, setOtpMessage] = useState(route.params.otpMessage || "Enter the code emailed to your account.");

  const onVerify = async () => {
    if (otp.trim().length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await forgotPasswordVerifyOtp(mobile, otp.trim());
      setStep("password");
    } catch (err) {
      setError(apiErrorMessage(err, "Incorrect code."));
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    try {
      const res = await forgotPasswordRequestOtp(mobile);
      setDevOtp(res.data?.debug_otp || "");
      setOtpMessage(res.message);
      setResent(true);
      setTimeout(() => setResent(false), 2500);
    } catch {
      // silent — the request-otp screen already surfaced the mobile-level error path
    }
  };

  const onReset = async () => {
    // Trim defensively — a keyboard/autofill-inserted trailing space is
    // invisible behind the masked dots and would otherwise fail this
    // comparison even though the two fields "look" identical to the user.
    const pw = password.trim();
    const cf = confirm.trim();
    if (pw.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (pw !== cf) {
      setError("Passwords don't match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await forgotPasswordReset(mobile, pw, cf);
      navigation.navigate("Login");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <BackHeader title="Reset password" onBack={() => (step === "password" ? setStep("otp") : navigation.goBack())} />
      <MetalHero compact style={styles.hero}>
        <View style={styles.heroInner}>
          <LogoPill size={44} />
        </View>
      </MetalHero>
      <View style={styles.header}>
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>{step === "otp" ? otpMessage : "Choose a new password for your account."}</Text>
      </View>

      {!!error && <ErrorBanner message={error} />}

      {step === "otp" ? (
        <>
          {!!devOtp && (
            <View style={styles.devBox}>
              <Text style={styles.devText}>
                Dev mode — email isn't configured on the backend yet, so here's the code directly: {devOtp}
              </Text>
            </View>
          )}
          <TextField label="6-digit code" placeholder="000000" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} />
          <PrimaryButton label="Verify code" onPress={onVerify} loading={loading} />
          <SecondaryButton label={resent ? "Code resent" : "Resend code"} onPress={onResend} style={{ marginTop: 10 }} />
          <Pressable onPress={() => navigation.navigate("Login")} style={styles.backToLoginWrap}>
            <Text style={styles.backToLogin}>Back to login</Text>
          </Pressable>
        </>
      ) : (
        <>
          <TextField label="New password" placeholder="Minimum 8 characters" value={password} onChangeText={setPassword} isPassword />
          <TextField label="Confirm new password" placeholder="Repeat your new password" value={confirm} onChangeText={setConfirm} isPassword />
          <PrimaryButton label="Reset password" onPress={onReset} loading={loading} />
          <Pressable onPress={() => navigation.navigate("Login")} style={styles.backToLoginWrap}>
            <Text style={styles.backToLogin}>Back to login</Text>
          </Pressable>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginBottom: 18 },
  heroInner: { alignItems: "center", paddingVertical: 4 },
  header: { alignItems: "center", marginBottom: 24 },
  title: { fontSize: 17, fontWeight: "600", color: NEUTRAL.textPrimary, marginTop: 10 },
  subtitle: { fontSize: 12, color: NEUTRAL.textSecondary, marginTop: 4, textAlign: "center", paddingHorizontal: 12 },
  devBox: { backgroundColor: NEUTRAL.warningBg, borderRadius: 10, padding: 10, marginBottom: 12 },
  devText: { fontSize: 11.5, color: NEUTRAL.warning },
  backToLoginWrap: { alignSelf: "center", marginTop: 16 },
  backToLogin: { fontSize: 12.5, color: NEUTRAL.textSecondary, fontWeight: "600" },
});
