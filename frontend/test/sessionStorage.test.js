import test from 'node:test';
import assert from 'node:assert/strict';
import {loadChatFromStorage,saveChatToStorage,loadSessionFromStorage,saveSessionToStorage,clearChatStorage} from '../src/utils/chatMessages.js';
test('Legal-Setu branding migrates existing chat, source evidence and case state without losing content',()=>{
 const previous=globalThis.sessionStorage;const data=new Map();
 globalThis.sessionStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
 try{
  const messages=[{id:'old-reply',role:'assistant',content:'Existing response',legalAnswer:{status:'answered',citations:[{passageId:'law-303'}]}}];
  const state={classification:{domain:'criminal'},advocates:[{name:'Existing advocate'}],ttsLang:'hi-IN',voiceText:'Existing case'};
  data.set('vakil-setu-chat-v1',JSON.stringify(messages));data.set('vakil-setu-session-v1',JSON.stringify(state));
  assert.deepEqual(loadChatFromStorage(),messages);assert.deepEqual(loadSessionFromStorage(),state);
  saveChatToStorage(messages);saveSessionToStorage(state);
  assert.equal(data.has('vakil-setu-chat-v1'),false);assert.equal(data.has('vakil-setu-session-v1'),false);
  assert.deepEqual(loadChatFromStorage(),messages);assert.deepEqual(loadSessionFromStorage(),state);
  data.set('vakil-setu-chat-v1','[]');data.set('vakil-setu-session-v1','{}');
  assert.deepEqual(loadChatFromStorage(),messages);assert.deepEqual(loadSessionFromStorage(),state);
  clearChatStorage();assert.equal(data.size,0);
 }finally{if(previous===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=previous;}
});
