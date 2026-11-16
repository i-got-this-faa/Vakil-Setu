import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, space } from "../../src/theme";
import { useUnreadBadge } from "../../src/features/alerts/use-unread-badge";
import { useLocale } from "../../src/providers/locale";

export default function TabsLayout() {
  const { copy, messages } = useLocale();
  const unread = useUnreadBadge();
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
    <View style={styles.brandHeader}>
      <View style={styles.brandMark}><Ionicons name="scale-outline" size={23} color={colors.primary} /></View>
      <View><Text style={styles.brandName}>Legal-Setu</Text><Text style={styles.brandCaption}>LEGAL AI</Text></View>
    </View>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        tabBarStyle: { minHeight: 64, paddingTop: space.sm, backgroundColor: colors.surface, borderTopColor: colors.border, elevation: 0 },
        tabBarActiveBackgroundColor: colors.primarySurface,
        tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.onPrimary },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: messages.navigation.findAdvocate,
          tabBarIcon: ({ focused, size }) => <Ionicons name="search" size={size} color={focused ? colors.primary : colors.muted} />,
        }}
      />
      <Tabs.Screen
        name="cases"
        options={{
          title: copy.product.cases,
          tabBarIcon: ({ focused, size }) => <Ionicons name="folder-open-outline" size={size} color={focused ? colors.primary : colors.muted} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: messages.navigation.consultations,
          tabBarIcon: ({ focused, size }) => <Ionicons name="calendar-outline" size={size} color={focused ? colors.primary : colors.muted} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: copy.product.notifications,
          tabBarBadge: unread.label,
          tabBarIcon: ({ focused, size }) => <Ionicons name="notifications-outline" size={size} color={focused ? colors.primary : colors.muted} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: messages.navigation.profile,
          tabBarIcon: ({ focused, size }) => <Ionicons name="person-circle-outline" size={size} color={focused ? colors.primary : colors.muted} />,
        }}
      />
    </Tabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  brandHeader: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.xl, paddingVertical: space.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  brandMark: { width: 40, height: 40, borderWidth: 1, borderColor: colors.primaryBorder, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  brandName: { fontFamily: fonts.heading, fontSize: 23, color: colors.ink },
  brandCaption: { fontSize: 10, letterSpacing: 1.6, color: colors.muted, marginTop: 2 },
});
