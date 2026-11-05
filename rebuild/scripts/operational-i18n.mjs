import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const output = path.join(root, 'apps/web/src/lib/operational-i18n');
const require = createRequire(import.meta.url);
const { parse } = require(path.join(root, 'apps/web/node_modules/next/dist/compiled/babel/parser.js'));

// Match React/Babel's JSX text whitespace semantics, including inline boundary spaces.
export function normalizeJSXText(value) {
  const lines = value.split(/\r\n|\n|\r/);
  let last = 0;
  for (let i = 0; i < lines.length; i++) if (/[^ \t]/.test(lines[i])) last = i;
  let result = '';
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].replace(/\t/g, ' ');
    if (i !== 0) line = line.replace(/^ +/, '');
    if (i !== lines.length - 1) line = line.replace(/ +$/, '');
    if (line) result += line + (i !== last ? ' ' : '');
  }
  return result;
}

export function keyFor(english) {
  return `op_${createHash('sha256').update(english).digest('hex').slice(0, 16)}`;
}

export function parseTSX(source) {
  return parse(source, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
}

// Only descend into expression positions that React renders. Never follow calls,
// identifiers, properties, tests, attributes, templates, or user-provided content.
export function extractSource(source, file = 'fixture.tsx') {
  const ast = parseTSX(source);
  const occurrences = [];
  const add = (node, text, kind) => {
    const english = text.trim();
    if (!/[A-Za-z]/.test(english)) return;
    occurrences.push({ file, line: node.loc.start.line, start: node.start, end: node.end,
      kind, english, key: keyFor(english), leading: text.match(/^\s*/)[0], trailing: text.match(/\s*$/)[0] });
  };
  const display = node => {
    if (!node) return;
    if (node.type === 'StringLiteral') add(node, node.value, 'expression');
    else if (node.type === 'ConditionalExpression') { display(node.consequent); display(node.alternate); }
    else if (node.type === 'LogicalExpression' && node.operator === '&&') display(node.right);
    else if (node.type === 'ParenthesizedExpression') display(node.expression);
  };
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'JSXElement') {
      const name = node.openingElement.name;
      if (name.type === 'JSXIdentifier' && ['script', 'style', 'code', 'pre', 'InterfaceText'].includes(name.name)) return;
      // Attributes are intentionally outside this transform's contract.
      for (const child of node.children) {
        if (child.type === 'JSXText') add(child, normalizeJSXText(child.value), 'text');
        else if (child.type === 'JSXExpressionContainer') { display(child.expression); visit(child.expression); }
        else visit(child);
      }
      return;
    }
    if (node.type === 'JSXFragment') {
      for (const child of node.children) {
        if (child.type === 'JSXText') add(child, normalizeJSXText(child.value), 'text');
        else if (child.type === 'JSXExpressionContainer') { display(child.expression); visit(child.expression); }
        else visit(child);
      }
      return;
    }
    if (node.type === 'JSXAttribute' || node.type === 'JSXOpeningElement') return;
    for (const [name, value] of Object.entries(node)) {
      if (['loc', 'start', 'end', 'extra', 'comments', 'tokens'].includes(name)) continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(ast.program);
  return occurrences.sort((a, b) => a.start - b.start);
}

export function transformSource(source, occurrences) {
  if (!occurrences.length) return source;
  const ast = parseTSX(source);
  if (ast.program.body.some(node => node.type === 'ImportDeclaration' && node.specifiers.some(specifier => specifier.local.name === 'InterfaceText'))) {
    // Existing import is owned by the caller; retain it.
  } else if (/\bInterfaceText\b/.test(source)) {
    throw new Error('InterfaceText binding requires manual inspection');
  }
  let result = source;
  for (const item of [...occurrences].sort((a, b) => b.start - a.start)) {
    const component = `<InterfaceText english={${JSON.stringify(item.english)}} />`;
    const replacement = item.kind === 'text'
      ? `${item.leading ? `{${JSON.stringify(item.leading)}}` : ''}${component}${item.trailing ? `{${JSON.stringify(item.trailing)}}` : ''}`
      : `${item.leading || item.trailing ? '<>' : ''}${item.leading ? `{${JSON.stringify(item.leading)}}` : ''}${component}${item.trailing ? `{${JSON.stringify(item.trailing)}}` : ''}${item.leading || item.trailing ? '</>' : ''}`;
    result = result.slice(0, item.start) + replacement + result.slice(item.end);
  }
  if (!ast.program.body.some(node => node.type === 'ImportDeclaration' && node.specifiers.some(specifier => specifier.local.name === 'InterfaceText'))) {
    const insert = ast.program.body[0]?.start ?? source.length;
    result = result.slice(0, insert) + 'import { InterfaceText } from "@/components/interface-text";\n' + result.slice(insert);
  }
  parseTSX(result);
  return result;
}

async function filesUnder(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(full));
    else if (entry.name.endsWith('.tsx') && !/\.(test|spec)\.tsx$/.test(entry.name)) result.push(full);
  }
  return result.sort();
}

export async function scan() {
  const files = (await Promise.all(['app', 'components'].map(name => filesUnder(path.join(root, 'apps/web/src', name))))).flat().sort();
  const sources = [];
  for (const full of files) {
    const source = await readFile(full, 'utf8');
    const file = path.relative(root, full).replaceAll('\\', '/');
    sources.push({ full, file, source, occurrences: extractSource(source, file) });
  }
  return sources;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--extract', '--check', '--apply'].includes(arg)) || args.length > 1) throw new Error('Use --extract (default), --check, or --apply');
  const sources = await scan();
  const occurrences = sources.flatMap(source => source.occurrences);
  const english = [...new Set(occurrences.map(item => item.english))].sort();
  const dictionary = Object.fromEntries(english.map(text => [text, keyFor(text)]));
  const messages = Object.fromEntries(english.map(text => [keyFor(text), text]));
  if (Object.keys(messages).length !== english.length) throw new Error('Key collision');
  if (args.includes('--apply')) {
    const existing = JSON.parse(await readFile(path.join(output, 'source.json'), 'utf8'));
    if (english.some(text => existing[text] !== dictionary[text])) throw new Error('Source inventory changed; extract and generate drafts before applying');
    const metadata = JSON.parse(await readFile(path.join(output, 'metadata.json'), 'utf8'));
    if (metadata.completeLocales.length !== 23 || metadata.sourceKeys !== Object.keys(existing).length) throw new Error('All 23 complete bundles are required before applying; run draft generation and --check');
    // Validate every transformed file before making the first UI mutation.
    const changes = sources.filter(item => item.occurrences.length).map(item => ({ full: item.full, source: transformSource(item.source, item.occurrences) }));
    // Explicitly opt-in: only the integrating parent should invoke this mutation.
    for (const item of changes) await writeFile(item.full, item.source);
  } else if (!args.includes('--check')) {
    await mkdir(path.join(output, 'bundles'), { recursive: true });
    await writeFile(path.join(output, 'source.json'), JSON.stringify(dictionary, null, 2) + '\n');
    await writeFile(path.join(output, 'bundles/en.json'), JSON.stringify(messages, null, 2) + '\n');
    await writeFile(path.join(output, 'inventory.json'), JSON.stringify({ scope: ['apps/web/src/app/**/*.tsx', 'apps/web/src/components/**/*.tsx'], filesScanned: sources.length,
      rawOccurrences: occurrences.length, uniqueEnglishStrings: english.length, exclusions: ['attributes (including accessibility labels and placeholders)', 'object properties', 'variables, function results and dynamic templates', 'script/style/code/pre and existing InterfaceText contents'],
      files: sources.filter(item => item.occurrences.length).map(item => ({ file: item.file, occurrences: item.occurrences.length })), occurrences }, null, 2) + '\n');
  }
  console.log(JSON.stringify({ mode: args[0] ?? '--extract', filesScanned: sources.length, filesWithLabels: sources.filter(item => item.occurrences.length).length, rawOccurrences: occurrences.length, uniqueEnglishStrings: english.length }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
