import { HistoryScreen } from "../src/voice/history-screen";
import { WithLocale } from "../src/voice/with-locale";

export default function HistoryRoute() {
  return <WithLocale>{(locale) => <HistoryScreen locale={locale} />}</WithLocale>;
}
