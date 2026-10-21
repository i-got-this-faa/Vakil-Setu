import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { output, root } from './operational-i18n.mjs';

export const languages = {
  en: ['English', 'en-IN', 'ltr', 'Latin'],
  as: ['Assamese', 'as-IN', 'ltr', 'Bengali'], bn: ['Bengali', 'bn-IN', 'ltr', 'Bengali'],
  brx: ['Bodo', 'brx-IN', 'ltr', 'Devanagari'], doi: ['Dogri', 'doi-IN', 'ltr', 'Devanagari'],
  gu: ['Gujarati', 'gu-IN', 'ltr', 'Gujarati'], hi: ['Hindi', 'hi-IN', 'ltr', 'Devanagari'],
  kn: ['Kannada', 'kn-IN', 'ltr', 'Kannada'], ks: ['Kashmiri', 'ks-Arab-IN', 'rtl', 'Arabic'],
  kok: ['Konkani', 'kok-Deva-IN', 'ltr', 'Devanagari'], mai: ['Maithili', 'mai-IN', 'ltr', 'Devanagari'],
  ml: ['Malayalam', 'ml-IN', 'ltr', 'Malayalam'], mni: ['Manipuri/Meitei', 'mni-Mtei-IN', 'ltr', 'Meetei_Mayek'],
  mr: ['Marathi', 'mr-IN', 'ltr', 'Devanagari'], ne: ['Nepali', 'ne-IN', 'ltr', 'Devanagari'],
  or: ['Odia', 'or-IN', 'ltr', 'Oriya'], pa: ['Punjabi', 'pa-Guru-IN', 'ltr', 'Gurmukhi'],
  sa: ['Sanskrit', 'sa-IN', 'ltr', 'Devanagari'], sat: ['Santali', 'sat-Olck-IN', 'ltr', 'Ol_Chiki'],
  sd: ['Sindhi', 'sd-Arab-IN', 'rtl', 'Arabic'], ta: ['Tamil', 'ta-IN', 'ltr', 'Tamil'],
  te: ['Telugu', 'te-IN', 'ltr', 'Telugu'], ur: ['Urdu', 'ur-IN', 'rtl', 'Arabic'],
};
export const retainedEnglish = ['Vakil Setu', 'IST', 'IST ·', 'IST.', 'KiB ·', 'eSpeak NG · GPL-3.0'];
const placeholders = value => (value.match(/\{[\w]+\}|%\d*\$?[sd]/g) ?? []).sort().join('|');
const numbers = value => (value.match(/\d+(?:[.,]\d+)*/g) ?? []).sort().join('|');

export function validateChunk(input, translated, locale) {
  if (!translated || typeof translated !== 'object' || Array.isArray(translated)) throw new Error('shape:object');
  const keys = Object.keys(input);
  if (Object.keys(translated).length !== keys.length || keys.some(key => !Object.hasOwn(translated, key))) throw new Error('shape:keys');
  const script = new RegExp(`\\p{Script=${languages[locale][3]}}`, 'u');
  for (const key of keys) {
    const text = translated[key];
    if (typeof text !== 'string' || !text.trim()) throw new Error('shape:nonempty-string');
    if (placeholders(text) !== placeholders(input[key])) throw new Error('shape:placeholders');
    if (numbers(text) !== numbers(input[key])) throw new Error('shape:numbers');
    if (retainedEnglish.includes(input[key])) {
      if (text !== input[key]) throw new Error('shape:retained-name');
    } else if (locale !== 'en') {
      if (text === input[key]) throw new Error('shape:unchanged-English');
      if (!script.test(text)) throw new Error('shape:script');
      if (['ks', 'sd', 'ur', 'mni', 'sat'].includes(locale)) {
        const letters = [...text.replace(/Vakil Setu|Clerk|Convex|Google Gemini|Gemini|eSpeak NG|GPL|IST|PDF|PNG|JPEG|TXT|KiB|MiB|MB|AI|Asia\/Kolkata/g, '').replace(/\{[\w]+\}/g, '')].filter(char => /\p{L}/u.test(char));
        if (letters.some(char => !script.test(char))) throw new Error('shape:foreign-script');
      }
    }
  }
  return Object.fromEntries(keys.map(key => [key, translated[key]]));
}

function chunkEntries(entries, maxCount = 45, maxCharacters = 4600) {
  const chunks = [];
  let current = [], size = 0;
  for (const entry of entries) {
    if (current.length && (current.length >= maxCount || size + entry[1].length > maxCharacters)) { chunks.push(Object.fromEntries(current)); current = []; size = 0; }
    current.push(entry); size += entry[1].length;
  }
  if (current.length) chunks.push(Object.fromEntries(current));
  return chunks;
}

async function readJSON(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return undefined; throw error; }
}

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const requested = args.filter(arg => arg !== '--check');
  if (requested.some(locale => !Object.hasOwn(languages, locale))) throw new Error('shape:locale');
  const dictionary = await readJSON(path.join(output, 'source.json'));
  const english = await readJSON(path.join(output, 'bundles/en.json'));
  if (!dictionary || !english) throw new Error('shape:missing-source-run-extractor');
  if (Object.entries(dictionary).some(([text, key]) => english[key] !== text) || Object.keys(dictionary).length !== Object.keys(english).length) throw new Error('shape:source-dictionary');
  const locales = Object.keys(languages).filter(locale => locale !== 'en' && (!requested.length || requested.includes(locale)));
  const model = process.env.OPERATIONAL_GEMINI_MODEL ?? 'gemini-3.6-flash';
  const bundles = path.join(output, 'bundles');
  const checkpoints = path.join(output, 'checkpoints');
  const states = [];
  const tasks = [];
  for (const locale of locales) {
    const file = path.join(bundles, `${locale}.json`);
    const existing = await readJSON(file);
    if (existing) { validateChunk(english, existing, locale); console.log(`${locale}: shape:validated ${Object.keys(existing).length}`); continue; }
    if (check) throw new Error(`shape:missing-bundle:${locale}`);
    const partial = await readJSON(path.join(checkpoints, `${locale}.json`)) ?? {};
    const valid = {};
    // Validate each checkpoint entry against the current source before reuse.
    for (const [key, value] of Object.entries(partial)) if (Object.hasOwn(english, key)) {
      try { Object.assign(valid, validateChunk({ [key]: english[key] }, { [key]: value }, locale)); } catch { /* Re-request invalid entry. */ }
    }
    for (const [key, text] of Object.entries(english)) if (retainedEnglish.includes(text)) valid[key] = text;
    const state = { locale, values: valid, failed: false };
    states.push(state);
    for (const input of chunkEntries(Object.entries(english).filter(([key]) => !Object.hasOwn(valid, key)))) tasks.push({ state, input });
  }
  if (check) { console.log(`shape:coverage ${locales.length + 1} locales ${Object.keys(english).length} keys`); return; }
  await mkdir(checkpoints, { recursive: true });
  let apiKey;
  if (tasks.length) {
    apiKey = (process.env.GEMINI_API_KEY ?? await readFile(path.join(root, '.runtime/gemini-api-key'), 'utf8')).trim();
    if (!apiKey || /\s/.test(apiKey)) throw new Error('shape:credential');
  }
  const concurrency = Number(process.env.OPERATIONAL_CONCURRENCY ?? '1');
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) throw new Error('shape:concurrency');
  let cursor = 0;
  let providerBlocked = false;
  // At most four requests in flight across all locales and chunks.
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (cursor < tasks.length && !providerBlocked) {
      const task = tasks[cursor++];
      const { state, input } = task;
      if (state.failed) continue;
      let succeeded = false;
      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          const [name, , , script] = languages[state.locale];
          const prompt = `Draft interface labels for the Indian legal consultation app Vakil Setu. Translate every value into ${name}, script ${script}. Return JSON with EXACTLY the same keys and string values, no commentary. All translations are drafts; human language and legal terminology review are UNVERIFIED. Preserve meanings, negatives, consent, privacy limitations and all ASCII numbers and {placeholders} exactly. Some labels are fragments adjoining dynamic values: translate only the supplied fragment. Do not add data, claims, or missing context. Do not leave English labels unchanged. Proper names Vakil Setu, Clerk, Convex, Google Gemini, eSpeak NG, technical units, file types and IST may remain Latin. For Kashmiri/Urdu/Sindhi use Arabic script; Manipuri MUST use Meitei Mayek, Santali MUST use Ol Chiki. Do not substitute Hindi or Bengali for another language.\n${JSON.stringify(input)}`;
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
            method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: {
              temperature: 0.2, maxOutputTokens: 8192, responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'MINIMAL', includeThoughts: false },
            } }), signal: AbortSignal.timeout(120000),
          });
          console.log(`${state.locale}: HTTP ${response.status}`);
          if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}`); }
          const data = await response.json();
          const candidate = data?.candidates?.[0];
          if (candidate?.finishReason !== 'STOP') throw new Error('shape:incomplete');
          const parts = candidate?.content?.parts;
          if (!Array.isArray(parts)) throw new Error('shape:response-parts');
          const raw = parts.filter(part => typeof part.text === 'string' && part.thought !== true).map(part => part.text).join('');
          const translated = validateChunk(input, JSON.parse(raw), state.locale);
          Object.assign(state.values, translated);
          // Serialize checkpoints per locale to avoid overlapping chunk writes.
          state.pendingWrite = (state.pendingWrite ?? Promise.resolve()).then(() => writeFile(path.join(checkpoints, `${state.locale}.json`), JSON.stringify(state.values, null, 2) + '\n'));
          await state.pendingWrite;
          console.log(`${state.locale}: shape:chunk-valid ${Object.keys(input).length} keys`);
          succeeded = true;
          break;
        } catch (error) {
          const safe = error instanceof Error && /^(HTTP \d{3}|shape:[a-z-]+)$/.test(error.message) ? error.message : 'shape:invalid-response';
          console.log(`${state.locale}: attempt ${attempt} ${safe}`);
          if (attempt < 4) await new Promise(resolve => setTimeout(resolve, safe.startsWith('HTTP') ? attempt * 20000 : attempt * 2000));
          else if (safe.startsWith('HTTP')) providerBlocked = true;
        }
      }
      if (!succeeded) { state.failed = true; process.exitCode = 1; }
    }
  }));
  for (const state of states) {
    await state.pendingWrite;
    if (state.failed || Object.keys(state.values).length !== Object.keys(english).length) continue;
    const validated = validateChunk(english, state.values, state.locale);
    await writeFile(path.join(bundles, `${state.locale}.json`), JSON.stringify(validated, null, 2) + '\n');
    await unlink(path.join(checkpoints, `${state.locale}.json`)).catch(error => { if (error.code !== 'ENOENT') throw error; });
    console.log(`${state.locale}: shape:bundle-valid ${Object.keys(validated).length} keys`);
  }
  const generated = [];
  const coverage = {};
  for (const locale of Object.keys(languages)) {
    const bundle = await readJSON(path.join(bundles, `${locale}.json`));
    if (bundle) {
      validateChunk(english, bundle, locale); generated.push(locale);
      coverage[locale] = { status: locale === 'en' ? 'source' : 'draft', keys: Object.keys(bundle).length };
    } else {
      const partial = await readJSON(path.join(checkpoints, `${locale}.json`)) ?? {};
      coverage[locale] = { status: 'incomplete', checkpointKeys: Object.keys(partial).length };
    }
  }
  await writeFile(path.join(bundles, 'index.ts'), generated.map(locale => `import ${locale} from './${locale}.json';`).join('\n') + `\n\n// Only complete, validated draft bundles are exported.\nexport const operationalBundles = { ${generated.join(', ')} };\n`);
  await writeFile(path.join(output, 'metadata.json'), JSON.stringify({ stage: 'draft', humanReview: 'unverified', legalTerminologyReview: 'unverified', provider: 'Google Gemini', model,
    thinkingLevel: 'MINIMAL', sourceKeys: Object.keys(english).length, completeLocales: generated, coverage, retainedEnglish,
    notice: 'Machine-generated static interface label drafts. Script/key checks are not human language, legal terminology, or contextual acceptance review.' }, null, 2) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main().catch(error => {
  console.error(error instanceof Error && /^(HTTP \d{3}|shape:[a-z:-]+)$/.test(error.message) ? error.message : 'shape:generation-failed');
  process.exitCode = 1;
});
