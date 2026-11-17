import { EmergencyScreen } from "../src/voice/emergency-screen";
import { WithLocale } from "../src/voice/with-locale";

export default function EmergencyRoute() {
  return <WithLocale>{(locale) => <EmergencyScreen locale={locale} />}</WithLocale>;
}
