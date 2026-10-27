import fs from 'node:fs/promises';
const original=await fs.readFile('C:/Users/DELL/Vakil-Setu/.codex-deck/reference-build/build.mjs','utf8');
let prefix=original.slice(0,original.indexOf('// 2.')).replace("const BUILD=ROOT+'/.codex-deck/reference-build'","const BUILD=ROOT+'/.codex-deck/compact-build'");
const body=String.raw`
// 2. Problem and intended audience.
{
let s=base('Problem and target users');
text(s,'People can describe a dispute without knowing its legal category, the relevant advocate or the next step.',36,109,888,65,25);
bullets(s,['Language barrier: formal terminology and long text forms can make initial intake difficult.','Unclear preparation: users may not know which facts and documents matter.','Fragmented access: guidance, advocate discovery and booking require separate steps.'],36,190,888,211,24);
text(s,'Target users',36,410,888,31,24,C.blue,true);
text(s,'People seeking initial legal orientation, especially Hindi/English speakers who prefer voice input, and advocates receiving consultation requests.',36,451,860,49,22);
note(s,'Problem framing is a design hypothesis. The materials provide no population-level survey or measured market size.',['SRS.md','README.md']);}
// 3. Complete product journey.
{
let s=base('Solution and core features');
const labels=['Describe','Understand','Find an advocate','Book'];
const bodies=['Speak or type in Hindi or English. Review the transcript.','Receive category, urgency, summary and next actions.','Review available profiles in the relevant practice area.','Create a consultation request and open payment checkout.'];
let last;labels.forEach((v,i)=>{let a=node(s,v,36+i*227,117,206,53);if(last)arrow(s,last,a,'right','left');last=a;text(s,bodies[i],36+i*227,190,206,112,22);});
text(s,'Conversation and accessibility',36,324,888,33,25,C.blue,true);
bullets(s,['Follow-up messages use recent conversation context. Browser speech synthesis can read the response aloud.','Current explicit language modes cover Hindi and English. Broader language support remains a development target.'],36,370,888,110,22);
note(s,'The product provides general orientation. A qualified advocate handles case-specific advice. Voice depends on browser and provider support.',['frontend/src/components/VoiceRecorder.jsx','frontend/src/hooks/useLegalChat.js','backend/src/services/aiService.js']);}
// 4. Architecture fills the slide for readable labels.
{
let s=base('System architecture');
region(s,'CLIENT LAYER',36,107,888,83);let ui=node(s,'React + Vite frontend\nVoice input, chat, analysis and booking',328,131,381,48);
region(s,'APPLICATION LAYER',36,222,888,88);let api=node(s,'Node.js + Express API\nTriage, matching, bookings and payments',328,248,381,49);arrow(s,ui,api);
text(s,'JSON requests and responses',735,194,189,24,15,C.muted);
region(s,'DATA AND PROVIDER LAYER',36,344,888,107);
let db=node(s,'MongoDB + Mongoose\nUsers, advocates, bookings',55,376,260,55),ai=node(s,'AI gateway / Gemini\nClassification + fallback',350,376,260,55),pay=node(s,'Razorpay\nOrders + payment verification',645,376,260,55);
arrow(s,api,db);arrow(s,api,ai);arrow(s,api,pay);
caption(s,'Speech recognition and playback run through browser Web Speech APIs. Provider keys stay on the server.');
note(s,'Architecture of current source code. No authentication layer, OCR service or Whisper endpoint is represented as implemented. Arrows show backend communication with the database and providers.',['backend/src/server.js','backend/src/services/aiService.js','backend/src/services/paymentService.js','frontend/src/utils/webSpeech.js']);}
// 5. Sequence follows combined triage endpoint.
{
let s=base('Analysis and matching sequence');
let xs=[48,282,516,750],names=['Browser client','Express API','AI provider','MongoDB'];
xs.forEach((x,i)=>{node(s,names[i],x,111,164,40);box(s,x+82,151,0.7,275,'#C7BDF0');});
let rows=[[0,1,'1  POST /api/ai/triage: text + history'],[1,2,'2  Classify domain, urgency and actions'],[2,1,'3  Structured result or local fallback'],[1,3,'4  Query expertise + availability'],[3,1,'5  Up to five profiles ranked by rating'],[1,0,'6  Return classification + advocates']];
rows.forEach(([a,b,label],i)=>{let y=191+i*42;let aa=box(s,xs[a]+82,y,0.4,0.4),bb=box(s,xs[b]+82,y,0.4,0.4);arrow(s,aa,bb,a<b?'right':'left',a<b?'left':'right');text(s,label,Math.min(xs[a],xs[b])+88,y-23,Math.abs(xs[a]-xs[b])-12,21,14,C.ink,false,'center');});
text(s,'Before submission: the user reviews the transcript. After the response: the interface displays guidance and profiles, with optional spoken playback.',36,452,888,49,21);
note(s,'The frontend uses the combined triage endpoint, which classifies and queries advocate records in one round trip. Fallback logic belongs to the backend AI adapter, not the external provider.',['frontend/src/hooks/useLegalChat.js','backend/src/controllers/aiController.js','backend/src/services/aiService.js']);}
// 6. Operations and limitations together.
{
let s=base('Advocate access and consultation booking');
text(s,'Advocate matching',36,113,412,35,26,C.blue,true);
bullets(s,['Filter profiles by classified expertise and availability.','Sort by rating and return up to five profiles.','Urgent lookup returns one available profile by rating across domains.'],36,162,412,237,23);
text(s,'Booking and payment',495,113,429,35,26,C.blue,true);
bullets(s,['Store the user, selected advocate and requested date.','Create a Razorpay order and open browser checkout.','Verify the signature and update booking/payment status.'],495,162,429,237,23);
text(s,'Current limits',36,414,888,32,24,C.blue,true);
text(s,'Language filtering and accepted time slots need development. Urgent lookup does not guarantee response. Demo confirmation can leave payment pending.',36,457,888,50,21);
note(s,'Payment integration exists in code, but this deck does not claim a validated transaction or production readiness. Add order binding, server-controlled pricing, restricted bypass, ownership checks and reconciliation before launch.',['backend/src/controllers/advocateController.js','backend/src/controllers/emergencyController.js','backend/src/controllers/bookingController.js','backend/src/controllers/paymentController.js']);}
// 7. Compact editable stack matrix.
{
let s=base('Technology stack and responsibilities');
table(s,[['Component','Technology','Responsibility'],['Frontend','React 18 + Vite 5','Input, chat, results and booking views'],['Backend','Node.js + Express 4','API routing and workflow coordination'],['Database','MongoDB + Mongoose 8','Profiles, users, bookings and payment IDs'],['Speech','Browser Web Speech APIs','Recognition and spoken responses'],['AI adapter','Gateway / Gemini','Contextual triage and basic fallback'],['Payments','Razorpay SDK + Checkout','Order creation and signature checks']],[167,290,431],109,337,20);
text(s,'The integration work connects speech, AI output, advocate records and transaction status in one user journey.',36,466,888,38,20,C.muted);
note(s,'Versions follow dependency declarations. These are not claims about latest releases. The current server does not register the Whisper route mentioned in an older README.',['frontend/package.json','backend/package.json','backend/src/server.js']);}
// 8. Evidence rather than performance claims.
{
let s=base('Current scope and validation plan');
text(s,'Implemented in the code',36,110,418,35,26,C.blue,true);
bullets(s,['Hindi/English voice and typed input with spoken playback.','Contextual triage in four domains: criminal, civil, family and property.','Advocate matching, booking records and payment integration.'],36,160,418,244,23);
text(s,'Evidence still required',497,110,427,35,26,C.blue,true);
bullets(s,['Advocate-reviewed cases for domain and urgency evaluation.','Language tests for transcript quality and response comprehension.','End-to-end booking and failure tests, including interrupted checkout.'],497,160,427,244,23);
text(s,'Security and operations',36,425,888,30,24,C.blue,true);
text(s,'Authentication, consent, profile verification, accepted slots and payment reconciliation remain launch requirements.',36,465,888,49,21);
note(s,'Implementation scope is based on code inspection. No measured accuracy, latency, live adoption or impact is claimed. Four domain slugs appear in the classification prompt.',['backend/src/services/aiService.js','backend/src/server.js','SRS.md']);}
// 9. Closing development priorities and impact.
{
let s=base('Roadmap and expected benefits');
const items=[['01','Stabilize the prototype','Test Hindi/English speech, model failure and the complete consultation journey.'],['02','Validate real use','Review cases with advocates and measure user comprehension and task completion.'],['03','Strengthen operations','Add verified profiles, consent, secure access and reliable booking/payment status.'],['04','Expand languages','Target 22 scheduled languages plus English. Validate each language before rollout.']];
items.forEach(([n,title,body],i)=>{let y=113+i*78;text(s,n,36,y,66,42,30,C.blue,true);text(s,title,112,y,260,34,24,C.blue,true);text(s,body,392,y,528,62,22);});
text(s,'Expected benefit: clearer initial guidance and easier advocate discovery. Faculty and advocate feedback will guide the next development stage.',36,456,888,51,22);
note(s,'Roadmap describes targets rather than completed milestones. General guidance supports preparation for professional consultation. Expected benefits require user trials.',['SRS.md','.codex-deck/reference-build/build.mjs']);}

// Keep diagram region headings at the left so connectors stay uninterrupted.
for(const h of headers){h.position={...h.position,left:48,width:270};h.text.style={typeface:'Arial',fontSize:13,color:C.ink,alignment:'left',autoFit:'none'};h.bringToFront();}
await (await PresentationFile.exportPptx(p)).save(BUILD+'/candidate.pptx');
for(let i=0;i<p.slides.items.length;i++)await fs.writeFile(BUILD+'/previews/slide-'+(i+1)+'.png',new Uint8Array(await(await p.export({slide:p.slides.items[i],format:'png',scale:1.5})).arrayBuffer()));
const result=await finalizePresentation({workspaceDir:ROOT,candidatePath:BUILD+'/candidate.pptx',finalPath:ROOT+'/output/presentations/Vakil_Setu_Compact_9_Slides.pptx',pythonExecutable:'C:/Users/DELL/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',integrityValidatorPath:SKILL+'/container_tools/inspect_presentation_package_integrity.py',layoutValidatorPath:SKILL+'/container_tools/inspect_presentation_layout_geometry.py',layoutArgs:['--expected-slide-size-emu','9144000,5143500','--validate-bullet-geometry','--validate-heading-fit','--require-native-table-slide','7'],explicitTotalSlideCount:9,requiredNativeTableOwnerSlides:[7],fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,receiptPath:BUILD+'/validation.json'});
console.log(JSON.stringify({final:result.finalPath,integrity:result.packageIntegrity.status,layout:result.presentationLayout}));
`;
await fs.writeFile('C:/Users/DELL/Vakil-Setu/.codex-deck/compact-build/build.mjs',prefix+body);
