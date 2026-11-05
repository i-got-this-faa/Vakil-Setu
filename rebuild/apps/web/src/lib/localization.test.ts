import { describe, expect, it } from 'bun:test';
import { LOCALES, isPilotLocale } from '@vakil/domain';
import { draftBundles, getLanguage } from '@vakil/i18n';
import { productCopy } from './copy';
import { caseNoSummaryCopy } from './case-copy';
import { chatCopy } from './chat-copy';
import { intakeChatCopy } from './intake-chat-copy';
import { getFeatureCopy } from './feature-copy';
import { getLocalizationNotice, LOCALE_STORAGE_KEY, readLocalePreference, saveLocalePreference } from './localization-preference';

describe('typed application localization', () => {
  it('connects all 23 short stored codes directly to the matching draft bundles', () => {
    expect(LOCALES).toHaveLength(23);
    for (const locale of LOCALES) {
      expect(isPilotLocale(locale)).toBe(true);
      expect(productCopy[locale]).toBe(draftBundles[locale].productCopy);
      expect(caseNoSummaryCopy[locale]).toBe(draftBundles[locale].caseCopy);
      expect(intakeChatCopy[locale]).toBe(draftBundles[locale].intakeChatCopy);
      expect(getFeatureCopy(locale)).toBe(draftBundles[locale].featureCopy);
      expect(getLocalizationNotice(locale)).toBe(draftBundles[locale].qualityNotice);
      const copy = chatCopy[locale];
      const number = new Intl.NumberFormat(getLanguage(locale)?.languageTag);
      const unusualName = 'case {max} $& <test>.pdf';
      expect(copy.selectCheckboxLabel(unusualName)).toContain(unusualName);
      expect(copy.documentCount(2, 5)).toContain(number.format(2));
      expect(copy.documentCount(2, 5)).toContain(number.format(5));
      expect(copy.charCount(1200, 4000)).toContain(number.format(1200));
      expect(copy.selectedAttachmentsCount(2, 3, '2 MiB', '6 MiB')).toContain('2 MiB');
      expect(copy.selectedAttachmentsCount(2, 3, '2 MiB', '6 MiB')).toContain('6 MiB');
      expect(copy.documentCount(2, 5)).not.toMatch(/\{\w+\}/);
      expect(copy.charCount(1200, 4000)).not.toMatch(/\{\w+\}/);
    }
    expect(isPilotLocale('en-IN')).toBe(false);
    expect(isPilotLocale('unknown')).toBe(false);
  });
});

describe('locale preference boundary', () => {
  const memory = () => {
    const values = new Map<string, string>();
    return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  };
  it('persists all 23 options, supports old registry tags and rejects invalid preferences', () => {
    const storage = memory();
    expect(readLocalePreference(storage)).toBe('en');
    for (const locale of LOCALES) {
      saveLocalePreference(locale, storage);
      expect(storage.getItem(LOCALE_STORAGE_KEY)).toBe(locale);
      expect(readLocalePreference(storage)).toBe(locale);
      storage.setItem(LOCALE_STORAGE_KEY, `${locale}-IN`);
      expect(readLocalePreference(storage)).toBe(locale);
    }
    storage.setItem(LOCALE_STORAGE_KEY, 'mni-Mtei-IN');
    expect(readLocalePreference(storage)).toBe('mni');
    storage.setItem(LOCALE_STORAGE_KEY, '<script>');
    expect(readLocalePreference(storage)).toBe('en');
  });
  it('keeps locale selection usable when browser storage throws', () => {
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(readLocalePreference(blocked)).toBe('en');
    expect(() => saveLocalePreference('ur', blocked)).not.toThrow();
  });
});
