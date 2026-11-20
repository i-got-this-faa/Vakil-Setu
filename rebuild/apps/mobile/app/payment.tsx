import { Redirect } from "expo-router";
import { PaymentScreen } from "../src/voice/payment-screen";
import { WithLocale } from "../src/voice/with-locale";

// Payment is not built yet: the screen exists only in demo mode (EXPO_PUBLIC_DEMO_MODE=1).
export default function PaymentRoute() {
  if (process.env.EXPO_PUBLIC_DEMO_MODE !== "1") return <Redirect href="/talk" />;
  return <WithLocale>{(locale) => <PaymentScreen locale={locale} />}</WithLocale>;
}
