import test from 'node:test';
import assert from 'node:assert/strict';
import {selectTriageAnswer} from '../src/services/triageAnswer.js';
const classification={status:'classified',source:'gemini',summary:'First check immediate safety, seek medical help if needed, and tell me whether you were injured or driving.'};
test('missing or rejected retrieval uses the independent LLM answer without invented citations',()=>{
 for(const status of ['insufficient_evidence','invalid_evidence','empty_corpus','no_matching_passages','retrieval_unavailable','source_excerpts']){
  const result=selectTriageAnswer(classification,{status,answer:'Rejected or insufficient source response',citations:[{passageId:'unverified'}],retrievalMethod:'hybrid'});
  assert.equal(result.status,'general_guidance');assert.equal(result.answer,classification.summary);assert.deepEqual(result.citations,[]);assert.equal(result.retrievalStatus,status);assert.equal(result.authorityChecked,false);assert.match(result.warnings[0],/not verified/);
 }
});
test('cited guidance stays grounded and unavailable models never produce a fake fallback',()=>{
 const grounded={status:'answered',answer:'Source-verified reply',citations:[{passageId:'303'}]};
 assert.equal(selectTriageAnswer(classification,grounded),grounded);
 const unavailable={status:'empty_corpus',answer:'No sources',citations:[]};
 assert.equal(selectTriageAnswer({...classification,status:'unavailable'},unavailable),unavailable);
 assert.equal(selectTriageAnswer({...classification,source:'unavailable'},unavailable),unavailable);
 assert.equal(selectTriageAnswer(classification,null),null);
 assert.match(selectTriageAnswer(classification,unavailable,'hi').warnings[0],/सामान्य/);
 assert.match(selectTriageAnswer({...classification,actions:['Preserve the available facts.']},unavailable).answer,/1\. Preserve the available facts\./);
});
