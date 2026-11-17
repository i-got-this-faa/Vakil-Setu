import { TalkScreen } from "../src/voice/talk-screen";
import { WithLocale } from "../src/voice/with-locale";

export default function TalkRoute() {
  return <WithLocale>{(locale) => <TalkScreen key={locale} locale={locale} />}</WithLocale>;
}
