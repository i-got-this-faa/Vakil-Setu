import { RequestScreen } from "../../src/features/bookings/request-screen";
import { useLocalSearchParams } from "expo-router";

export default function RequestRoute() {
  const params = useLocalSearchParams<{ advocateId: string; slotId?: string }>();
  const routeId = typeof params.advocateId === "string" ? params.advocateId : "";
  const slotId = typeof params.slotId === "string" ? params.slotId : "";
  return <RequestScreen routeId={routeId} slotId={slotId} />;
}
