import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Contacts from "expo-contacts";
import { File, Paths } from "expo-file-system";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { FlatList } from "react-native-gesture-handler";
import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { ContactRow } from "@/src/components/ContactRow";
import { fontSize, palette, radius, spacing } from "@/src/theme";
import { buildFileName, generateVCF, SimpleContact } from "@/src/vcf";

type Phase = "loading" | "needs-permission" | "denied" | "ready";

const EMPTY_BG_LIGHT =
  "https://images.pexels.com/photos/3062948/pexels-photo-3062948.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const EMPTY_BG_DARK =
  "https://images.unsplash.com/photo-1637946175559-22c4fe13fc54?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzR8MHwxfHNlYXJjaHwxfHxjbGVhbiUyMG1pbmltYWwlMjBhYnN0cmFjdCUyMGJsYWNrJTIwZ2VvbWV0cmljJTIwYmFja2dyb3VuZHxlbnwwfHx8fDE3ODYwMjY2NDV8MA&ixlib=rb-4.1.0&q=85";

export default function Home() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = isDark ? palette.dark : palette.light;
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<Phase>("loading");
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [contacts, setContacts] = useState<SimpleContact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [exporting, setExporting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(
    null,
  );
  const toastAnim = useRef(new Animated.Value(0)).current;

  const showToast = useCallback(
    (msg: string, error?: boolean) => {
      setToast({ msg, error });
      Animated.sequence([
        Animated.timing(toastAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.delay(2200),
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => setToast(null));
    },
    [toastAnim],
  );

  const loadContacts = useCallback(async () => {
    setPhase("loading");
    const { data } = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.FirstName,
        Contacts.Fields.LastName,
        Contacts.Fields.Name,
        Contacts.Fields.PhoneNumbers,
      ],
    });

    const mapped: SimpleContact[] = data
      .map((c) => {
        const phones = (c.phoneNumbers || [])
          .map((p) => (p.number || "").trim())
          .filter(Boolean);
        const name =
          c.name ||
          [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
          "No Name";
        return {
          id: c.id || name + phones.join(""),
          name,
          firstName: c.firstName,
          lastName: c.lastName,
          phones,
        };
      })
      .filter((c) => c.phones.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    setContacts(mapped);
    setPhase("ready");
  }, []);

  const evaluatePermission = useCallback(async () => {
    const res = await Contacts.getPermissionsAsync();
    setCanAskAgain(res.canAskAgain);
    if (res.status === "granted") {
      await loadContacts();
    } else if (res.status === "undetermined") {
      setPhase("needs-permission");
    } else {
      setPhase("denied");
    }
  }, [loadContacts]);

  useEffect(() => {
    evaluatePermission();
  }, [evaluatePermission]);

  const requestPermission = useCallback(async () => {
    const res = await Contacts.requestPermissionsAsync();
    setCanAskAgain(res.canAskAgain);
    if (res.status === "granted") {
      await loadContacts();
    } else {
      setPhase("denied");
    }
  }, [loadContacts]);

  // Filtering
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phones.some((p) => p.replace(/\s/g, "").includes(q.replace(/\s/g, ""))),
    );
  }, [contacts, query]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  const toggleContact = useCallback((id: string) => {
    Haptics.selectionAsync();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((c) => next.delete(c.id));
      } else {
        filtered.forEach((c) => next.add(c.id));
      }
      return next;
    });
  }, [allFilteredSelected, filtered]);

  const handleExport = useCallback(async () => {
    if (selected.size === 0 || exporting) return;
    setExporting(true);
    try {
      const chosen = contacts.filter((c) => selected.has(c.id));
      const vcf = generateVCF(chosen);
      const fileName = buildFileName();

      const file = new File(Paths.cache, fileName);
      if (file.exists) file.delete();
      file.create();
      file.write(vcf);

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast("Sharing is not available on this device", true);
        return;
      }

      await Sharing.shareAsync(file.uri, {
        mimeType: "text/vcard",
        UTI: "public.vcard",
        dialogTitle: "Export contacts",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`Exported ${chosen.length} contact${chosen.length > 1 ? "s" : ""}`);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast("Export failed. Please try again.", true);
    } finally {
      setExporting(false);
    }
  }, [contacts, selected, exporting, showToast]);

  // ---------- Render states ----------

  if (phase === "loading") {
    return (
      <View style={[styles.center, { backgroundColor: colors.surface }]}>
        <ActivityIndicator testID="loading-spinner" size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  if (phase === "needs-permission" || phase === "denied") {
    const denied = phase === "denied";
    return (
      <View style={[styles.fill, { backgroundColor: colors.surface }]}>
        <Image
          source={{ uri: isDark ? EMPTY_BG_DARK : EMPTY_BG_LIGHT }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={300}
        />
        <LinearGradient
          colors={[
            "transparent",
            isDark ? "rgba(0,0,0,0.35)" : "rgba(28,28,30,0.35)",
            isDark ? "rgba(0,0,0,0.95)" : "rgba(28,28,30,0.95)",
          ]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.stateContent, { paddingBottom: insets.bottom + spacing["3xl"] }]}>
          <View style={styles.stateIconWrap}>
            <Ionicons
              name={denied ? "lock-closed" : "people"}
              size={30}
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.stateTitle}>
            {denied ? "Contacts access needed" : "Export your contacts"}
          </Text>
          <Text style={styles.stateBody}>
            {denied
              ? "We need permission to read your contacts so you can pick and export them. Everything stays on your device."
              : "Allow access to your contacts to select and export them as a VCF file. Nothing ever leaves your device."}
          </Text>

          {denied && !canAskAgain ? (
            <Pressable
              testID="open-settings-button"
              onPress={() => Linking.openSettings()}
              style={({ pressed }) => [
                styles.ctaPrimary,
                { backgroundColor: colors.brandPrimary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Ionicons name="settings-outline" size={18} color={colors.onBrandPrimary} />
              <Text style={[styles.ctaText, { color: colors.onBrandPrimary }]}>
                Open Settings
              </Text>
            </Pressable>
          ) : (
            <Pressable
              testID="allow-access-button"
              onPress={requestPermission}
              style={({ pressed }) => [
                styles.ctaPrimary,
                { backgroundColor: colors.brandPrimary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.ctaText, { color: colors.onBrandPrimary }]}>
                Allow Access
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // phase === "ready"
  const ctaHeight = 64 + insets.bottom + spacing.md;

  return (
    <View style={[styles.fill, { backgroundColor: colors.surface }]}>
      {/* Sticky header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.sm,
            backgroundColor: colors.surface,
            borderBottomColor: colors.divider,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.onSurface }]}>Contacts</Text>

        <View style={[styles.searchBar, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="search" size={18} color={colors.onSurfaceTertiary} />
          <TextInput
            testID="search-input"
            value={query}
            onChangeText={setQuery}
            placeholder="Search name or number"
            placeholderTextColor={colors.onSurfaceTertiary}
            style={[styles.searchInput, { color: colors.onSurface }]}
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable testID="clear-search" onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.onSurfaceTertiary} />
            </Pressable>
          )}
        </View>

        <View style={styles.selectRow}>
          <Text
            testID="selected-count"
            style={[styles.selectedCount, { color: colors.onSurface }]}
          >
            {selected.size} Selected
          </Text>
          <Pressable
            testID="select-all-toggle"
            onPress={toggleSelectAll}
            disabled={filtered.length === 0}
            hitSlop={8}
            style={styles.selectAllBtn}
          >
            <Text style={[styles.selectAllText, { color: colors.brandPrimary }]}>
              {allFilteredSelected ? "Deselect All" : "Select All"}
            </Text>
            <Ionicons
              name={allFilteredSelected ? "checkmark-circle" : "ellipse-outline"}
              size={20}
              color={colors.brandPrimary}
            />
          </Pressable>
        </View>
      </View>

      <FlatList
        testID="contacts-list"
        data={filtered}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => (
          <ContactRow
            contact={item}
            selected={selected.has(item.id)}
            onToggle={toggleContact}
            colors={colors}
          />
        )}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.divider }]} />
        )}
        contentContainerStyle={{ paddingBottom: ctaHeight + spacing.lg }}
        ListEmptyComponent={
          <View style={styles.listEmpty}>
            <Ionicons name="search" size={28} color={colors.onSurfaceTertiary} />
            <Text style={[styles.listEmptyText, { color: colors.onSurfaceTertiary }]}>
              {contacts.length === 0
                ? "No contacts with phone numbers found"
                : "No contacts match your search"}
            </Text>
          </View>
        }
      />

      {/* Bottom sticky export bar */}
      <BlurView
        intensity={40}
        tint={isDark ? "dark" : "light"}
        style={[
          styles.exportBar,
          {
            paddingBottom: insets.bottom + spacing.md,
            borderTopColor: colors.divider,
          },
        ]}
      >
        <Pressable
          testID="export-button"
          onPress={handleExport}
          disabled={selected.size === 0 || exporting}
          style={({ pressed }) => [
            styles.exportBtn,
            {
              backgroundColor:
                selected.size === 0 ? colors.surfaceTertiary : colors.brandPrimary,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          {exporting ? (
            <ActivityIndicator color={colors.onBrandPrimary} />
          ) : (
            <>
              <Ionicons
                name="share-outline"
                size={20}
                color={
                  selected.size === 0 ? colors.onSurfaceTertiary : colors.onBrandPrimary
                }
              />
              <Text
                style={[
                  styles.exportText,
                  {
                    color:
                      selected.size === 0
                        ? colors.onSurfaceTertiary
                        : colors.onBrandPrimary,
                  },
                ]}
              >
                {selected.size === 0
                  ? "Select contacts to export"
                  : `Export ${selected.size} as VCF`}
              </Text>
            </>
          )}
        </Pressable>
      </BlurView>

      {/* Toast */}
      {toast && (
        <Animated.View
          testID="toast"
          pointerEvents="none"
          style={[
            styles.toast,
            {
              bottom: ctaHeight + spacing.lg,
              backgroundColor: toast.error ? colors.error : colors.surfaceInverse,
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons
            name={toast.error ? "alert-circle" : "checkmark-circle"}
            size={18}
            color={toast.error ? colors.onError : colors.onSurfaceInverse}
          />
          <Text
            style={[
              styles.toastText,
              { color: toast.error ? colors.onError : colors.onSurfaceInverse },
            ]}
          >
            {toast.msg}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Permission / empty states
  stateContent: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: spacing.xl,
  },
  stateIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  stateTitle: {
    fontSize: fontSize["2xl"],
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: spacing.sm,
  },
  stateBody: {
    fontSize: fontSize.lg,
    lineHeight: 22,
    color: "rgba(255,255,255,0.82)",
    marginBottom: spacing.xl,
  },
  ctaPrimary: {
    height: 52,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  ctaText: { fontSize: fontSize.lg, fontWeight: "600" },

  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  title: { fontSize: fontSize["2xl"], fontWeight: "700" },
  searchBar: {
    height: 40,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: fontSize.lg, padding: 0 },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedCount: { fontSize: fontSize.lg, fontWeight: "600" },
  selectAllBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  selectAllText: { fontSize: fontSize.base, fontWeight: "600" },

  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + 40 + spacing.md,
  },
  listEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing["3xl"],
    gap: spacing.md,
  },
  listEmptyText: { fontSize: fontSize.lg },

  // Export bar
  exportBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  exportBtn: {
    height: 52,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  exportText: { fontSize: fontSize.lg, fontWeight: "600" },

  // Toast
  toast: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  toastText: { flex: 1, fontSize: fontSize.base, fontWeight: "500" },
});
