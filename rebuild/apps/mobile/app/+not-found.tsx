import { router } from "expo-router";
import { Body, Button, Card, Heading, Screen } from "../src/components/ui";

export default function NotFoundRoute() {
  return (
    <Screen>
      <Card>
        <Heading>This page does not exist.</Heading>
        <Body>The link may be out of date.</Body>
        <Button label="Go back" onPress={() => router.replace("/talk")} />
      </Card>
    </Screen>
  );
}
