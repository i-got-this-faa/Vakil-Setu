import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {Presentation,PresentationFile} from '@oai/artifact-tool';
const ROOT='C:/Users/DELL/Vakil-Setu';
const BUILD=ROOT+'/.codex-deck/compact-build';
const SKILL='C:/Users/DELL/.codex/plugins/cache/openai-primary-runtime/presentations/26.1011.11113/skills/presentations';
const {makeNativeBulletParagraphs,finalizePresentation}=await import(pathToFileURL(SKILL+'/container_tools/artifact_tool_utils.mjs').href);
const headers=[];
const p=Presentation.create({slideSize:{width:960,height:540}});
const C={blue:'#0969DA',ink:'#24292F',muted:'#626B76',line:'#CFD7E2',pale:'#FFFFDF',lav:'#EEEAFE',purple:'#AA9BEC',grey:'#F4F6F8'};
function box(s,x,y,w,h,fill='none',stroke='none',geo='rect'){return s.shapes.add({geometry:geo,position:{left:x,top:y,width:w,height:h},fill,line:{fill:stroke,width:stroke==='none'?0:0.7}})}
function text(s,t,x,y,w,h,size=24,color=C.ink,bold=false,align='left'){let q=box(s,x,y,w,h);q.text=t;q.text.insets=0;q.text.style={typeface:'Arial',fontSize:size,color,bold,alignment:align,verticalAlignment:'top',autoFit:'none'};return q;}
function base(title){let s=p.slides.add();s.background.fill='#FFFFFF';text(s,title,36,26,888,60,40,C.blue,true);box(s,36,87,888,0.7,C.line);text(s,String(p.slides.items.length),895,502,30,24,18,'#777777',false,'right');return s;}
function bullets(s,items,x=36,y=108,w=888,h=350,size=24){let q=text(s,'',x,y,w,h,size);q.text=makeNativeBulletParagraphs(items,{marginLeftPoints:14,hangingPoints:10,spaceAfterPoints:12});return q;}
function note(s,t,src=[]){s.speakerNotes.textFrame.setText(t+'\n\nSources:\n'+src.map(v=>v.startsWith('http')?v:ROOT+'/'+v).join('\n'));}
function table(s,values,widths,y=108,h=322,size=21){let t=s.tables.add({rows:values.length,columns:values[0].length,left:36,top:y,width:888,height:h,values,columnWidths:widths});for(let r=0;r<values.length;r++)for(let c=0;c<values[0].length;c++){let a=t.getCell(r,c);a.fill=r%2===0?C.grey:'#FFFFFF';a.text.style={typeface:'Arial',fontSize:size,color:r===0?C.blue:C.ink,bold:r===0||c===0};}t.borders.assign({fill:C.line,width:0.7,style:'solid'});return t;}
function region(s,label,x,y,w,h){box(s,x,y,w,h,C.pale,'#C8C889').sendToBack();const tw=Math.min(w-12,label.length*7.4+12);const q=text(s,label,x+(w-tw)/2,y+5,tw,21,14,C.ink,false,'center');q.fill=C.pale;headers.push(q);}
function node(s,label,x,y,w=142,h=44){let a=box(s,x,y,w,h,C.lav,C.purple);a.text=label;a.text.insets=4;a.text.style={typeface:'Arial',fontSize:15,color:C.ink,alignment:'center',verticalAlignment:'middle',autoFit:'none'};return a;}
function arrow(s,a,b,from='bottom',to='top',dashed=false){let q=s.shapes.connect(a,b,{kind:'straight',fromSide:from,toSide:to,line:{fill:C.blue,width:1.3,style:dashed?'dash':'solid'},tail:{type:'triangle',width:'sm',length:'sm'}});q.bringToFront();return q;}
function caption(s,t){text(s,t,36,461,860,35,18,C.muted);}
function split(title,items){let s=base(title);bullets(s,items,36,109,378,362,23);box(s,432,101,492,383,'none',C.line);return s;}
function pipeline(s,stages){let last;stages.forEach((g,i)=>{let y=116+i*112;region(s,g[0],444,y,468,93);let xs=i%2?[775,616,457]:[457,616,775];let widths=i%2?[124,135,135]:[135,135,124];let a=node(s,g[1],xs[0],y+32,widths[0],44),b=node(s,g[2],xs[1],y+32,widths[1],44),c=node(s,g[3],xs[2],y+32,widths[2],44);let side=i%2?'left':'right',target=i%2?'right':'left';arrow(s,a,b,side,target);arrow(s,b,c,side,target);if(last)arrow(s,last,a);last=c;});}

// 1. Cover, matching the supplied reference composition.
{
let s=p.slides.add();s.background.fill='#FFFFFF';text(s,'VAKIL SETU',50,31,860,80,62,C.blue,true,'center');
text(s,'Multilingual voice-based legal assistance\nand advocate access',60,129,840,80,31,'#0751AA',true,'center');
text(s,'Presented by: Raghav Nargotra (2023A1R033)\nSidarth Gupta (2023A1R038)',90,224,780,67,24,C.ink,false,'center');
let bytes=await fs.readFile(ROOT+'/.codex-deck/new-reference/logo-alpha.png');s.images.add({blob:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),contentType:'image/png',alt:'MIET institutional logo from supplied reference',fit:'contain',position:{left:394,top:391,width:172,height:61}});
text(s,'Model Institute of Engineering and Technology (Autonomous), Jammu · 2026',50,472,860,30,18,C.muted,false,'center');
note(s,'Presenter names and roll numbers retained from the previous Vakil Setu faculty presentation. Institutional logo supplied in the reference PDF.',['.codex-deck/final.mjs']);}

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
text(s,'JSON API requests',735,194,189,24,15,C.muted);
region(s,'DATA AND SERVICES',36,344,888,107);
let db=node(s,'MongoDB + Mongoose\nUsers, advocates, bookings',55,376,260,55),ai=node(s,'AI gateway / Gemini\nModel classification',350,376,260,55),pay=node(s,'Razorpay\nOrders + payment verification',645,376,260,55);
arrow(s,api,db);arrow(s,api,ai);arrow(s,api,pay);
caption(s,'Browser Web Speech handles recognition/playback. The backend holds keys and handles AI fallback.');
note(s,'Architecture of current source code. No authentication layer, OCR service or Whisper endpoint is represented as implemented. Arrows show backend communication with the database and providers.',['backend/src/server.js','backend/src/services/aiService.js','backend/src/services/paymentService.js','frontend/src/utils/webSpeech.js']);}
// 5. Sequence follows combined triage endpoint.
{
let s=base('Analysis and matching sequence');
let xs=[48,282,516,750],names=['Browser client','Express API','AI provider','MongoDB'];
xs.forEach((x,i)=>{node(s,names[i],x,111,164,40);box(s,x+82,151,0.7,275,'#C7BDF0');});
let rows=[[0,1,'1  POST /api/ai/triage: text + history'],[1,2,'2  Request issue classification'],[2,1,'3  Model response or provider error'],[1,3,'4  Query expertise + availability'],[3,1,'5  Up to five profiles ranked by rating'],[1,0,'6  Return classification + advocates']];
rows.forEach(([a,b,label],i)=>{let y=191+i*42;let aa=box(s,xs[a]+82,y,0.4,0.4),bb=box(s,xs[b]+82,y,0.4,0.4);arrow(s,aa,bb,a<b?'right':'left',a<b?'left':'right');text(s,label,Math.min(xs[a],xs[b])+88,y-23,Math.abs(xs[a]-xs[b])-12,21,14,C.ink,false,'center');});
text(s,'The user reviews the transcript before submission. The backend applies fallback on AI failure. Results include guidance and advocate profiles.',36,452,888,49,21);
note(s,'The frontend uses the combined triage endpoint, which classifies and queries advocate records in one round trip. Fallback logic belongs to the backend AI adapter, not the external provider.',['frontend/src/hooks/useLegalChat.js','backend/src/controllers/aiController.js','backend/src/services/aiService.js']);}
// 6. Operations and limitations together.
{
let s=base('Advocate matching and booking');
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
text(s,'The stack connects speech, legal triage, advocate matching and consultation records.',36,466,888,38,20,C.muted);
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
for(const h of headers){h.position={...h.position,left:48,width:190};h.text.style={typeface:'Arial',fontSize:13,color:C.ink,alignment:'left',autoFit:'none'};h.bringToFront();}
await (await PresentationFile.exportPptx(p)).save(BUILD+'/candidate.pptx');
for(let i=0;i<p.slides.items.length;i++)await fs.writeFile(BUILD+'/previews/slide-'+(i+1)+'.png',new Uint8Array(await(await p.export({slide:p.slides.items[i],format:'png',scale:1.5})).arrayBuffer()));
const result=await finalizePresentation({workspaceDir:ROOT,candidatePath:BUILD+'/candidate.pptx',finalPath:ROOT+'/output/presentations/Vakil_Setu_Short_Detailed.pptx',pythonExecutable:'C:/Users/DELL/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',integrityValidatorPath:SKILL+'/container_tools/inspect_presentation_package_integrity.py',layoutValidatorPath:SKILL+'/container_tools/inspect_presentation_layout_geometry.py',layoutArgs:['--expected-slide-size-emu','9144000,5143500','--validate-bullet-geometry','--validate-heading-fit','--require-native-table-slide','7'],explicitTotalSlideCount:9,requiredNativeTableOwnerSlides:[7],fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,receiptPath:BUILD+'/delivery-validation.json'});
console.log(JSON.stringify({final:result.finalPath,integrity:result.packageIntegrity.status,layout:result.presentationLayout}));
