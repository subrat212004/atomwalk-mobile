import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen, BackHeader, ErrorBanner, SectionTitle, EmptyState } from "@/components/Layout";
import { PrimaryButton } from "@/components/Buttons";
import { SegmentedControl } from "@/components/SegmentedControl";
import { NEUTRAL } from "@/theme/themes";
import { useAppTheme } from "@/context/ThemeContext";
import { getDoctorDetail, getSlots } from "@/api/portal";
import { apiErrorMessage } from "@/api/client";
import { DoctorDetail, SlotEntry } from "@/api/types";
import { AppStackParamList } from "@/navigation/types";

function dateOffsetLabel(daysFromToday: number): { key: string; label: string } {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const iso = d.toISOString().slice(0, 10);
  const label = daysFromToday === 0 ? "Today" : daysFromToday === 1 ? "Tomorrow" : d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  return { key: iso, label };
}

export function DoctorDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, "DoctorDetail">>();
  const { tenantId, doctorId, initialComplaint, patientAwpid, patientName } = route.params;
  const { theme } = useAppTheme();

  const dateOptions = [0, 1, 2, 3, 4, 5, 6].map(dateOffsetLabel);
  const [selectedDate, setSelectedDate] = useState(dateOptions[0].key);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
  const [slots, setSlots] = useState<SlotEntry[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDoctor = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDoctor(await getDoctorDetail(tenantId, doctorId));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [tenantId, doctorId]);

  useEffect(() => {
    loadDoctor();
  }, [loadDoctor]);

  useEffect(() => {
    setSelectedTime(null);
    setSlots([]);
    setSlotsLoading(true);
    getSlots(tenantId, doctorId, selectedDate)
      .then(setSlots)
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setSlotsLoading(false));
  }, [tenantId, doctorId, selectedDate]);

  return (
    <Screen>
      <BackHeader title="Doctor profile" onBack={() => navigation.goBack()} />
      {!!error && <ErrorBanner message={error} onRetry={loadDoctor} />}
      {loading ? (
        <Text style={styles.loading}>Loading…</Text>
      ) : !doctor ? null : (
        <View style={styles.body}>
          <View style={[styles.avatar, { backgroundColor: theme.bg }]}>
            <Text style={[styles.avatarText, { color: theme.text }]}>{doctor.name.replace("Dr. ", "")[0]}</Text>
          </View>
          <Text style={styles.name}>{doctor.name}</Text>
          <Text style={styles.spec}>
            {doctor.specialisation || "General physician"}
            {doctor.experience_years ? ` · ${doctor.experience_years} yrs experience` : ""}
          </Text>
          {!!doctor.bio && <Text style={styles.bio}>{doctor.bio}</Text>}
          {!!doctor.known_for && <Text style={styles.knownFor}>Known for: {doctor.known_for}</Text>}
          {doctor.consultation_fee && <Text style={styles.fee}>Consultation fee: ₹{doctor.consultation_fee}</Text>}

          <View style={{ alignSelf: "stretch" }}>
            <SectionTitle>Choose a date</SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <SegmentedControl options={dateOptions} value={selectedDate} onChange={setSelectedDate} />
            </ScrollView>
          </View>

          <View style={{ alignSelf: "stretch" }}>
            <SectionTitle>Choose a time slot</SectionTitle>
            {slotsLoading ? (
              <Text style={styles.slotsLoading}>Loading slots…</Text>
            ) : slots.length === 0 ? (
              <EmptyState text="No slots configured for this day — try a different date." />
            ) : (
              <View style={styles.slotGrid}>
                {slots.map((s) => {
                  const active = s.time === selectedTime;
                  return (
                    <Pressable
                      key={s.time}
                      disabled={!s.available}
                      onPress={() => setSelectedTime(s.time)}
                      style={[
                        styles.slot,
                        !s.available && styles.slotDisabled,
                        active && { backgroundColor: theme.fill, borderColor: theme.fill },
                      ]}
                    >
                      <Text style={[styles.slotText, !s.available && styles.slotTextDisabled, active && { color: theme.on }]}>
                        {s.time}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          <PrimaryButton
            label={selectedTime ? "Book appointment" : "Pick a slot to continue"}
            disabled={!selectedTime}
            style={{ alignSelf: "stretch" }}
            onPress={() =>
              navigation.navigate("ConfirmBooking", {
                tenantId,
                doctorId,
                doctorName: doctor.name,
                hospitalName: typeof doctor.hospital === "object" ? doctor.hospital.name : String(doctor.hospital || ""),
                date: selectedDate,
                time: selectedTime || undefined,
                chiefComplaint: initialComplaint,
                patientAwpid,
                patientName: patientName || "You",
              })
            }
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { textAlign: "center", color: NEUTRAL.textMuted, marginTop: 40 },
  body: { alignItems: "center" },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  avatarText: { fontSize: 22, fontWeight: "700" },
  name: { fontSize: 16, fontWeight: "600", color: NEUTRAL.textPrimary },
  spec: { fontSize: 12.5, color: NEUTRAL.textSecondary, marginTop: 3, marginBottom: 14, textAlign: "center" },
  bio: { fontSize: 12.5, color: NEUTRAL.textSecondary, textAlign: "left", alignSelf: "stretch", marginBottom: 10 },
  knownFor: { fontSize: 12, color: NEUTRAL.textSecondary, alignSelf: "stretch", marginBottom: 6 },
  fee: { fontSize: 12.5, fontWeight: "600", color: NEUTRAL.textPrimary, alignSelf: "stretch", marginBottom: 12 },
  slotsLoading: { fontSize: 12, color: NEUTRAL.textMuted, marginTop: 4, marginBottom: 8 },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  slot: { borderWidth: 1, borderColor: NEUTRAL.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: NEUTRAL.surface },
  slotDisabled: { backgroundColor: NEUTRAL.surfaceAlt, borderColor: NEUTRAL.surfaceAlt },
  slotText: { fontSize: 12, color: NEUTRAL.textPrimary, fontWeight: "600" },
  slotTextDisabled: { color: NEUTRAL.textMuted, fontWeight: "400" },
});
