import { describe, expect, it } from 'bun:test';
import { draftBundles, draftedLocales, getInterfaceLocale, getLanguage, getLanguageCapabilities, getLocaleOptions, getMessages, hasDraftTranslation, isPilotLocale, locales, normalizeLocale, pilotLocales, translationDictionary, translationQuality } from '../src';

const codes = ['en', 'as', 'bn', 'brx', 'doi', 'gu', 'hi', 'kn', 'ks', 'kok', 'mai', 'ml', 'mni', 'mr', 'ne', 'or', 'pa', 'sa', 'sat', 'sd', 'ta', 'te', 'ur'];
function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix]: value };
  if (!value || typeof value !== 'object') throw new Error(`Non-string copy at ${prefix}`);
  return Object.assign({}, ...Object.entries(value).map(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key)));
}
const expectedScripts: Record<string, RegExp> = {
  as: /[\u0980-\u09ff]/, bn: /[\u0980-\u09ff]/, brx: /[\u0900-\u097f]/, doi: /[\u0900-\u097f]/,
  gu: /[\u0a80-\u0aff]/, hi: /[\u0900-\u097f]/, kn: /[\u0c80-\u0cff]/, ks: /[\u0600-\u06ff]/,
  kok: /[\u0900-\u097f]/, mai: /[\u0900-\u097f]/, ml: /[\u0d00-\u0d7f]/, mni: /[\uabc0-\uabff]/,
  mr: /[\u0900-\u097f]/, ne: /[\u0900-\u097f]/, or: /[\u0b00-\u0b7f]/, pa: /[\u0a00-\u0a7f]/,
  sa: /[\u0900-\u097f]/, sat: /[\u1c50-\u1c7f]/, sd: /[\u0600-\u06ff]/, ta: /[\u0b80-\u0bff]/,
  te: /[\u0c00-\u0c7f]/, ur: /[\u0600-\u06ff]/,
};

describe('23-locale registry and stored-code compatibility', () => {
  it('exposes exactly English and the 22 scheduled languages, with native options', () => {
    expect(locales.map(language => String(language.shortCode))).toEqual(codes);
    expect(new Set(locales.map(language => language.code)).size).toBe(23);
    expect(Array.from(pilotLocales, String)).toEqual(codes.map(code => `${code}-IN`));
    expect(getLocaleOptions().map(option => String(option.value))).toEqual(codes);
    expect(locales.every(language => language.isPilot)).toBe(true);
    for (const language of locales) {
      expect(language.nativeName.trim()).not.toBe('');
      expect(normalizeLocale(language.shortCode)).toBe(language.code);
      expect(normalizeLocale(language.languageTag)).toBe(language.code);
      expect(isPilotLocale(language.code)).toBe(true);
      expect(isPilotLocale(language.shortCode)).toBe(false);
    }
  });
  it('preserves canonical codes and historical aliases while using explicit native-script tags', () => {
    expect(normalizeLocale('en_US')).toBe('en-IN');
    expect(normalizeLocale('HI-IN')).toBe('hi-IN');
    expect(normalizeLocale('pan')).toBe('pa-IN');
    expect(normalizeLocale('mni-IN')).toBe('mni-IN');
    expect(normalizeLocale('sat-IN')).toBe('sat-IN');
    expect(normalizeLocale('mni_Mtei_IN')).toBe('mni-IN');
    expect(getLanguage('mni')?.script).toBe('Meitei Mayek');
    expect(getLanguage('sat')?.languageTag).toBe('sat-Olck-IN');
    expect(getLanguage('mni')?.languageTag).toBe('mni-Mtei-IN');
    expect(normalizeLocale('unknown')).toBeUndefined();
    expect(getLanguage('')).toBeUndefined();
    expect(isPilotLocale('EN-IN')).toBe(false);
  });
  it('sets RTL only for Kashmiri, Sindhi and Urdu', () => {
    expect(locales.filter(language => language.direction === 'rtl').map(language => language.shortCode)).toEqual(['ks', 'sd', 'ur']);
  });
});

describe('truthful independent language capabilities', () => {
  it('labels completed interfaces unverified and unfinished interfaces unavailable', () => {
    expect(translationQuality).toEqual({ stage: 'draft', humanReview: 'unverified', legalTerminologyReview: 'unverified' });
    for (const language of locales) {
      expect(language.capabilities).toEqual({ interface: hasDraftTranslation(language.shortCode) ? 'unverified' : 'unavailable', typedInput: 'available', aiInput: 'unavailable', aiOutput: 'unavailable', aiTriage: 'unavailable', speechInput: 'unavailable', speechPlayback: 'unavailable' });
    }
  });
  it('requires server configuration for AI and checks speech input/playback independently', () => {
    for (const code of codes) {
      expect(getLanguageCapabilities(code, { aiConfigured: false, speechInputAvailable: true })?.aiInput).toBe('unavailable');
      expect(getLanguageCapabilities(code, { aiConfigured: true })?.aiOutput).toBe('unverified');
      const mixed = getLanguageCapabilities(code, { aiConfigured: true, aiOutputAvailable: false, speechInputAvailable: true });
      expect(mixed?.aiInput).toBe('unverified');
      expect(mixed?.aiOutput).toBe('unavailable');
      expect(mixed?.aiTriage).toBe('unavailable');
      expect(mixed?.speechInput).toBe('unverified');
      expect(mixed?.speechPlayback).toBe('unavailable');
      expect(getLanguageCapabilities(code, { aiConfigured: false, speechPlaybackAvailable: true })?.speechPlayback).toBe('unverified');
    }
    expect(getLanguageCapabilities('unknown', { aiConfigured: true })).toBeUndefined();
  });
});

describe('complete draft copy and explicitly unavailable translations', () => {
  const english = flatten(draftBundles.en);
  const placeholders = (value: string) => (value.match(/\{\w+\}/g) ?? []).sort();
  for (const language of locales) {
    it(`${language.shortCode}: every shared/product/case/chat/intake/feature key and placeholder is present`, () => {
      const copy = flatten(draftBundles[language.shortCode]);
      expect(Object.keys(copy).sort()).toEqual(Object.keys(english).sort());
      for (const [key, source] of Object.entries(english)) {
        const value = copy[key];
        expect(value, key).toBeDefined();
        if (!value) throw new Error(`Missing ${language.shortCode}.${key}`);
        expect(value.trim().length, key).toBeGreaterThan(0);
        expect(placeholders(value), key).toEqual(placeholders(source));
        // A proper brand name may retain its registered Latin spelling; functional copy may not.
        if (language.shortCode !== 'en' && hasDraftTranslation(language.shortCode) && key !== 'sharedMessages.navigation.brandName') {
          expect(value, key).not.toBe(source);
          const script = expectedScripts[language.shortCode];
          expect(script?.test(value), key).toBe(true);
        }
      }
    });
  }
  it('resolves drafted languages and explicitly discloses every unfinished English fallback', () => {
    for (const language of locales) {
      expect(getMessages(language.shortCode)).toBe(translationDictionary[language.code]);
      if (hasDraftTranslation(language.shortCode)) {
        if (language.shortCode !== 'en') expect(getMessages(language.code)).not.toBe(translationDictionary['en-IN']);
        expect(getInterfaceLocale(language.shortCode)).toBe(language.shortCode);
      } else {
        expect(getMessages(language.code)).toBe(translationDictionary['en-IN']);
        expect(draftBundles[language.shortCode].qualityNotice).toContain('interface translation is unavailable');
        expect(draftBundles[language.shortCode].qualityNotice).toContain('English interface text is shown');
        expect(language.capabilities.interface).toBe('unavailable');
        expect(getInterfaceLocale(language.shortCode)).toBe('en');
      }
    }
    expect(getMessages('unknown')).toBe(translationDictionary['en-IN']);
    expect(getMessages('hi').navigation.brandName).toBe('वक़ील सेतु');
    expect(getMessages('pa').navigation.brandName).toBe('ਵਕੀਲ ਸੇਤੂ');
  });
  it('retains exactly thirteen draft bundles and defers ten translations honestly', () => {
    expect(draftedLocales).toHaveLength(13);
    expect(locales.filter(language => !hasDraftTranslation(language.shortCode)).map(language => language.shortCode)).toEqual(['ml', 'mni', 'ne', 'or', 'sa', 'sat', 'sd', 'ta', 'te', 'ur']);
  });
});
