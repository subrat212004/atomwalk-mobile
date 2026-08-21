import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen, BackHeader, ErrorBanner } from "@/components/Layout";
import { TextField } from "@/components/TextField";
import { DateField } from "@/components/DateField";
import { PrimaryButton } from "@/components/Buttons";
import { LogoPill } from "@/components/Logo";
import { MetalHero } from "@/components/MetalHero";
import { NEUTRAL } from "@/theme/themes";
import { registerRequestOtp, registerVerifyOtp, registerAccount } from "@/api/auth";
import { apiErrorMessage } from "@/api/client";
import { AuthStackParamList } from "@/navigation/types";

// Ordered as a real signup should be: identity first, then prove the email
// is really yours (OTP), then set the password last — not a single page
// with password sitting next to unverified fields. "password" is skipped
// straight from "details" only when no email was given (nothing to verify).
type Step = "details" | "otp" | "password";

export function RegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [step, setStep] = useState<Step>("details");

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState(""); // YYYY-MM-DD
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Only ever populated when the backend has no SMTP configured and is
  // running in DEBUG mode (see core/email.py) — it echoes the code back
  // in the response instead of actually emailing it, specifically so local
  // testing isn't blocked on real email delivery being set up. Remove this
  // once EMAIL_HOST_USER/PASSWORD are configured in production.
  const [devOtp, setDevOtp] = useState("");

  const onContinueFromDetails = async () => {
    if (!fullName.trim() || !/^\d{10}$/.test(mobile.trim())) {
      setError("Fill in your name and a valid 10-digit mobile number.");
      return;
    }
    setError("");
    if (!email.trim()) {
      // No email means nothing to verify — go straight to setting a password.
      setStep("password");
      return;
    }
    setLoading(true);
    try {
      // An email means a verification code is required before the account
      // can actually be created — mirrors PortalRegisterRequestOTPView.
      const res = await registerRequestOtp(mobile.trim(), email.trim());
      setDevOtp(res.data?.debug_otp || "");
      setStep("otp");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async () => {
    if (otp.trim().length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await registerVerifyOtp(mobile.trim(), otp.trim());
      setStep("password");
    } catch (err) {
      setError(apiErrorMessage(err, "Incorrect code."));
    } finally {
      setLoading(false);
    }
  };

  const onSetPasswordAndCreate = async () => {
    // Trim defensively — invisible keyboard/autofill-inserted whitespace
    // must never end up baked into the stored password.
    if (password.trim().length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password.trim() !== confirmPassword.trim()) {
      setError("Passwords don't match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await registerAccount({
        full_name: fullName.trim(),
        mobile: mobile.trim(),
        password: password.trim(),
        email: email.trim() || undefined,
        date_of_birth: dob.trim() || undefined,
      });
      navigation.navigate("Login");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onBack = () => {
    if (step === "password") setStep(email.trim() ? "otp" : "details");
    else if (step === "otp") setStep("details");
    else navigation.goBack();
  };

  const stepTitle = { details: "Create your account", otp: "Verify your email", password: "Set a password" }[step];
  const stepSubtitle = {
    details: "Register to book appointments and view your records.",
    otp: `Enter the code sent to ${email}.`,
    password: "Last step — choose a password to protect your account.",
  }[step];

  return (
    <Screen>
      <BackHeader title="Create account" onBack={onBack} />
      <MetalHero compact style={styles.hero} decorative curved>
        <View style={styles.heroInner}>
          <LogoPill size={44} />
        </View>
      </MetalHero>
      <View style={styles.header}>
        <Text style={styles.title}>{stepTitle}</Text>
        <Text style={styles.subtitle}>{stepSubtitle}</Text>
      </View>

      {!!error && <ErrorBanner message={error} />}

      {step === "details" && (
        <>
          <TextField label="Full name" placeholder="e.g. Rohan Sharma" value={fullName} onChangeText={setFullName} />
          <TextField label="Mobile number" placeholder="98xxxxxxxx" value={mobile} onChangeText={setMobile} keyboardType="number-pad" maxLength={10} />
          <TextField label="Email (optional)" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Text style={styles.hint}>Add an email to secure your account with a verification code.</Text>
          <DateField label="Date of birth" value={dob} onChange={setDob} maximumDate={new Date()} />
          <PrimaryButton label="Continue" onPress={onContinueFromDetails} loading={loading} />
        </>
      )}

      {step === "otp" && (
        <>
          {!!devOtp && (
            <View style={styles.devBox}>
              <Text style={styles.devText}>
                Dev mode — email isn't configured on the backend yet, so here's the code directly: {devOtp}
              </Text>
            </View>
          )}
          <TextField label="6-digit code" placeholder="000000" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} />
          <PrimaryButton label="Verify code" onPress={onVerifyOtp} loading={loading} />
          <Pressable onPress={() => navigation.navigate("Login")} style={styles.backToLoginWrap}>
            <Text style={styles.backToLogin}>Back to login</Text>
          </Pressable>
        </>
      )}

      {step === "password" && (
        <>
          <TextField label="Password" placeholder="Minimum 8 characters" value={password} onChangeText={setPassword} isPassword />
          <TextField label="Confirm password" placeholder="Re-enter your password" value={confirmPassword} onChangeText={setConfirmPassword} isPassword />
          <PrimaryButton label="Create account" onPress={onSetPasswordAndCreate} loading={loading} />
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
  header: { alignItems: "center", marginBottom: 20 },
  title: { fontSize: 17, fontWeight: "600", color: NEUTRAL.textPrimary, marginTop: 10 },
  subtitle: { fontSize: 12, color: NEUTRAL.textSecondary, marginTop: 4, textAlign: "center", paddingHorizontal: 12 },
  hint: { fontSize: 11, color: NEUTRAL.textMuted, marginTop: -8, marginBottom: 14 },
  devBox: { backgroundColor: NEUTRAL.warningBg, borderRadius: 10, padding: 10, marginBottom: 12 },
  devText: { fontSize: 11.5, color: NEUTRAL.warning },
  backToLoginWrap: { alignSelf: "center", marginTop: 16 },
  backToLogin: { fontSize: 12.5, color: NEUTRAL.textSecondary, fontWeight: "600" },
});
