import { usePaginatedQuery } from "convex/react";
import { api } from "@legal-setu/backend/api";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { Body, Button, EmptyState, Heading, LoadMoreButton, Loading, Screen, Small, Stack, Title } from "../../components/ui";
import { AccountGate } from "../account/account-gate";
import { caseStateLabel } from "../../lib/labels";
import { useLocale } from "../../providers/locale";
import { colors, radius, space } from "../../theme";
import { STRINGS } from "../../lib/strings";

export function CasesScreen() {
  return (
    <AccountGate>
      <CasesList />
    </AccountGate>
  );
}

function CasesList() {
  const { copy } = useLocale();
  const { results, status, loadMore } = usePaginatedQuery(api.cases.listMine, {}, { initialNumItems: 20 });
  return (
    <Screen>
      <Title>{copy.product.cases}</Title>
      <Body muted>{STRINGS.casesIntro}</Body>
      <Button label={STRINGS.newIntake} onPress={() => router.push("/case/new")} />
      {status === "LoadingFirstPage" ? (
        <Loading label={STRINGS.loading} />
      ) : results.length === 0 ? (
        <EmptyState title={STRINGS.noCasesTitle}>{STRINGS.noCasesBody}</EmptyState>
      ) : (
        <Stack>
          {results.map((item) => (
            <Pressable
              key={item._id}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}, ${caseStateLabel(item.state)}`}
              onPress={() => router.push(`/case/${item._id}`)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <Heading>{item.title}</Heading>
              <Small>
                {caseStateLabel(item.state)} · {item.locale.toUpperCase()} · {STRINGS.summaryVersionShort} {item.summaryVersion}
              </Small>
              <Text style={styles.link}>{STRINGS.openCase} →</Text>
            </Pressable>
          ))}
        </Stack>
      )}
      <LoadMoreButton status={status} onLoadMore={() => loadMore(20)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm, padding: space.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pressed: { opacity: 0.9 },
  link: { color: colors.primary, fontWeight: "700", fontSize: 16 },
});
