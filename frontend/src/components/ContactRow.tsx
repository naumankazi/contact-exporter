import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fontSize, radius, spacing, ThemeColors } from "@/src/theme";
import { SimpleContact } from "@/src/vcf";

type Props = {
  contact: SimpleContact;
  selected: boolean;
  onToggle: (id: string) => void;
  colors: ThemeColors;
};

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "#";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ContactRowBase({ contact, selected, onToggle, colors }: Props) {
  const phoneLabel =
    contact.phones.length > 1
      ? `${contact.phones[0]}  +${contact.phones.length - 1} more`
      : contact.phones[0] || "No number";

  return (
    <Pressable
      testID={`contact-row-${contact.id}`}
      onPress={() => onToggle(contact.id)}
      android_ripple={{ color: colors.surfaceSecondary }}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.surfaceSecondary : colors.surface },
      ]}
    >
      <View
        style={[styles.avatar, { backgroundColor: colors.brandTertiary }]}
      >
        <Text style={[styles.avatarText, { color: colors.onBrandTertiary }]}>
          {initialsFor(contact.name)}
        </Text>
      </View>

      <View style={styles.info}>
        <Text
          numberOfLines={1}
          style={[styles.name, { color: colors.onSurface }]}
        >
          {contact.name}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.phone, { color: colors.onSurfaceSecondary }]}
        >
          {phoneLabel}
        </Text>
      </View>

      <Ionicons
        testID={`contact-check-${contact.id}`}
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={26}
        color={selected ? colors.brandPrimary : colors.onSurfaceTertiary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: fontSize.base,
    fontWeight: "600",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.lg,
    fontWeight: "500",
  },
  phone: {
    fontSize: fontSize.base,
    marginTop: 2,
  },
});

export const ContactRow = memo(ContactRowBase);
