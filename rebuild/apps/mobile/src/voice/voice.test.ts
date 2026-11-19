import { describe, expect, test } from "bun:test";
import { VOICE_LOCALES } from "@legal-setu/domain";
import { LANGUAGE_CHOICES, phrasesFor, speechTagFor } from "./languages";
import { SERVER_VOICE_LOCALES, EMERGENCY_NUMBERS, bookingStatus, splitForSpeech, failureText, indianMobile, lawSourceLabel, rankLawyers } from "./logic";

describe("phrases", () => {
  test("every spoken language has every phrase in its own words (no silent English fallback)", () => {
    const english = phrasesFor("en");
    for (const locale of VOICE_LOCALES) {
      if (locale === "en") continue;
      const phrases = phrasesFor(locale);
      for (const key of Object.keys(english) as (keyof typeof english)[]) {
        expect({ locale, key, translated: phrases[key] !== english[key] }).toEqual({ locale, key, translated: true });
      }
    }
  });
  test("language picker lists all thirteen languages by native name, with Indian speech tags", () => {
    expect(LANGUAGE_CHOICES.map((choice) => choice.code)).toEqual([...VOICE_LOCALES]);
    expect(LANGUAGE_CHOICES.find((choice) => choice.code === "ta")?.name).toBe("தமிழ்");
    expect(LANGUAGE_CHOICES.find((choice) => choice.code === "doi")?.name).toBe("डोगरी");
    expect(speechTagFor("en")).toBe("en-IN");
    expect(speechTagFor("or")).toBe("or-IN");
  });
});

describe("indianMobile", () => {
  test("accepts common ways people write a mobile number", () => {
    expect(indianMobile("98765 43210")).toBe("+919876543210");
    expect(indianMobile("+91 98765-43210")).toBe("+919876543210");
    expect(indianMobile("09876543210")).toBe("+919876543210");
  });
  test("rejects landlines, short numbers and junk", () => {
    expect(indianMobile("1234567890")).toBeNull();
    expect(indianMobile("98765")).toBeNull();
    expect(indianMobile("abc")).toBeNull();
  });
});

describe("rankLawyers", () => {
  const lawyer = (id: string, locales: string[], domains: string[], city: string, start?: number) => ({ _id: id, displayName: id, city, yearsExperience: 5, locales, domains, slots: start ? [{ start }] : [] });
  test("puts your language first, then your kind of problem, then your city, then soonest time", () => {
    const ranked = rankLawyers([
      lawyer("english-property-ludhiana", ["en"], ["property"], "Ludhiana", 1),
      lawyer("punjabi-family", ["pa"], ["family"], "Delhi", 1),
      lawyer("punjabi-property-later", ["pa"], ["property"], "Delhi", 9),
      lawyer("punjabi-property-sooner", ["pa"], ["property"], "Delhi", 2),
      lawyer("punjabi-property-ludhiana", ["pa"], ["property"], " ludhiana ", 50),
    ], { locale: "pa", domain: "property", city: "Ludhiana" });
    expect(ranked.map((item) => item._id)).toEqual(["punjabi-property-ludhiana", "punjabi-property-sooner", "punjabi-property-later", "punjabi-family", "english-property-ludhiana"]);
  });
  test("ignores an unknown problem type", () => {
    const ranked = rankLawyers([lawyer("b", ["hi"], ["unknown"], "", 2), lawyer("a", ["hi"], ["civil"], "", 1)], { locale: "hi", domain: "unknown", city: "" });
    expect(ranked.map((item) => item._id)).toEqual(["a", "b"]);
  });
});

describe("messages", () => {
  const hi = phrasesFor("hi");
  test("maps server reasons to plain spoken messages", () => {
    expect(failureText("busy", hi)).toBe(hi.busy);
    expect(failureText("rate_limited", hi)).toBe(hi.busy);
    expect(failureText("malformed", hi)).toBe(hi.sayAgain);
    expect(failureText("not_configured", hi)).toBe(hi.error);
    expect(bookingStatus("accepted", hi)).toBe(hi.statusAccepted);
    expect(bookingStatus("expired", hi)).toBe(hi.statusExpired);
  });
});

describe("lawSourceLabel", () => {
  test("names a statute by act and section, and a judgment by case, court and year", () => {
    expect(lawSourceLabel({ title: "BNS", url: "https://x", documentType: "statute", act: "BNS", sectionNumber: 318, sectionTitle: "Cheating", quote: "" })).toBe("BNS § 318 · Cheating");
    expect(lawSourceLabel({ title: "A v. B", url: "https://x", documentType: "judgment", court: "High Court of J&K", decisionDate: "2024-03-07", quote: "" })).toBe("A v. B · High Court of J&K · 2024");
  });
});

describe("emergency", () => {
  test("lists 112 first, then women, children and free legal aid, each with a label in every language", () => {
    expect(EMERGENCY_NUMBERS.map((item) => item.number)).toEqual(["112", "181", "1098", "15100"]);
    for (const locale of VOICE_LOCALES) for (const item of EMERGENCY_NUMBERS) expect(phrasesFor(locale)[item.label].length).toBeGreaterThan(0);
  });
});

describe("documents", () => {
  test("a rejected document gets its own plain message", () => {
    const hi = phrasesFor("hi");
    expect(failureText("document_invalid", hi)).toBe(hi.documentProblem);
  });
});

describe("splitForSpeech", () => {
  test("starts with one sentence, then groups the rest into short pieces", () => {
    const text = "यह अदालत का नोटिस है। आपको 12 मार्च को जाना है। साथ में कागज़ ले जाइए। क्या आपके पास वकील है?";
    expect(splitForSpeech(text, 60)).toEqual(["यह अदालत का नोटिस है।", "आपको 12 मार्च को जाना है। साथ में कागज़ ले जाइए।", "क्या आपके पास वकील है?"]);
  });
  test("cuts a very long sentence at a comma or space, never mid-word", () => {
    const pieces = splitForSpeech(`${"शब्द ".repeat(80)}अंत।`, 100);
    expect(pieces.every((piece) => piece.length <= 100)).toBe(true);
    expect(pieces.join(" ").split(" ").every((word) => word === "शब्द" || word === "अंत।")).toBe(true);
  });
  test("every language except Urdu has a natural voice", () => {
    expect(VOICE_LOCALES.filter((code) => !SERVER_VOICE_LOCALES.includes(code))).toEqual(["ur"]);
  });
});
