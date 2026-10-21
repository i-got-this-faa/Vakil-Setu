import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import path from 'node:path';
import { extractSource, normalizeJSXText, transformSource, scan, output, keyFor } from '../../../scripts/operational-i18n.mjs';
import { languages, validateChunk, retainedEnglish } from '../../../scripts/generate-operational-drafts.mjs';

test('extract only rendered literals; preserve JSX whitespace, dynamic data and attributes', () => {
  const source = `"use client";
const properties = { name: "Private name" };
export const Example = () => <div title="Attribute" aria-label={ok ? "Attr yes" : "Attr no"}>
  First line
  second line
  <b>Bold</b> inline text {ready ? "Ready" : "Wait"}{ok && "Continue"}
  {person.name}{format("Function argument")}{properties.name}
  <code>Code untouched</code><span>{" leading "}</span>
</div>;`;
  assert.equal(normalizeJSXText('\n  First line\n  second line\n  '), 'First line second line');
  const occurrences = extractSource(source);
  assert.deepEqual(occurrences.map(item => item.english), ['First line second line', 'Bold', 'inline text', 'Ready', 'Wait', 'Continue', 'leading']);
  const result = transformSource(source, occurrences);
  assert.ok(result.startsWith('"use client";\nimport { InterfaceText }'));
  assert.ok(result.includes('title="Attribute"'));
  assert.ok(result.includes('{person.name}{format("Function argument")}{properties.name}'));
  assert.ok(result.includes('<code>Code untouched</code>'));
  assert.ok(result.includes('ready ? <InterfaceText english={"Ready"} /> : <InterfaceText english={"Wait"} />'));
  assert.ok(result.includes('{" "}<InterfaceText english={"inline text"} />{" "}'));
  assert.deepEqual(extractSource(result), []);
  assert.equal(transformSource(result, []), result);
});

test('network validation rejects key, placeholder, number and required-script corruption', () => {
  const source = { label: 'Save {count} in 24 hours' };
  assert.deepEqual(validateChunk(source, { label: '24 घंटे में {count} सहेजें' }, 'hi'), { label: '24 घंटे में {count} सहेजें' });
  assert.throws(() => validateChunk(source, { wrong: 'सहेजें' }, 'hi'), /shape:keys/);
  assert.throws(() => validateChunk(source, { label: '24 घंटे सहेजें' }, 'hi'), /shape:placeholders/);
  assert.throws(() => validateChunk(source, { label: '12 घंटे {count} सहेजें' }, 'hi'), /shape:numbers/);
  assert.throws(() => validateChunk({ label: 'Save' }, { label: 'सहेजें' }, 'mni'), /shape:script/);
  assert.throws(() => validateChunk({ label: 'Save' }, { label: 'সেভ' }, 'sat'), /shape:script/);
  assert.throws(() => validateChunk({ label: 'Save' }, { label: 'محفوظ सहेजें' }, 'ur'), /shape:foreign-script/);
});

test('every locale bundle has exact source keys, placeholders and required script', async () => {
  const english = JSON.parse(await readFile(path.join(output, 'bundles/en.json'), 'utf8'));
  const dictionary = JSON.parse(await readFile(path.join(output, 'source.json'), 'utf8'));
  assert.equal(Object.keys(dictionary).length, Object.keys(english).length);
  for (const [text, key] of Object.entries(dictionary)) {
    assert.equal(keyFor(text), key);
    assert.equal(english[key], text);
  }
  for (const locale of Object.keys(languages)) {
    const bundle = JSON.parse(await readFile(path.join(output, `bundles/${locale}.json`), 'utf8'));
    validateChunk(english, bundle, locale);
    assert.deepEqual(Object.keys(bundle).sort(), Object.keys(english).sort());
    for (const [key, text] of Object.entries(bundle)) if (locale !== 'en' && text === english[key]) assert.ok(retainedEnglish.includes(text));
  }
});

test('dry transform parses all actual app/component files without mutating them', async () => {
  const sources = await scan();
  for (const item of sources) {
    const transformed = transformSource(item.source, item.occurrences);
    assert.equal(extractSource(transformed).length, 0, item.file);
    assert.equal(await readFile(item.full, 'utf8'), item.source);
  }
});

test('typed helper selects real bundles and annotates unknown copy as English', async () => {
  // Node does not resolve Next's extensionless JSON imports. Inline those real
  // files in memory, then execute the actual helper after stripping TS types.
  const english = JSON.parse(await readFile(path.join(output, 'bundles/en.json'), 'utf8'));
  const dictionary = JSON.parse(await readFile(path.join(output, 'source.json'), 'utf8'));
  const bundles = {};
  for (const name of await readdir(path.join(output, 'bundles'))) if (name.endsWith('.json')) {
    bundles[name.slice(0, -5)] = JSON.parse(await readFile(path.join(output, 'bundles', name), 'utf8'));
  }
  const helper = stripTypeScriptTypes(await readFile(path.join(output, 'index.ts'), 'utf8'))
    .replace("import en from './bundles/en.json';", `const en = ${JSON.stringify(english)};`)
    .replace("import { operationalBundles } from './bundles';", `const operationalBundles = ${JSON.stringify(bundles)};`)
    .replace("import dictionary from './source.json';", `const dictionary = ${JSON.stringify(dictionary)};`);
  const { translateOperational } = await import(`data:text/javascript;base64,${Buffer.from(helper).toString('base64')}`);
  const unknown = 'Unregistered copy must remain English';
  assert.deepEqual(translateOperational('ur-IN', unknown), { text: unknown, lang: 'en-IN', dir: 'ltr', known: false });
  assert.deepEqual(translateOperational('__proto__', unknown), { text: unknown, lang: 'en-IN', dir: 'ltr', known: false });
  assert.deepEqual(translateOperational('ur', 'toString'), { text: 'toString', lang: 'en-IN', dir: 'ltr', known: false });
  for (const [locale, bundle] of Object.entries(bundles)) {
    for (const [text, key] of Object.entries(dictionary)) {
      const result = translateOperational(locale, text);
      assert.equal(result.text, bundle[key]);
      assert.equal(result.known, true);
      assert.equal(result.lang, locale !== 'en' && text === bundle[key] ? 'en-IN' : languages[locale][1]);
      assert.equal(result.dir, locale !== 'en' && text === bundle[key] ? 'ltr' : languages[locale][2]);
    }
  }
});
