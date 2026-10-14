import { describe, expect, it } from 'bun:test';
import {
  getLanguage,
  getMessages,
  isPilotLocale,
  locales,
  normalizeLocale,
  pilotLocales,
  translationDictionary,
} from '../src';
import type { Messages } from '../src';

describe('@vakil/i18n language registry', () => {
  it('registers exactly 23 languages (English + 22 Eighth Schedule Indian languages)', () => {
    expect(locales.length).toBe(23);

    const codes = locales.map((l) => l.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(23);

    // Verify key languages
    expect(codes).toContain('en-IN');
    expect(codes).toContain('hi-IN');
    expect(codes).toContain('pa-IN');
    expect(codes).toContain('bn-IN');
    expect(codes).toContain('ta-IN');
    expect(codes).toContain('te-IN');
    expect(codes).toContain('ur-IN');
    expect(codes).toContain('mr-IN');
    expect(codes).toContain('gu-IN');
    expect(codes).toContain('kn-IN');
    expect(codes).toContain('ml-IN');
    expect(codes).toContain('or-IN');
    expect(codes).toContain('as-IN');
    expect(codes).toContain('ks-IN');
    expect(codes).toContain('sd-IN');
  });

  it('preserves stable BCP47 codes with -IN country tag', () => {
    for (const lang of locales) {
      expect(lang.code).toMatch(/^[a-z]{2,3}-IN$/);
    }
  });

  it('defines exactly 3 pilot locales: English, Hindi, and Punjabi', () => {
    expect(pilotLocales).toEqual(['en-IN', 'hi-IN', 'pa-IN']);

    const pilotEntries = locales.filter((l) => l.isPilot);
    expect(pilotEntries.length).toBe(3);
    expect(pilotEntries.map((l) => l.code).sort()).toEqual(['en-IN', 'hi-IN', 'pa-IN']);
  });

  it('truthfully labels capabilities without fabricating AI or speech readiness', () => {
    for (const lang of locales) {
      // All 23 languages support Unicode typed text input
      expect(lang.capabilities.typedInput).toBe('available');

      if (lang.isPilot) {
        // Message bundles exist, but no independent language review is recorded.
        expect(lang.capabilities.interface).toBe('unverified');
        // AI triage and speech are unverified without live provider and language tests.
        expect(lang.capabilities.aiTriage).toBe('unverified');
        expect(lang.capabilities.speechInput).toBe('unverified');
        expect(lang.capabilities.speechPlayback).toBe('unverified');
      } else {
        // Non-pilot languages have unavailable interface and deferred AI/speech
        expect(lang.capabilities.interface).toBe('unavailable');
        expect(lang.capabilities.aiTriage).toBe('unavailable');
        expect(lang.capabilities.speechInput).toBe('unavailable');
        expect(lang.capabilities.speechPlayback).toBe('unavailable');
      }
    }
  });

  it('accurately specifies text direction for RTL scripts', () => {
    const rtlCodes = ['ks-IN', 'sd-IN', 'ur-IN'];
    for (const lang of locales) {
      if (rtlCodes.includes(lang.code)) {
        expect(lang.direction).toBe('rtl');
      } else {
        expect(lang.direction).toBe('ltr');
      }
    }
  });

  it('normalizes locale aliases accurately', () => {
    expect(normalizeLocale('en')).toBe('en-IN');
    expect(normalizeLocale('en-in')).toBe('en-IN');
    expect(normalizeLocale('en_US')).toBe('en-IN');
    expect(normalizeLocale('hi')).toBe('hi-IN');
    expect(normalizeLocale('HI-IN')).toBe('hi-IN');
    expect(normalizeLocale('pa')).toBe('pa-IN');
    expect(normalizeLocale('pan')).toBe('pa-IN');
    expect(normalizeLocale('ta')).toBe('ta-IN');
    expect(normalizeLocale('ur')).toBe('ur-IN');
    expect(normalizeLocale('invalid-code')).toBeUndefined();
  });

  it('retrieves language definitions with getLanguage', () => {
    const hindi = getLanguage('hi');
    expect(hindi).toBeDefined();
    expect(hindi?.name).toBe('Hindi');
    expect(hindi?.nativeName).toBe('हिन्दी');
    expect(hindi?.script).toBe('Devanagari');

    const punjabi = getLanguage('pa-IN');
    expect(punjabi).toBeDefined();
    expect(punjabi?.name).toBe('Punjabi');
    expect(punjabi?.nativeName).toBe('ਪੰਜਾਬੀ');
    expect(punjabi?.script).toBe('Gurmukhi');

    const english = getLanguage('en');
    expect(english).toBeDefined();
    expect(english?.name).toBe('English');

    expect(getLanguage('unknown')).toBeUndefined();
  });

  it('narrows only exact canonical pilot locale tags', () => {
    expect(isPilotLocale('en-IN')).toBe(true);
    expect(isPilotLocale('hi-IN')).toBe(true);
    expect(isPilotLocale('pa-IN')).toBe(true);
    expect(isPilotLocale('en')).toBe(false);
    expect(isPilotLocale('hi')).toBe(false);
    expect(isPilotLocale('pa')).toBe(false);
    expect(isPilotLocale('pan')).toBe(false);
    expect(isPilotLocale('EN-IN')).toBe(false);
    expect(isPilotLocale('hi_in')).toBe(false);
    expect(isPilotLocale('ta-IN')).toBe(false);
    expect(isPilotLocale('ur-IN')).toBe(false);
    expect(isPilotLocale('xyz')).toBe(false);
  });
});

describe('@vakil/i18n translation dictionary and message parity', () => {
  const sections: (keyof Messages)[] = [
    'navigation',
    'common',
    'intake',
    'discovery',
    'booking',
    'dashboard',
    'profile',
    'admin',
    'failure',
    'voice',
    'consent',
    'capabilities',
  ];

  it('contains complete dictionaries for all pilot locales', () => {
    for (const pilot of pilotLocales) {
      const msgs = translationDictionary[pilot];
      expect(msgs).toBeDefined();
      for (const section of sections) {
        expect(msgs[section]).toBeDefined();
      }
    }
  });

  it('ensures identical typed message keys across English, Hindi, and Punjabi', () => {
    const en = translationDictionary['en-IN'];
    const hi = translationDictionary['hi-IN'];
    const pa = translationDictionary['pa-IN'];

    for (const section of sections) {
      const enEntries = Object.entries(en[section]);
      const hiEntries = Object.entries(hi[section]);
      const paEntries = Object.entries(pa[section]);

      const enKeys = enEntries.map(([k]) => k).sort();
      const hiKeys = hiEntries.map(([k]) => k).sort();
      const paKeys = paEntries.map(([k]) => k).sort();

      expect(hiKeys).toEqual(enKeys);
      expect(paKeys).toEqual(enKeys);

      const hiMap = new Map(hiEntries);
      const paMap = new Map(paEntries);

      // Verify no empty strings in any language
      for (const [key, enVal] of enEntries) {
        const hiVal = hiMap.get(key);
        const paVal = paMap.get(key);

        expect(typeof enVal).toBe('string');
        expect(typeof hiVal).toBe('string');
        expect(typeof paVal).toBe('string');

        expect(enVal.trim().length).toBeGreaterThan(0);
        expect(hiVal?.trim().length).toBeGreaterThan(0);
        expect(paVal?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('includes Devanagari and Gurmukhi characters in the pilot bundles', () => {
    const hi = translationDictionary['hi-IN'];
    const pa = translationDictionary['pa-IN'];

    // Devanagari Unicode range: \u0900-\u097F
    const devanagariRegex = /[\u0900-\u097F]/;
    expect(devanagariRegex.test(hi.navigation.brandName)).toBe(true);
    expect(devanagariRegex.test(hi.intake.title)).toBe(true);
    expect(devanagariRegex.test(hi.booking.requestTitle)).toBe(true);

    // Gurmukhi Unicode range: \u0A00-\u0A7F
    const gurmukhiRegex = /[\u0A00-\u0A7F]/;
    expect(gurmukhiRegex.test(pa.navigation.brandName)).toBe(true);
    expect(gurmukhiRegex.test(pa.intake.title)).toBe(true);
    expect(gurmukhiRegex.test(pa.booking.requestTitle)).toBe(true);
  });

  it('resolves messages with getMessages and falls back to English for non-pilot locales', () => {
    const hi = getMessages('hi');
    expect(hi.navigation.brandName).toBe('वक़ील सेतु');

    const pa = getMessages('pa');
    expect(pa.navigation.brandName).toBe('ਵਕੀਲ ਸੇਤੂ');

    const en = getMessages('en');
    expect(en.navigation.brandName).toBe('Vakil Setu');

    // Non-pilot locale fallback
    const ta = getMessages('ta-IN');
    expect(ta.navigation.brandName).toBe('Vakil Setu');

    const unknown = getMessages('unknown-locale');
    expect(unknown.navigation.brandName).toBe('Vakil Setu');
  });
});
