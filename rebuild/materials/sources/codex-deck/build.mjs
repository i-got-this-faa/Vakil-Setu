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

// 1: Minimal cover, using the reference's blue academic typography.
{
const s=base('','', 'Inherited prototype and proposed development');
text(s,'VAKIL SETU',65,150,1140,105,76,C.blue,true,'Georgia');
text(s,'Voice-based legal assistance\nand advocate access',70,266,1100,116,39,C.ink);
line(s,72,424,1128,C.cyan);
text(s,'Existing foundation',74,461,460,35,24,C.blue,true);
text(s,'Hindi and English voice workflow',74,507,560,45,27);
text(s,'Proposed extension',726,461,440,35,24,C.orange,true);
text(s,'22 scheduled languages\nwith English retained',726,507,470,85,27);
note(s,'I have inherited an existing prototype. This presentation explains its architecture and a proposed development programme. The confirmed extension goal is support for all 22 scheduled languages. English remains an additional supported language. No completed contributions or evaluation results are claimed.',[src.voice,src.langs,'User-provided project context; NaN.pdf is a visual reference only.']);
}
// 2
{
const s=base('PROBLEM AND PROPOSED SOLUTION','A first point of contact for people who do not know where to begin');
section(s,'USER BARRIERS',48,190,365);
text(s,'Legal terminology\n\nLanguage mismatch\n\nChoosing an advocate',50,249,360,283,28);
section(s,'VAKIL SETU WORKFLOW',465,190,766);
const a=node(s,'Describe','Speak in a familiar language',466,251,224,155);
const b=node(s,'Understand','Receive a category and preliminary explanation',737,251,224,155);
const c=node(s,'Connect','Find an advocate and request a consultation',1008,251,224,155);
arrow(s,a,b);arrow(s,b,c);
text(s,'A legal professional remains responsible for case-specific advice.',466,452,747,80,28,C.blue,true);
text(s,'Development focus: language access throughout the full interaction.',50,588,1170,48,25,C.orange,true);
note(s,'These are the project’s problem assumptions, not measured survey findings. Explain triage as identifying the general type and urgency of a problem. The prototype offers information and a booking workflow. It does not establish a completed consultation.',[src.ai,src.triage,src.book]);
}
// 3
{
const s=base('EXISTING BASELINE AND DEVELOPMENT SCOPE','Clear ownership of the inherited system and the proposed extension');
table(s,[['Capability','Inherited prototype','Proposed development'],['Language access','Hindi and English voice input','22 scheduled languages + English'],['Speech pipeline','Browser recognition and playback','Provider adapters and capability checks'],['Legal analysis','4 categories, urgency and actions','Language consistency and output validation'],['Advocate discovery','Expertise, availability and rating','Language-aware matching'],['Booking and payment','Booking storage and Razorpay code','Access controls and reliable confirmation']],48,195,1184,385,[225,432,527]);
text(s,'Document scanning and statutory analysis remain later roadmap candidates.',49,611,1180,35,22,C.orange,true);
note(s,'Only the multilingual extension is an explicit user goal. Provider abstraction, validation, language-aware matching and booking hardening are proposed supporting work, not previously completed contributions. Treat the repository documents as the intended future direction. Review and approve the precise scope with faculty.',[src.voice,src.ai,'backend/src/controllers/advocateController.js',src.book,src.pay,'PITCH_REPORT.md; user clarification']);
}
// 4
{
const s=base('USER JOURNEY','Illustrative case: “My landlord has not returned my security deposit”');
const items=[['01  Speak','Choose Hindi or English and dictate the issue'],['02  Submit','Review the transcript and send the request'],['03  Understand','Read the category, urgency and next steps'],['04  Select','Choose an advocate from available matches'],['05  Schedule','Enter user details and an appointment time'],['06  Confirm','Use payment or the existing skip option']];
let boxes=[];items.forEach((it,i)=>{let col=i<3?i:5-i, yy=i<3?212:446;boxes.push(node(s,...it,48+col*410,yy,365,149));});
arrow(s,boxes[0],boxes[1]);arrow(s,boxes[1],boxes[2]);arrow(s,boxes[2],boxes[3],'bottom','top');arrow(s,boxes[3],boxes[4],'left','right');arrow(s,boxes[4],boxes[5],'left','right');
note(s,'Use this hypothetical example to explain the interface, without promising a specific model answer. Follow-up messages reuse conversation context. The booking currently records a requested time without checking actual calendar slots or advocate acceptance. Payment skipping is present in the inherited implementation.',[src.voice,'frontend/src/hooks/useLegalChat.js','frontend/src/pages/BookingPage.jsx']);
}
// 5
{
const s=base('CURRENT SYSTEM ARCHITECTURE','Existing application code and service boundaries','Current implementation in the inherited codebase');
section(s,'BROWSER',48,188,288);section(s,'APPLICATION SERVER',421,188,395);section(s,'EXTERNAL SERVICES',899,188,333);
const ui=node(s,'React + Vite','Home, results and booking pages',48,250,288,123);
const speech=node(s,'Browser speech','Speech recognition and spoken responses',48,454,288,132);
const api=node(s,'Express API','Triage, advocate matching, bookings and payments',421,250,395,123);
const db=node(s,'MongoDB','Users, advocates, bookings and review schema',421,454,395,132);
const llm=node(s,'AI provider','Gemini or configured gateway',899,250,333,123);
const pay=node(s,'Razorpay','Order creation and signature verification',899,454,333,132);
arrow(s,ui,api);arrow(s,api,llm);arrow(s,api,db,'bottom','top');arrow(s,speech,ui,'top','bottom');s.shapes.connect(api,pay,{kind:'elbow',fromSide:'right',toSide:'left',line:{fill:C.blue,width:2.4},tail:{type:'triangle',width:'med',length:'med'}});

text(s,'The Express API calls external services and stores booking and payment records.',48,624,1180,30,20,C.muted);
note(s,'The application is a React client with an Express server and MongoDB. The diagram groups runtime dependencies. Speech recognition runs through the browser API. The Express payment controller reads a booking, calls Razorpay and stores the order identifier; MongoDB does not directly call Razorpay. The API also coordinates the payment flow shown in the booking slide. No Whisper route is registered in the current server.',['backend/src/server.js',src.voice,src.ai,src.pay,'backend/src/models/']);
}
// 6
{
const s=base('AI ANALYSIS AND ADVOCATE MATCHING','One triage request combines interpretation with database retrieval');
const a=node(s,'Request','Issue text + recent chat history',48,231,242,147);
const b=node(s,'AI service','Build prompt and call the configured model',354,231,250,147);
const c=node(s,'Structured result','Category, urgency, summary and actions',668,231,260,147);
const d=node(s,'Matches','Filter advocates and sort by rating',992,231,239,147);
arrow(s,a,b);arrow(s,b,c);arrow(s,c,d);
section(s,'OUTPUT CATEGORIES',48,447,559);text(s,'Criminal     Civil\nFamily        Property',50,502,550,99,29,C.blue,true);
section(s,'CURRENT RULES',669,447,562);text(s,'Available advocates only\nUp to 5 matches, highest rating first\nKeyword fallback for selected API failures',670,501,561,120,23);
note(s,'POST /api/ai/triage calls classifyLegalIssue, then queries advocates. Up to ten prior messages enter the AI prompt. Matching is a database query, not an AI ranking model. The keyword fallback is partial: missing credentials and some error types still fail. The model is accessed through an external API, not trained in this repository.',[src.ai,src.triage]);
}
// 7
{
const s=base('PROPOSED MULTILINGUAL ARCHITECTURE','A language layer around the existing legal workflow','Proposed design, subject to provider trials and language evaluation');
const a=node(s,'Language','Voice or text input',48,231,216,117,C.orange);
const b=node(s,'Speech adapter','Language-specific ASR',304,231,249,117,C.orange);
const c=node(s,'User confirmation','Correct names, dates and amounts',593,231,284,117,C.orange);
const d=node(s,'Legal triage','Reuse and validate structured analysis',917,231,314,117,C.blue);
arrow(s,a,b,'right','left',C.orange);arrow(s,b,c,'right','left',C.orange);arrow(s,c,d);
const e=node(s,'Advocate matching','Expertise + language preference',917,463,314,131,C.orange);
const f=node(s,'Localized response','Preserve facts and flag uncertainty',593,463,284,131,C.orange);
const g=node(s,'Speech output','TTS where validated; text remains available',304,463,249,131,C.orange);
const h=node(s,'User','Read or listen',48,463,216,131,C.orange);
arrow(s,d,e,'bottom','top');arrow(s,e,f,'left','right',C.orange);arrow(s,f,g,'left','right',C.orange);arrow(s,g,h,'left','right',C.orange);
text(s,'Provider routing and translation, where needed, sit behind the language adapters.',48,621,1184,32,21,C.muted);
note(s,'Orange blocks are proposed additions or changes. Blue marks the reusable legal-triage core. ASR means automatic speech recognition and TTS means text to speech. Evaluate providers per language and script, including direct multilingual processing versus translation. BHASHINI is a candidate ecosystem to evaluate, not an integrated or guaranteed provider. Do not promise speech availability for every language before testing.',[src.voice,src.ai,src.bhash,'Proposed design based on user development goal']);
}
// 8
{
const s=base('LANGUAGE COVERAGE TARGET','22 scheduled languages, with English retained as an additional language','Target coverage; language-by-language validation remains required');
text(s,'22',52,195,270,132,100,C.blue,true,'Georgia');text(s,'scheduled languages',52,330,310,43,27,C.blue,true);
text(s,'Hindi is already in the target set.\nEnglish remains additional.',53,412,300,103,24);
const groups=[['Assamese','Bengali','Bodo','Dogri','Gujarati','Hindi'],['Kannada','Kashmiri','Konkani','Maithili','Malayalam','Manipuri'],['Marathi','Nepali','Odia','Punjabi','Sanskrit'],['Santali','Sindhi','Tamil','Telugu','Urdu']];
groups.forEach((g,i)=>{const x=402+i*209;line(s,x,210,181,i===3?C.orange:C.blue);text(s,g.join('\n\n'),x,239,191,347,23);});
text(s,'Coverage checklist: recognition, text quality, playback, interface and user testing',51,613,1180,36,22,C.orange,true);
note(s,'The Eighth Schedule lists 22 languages. English is not in that list, so retaining English while covering every scheduled language implies 23 language options in total. Names use common contemporary spellings. A scheduled language can use more than one script, and regional accents require separate testing. Do not equate a translated menu with validated end-to-end voice support.',[src.langs,src.voice]);
}
// 9
{
const s=base('DATA MODEL AND BOOKING FLOW','Persistent records connect users, advocates and payment status');
const u=node(s,'User','Name, phone, email\nPreferred language',48,217,308,145);
const b=node(s,'Booking','User ID, advocate ID, time\nStatus, amount, payment IDs',489,217,308,145);
const a=node(s,'Advocate','Expertise, rating, languages\nExperience, availability',930,217,302,145);
arrow(s,u,b);arrow(s,a,b,'left','right');text(s,'1 to many',361,241,125,34,17,C.muted);text(s,'many to 1',802,241,125,34,17,C.muted);
section(s,'PAYMENT SEQUENCE',48,425,1182);
const n1=node(s,'Create booking','MongoDB record',48,488,251,102);
const n2=node(s,'Create order','Server calls Razorpay',359,488,251,102);
const n3=node(s,'Checkout','User pays in browser',670,488,251,102);
const n4=node(s,'Verify','Update booking status',981,488,251,102);
[ [n1,n2],[n2,n3],[n3,n4] ].forEach(z=>arrow(s,...z));
text(s,'A Review schema also exists. A complete review workflow is outside the current routes.',48,624,1180,30,20,C.muted);
note(s,'Arrows in the top diagram represent record relationships, not network calls. The booking holds references to one user and one advocate. Proposed hardening must verify ownership, derive the fee on the server, bind a payment to the stored order, and handle confirmation reliably. The inherited code also allows confirmation with payment pending.',['backend/src/models/User.js','backend/src/models/Advocate.js','backend/src/models/Booking.js','backend/src/models/Review.js',src.pay]);
}
// 10
{
const s=base('FEASIBILITY AND RISKS','Reuse the working structure and validate the uncertain parts');
section(s,'REUSABLE FOUNDATION',48,189,473);
text(s,'React interface and routing\n\nExpress service structure\n\nMongoDB records\n\nAI and payment integrations',51,250,459,332,26);
section(s,'RISK AND PROPOSED RESPONSE',576,189,655,C.orange);
const vals=[['Uneven speech coverage','Test providers by language and script'],['Incorrect legal meaning','Confirm transcript and review outputs'],['Provider failure or latency','Use timeouts, clear errors and text fallback'],['Sensitive case information','Add access control and retention rules'],['Unreliable bookings','Check slots, fees and payment ownership']];
vals.forEach((v,i)=>{const y=246+i*75;text(s,v[0],578,y,650,29,22,C.blue,true);text(s,v[1],578,y+30,650,32,21);});
note(s,'Feasibility comes from reusable software structure, not proven language performance. Existing integrations are code present in the repository and still need live validation. The proposed language provider must be evaluated for actual availability, cost, latency and quality. Risk controls shown here are development tasks. No measured reliability or cost claim is made.',[src.voice,src.ai,src.book,src.pay,src.bhash]);
}
// 11
{
const s=base('DEVELOPMENT ROADMAP','A staged implementation plan with evidence at each milestone','Proposed milestones; scheduling depends on scope and resources');
const stages=[['01','Baseline audit','Reproduce the existing flow\nRecord bugs and API behavior','Evidence: repeatable demo'],['02','Language pilot','Add provider adapters\nTest a small language batch','Evidence: reviewed transcripts'],['03','Coverage expansion','Localize interface and responses\nAdd language-aware matching','Evidence: per-language report'],['04','Integrated validation','Harden booking and payment\nRun complete user scenarios','Evidence: faculty-ready demo']];
stages.forEach((a,i)=>{const x=48+i*305;text(s,a[0],x,210,260,74,61,i===0?C.blue:C.orange,true,'Georgia');line(s,x,305,270);text(s,a[1],x,330,270,65,28,C.blue,true);text(s,a[2],x,408,270,127,23);text(s,a[3],x,566,270,70,21,C.green,true);});
note(s,'This is a proposed work sequence, not a claim that milestones are complete. Establish a baseline before adding languages. Select pilot languages only after checking provider support and access to reviewers. Expand based on measured quality. No duration or team capacity has been supplied, so dates are deliberately omitted.',['User goal and proposed implementation plan']);
}
// 12
{
const s=base('VALIDATION PLAN','Language coverage must come with measurable evidence','Proposed evaluation; no benchmark results claimed');
table(s,[['Layer','What to measure','Evidence to present'],['Speech recognition','Word errors and critical fact errors','Per-language transcripts and corrections'],['Legal triage','Category accuracy and urgency errors','Reviewed test cases with expected labels'],['Language response','Meaning, clarity and factual preservation','Bilingual or native-speaker review'],['User experience','Completion rate and response time','Observed tasks and median / p95 latency'],['Booking and payment','Slot conflicts and status correctness','Integration tests and failure scenarios']],48,194,1184,391,[249,450,485]);
text(s,'Choose acceptance thresholds with faculty and reviewers before testing.',49,612,1179,38,24,C.orange,true);
note(s,'WER means word error rate. Critical entities include names, dates and amounts, which can matter even when overall WER appears low. Report results by language, accent and test condition rather than hiding weak languages in an average. Include noisy audio, mixed-language speech and provider outages. Use legal reviewers for expected classifications. Measure both latency and cost per completed case before commercial claims.',['Proposed evaluation methodology']);
}
// 13
{
const s=base('EXPECTED IMPACT AND PROJECT CONTRIBUTION','Benefits to evaluate as the inherited prototype develops');
row(s,'01','Broader language access','More users can describe a problem in their preferred language.',215);
row(s,'02','Clearer first steps','Users can understand the issue category and prepare for a consultation.',320,C.cyan);
row(s,'03','More relevant discovery','Language preference can complement expertise when finding advocates.',425,C.green);
row(s,'04','Accountable development','A documented baseline and test results make new contributions visible.',530,C.orange);
note(s,'All benefits on this slide are expected outcomes to evaluate, not measured impact. The academic contribution is extending and validating an inherited system. Explain exactly which modules you changed after implementation. The current presentation claims no completed new development. The application provides preliminary information, and a qualified advocate handles case-specific advice.',['User project context and proposed evaluation plan']);
}
// 14
{
const s=base('REFERENCES AND DISCUSSION','Source basis for the architecture and proposed language extension');
section(s,'PROJECT EVIDENCE',48,187,572);
text(s,'Current application source\nReact pages, voice component and chat hook\nExpress controllers, AI service and models\n\nDevelopment direction\nProject documentation and assigned extension\n\nVisual reference\nNaN.pdf supplied by the presenter',50,245,566,329,23);
section(s,'EXTERNAL REFERENCES',681,187,550);
text(s,'Ministry of Home Affairs\nEighth Schedule language list\nmha.gov.in/sites/default/files/Eighth_Schedule.pdf\n\nBHASHINI\nCandidate language-service ecosystem\nbhashini.gov.in',682,245,548,286,22);
text(s,'Discussion: language pilot, project scope and acceptance criteria',49,609,1181,42,27,C.blue,true);
note(s,'Repository paths supporting the baseline are listed in notes throughout the deck. Documentation describes the target direction and should not be used as evidence of implementation. The supplied PDF informs structure and theme only; no SIH affiliation, team identity or defense-project claims are transferred. The language list is official. BHASHINI is a candidate for investigation, not a provider selection or a guarantee of support for every modality.',[src.langs,src.bhash,'C:/Users/DELL/Downloads/NaN.pdf','C:/Users/DELL/Vakil-Setu/backend/src/','C:/Users/DELL/Vakil-Setu/frontend/src/']);
}

await (await PresentationFile.exportPptx(p)).save(ROOT+'/.codex-deck/candidate.pptx');
for(let i=0;i<p.slides.items.length;i++){
 const png=await p.export({slide:p.slides.items[i],format:'png',scale:1});
 await fs.writeFile(ROOT+`/.codex-deck/previews/slide-${String(i+1).padStart(2,'0')}.png`,new Uint8Array(await png.arrayBuffer()));
}
const {finalizePresentation}=await import(pathToFileURL(SKILL+'/container_tools/artifact_tool_utils.mjs').href);
const result=await finalizePresentation({workspaceDir:ROOT,candidatePath:ROOT+'/.codex-deck/candidate.pptx',finalPath:ROOT+'/output/presentations/Vakil_Setu_Faculty_Presentation.pptx',pythonExecutable:'C:/Users/DELL/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',integrityValidatorPath:SKILL+'/container_tools/inspect_presentation_package_integrity.py',layoutValidatorPath:SKILL+'/container_tools/inspect_presentation_layout_geometry.py',layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit','--require-native-table-slide','3','--require-native-table-slide','12'],fontPolicy:{basis:'design',families:['Arial','Georgia']},requiredNativeTableOwnerSlides:[3,12],verifyArtifactToolImport:true,receiptPath:ROOT+'/.codex-deck/validation.json'});
console.log(JSON.stringify(result));
