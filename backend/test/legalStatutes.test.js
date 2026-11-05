import test from 'node:test';
import assert from 'node:assert/strict';
import { officialStatuteMarkdown, parseBnsSections } from '../src/services/legalStatutes.js';
test('official HTML extraction preserves ordered legal text and removes scripts',()=>{
 const markdown=officialStatuteMarkdown('<body><script>bad()</script><p><b>Title</b></p><p><strong>1.</strong> A sufficiently long exact statute passage with legal words and punctuation.</p><p><b>2.</b> A second sufficiently long statute passage that should remain intact.</p></body>');
 const sections=parseBnsSections(markdown,2);
 assert.equal(sections.length,2);assert.match(sections[0].text,/exact statute passage/);assert.ok(!markdown.includes('bad()'));
 assert.throws(()=>parseBnsSections(markdown,358),/Incomplete/);
});
