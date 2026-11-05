import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {Presentation, PresentationFile} from '@oai/artifact-tool';
const ROOT='C:/Users/DELL/Vakil-Setu';
const SKILL='C:/Users/DELL/.codex/plugins/cache/openai-primary-runtime/presentations/26.904.11930/skills/presentations';
const p=Presentation.create({slideSize:{width:1280,height:720}});
const C={blue:'#203F91',cyan:'#0073B9',ink:'#172237',muted:'#53647A',pale:'#EEF5FB',orange:'#D77A00',green:'#087E65',line:'#BDCDDF',white:'#FFFFFF'};
function shape(s,x,y,w,h,fill=C.white,stroke='none',geo='rect'){return s.shapes.add({geometry:geo,position:{left:x,top:y,width:w,height:h},fill,line:{fill:stroke,width:stroke==='none'?0:1.5}})}
function text(s,t,x,y,w,h,size=24,color=C.ink,bold=false,font='Arial',align='left'){const a=shape(s,x,y,w,h,'none');a.text=t;a.text.style={typeface:font,fontSize:size,color,bold,alignment:align,verticalAlignment:'middle',autoFit:'none'};return a}
function line(s,x,y,w,color=C.blue){shape(s,x,y,w,2,color)}
function base(title,sub='',status=''){const s=p.slides.add();s.background.fill=C.white;text(s,'VAKIL SETU',42,21,180,25,17,C.blue,true);text(s,title,42,64,1196,58,35,C.blue,true,'Georgia');if(sub)text(s,sub,44,124,1192,39,20,C.muted);shape(s,0,681,1280,39,C.cyan);text(s,status||'Faculty project review',44,687,1110,23,14,C.white);text(s,String(p.slides.items.length).padStart(2,'0'),1187,687,50,23,14,C.white,true,'Arial','right');return s}
function note(s,t,src=[]){s.speakerNotes.textFrame.setText(t+'\n\nSources: '+src.join('\n'))}
function node(s,title,body,x,y,w=250,h=125,color=C.blue){const box=shape(s,x,y,w,h,C.pale,color);text(s,title,x+14,y+12,w-28,34,23,color,true);text(s,body,x+14,y+51,w-28,h-59,20);return box}
function arrow(s,a,b,from='right',to='left',color=C.blue){return s.shapes.connect(a,b,{kind:'straight',fromSide:from,toSide:to,line:{fill:color,width:2.4},tail:{type:'triangle',width:'med',length:'med'}})}
function section(s,t,x,y,w,color=C.blue){text(s,t,x,y,w,31,22,color,true);line(s,x,y+36,w,color)}
function row(s,n,title,body,y,color=C.blue){text(s,n,40,y,88,56,36,color,true,'Georgia');text(s,title,130,y,350,48,24,color,true);text(s,body,495,y,728,68,22);line(s,130,y+76,1092,C.line)}
function table(s,values,x,y,w,h,widths){const t=s.tables.add({rows:values.length,columns:values[0].length,left:x,top:y,width:w,height:h,values,columnWidths:widths});for(let r=0;r<values.length;r++)for(let c=0;c<values[0].length;c++){const v=t.getCell(r,c);v.fill=r===0?C.blue:r%2?C.pale:C.white;v.text.style={typeface:'Arial',fontSize:r===0?20:21,bold:r===0||c===0,color:r===0?C.white:C.ink};}t.borders.assign({fill:C.line,width:1,style:'solid'});return t}
const src={voice:'frontend/src/components/VoiceRecorder.jsx',ai:'backend/src/services/aiService.js',triage:'backend/src/controllers/aiController.js',book:'backend/src/controllers/bookingController.js',pay:'backend/src/controllers/paymentController.js',langs:'https://www.mha.gov.in/sites/default/files/Eighth_Schedule.pdf',bhash:'https://bhashini.gov.in/'};

{
const s=base('','','College project presentation');
text(s,'VAKIL SETU',65,156,1140,108,78,C.blue,true,'Georgia');
text(s,'Multilingual Voice-Based Legal Assistance\nand Advocate Access',70,286,1115,110,37,C.ink);
line(s,72,443,1128,C.cyan);
text(s,'PRESENTED BY',74,477,1100,35,21,C.blue,true);
text(s,'Raghav Nargotra',74,535,530,44,31,C.blue,true);
text(s,'2023A1R033',74,585,530,39,26,C.muted);
text(s,'Sidarth Gupta',727,535,460,44,31,C.blue,true);
text(s,'2023A1R038',727,585,460,39,26,C.muted);
note(s,'Project presentation by Raghav Nargotra, roll number 2023A1R033, and Sidarth Gupta, roll number 2023A1R038.');
}
{
const s=base('PROBLEM STATEMENT','Accessible first-step legal assistance across Indian languages');
text(s,'How can a person explain a legal problem,\nunderstand the next step and reach an advocate\nin a language they are comfortable using?',51,193,1177,143,35,C.blue,true);
section(s,'LANGUAGE BARRIER',48,395,365);section(s,'LEGAL COMPLEXITY',455,395,365);section(s,'ADVOCATE DISCOVERY',862,395,369);
text(s,'People may struggle to describe facts through an unfamiliar language or interface.',50,454,361,134,25);
text(s,'Users may not know the issue category, urgency or information they should prepare.',457,454,361,134,25);
text(s,'Finding relevant expertise and a shared language adds another step before consultation.',864,454,363,134,25);
text(s,'Project objective: a multilingual voice interface that connects initial guidance with advocate access.',49,614,1182,43,23,C.orange,true);
note(s,'Present these as the user problems the project addresses. No numerical prevalence or survey finding is claimed. The product aims to help with initial orientation and discovery, while professional consultation handles case-specific advice.');
}
{
const s=base('SOLUTION','Vakil Setu: voice-based legal assistance and advocate access');
const a=node(s,'Describe','Speak or type the problem in a preferred language',48,213,252,159);
const b=node(s,'Understand','Receive a short explanation, category and urgency',359,213,252,159);
const c=node(s,'Find an advocate','Match relevant expertise and language preference',670,213,252,159);
const d=node(s,'Book','Request a consultation and complete payment',981,213,251,159);
arrow(s,a,b);arrow(s,b,c);arrow(s,c,d);
section(s,'LANGUAGE SCOPE',48,437,559);section(s,'USER EXPERIENCE',668,437,563);
text(s,'22 scheduled languages\n+ English',51,490,552,98,38,C.blue,true);
text(s,'Confirm the transcript before analysis\nRead or listen to the explanation\nContinue with contextual follow-up questions',670,491,555,114,24);
text(s,'Target scope. Language coverage requires validation across recognition, response and playback.',50,625,1179,29,20,C.orange,true);
note(s,'Describe the solution as the planned complete experience. Hindi belongs to the set of 22 scheduled languages. Retaining English makes 23 language choices in total. Support includes speech recognition, understandable responses, spoken output and interface localization. The information provided is preliminary, with case-specific advice handled by an advocate.',[src.langs]);
}
{
const s=base('LANGUAGE COVERAGE TARGET','22 scheduled languages, with English retained as an additional language','Target coverage; language-by-language validation remains required');
text(s,'22',52,195,270,132,100,C.blue,true,'Georgia');text(s,'scheduled languages',52,330,310,43,27,C.blue,true);
text(s,'English remains an additional language alongside the scheduled set.',53,412,300,103,24);
const groups=[['Assamese','Bengali','Bodo','Dogri','Gujarati','Hindi'],['Kannada','Kashmiri','Konkani','Maithili','Malayalam','Manipuri'],['Marathi','Nepali','Odia','Punjabi','Sanskrit'],['Santali','Sindhi','Tamil','Telugu','Urdu']];
groups.forEach((g,i)=>{const x=402+i*209;line(s,x,210,181,i===3?C.orange:C.blue);text(s,g.join('\n\n'),x,239,191,347,23);});
text(s,'Coverage checklist: recognition, text quality, playback, interface and user testing',51,613,1180,36,22,C.orange,true);
note(s,'The Eighth Schedule lists 22 languages. English is not in that list, so retaining English while covering every scheduled language implies 23 language options in total. Names use common contemporary spellings. A scheduled language can use more than one script, and regional accents require separate testing. Do not equate a translated menu with validated end-to-end voice support.',[src.langs,src.voice]);
}
{
const s=base('TECHNICAL APPROACH','Target system architecture and service responsibilities','Proposed system architecture');
section(s,'CLIENT',48,188,288);section(s,'APPLICATION LAYER',421,188,395);section(s,'SERVICE INTEGRATIONS',899,188,333);
const ui=node(s,'React + Vite','Language selection, voice input, chat and booking',48,250,288,132);
const output=node(s,'User response','Localized text, speech playback and booking status',48,460,288,138);
const api=node(s,'Node.js + Express','Authentication, request routing, validation and matching',421,250,395,132);
const db=node(s,'MongoDB','Users, advocates, case consent, bookings and payment IDs',421,460,395,138);
const ai=node(s,'Language + AI','Speech recognition, translation, legal triage and speech output',899,250,333,132);
const pay=node(s,'Razorpay','Payment order, checkout verification and status events',899,460,333,138);
arrow(s,ui,api);arrow(s,api,ai);arrow(s,api,db,'bottom','top');arrow(s,ui,output,'bottom','top');
s.shapes.connect(api,pay,{kind:'elbow',fromSide:'right',toSide:'left',line:{fill:C.blue,width:2.4},tail:{type:'triangle',width:'med',length:'med'}});
text(s,'Server-side provider adapters keep credentials private and allow services to change.',49,629,1180,30,21,C.muted);
note(s,'Explain the system as a target architecture. The browser captures user input and displays returned responses. The Express server calls AI and language providers, performs matching, manages records and coordinates payments. MongoDB does not call providers directly. Authentication, consent records and reliable payment status handling are part of the proposed implementation. Provider choices remain subject to evaluation. The response node represents presentation of returned results, not a second independent application.',['Proposed architecture informed by project technical materials',src.bhash]);
}
{
const s=base('TECHNICAL APPROACH','Multilingual processing and legal triage flow','Proposed processing pipeline');
const a=node(s,'01  Input','Select language and capture voice or text',48,219,252,139);
const b=node(s,'02  Transcript','Recognize speech and let the user correct facts',359,219,252,139);
const c=node(s,'03  Language','Normalize text; translate only where needed',670,219,252,139);
const d=node(s,'04  Analysis','Return category, urgency and suggested actions',981,219,251,139);
arrow(s,a,b);arrow(s,b,c);arrow(s,c,d);
const e=node(s,'08  User','Read or listen, ask a follow-up, request a booking',48,449,252,146,C.green);
const f=node(s,'07  Response','Localize explanation and synthesize speech',359,449,252,146,C.green);
const g=node(s,'06  Match','Filter expertise, language preference and availability',670,449,252,146,C.green);
const h=node(s,'05  Validate','Check response structure and preserve critical facts',981,449,251,146,C.orange);
arrow(s,d,h,'bottom','top');arrow(s,h,g,'left','right');arrow(s,g,f,'left','right',C.green);arrow(s,f,e,'left','right',C.green);
text(s,'Critical facts: names, dates and amounts. Unsupported language modes need a clear fallback.',49,627,1182,34,21,C.muted);
note(s,'ASR converts speech to text. TTS generates spoken output. Compare direct multilingual analysis with translation-based processing for each language. Validation checks structure and preservation of facts, but it cannot guarantee legal correctness. Include qualified review and uncertainty handling. Use the same scenario across languages to compare results. No model accuracy or response-time result is claimed.',[src.bhash,'Proposed processing design']);
}
{
const s=base('FEASIBILITY AND VIABILITY ANALYSIS','Implementation choices, operating costs and validation gates');
section(s,'TECHNICAL FEASIBILITY',48,189,559);section(s,'OPERATIONAL VIABILITY',670,189,561,C.orange);
text(s,'Standard web stack\nReact, Express and MongoDB\n\nService-based language processing\nEvaluate providers per language and script\n\nStaged implementation\nPilot languages before broader expansion',50,244,550,271,24);
text(s,'Measure cost per completed interaction\nSpeech + model + translation + hosting\n\nVerify consultation fulfilment\nAdvocate onboarding and real availability\n\nProtect sensitive information\nAccess controls, consent and retention',672,244,550,271,24);
section(s,'VALIDATION GATES',48,545,1183);
text(s,'Speech errors and fact preservation',50,593,373,55,22,C.blue,true);
text(s,'Legal review and response latency',455,593,373,55,22,C.blue,true);
text(s,'Booking reliability and service cost',860,593,369,55,22,C.blue,true);
note(s,'Technical feasibility relies on mature application technologies, but language quality and live service availability still require testing. BHASHINI is one candidate ecosystem to evaluate, not a guaranteed fit for all modalities. Measure cost per completed case from audio duration, API usage, model tokens, hosting allocation and retries. Payment and consultation costs are separate. No profit margin, budget, timeline or benchmark is supplied. Agree acceptance thresholds with faculty and reviewers before evaluation. Test provider outages, noisy audio, mixed-language input and payment failures.',[src.bhash]);
}
{
const s=base('IMPACTS AND BENEFITS','Expected outcomes to evaluate through user trials','Expected benefits, subject to validation');
row(s,'01','Language accessibility','Users can describe their issue and receive explanations in a familiar language.',214);
row(s,'02','Clearer initial guidance','A short summary and relevant next steps can help users prepare for consultation.',320,C.cyan);
row(s,'03','Relevant advocate access','Expertise and language preference guide discovery and consultation requests.',426,C.green);
row(s,'04','Structured case intake','Confirmed facts and a concise issue summary can support the first discussion.',532,C.orange);
note(s,'Expected beneficiaries include people seeking initial legal orientation, users more comfortable speaking than typing and advocates receiving consultation requests. Evaluate benefits through task completion, comprehension checks, matching relevance and successful bookings. Do not claim reduced court backlog, faster judgments or measured social impact without evidence.');
}
{
const s=base('REFERENCES','Official sources and technical documentation');
section(s,'LANGUAGE SCOPE AND SERVICES',48,190,1183);
text(s,'1  Ministry of Home Affairs: Eighth Schedule language list',50,249,1180,35,25,C.blue,true);
text(s,'https://www.mha.gov.in/sites/default/files/Eighth_Schedule.pdf',78,290,1130,32,22);
text(s,'2  BHASHINI: language technology services and ecosystem',50,346,1180,35,25,C.blue,true);
text(s,'https://bhashini.gov.in/',78,387,1130,32,22);
section(s,'IMPLEMENTATION DOCUMENTATION',48,450,1183);
text(s,'React\nreact.dev',50,510,240,85,24,C.blue,true);
text(s,'Express\nexpressjs.com',354,510,240,85,24,C.blue,true);
text(s,'MongoDB\nmongodb.com/docs',658,510,260,85,24,C.blue,true);
text(s,'Razorpay\nrazorpay.com/docs',972,510,260,85,24,C.blue,true);
text(s,'Provider selection and language coverage require testing against the project requirements.',49,623,1181,35,21,C.muted);
note(s,'The official language list supports the scope statement. BHASHINI is a candidate service ecosystem. The framework links are implementation documentation, not evidence of tested project performance. The supplied NaN.pdf informs the visual theme only. No affiliation or claims from that document are transferred.',[src.langs,src.bhash,'https://react.dev/','https://expressjs.com/','https://www.mongodb.com/docs/','https://razorpay.com/docs/']);
}

await (await PresentationFile.exportPptx(p)).save(ROOT+'/.codex-deck/final-candidate.pptx');
for(let i=0;i<p.slides.items.length;i++){
const png=await p.export({slide:p.slides.items[i],format:'png',scale:1});
await fs.writeFile(ROOT+`/.codex-deck/final-previews/slide-${i+1}.png`,new Uint8Array(await png.arrayBuffer()));
}
const {finalizePresentation}=await import(pathToFileURL(SKILL+'/container_tools/artifact_tool_utils.mjs').href);
const r=await finalizePresentation({workspaceDir:ROOT,candidatePath:ROOT+'/.codex-deck/final-candidate.pptx',finalPath:ROOT+'/output/presentations/Vakil_Setu_Faculty_Final.pptx',pythonExecutable:'C:/Users/DELL/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',integrityValidatorPath:SKILL+'/container_tools/inspect_presentation_package_integrity.py',layoutValidatorPath:SKILL+'/container_tools/inspect_presentation_layout_geometry.py',layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],fontPolicy:{basis:'design',families:['Arial','Georgia']},verifyArtifactToolImport:true,receiptPath:ROOT+'/.codex-deck/final-validation.json'});
console.log(JSON.stringify({final:r.finalPath,layout:r.presentationLayout,integrity:r.packageIntegrity.status}));


