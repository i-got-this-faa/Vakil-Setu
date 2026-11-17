import { Redirect } from "expo-router";
import { WithLocale } from "../src/voice/with-locale";

export default function Index() {
  return <WithLocale>{() => <Redirect href="/talk" />}</WithLocale>;
}
