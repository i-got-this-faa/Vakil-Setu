import { Body, Card, Heading, Screen, Small } from "./ui";

/** Shown instead of the app when public configuration is missing or invalid. Nothing is sent to a server. */
export function ServiceNotConfigured({ missing }: { missing: readonly string[] }) {
  return (
    <Screen>
      <Card>
        <Heading>Service setup is incomplete</Heading>
        <Body>
          Legal-Setu cannot reach its sign-in or case services because public configuration is missing or invalid.
        </Body>
        <Body>Missing or invalid: {missing.join(", ")}.</Body>
        <Small>
          Add these values to apps/mobile/.env.local (copy from .env.example), then restart Expo with a cleared cache (for example
          `bun run --filter @legal-setu/mobile start -c`). Only public values belong in this app. Nothing entered here is saved to a server.
        </Small>
      </Card>
    </Screen>
  );
}
