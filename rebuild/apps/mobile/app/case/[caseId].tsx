import { CaseScreen } from "../../src/features/cases/case-screen";
import { useLocalSearchParams } from "expo-router";

export default function CaseRoute() {
  const params = useLocalSearchParams<{ caseId: string }>();
  const routeId = typeof params.caseId === "string" ? params.caseId : "";
  return <CaseScreen routeId={routeId} />;
}
