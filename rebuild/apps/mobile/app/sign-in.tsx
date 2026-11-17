import { SignInScreen } from "../src/voice/sign-in-screen";
import { WithLocale } from "../src/voice/with-locale";

export default function SignInRoute() {
  return <WithLocale>{(locale) => <SignInScreen locale={locale} />}</WithLocale>;
}
