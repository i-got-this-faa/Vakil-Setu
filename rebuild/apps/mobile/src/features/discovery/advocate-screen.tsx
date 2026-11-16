import { useQuery } from "convex/react";
import { api } from "@legal-setu/backend/api";
import type { Id } from "@legal-setu/backend/data-model";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge, Body, Button, Card, EmptyState, Heading, Loading, Notice, Row, Screen, Small, Stack, Title } from "../../components/ui";
import { formatIst } from "../../lib/format";
import { consultationDurationMinutes } from "../../lib/booking";
import { consultationModeLabel } from "../../lib/labels";
import { useAccountGateState } from "../../hooks/use-account-gate";
import { useLocale } from "../../providers/locale";
import { colors, radius, space } from "../../theme";
import { STRINGS } from "../../lib/strings";

/** Public advocate profile. Route IDs are resolved server-side before any profile query runs. */
export function AdvocateScreen({ routeId }: { routeId: string }) {
  const resolved = useQuery(api.advocates.resolvePublic, { routeId });
  if (resolved === undefined) return <Screen><Loading label={STRINGS.loadingProfile} /></Screen>;
  if (resolved === null) {
    return (
      <Screen>
        <EmptyState title={STRINGS.profileUnavailable}>{STRINGS.profileUnavailableBody}</EmptyState>
      </Screen>
    );
  }
  return <AdvocateProfile advocateId={resolved} />;
}

function AdvocateProfile({ advocateId }: { advocateId: Id<"advocates"> }) {
  const { copy, locale, messages } = useLocale();
  const profile = useQuery(api.advocates.getPublic, { advocateId });
  const slots = useQuery(api.slots.listPublic, { advocateId });
  const [selectedSlotId, setSelectedSlotId] = useState<Id<"slots"> | null>(null);
  if (profile === undefined || slots === undefined) return <Screen><Loading label={STRINGS.loadingProfile} /></Screen>;
  if (profile === null) {
    return (
      <Screen>
        <EmptyState title={STRINGS.profileNoLonger}>{STRINGS.profileNoLongerBody}</EmptyState>
      </Screen>
    );
  }
  return (
    <Screen>
      <Title>{profile.displayName}</Title>
      <Small>{STRINGS.approvedAdvocate} · {profile.city}</Small>
      <Body>{profile.bio}</Body>
      <Card>
        <Row>
          <Badge label={`${profile.yearsExperience} ${messages.discovery.yearsExperience}`} />
          {profile.domains.map((value) => (
            <Badge key={value} label={copy.product.domainLabels[value]} />
          ))}
        </Row>
        <Small>{profile.locales.map((value) => value.toUpperCase()).join(" / ")} · {profile.consultationModes.map(consultationModeLabel).join(" · ")}</Small>
      </Card>
      <Card>
        <Heading>{STRINGS.publishedSlots}</Heading>
        <Small>{STRINGS.timesInIst}</Small>
        {slots.length === 0 ? (
          <EmptyState title={STRINGS.noOpenSlots}>{STRINGS.noOpenSlotsBody}</EmptyState>
        ) : (
          <Stack>
            {slots.map((slot) => {
              const selected = selectedSlotId === slot._id;
              return (
                <Pressable
                  key={slot._id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${formatIst(slot.start, locale)}, ${consultationDurationMinutes(slot.start, slot.end)} minutes`}
                  onPress={() => setSelectedSlotId(slot._id)}
                  style={[styles.slot, selected && styles.slotSelected]}
                >
                  <Text style={styles.slotTime}>{formatIst(slot.start, locale)}</Text>
                  <Small>
                    {consultationDurationMinutes(slot.start, slot.end)} min · {consultationModeLabel(slot.consultationMode)}
                  </Small>
                  <Text style={styles.slotAction}>{selected ? STRINGS.slotSelected : STRINGS.selectSlot}</Text>
                </Pressable>
              );
            })}
          </Stack>
        )}
      </Card>
      {selectedSlotId ? <BookingCallToAction advocateId={advocateId} slotId={selectedSlotId} /> : null}
    </Screen>
  );
}

function BookingCallToAction({ advocateId, slotId }: { advocateId: Id<"advocates">; slotId: Id<"slots"> }) {
  const gate = useAccountGateState();
  if (gate.kind === "loading") return <Loading label={STRINGS.loadingAccount} />;
  if (gate.kind === "signed_out") {
    return (
      <Card>
        <Heading>{STRINGS.signInToRequestTitle}</Heading>
        <Body muted>{STRINGS.signInToRequestBody}</Body>
        <Button label={STRINGS.signIn} onPress={() => router.push("/sign-in")} />
      </Card>
    );
  }
  if (gate.kind === "disabled" || gate.kind === "use_website") {
    return <Notice tone="warning">{STRINGS.requestNeedsUserAccount}</Notice>;
  }
  // Onboarding and ready states both continue into the request screen, which enforces the account gate.
  return (
    <Card>
      <Heading>{STRINGS.requestTitle}</Heading>
      <Body muted>{STRINGS.requestIntro}</Body>
      <Button
        label={STRINGS.requestThisSlot}
        onPress={() => router.push(`/request/${advocateId}?slotId=${encodeURIComponent(slotId)}`)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  slot: { gap: space.xs, padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, minHeight: 48 },
  slotSelected: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.subtle },
  slotTime: { fontSize: 16, fontWeight: "700", color: colors.ink },
  slotAction: { color: colors.primary, fontWeight: "700", marginTop: space.xs },
});
