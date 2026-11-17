import { LawyersScreen } from "../src/voice/lawyers-screen";
import { WithLocale } from "../src/voice/with-locale";

export default function LawyersRoute() {
  return <WithLocale>{(locale) => <LawyersScreen locale={locale} />}</WithLocale>;
}
