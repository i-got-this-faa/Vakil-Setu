import { usePaginatedQuery } from "convex/react";
import { api } from "@legal-setu/backend/api";
import { LEGAL_DOMAINS, type LegalDomain, type PilotLocale } from "@legal-setu/domain";
import { locales } from "@legal-setu/i18n";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { Badge, Body, Button, Card, Chip, EmptyState, Heading, LoadMoreButton, Loading, Row, Screen, Small, Stack, TextField, Title } from "../../components/ui";
import { consultationModeLabel } from "../../lib/labels";
import { useLocale } from "../../providers/locale";
import { colors, radius, space } from "../../theme";
import { STRINGS } from "../../lib/strings";

interface Filters {
  domain?: LegalDomain;
  locale?: PilotLocale;
  city?: string;
}

const DOMAIN_CHOICES = LEGAL_DOMAINS.filter((domain) => domain !== "unknown");

/** Anonymous discovery, matching the web app: approved, active advocates only. */
export function DiscoverScreen() {
  const { copy, messages } = useLocale();
  const [domain, setDomain] = useState<LegalDomain | null>(null);
  const [locale, setLocale] = useState<PilotLocale | null>(null);
  const [city, setCity] = useState("");
  const [applied, setApplied] = useState<Filters>({});

  function applyFilters() {
    const trimmedCity = city.trim();
    setApplied({
      ...(domain ? { domain } : {}),
      ...(locale ? { locale } : {}),
      ...(trimmedCity ? { city: trimmedCity.slice(0, 100) } : {}),
    });
  }

  function resetFilters() {
    setDomain(null);
    setLocale(null);
    setCity("");
    setApplied({});
  }

  return (
    <Screen>
      <Title>{messages.discovery.title}</Title>
      <Body muted>{messages.discovery.subtitle}</Body>
      <Card>
        <Small>{messages.discovery.practiceAreaFilter}</Small>
        <View style={styles.chipWrap}>
          <Chip label={STRINGS.allPracticeAreas} selected={domain === null} onPress={() => setDomain(null)} />
          {DOMAIN_CHOICES.map((value) => (
            <Chip key={value} label={copy.product.domainLabels[value]} selected={domain === value} onPress={() => setDomain(value)} />
          ))}
        </View>
        <Small>{messages.discovery.languageFilter}</Small>
        <LanguageChips selected={locale} allLabel={copy.feature.allLanguages} onSelect={setLocale} />
        <TextField
          label={messages.discovery.locationFilter}
          value={city}
          onChangeText={setCity}
          placeholder="For example, Delhi"
          maxLength={100}
          autoCapitalize="words"
          returnKeyType="search"
          onSubmitEditing={applyFilters}
        />
        <Row>
          <Button label={messages.discovery.filterButton} onPress={applyFilters} />
          <Button variant="secondary" label={messages.discovery.resetFilters} onPress={resetFilters} />
        </Row>
      </Card>
      <DiscoveryResults filters={applied} />
    </Screen>
  );
}

function LanguageChips({ selected, allLabel, onSelect }: { selected: PilotLocale | null; allLabel: string; onSelect: (value: PilotLocale | null) => void }) {
  return (
    <Stack>
      <View style={styles.chipRowScroll}>
        <Chip label={allLabel} selected={selected === null} onPress={() => onSelect(null)} />
        {locales.map((language) => (
          <Chip
            key={language.shortCode}
            label={language.nativeName}
            selected={selected === language.shortCode}
            onPress={() => onSelect(language.shortCode)}
          />
        ))}
      </View>
    </Stack>
  );
}

function DiscoveryResults({ filters }: { filters: Filters }) {
  const { copy, messages } = useLocale();
  const { results, status, loadMore } = usePaginatedQuery(api.advocates.listPublic, filters, { initialNumItems: 20 });
  if (status === "LoadingFirstPage") return <Loading label={STRINGS.loading} />;
  if (results.length === 0) {
    return (
      <EmptyState title={messages.discovery.noResultsFound}>
        {STRINGS.discoveryEmptyBody}
      </EmptyState>
    );
  }
  return (
    <Stack>
      <Small>{copy.product.discoveryOrder}</Small>
      {results.map((profile) => (
        <Pressable
          key={profile._id}
          accessibilityRole="button"
          accessibilityLabel={`${profile.displayName}, ${profile.city}`}
          onPress={() => router.push(`/advocate/${profile._id}`)}
          style={({ pressed }) => [styles.advocate, pressed && styles.pressed]}
        >
          <Badge label={STRINGS.approvedProfile} tone="success" />
          <Heading>{profile.displayName}</Heading>
          <Body muted>
            {profile.city} · {profile.yearsExperience} {messages.discovery.yearsExperience}
          </Body>
          <View style={styles.chipWrap}>
            {profile.domains.map((value) => (
              <Badge key={value} label={copy.product.domainLabels[value]} />
            ))}
          </View>
          <Small>{profile.locales.map((value) => value.toUpperCase()).join(" / ")} · {profile.consultationModes.map(consultationModeLabel).join(" · ")}</Small>
          <Body>{profile.bio}</Body>
          <Small>{profile.slots.length > 0 ? STRINGS.slotsPublished : STRINGS.noSlotsPublished}</Small>
          <Text style={styles.viewLink}>{messages.discovery.viewProfile} →</Text>
        </Pressable>
      ))}
      <LoadMoreButton status={status} onLoadMore={() => loadMore(20)} />
    </Stack>
  );
}


const styles = StyleSheet.create({
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chipRowScroll: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  advocate: { gap: space.sm, padding: space.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pressed: { opacity: 0.9 },
  viewLink: { color: colors.primary, fontWeight: "700", fontSize: 16, marginTop: space.xs },
});
