import { AdvocateScreen } from "../../src/features/discovery/advocate-screen";
import { useLocalSearchParams } from "expo-router";

export default function AdvocateRoute() {
  const params = useLocalSearchParams<{ advocateId: string }>();
  const routeId = typeof params.advocateId === "string" ? params.advocateId : "";
  return <AdvocateScreen routeId={routeId} />;
}
