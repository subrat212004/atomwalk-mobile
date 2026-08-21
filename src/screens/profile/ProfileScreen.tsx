import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, Image, Modal } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Camera } from "lucide-react-native";
import { Screen, ErrorBanner, SectionTitle } from "@/components/Layout";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { SecondaryButton, PrimaryButton } from "@/components/Buttons";
import { TextField } from "@/components/TextField";
import { DateField } from "@/components/DateField";
import { SelectField } from "@/components/SelectField";
import { MetalHero } from "@/components/MetalHero";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { GENDER_OPTIONS, RELATIONSHIP_OPTIONS } from "@/constants/options";
import { NEUTRAL } from "@/theme/themes";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { getProfile, getHealthSummary, getFamily, updateProfile } from "@/api/portal";
import { apiErrorMessage } from "@/api/client";
import { pickImage, pickImageFromCamera, fileToDataUri } from "@/utils/fileHelpers";
import { Profile, HealthSummary, FamilyMember } from "@/api/types";
import { AppStackParamList } from "@/navigation/types";

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { theme, allThemes, setThemeKey } = useAppTheme();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [signOutConfirmVisible, setSignOutConfirmVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
      setSignOutConfirmVisible(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [p, s, f] = await Promise.all([getProfile(), getHealthSummary(), getFamily()]);
      setProfile(p);
      setSummary(s);
      setFamily(f);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onPickPhoto = async (source: "camera" | "gallery") => {
    setShowPhotoSheet(false);
    try {
      const file = source === "camera" ? await pickImageFromCamera() : await pickImage();
      if (!file) return;
      setUploadingPhoto(true);
      const dataUri = await fileToDataUri(file);
      const updated = await updateProfile({ photo: dataUri });
      setProfile(updated);
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't update your photo."));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onRemovePhoto = async () => {
    setShowPhotoSheet(false);
    setUploadingPhoto(true);
    try {
      const updated = await updateProfile({ photo: "" });
      setProfile(updated);
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't remove your photo."));
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <Screen onRefresh={load} refreshing={loading}>
      {profile && (
        <MetalHero style={styles.hero} curved>
          <View style={styles.heroContent}>
            <View style={styles.avwrap}>
              <View style={styles.avatar}>
                {profile.photo ? (
                  <Image source={{ uri: profile.photo }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarText}>{profile.full_name?.[0] || "?"}</Text>
                )}
              </View>
              <Pressable
                onPress={() => setShowPhotoSheet(true)}
                style={styles.camBtn}
                hitSlop={8}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? <Text style={styles.camIcon}>…</Text> : <Camera size={13} color="#146334" strokeWidth={2.4} />}
              </Pressable>
            </View>
            <Pill label="Verified account" tone="neutral" />
            <Text style={styles.name}>{profile.full_name}</Text>
            <Text style={styles.awpid}>AWPID: {profile.awpid}</Text>
          </View>
        </MetalHero>
      )}

      <Modal visible={showPhotoSheet} transparent animationType="fade" onRequestClose={() => setShowPhotoSheet(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setShowPhotoSheet(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.sheetTitle}>Update profile photo</Text>
            <Pressable style={styles.sheetOpt} onPress={() => onPickPhoto("camera")}>
              <Text style={styles.sheetOptText}>Take photo</Text>
            </Pressable>
            <Pressable style={styles.sheetOpt} onPress={() => onPickPhoto("gallery")}>
              <Text style={styles.sheetOptText}>Choose from gallery</Text>
            </Pressable>
            {!!profile?.photo && (
              <Pressable style={styles.sheetOpt} onPress={onRemovePhoto}>
                <Text style={[styles.sheetOptText, { color: NEUTRAL.danger }]}>Remove photo</Text>
              </Pressable>
            )}
            <Pressable style={styles.sheetCancel} onPress={() => setShowPhotoSheet(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {!!error && <ErrorBanner message={error} onRetry={load} />}

      {profile && !editing && (
        <Card>
          <View style={styles.rowBetween}>
            <SectionTitle>Personal details</SectionTitle>
            <Pressable onPress={() => setEditing(true)}>
              <Text style={[styles.editLink, { color: theme.text }]}>Edit</Text>
            </Pressable>
          </View>
          <Row label="Mobile" value={profile.mobile} />
          <Row label="Email" value={profile.email || "Not set"} />
          <Row label="Gender" value={genderLabel(profile.gender) || "Not set"} />
          <Row label="Date of birth" value={profile.date_of_birth || "Not set"} />
        </Card>
      )}

      {profile && editing && (
        <EditProfileForm
          profile={profile}
          onSaved={(updated) => {
            setProfile(updated);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      {summary && (
        <>
          <SectionTitle>Health summary</SectionTitle>
          <View style={styles.summaryRow}>
            <Card style={styles.summaryTile}>
              <Text style={styles.summaryLabel}>BLOOD GROUP</Text>
              <Text style={[styles.summaryValue, { color: NEUTRAL.danger }]}>{summary.blood_group || "Not recorded"}</Text>
            </Card>
            <Card style={styles.summaryTile}>
              <Text style={styles.summaryLabel}>ALLERGIES</Text>
              <Text style={styles.summaryValue}>{summary.active_allergies.length ? summary.active_allergies.map((a) => a.substance).join(", ") : "None reported"}</Text>
            </Card>
          </View>
          {summary.active_diagnoses.length > 0 && (
            <Card>
              <Text style={styles.summaryLabel}>ACTIVE DIAGNOSES</Text>
              <View style={styles.diagWrap}>
                {summary.active_diagnoses.map((d, i) => (
                  <View key={i} style={styles.diagPill}>
                    <Text style={styles.diagText}>{d.description}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}
        </>
      )}

      <View style={styles.rowBetween}>
        <SectionTitle>Family members</SectionTitle>
        <Pressable onPress={() => navigation.navigate("AddFamilyMember")}>
          <Text style={[styles.editLink, { color: theme.text }]}>+ Add</Text>
        </Pressable>
      </View>
      {family.length === 0 ? (
        <Card>
          <Text style={styles.emMeta}>No family members added yet.</Text>
        </Card>
      ) : (
        family.map((f, i) => (
          <Card key={i}>
            <Text style={styles.hospitalName}>{f.full_name}</Text>
            <Text style={styles.emMeta}>
              {relationshipLabel(f.relationship) || "Family member"}
              {f.date_of_birth ? ` · Born ${f.date_of_birth}` : ""}
            </Text>
          </Card>
        ))
      )}

      {profile && (profile.emergency_contact_name || profile.emergency_contact_phone) ? (
        <>
          <SectionTitle>Emergency contact</SectionTitle>
          <Card>
            <Text style={styles.emName}>{profile.emergency_contact_name}</Text>
            <Text style={styles.emMeta}>
              {profile.emergency_contact_relation} · {profile.emergency_contact_phone}
            </Text>
          </Card>
        </>
      ) : null}

      {summary && summary.linked_hospitals.length > 0 && (
        <>
          <SectionTitle>Linked hospitals</SectionTitle>
          {summary.linked_hospitals.map((h, i) => (
            <Card key={i}>
              <View style={styles.rowBetween}>
                <Text style={styles.hospitalName}>{h.hospital_name}</Text>
                <Text style={styles.hospitalDate}>{h.last_visit}</Text>
              </View>
            </Card>
          ))}
        </>
      )}

      <SectionTitle>Color theme</SectionTitle>
      <Card>
        <View style={styles.swatchRow}>
          {allThemes.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setThemeKey(t.key)}
              style={[styles.swatch, { backgroundColor: t.fill, borderColor: t.key === theme.key ? NEUTRAL.textPrimary : "transparent" }]}
            />
          ))}
        </View>
      </Card>

      <SectionTitle>Need help?</SectionTitle>
      <Card>
        <Text style={styles.supportText}>
          For questions about your records, appointments, or anything that doesn't look right in the app, contact{" "}
          <Text style={{ fontWeight: "700" }}>support@atomwalk.com</Text>.
        </Text>
        <Text style={styles.supportNote}>
          In a medical emergency, call your local emergency number or go to the nearest hospital directly — do not
          wait for a reply here.
        </Text>
      </Card>

      <SecondaryButton label="Sign out" onPress={() => setSignOutConfirmVisible(true)} danger style={{ marginTop: 6 }} />

      <ConfirmDialog
        visible={signOutConfirmVisible}
        danger
        title="Sign out?"
        message="You'll need to sign in again to view your appointments and records."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        loading={signingOut}
        onConfirm={onSignOut}
        onCancel={() => setSignOutConfirmVisible(false)}
      />
    </Screen>
  );
}

function EditProfileForm({ profile, onSaved, onCancel }: { profile: Profile; onSaved: (p: Profile) => void; onCancel: () => void }) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [mobile, setMobile] = useState(profile.mobile);
  const [gender, setGender] = useState(profile.gender);
  const [dob, setDob] = useState(profile.date_of_birth || "");
  const [emName, setEmName] = useState(profile.emergency_contact_name);
  const [emPhone, setEmPhone] = useState(profile.emergency_contact_phone);
  const [emRelation, setEmRelation] = useState(profile.emergency_contact_relation);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!fullName.trim()) {
      setError("Name cannot be blank.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const updated = await updateProfile({
        full_name: fullName.trim(),
        mobile: mobile.trim(),
        gender: gender.trim(),
        date_of_birth: dob.trim() || undefined,
        emergency_contact_name: emName.trim(),
        emergency_contact_phone: emPhone.trim(),
        emergency_contact_relation: emRelation.trim(),
      });
      onSaved(updated);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <SectionTitle>Edit personal details</SectionTitle>
      {!!error && <ErrorBanner message={error} />}
      <TextField label="Full name" value={fullName} onChangeText={setFullName} />
      <TextField label="Mobile number" value={mobile} onChangeText={setMobile} keyboardType="number-pad" maxLength={10} />
      <SelectField label="Gender" value={gender} options={GENDER_OPTIONS} onChange={setGender} />
      <DateField label="Date of birth" value={dob} onChange={setDob} maximumDate={new Date()} />
      <TextField label="Emergency contact name" value={emName} onChangeText={setEmName} />
      <TextField label="Emergency contact phone" value={emPhone} onChangeText={setEmPhone} keyboardType="number-pad" maxLength={10} />
      <TextField label="Emergency contact relation" value={emRelation} onChangeText={setEmRelation} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <SecondaryButton label="Cancel" onPress={onCancel} style={{ flex: 1 }} />
        <PrimaryButton label="Save changes" onPress={onSave} loading={saving} style={{ flex: 1 }} />
      </View>
    </Card>
  );
}

function genderLabel(value: string): string {
  return GENDER_OPTIONS.find((o) => o.value === value)?.label || value;
}

function relationshipLabel(value: string): string {
  return RELATIONSHIP_OPTIONS.find((o) => o.value === value)?.label || value;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowBetween2}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { marginBottom: 16 },
  heroContent: { alignItems: "center", paddingVertical: 4 },
  avwrap: { position: "relative", marginBottom: 8 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: "100%", height: "100%" },
  avatarText: { fontSize: 20, fontWeight: "700", color: "#fff" },
  camBtn: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#146334",
    alignItems: "center",
    justifyContent: "center",
  },
  camIcon: { fontSize: 12 },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(12,35,64,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: NEUTRAL.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  sheetTitle: { fontSize: 12.5, fontWeight: "700", color: NEUTRAL.textPrimary, textAlign: "center", marginBottom: 12 },
  sheetOpt: { paddingVertical: 13, borderRadius: 10, backgroundColor: NEUTRAL.surfaceAlt, alignItems: "center", marginBottom: 8 },
  sheetOptText: { fontSize: 13, color: NEUTRAL.textPrimary, fontWeight: "500" },
  sheetCancel: { paddingVertical: 13, alignItems: "center", marginTop: 4 },
  sheetCancelText: { fontSize: 13, color: NEUTRAL.textSecondary, fontWeight: "600" },
  name: { fontWeight: "600", fontSize: 15, marginTop: 8, color: "#FFFFFF" },
  awpid: { fontSize: 11, color: "#EAF3DE", marginTop: 2 },
  editLink: { fontSize: 12, fontWeight: "600" },
  supportText: { fontSize: 12, color: NEUTRAL.textSecondary, lineHeight: 18 },
  supportNote: { fontSize: 11, color: NEUTRAL.textMuted, lineHeight: 16, marginTop: 8 },
  rowBetween2: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  rowLabel: { fontSize: 11, color: NEUTRAL.textMuted },
  rowValue: { fontSize: 12.5, color: NEUTRAL.textPrimary },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryTile: { flex: 1 },
  summaryLabel: { fontSize: 9.5, color: NEUTRAL.textMuted, marginBottom: 4 },
  summaryValue: { fontSize: 12.5, fontWeight: "600", color: NEUTRAL.textPrimary },
  diagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  diagPill: { backgroundColor: NEUTRAL.surfaceAlt, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  diagText: { fontSize: 11, color: NEUTRAL.textPrimary },
  emName: { fontSize: 13, fontWeight: "600", color: NEUTRAL.textPrimary },
  emMeta: { fontSize: 11.5, color: NEUTRAL.textSecondary, marginTop: 3 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hospitalName: { fontSize: 12.5, fontWeight: "600", color: NEUTRAL.textPrimary },
  hospitalDate: { fontSize: 11, color: NEUTRAL.textMuted },
  swatchRow: { flexDirection: "row", gap: 10 },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
});
