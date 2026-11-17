import type { Id } from "@legal-setu/backend/data-model";
import { useLocalSearchParams } from "expo-router";
import { LawyerScreen } from "../../src/voice/lawyer-screen";
import { WithLocale } from "../../src/voice/with-locale";

export default function LawyerRoute() {
  const { advocateId } = useLocalSearchParams<{ advocateId: string }>();
  return <WithLocale>{(locale) => <LawyerScreen locale={locale} advocateId={advocateId as Id<"advocates">} />}</WithLocale>;
}
