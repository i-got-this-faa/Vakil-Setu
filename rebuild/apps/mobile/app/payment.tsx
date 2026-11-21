import { Redirect, useLocalSearchParams } from "expo-router";
import { PaymentScreen } from "../src/voice/payment-screen";
import { WithLocale } from "../src/voice/with-locale";

// Demo payments only (no money moves). A real appointment's fee is opened with ?bookingId=…; the server decides
// whether test payments are allowed (PAYMENTS_MODE=demo). Without a booking, only the scripted demo mode has this screen.
export default function PaymentRoute() {
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  if (!bookingId && process.env.EXPO_PUBLIC_DEMO_MODE !== "1") return <Redirect href="/talk" />;
  return <WithLocale>{(locale) => <PaymentScreen locale={locale} {...(bookingId ? { bookingId } : {})} />}</WithLocale>;
}
