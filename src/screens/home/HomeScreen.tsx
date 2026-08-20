import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CompositeNavigationProp } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { CalendarDays, ClipboardList, HeartPulse, Pill as PillIcon, FlaskConical, Bell } from "lucide-react-native";
import { Screen, ErrorBanner } from "@/components/Layout";
import { Card } from "@/components/Card";
import { Pill, statusTone } from "@/components/Pill";
import { LogoPill } from "@/components/Logo";
import { MetalHero } from "@/components/MetalHero";
import { IconBadge } from "@/components/IconBadge";
import { GadgetCard, DASHBOARD_TINTS, GadgetTint } from "@/components/GadgetCard";
import type { LucideIcon } from "@/theme/icons";
import { getSpecialtyStyle } from "@/theme/specialtyStyle";
import { NEUTRAL } from "@/theme/themes";
import { useAppTheme } from "@/context/ThemeContext";
import { getStats, getMyBookings, getNotifications, getProfile } from "@/api/portal";
import { apiErrorMessage } from "@/api/client";
import { Booking } from "@/api/types";
import { AppStackParamList } from "@/navigation/types";
import { AppTabsParamList } from "@/navigation/types";
import { useExitOnDoubleBack } from "@/utils/useExitOnDoubleBack";

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabsParamList, "Home">,
  NativeStackNavigationProp<AppStackParamList>
>;

const QUICK_ACTIONS: { key: string; label: string; sub: string; icon: LucideIcon; tint: GadgetTint }[] = [
  { key: "book", label: "Book visit", sub: "Find a doctor and a slot", icon: CalendarDays, tint: DASHBOARD_TINTS.teal },
  { key: "appointments", label: "Appointments", sub: "Upcoming and past visits", icon: ClipboardList, tint: DASHBOARD_TINTS.indigo },
  { key: "health", label: "Health journey", sub: "Vaccines, visits, and more", icon: HeartPulse, tint: DASHBOARD_TINTS.rose },
  { key: "prescriptions", label: "Prescriptions", sub: "From your past visits", icon: PillIcon, tint: DASHBOARD_TINTS.slate },
  { key: "labs", label: "Lab reports", sub: "Tests, results, and reports", icon: FlaskConical, tint: DASHBOARD_TINTS.gold },
];

function greetingForHour(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

export function HomeScreen() {
  useExitOnDoubleBack();
  const navigation = useNavigation<Nav>();
  const { theme } = useAppTheme();
  const [stats, setStats] = useState<{ hospitals: number; doctors: number } | null>(null);
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  // Recomputed every minute so "Good morning"/the date roll over on their
  // own while the app is sitting open, not just on the next full reload.
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [s, bookings, notifs, profile] = await Promise.all([
        getStats(),
        getMyBookings(),
        getNotifications().catch(() => null),
        getProfile().catch(() => null),
      ]);
      setStats(s);
      setUpcoming(bookings.filter((b) => ["scheduled", "waiting", "vitals_done", "in_progress"].includes(b.status)));
      setUnreadCount(notifs?.unread_count ?? 0);
      setFirstName(profile?.full_name?.split(" ")[0] || "");
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't load your dashboard."));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onQuickAction = (key: string) => {
    if (key === "book") navigation.navigate("FindDoctors", undefined);
    else if (key === "appointments") navigation.navigate("Tabs" as any, { screen: "Appointments" } as any);
    else if (key === "health") navigation.navigate("Tabs" as any, { screen: "Health" } as any);
    else if (key === "prescriptions") navigation.navigate("Prescriptions");
    else if (key === "labs") navigation.navigate("LabReports");
  };

  const nextUp = upcoming[0];
  // "Your bookings" used to show the next 2 upcoming appointments regardless
  // of date, which could be a week out — narrowed to just today's, since
  // that's the useful "what's on for me right now" view on the dashboard.
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayBookings = upcoming.filter((b) => b.date === todayIso);

  return (
    <Screen onRefresh={load} refreshing={loading}>
      <MetalHero compact style={styles.hero}>
        <View style={styles.heroTop}>
          <LogoPill size={40} />
          <Pressable onPress={() => navigation.navigate("Notifications")} hitSlop={10} style={styles.bellBtn}>
            <Bell size={18} color="#FFFFFF" strokeWidth={2.2} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
        <Text style={styles.greeting}>
          {greetingForHour(now.getHours())}
          {firstName ? `, ${firstName}` : ""}
        </Text>
        <Text style={styles.greetingDate}>{now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</Text>
        <Text style={styles.greetingSub}>
          {stats ? `${stats.hospitals} hospital${stats.hospitals === 1 ? "" : "s"} · ${stats.doctors}+ doctors on the platform` : "Here's your health at a glance"}
        </Text>
      </MetalHero>

      {!!error && <ErrorBanner message={error} onRetry={load} />}

      <Pressable
        onPress={() => navigation.navigate("Tabs" as any, { screen: "Appointments" } as any)}
        style={styles.reminderCard}
      >
        <IconBadge icon={Bell} size={32} />
        <View style={{ flex: 1 }}>
          {nextUp ? (
            <>
              <Text style={styles.remTitle}>
                {upcoming.length} upcoming appointment{upcoming.length === 1 ? "" : "s"}
              </Text>
              <Text style={styles.remSub}>
                {nextUp.doctor} · {nextUp.hospital} · {nextUp.date}
                {nextUp.time ? `, ${nextUp.time}` : ""}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.remTitle}>No upcoming appointments</Text>
              <Text style={styles.remSub}>Tap Book visit below to see a doctor</Text>
            </>
          )}
        </View>
        <Text style={styles.remChev}>›</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Quick access</Text>
      <View style={styles.grid}>
        {QUICK_ACTIONS.map((qa) => (
          <GadgetCard
            key={qa.key}
            icon={qa.icon}
            title={qa.label}
            subtitle={qa.sub}
            tint={qa.tint}
            iconSize={32}
            onPress={() => onQuickAction(qa.key)}
            style={styles.qa}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Today's bookings</Text>
      {todayBookings.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>
            {upcoming.length === 0 ? "No upcoming appointments yet." : "Nothing on for today."}
          </Text>
        </Card>
      ) : (
        todayBookings.map((b) => {
          // Colored by what the visit is for (the reason given at booking),
          // not by hospital/status — so a parent glancing at the dashboard
          // can tell "vaccination visit" from "fever follow-up" by color
          // alone, the same way the specialty icons on Find Doctors do.
          const st = getSpecialtyStyle(b.chief_complaint || b.doctor);
          const Icon = st.icon;
          return (
            <Card key={b.id} style={{ ...styles.bookingCard, borderColor: st.fg, backgroundColor: st.bg }}>
              <View style={styles.rowBetween}>
                <View style={styles.bookingLeft}>
                  <View style={[styles.bookingIcon, { backgroundColor: "#FFFFFF" }]}>
                    <Icon size={16} color={st.fg} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.hospitalName}>{b.hospital}</Text>
                    <Text style={styles.doctorLine}>
                      {b.doctor}
                      {b.time ? ` · ${b.time}` : ""}
                    </Text>
                  </View>
                </View>
                <Pill label={b.status} tone={statusTone(b.status)} />
              </View>
              {!!b.chief_complaint && (
                <Text style={[styles.reasonLine, { color: st.fg }]} numberOfLines={1}>
                  {b.chief_complaint}
                </Text>
              )}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginBottom: 16 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  bellBtn: { position: "relative", padding: 4 },
  badge: { position: "absolute", top: -2, right: -2, minWidth: 15, height: 15, borderRadius: 8, backgroundColor: "#B23A3A", alignItems: "center", justifyContent: "center", paddingHorizontal: 2 },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  greeting: { fontSize: 16, fontWeight: "600", color: "#FFFFFF", marginTop: 12 },
  greetingDate: { fontSize: 11, color: "#EAF3DE", marginTop: 2, opacity: 0.9 },
  greetingSub: { fontSize: 11.5, color: "#EAF3DE", marginTop: 6 },
  reminderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: NEUTRAL.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
    borderWidth: 0.5,
    borderColor: NEUTRAL.border,
  },
  remTitle: { fontSize: 12.5, fontWeight: "600", color: NEUTRAL.textPrimary },
  remSub: { fontSize: 11, color: NEUTRAL.textSecondary, marginTop: 3 },
  remChev: { fontSize: 18, color: NEUTRAL.textMuted },
  sectionTitle: { fontSize: 12, fontWeight: "600", color: NEUTRAL.textSecondary, marginBottom: 8, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  qa: { width: "47%" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hospitalName: { fontSize: 13, fontWeight: "600", color: NEUTRAL.textPrimary },
  doctorLine: { fontSize: 11.5, color: NEUTRAL.textSecondary, marginTop: 4 },
  emptyText: { fontSize: 12.5, color: NEUTRAL.textMuted },
  bookingCard: { borderWidth: 1 },
  bookingLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, marginRight: 8 },
  bookingIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  reasonLine: { fontSize: 11, fontWeight: "600", marginTop: 8 },
});
