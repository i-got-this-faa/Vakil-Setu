import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {Presentation,PresentationFile} from '@oai/artifact-tool';
const ROOT='C:/Users/DELL/Vakil-Setu';
const BUILD=ROOT+'/.codex-deck/reference-build';
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
// 2.
{
let s=base('The problem in accessing legal help');text(s,'A person can describe a dispute without knowing its legal category or the right advocate.',36,108,888,62,24);
bullets(s,['Language and literacy: formal terminology and long text forms can make the first step difficult.','Unclear next steps: users may not know which facts or documents to prepare.','Advocate discovery: practice area, availability and language affect consultation choices.','Fragmented journey: explaining the issue, finding an advocate and booking often require separate steps.'],36,183,888,288,24);
note(s,'Problem framing and project motivation. These statements are design hypotheses rather than quantified survey findings.',['SRS.md','PITCH_REPORT.md']);}
// 3.
{
let s=base('What is Vakil Setu');text(s,'Vakil Setu connects a spoken or typed problem with preliminary guidance and advocate discovery.',36,108,888,62);
bullets(s,['Voice input: the browser converts speech into text that the user can review.','Legal triage: the service returns a category, urgency, short summary and suggested actions.','Advocate access: the API filters by expertise and availability, then ranks profiles by rating.','Consultation booking: the system stores a request and supports Razorpay checkout.'],36,184,888,274);
caption(s,'The assistant provides general information. An advocate handles case-specific legal advice.');note(s,'Description of code-level capabilities, not a claim of live deployment or successful user validation.',['frontend/src/components/VoiceRecorder.jsx','backend/src/services/aiService.js','backend/src/controllers/advocateController.js','backend/src/controllers/paymentController.js']);}
// 4.
{
let s=base('Existing services and the project focus');table(s,[['Approach','Existing role','Vakil Setu project focus'],['LawRato','Lawyer discovery, consultation and legal Q&A','Connect spoken intake with structured triage and matching'],['eCourts Services','Case status, cause lists and court orders','Support the first step before a consultation'],['Generic AI assistant','Conversational explanations','Use defined categories and return local advocate matches'],['Direct consultation','Professional case-specific advice','Help users prepare a concise issue summary']], [194,282,412],108,316,20);
text(s,'The differentiation to test is the combined voice-to-consultation journey. Lawyer discovery already exists.',36,447,888,51,22);
note(s,'Official service descriptions support LawRato and eCourts roles. The final column is a project positioning hypothesis, not evidence that competitors lack voice features.',['https://lawrato.com/cmses/page/how-does-lawrato-work','https://ecommitteesci.gov.in/service/ecourts-services-mobile-application/','README.md']);}
// 5.
{
let s=base('How it works');text(s,'One browser interface connects input, analysis, advocate matching and booking.',36,109,888,38);
bullets(s,['Capture: choose Hindi or English, then speak or type the problem.','Review: correct the transcript before submitting it for analysis.','Analyze: the Express API sends the text and recent conversation to the AI service.','Match: filter available advocates in the returned practice area.','Book: select a profile and time, then create a consultation request.'],36,162,888,300);
caption(s,'Target users: people seeking initial legal orientation and advocates receiving consultation requests.');note(s,'The current voice component uses browser Web Speech recognition. A Whisper endpoint mentioned in README is not registered in the current server.',['frontend/src/components/VoiceRecorder.jsx','backend/src/server.js','frontend/src/hooks/useLegalChat.js']);}
// 6.
{
let s=base('A first consultation journey');let steps=['1. Select Hindi or English and allow microphone access, or use typed input.','2. Explain the issue and review the recognized text.','3. Submit the transcript to receive a category, summary and suggested actions.','4. Ask a follow-up question while keeping the current conversation context.','5. Select an available advocate and enter consultation details.','6. Create the booking, complete checkout or use the current unpaid confirmation option.'];steps.forEach((t,i)=>text(s,t,56,111+i*56,848,53,23));
caption(s,'Confirmation records application status. Operational acceptance by an advocate still needs validation.');note(s,'The frontend permits confirming without payment. The current implementation does not establish an advocate acceptance workflow or collision-free appointment schedule.',['frontend/src/pages/BookingPage.jsx','backend/src/controllers/bookingController.js']);}
// 7.
{
let s=split('System architecture and topology',['Browser client: React + Vite handles voice input, chat and booking.','Express API: routes analysis, matching and payment requests.','AI adapter: supports a college gateway or Gemini configuration.','MongoDB: stores profiles, users and bookings.','Razorpay: creates orders and returns checkout details.']);
region(s,'Client layer',446,114,464,77);let ui=node(s,'React + Vite\nWeb Speech APIs',585,141,188,41);
region(s,'Application layer',446,225,464,97);let api=node(s,'Node.js + Express\nAPI controllers',585,261,188,47);arrow(s,ui,api);
region(s,'Data and external services',446,362,464,107);let db=node(s,'MongoDB\nProfiles / bookings',455,400,142,48),ai=node(s,'AI gateway\nor Gemini',607,400,142,48),pay=node(s,'Razorpay\nOrders / checkout',759,400,142,48);arrow(s,api,db);arrow(s,api,ai);arrow(s,api,pay);
note(s,'Native editable recreation of the reference architecture style. Connections indicate API communication, not provider-to-database access. Voice recognition currently happens through the browser.',['backend/src/server.js','backend/src/services/aiService.js','backend/src/services/paymentService.js','frontend/src/components/VoiceRecorder.jsx']);}
// 8. Sequence diagram.
{
let s=split('Legal analysis request sequence',['The user reviews the recognized text.','The client submits text and chat history.','The API calls the configured model provider.','The service parses the returned classification.','Matching queries profiles by domain.','The interface displays the results.']);
let xs=[449,564,679,794],names=['Browser','Express API','AI service','MongoDB'];xs.forEach((x,i)=>{node(s,names[i],x,117,108,34);box(s,x+54,153,0.6,282,'#C7BDF0');node(s,names[i],x,442,108,29);});
let rows=[[0,1,'1  Text + history'],[1,2,'2  Classify issue'],[2,1,'3  JSON result'],[1,0,'4  Guidance'],[0,1,'5  Match domain'],[1,3,'6  Query profiles'],[3,1,'7  Ranked matches'],[1,0,'8  Display results']];
rows.forEach(([a,b,label],i)=>{let y=174+i*33;let aa=box(s,xs[a]+54,y,0.4,0.4),bb=box(s,xs[b]+54,y,0.4,0.4);arrow(s,aa,bb,a<b?'right':'left',a<b?'left':'right');text(s,label,Math.min(xs[a],xs[b])+56,y-17,Math.abs(xs[a]-xs[b])-4,19,12,C.ink,false,'center');});
note(s,'Sequence follows the client classification and advocate matching API calls. Recognition precedes API submission.',['frontend/src/hooks/useLegalChat.js','frontend/src/api/client.js','backend/src/controllers/aiController.js','backend/src/controllers/advocateController.js']);}
// 9.
{
let s=split('Voice input and response workflow',['Recognition: browser Web Speech converts microphone input into text.','Transcript review: users can edit or type facts before analysis.','Language selection: current explicit modes cover Hindi and English.','Playback: browser speech synthesis reads the response when a suitable voice is available.']);
pipeline(s,[['1. Input capture','Microphone\npermission','Speech\nrecognition','Transcript'],['2. User review','Edit or type\nfacts','Submit\nconfirmed text','API analysis'],['3. Response delivery','Summary and\nnext steps','Browser speech\nsynthesis','Read or listen']]);
note(s,'Supported browser and available speech voices affect behavior. Broader multilingual recognition is a target rather than verified end-to-end coverage.',['frontend/src/components/VoiceRecorder.jsx','frontend/src/utils/webSpeech.js']);}
// 10.
{
let s=split('AI triage and fallback workflow',['Context: the prompt includes recent conversation and the latest user message.','Output: four legal domains, an urgency label, a summary and actions.','Language: response rules currently distinguish Hindi and English.','Fallback: local keyword rules provide a basic result when the model service fails.']);
region(s,'1. Request preparation',447,116,463,94);let a=node(s,'User text\n+ chat history',463,152,184,44),b=node(s,'Language rules\n+ JSON schema',709,152,184,44);arrow(s,a,b,'right','left');
region(s,'2. Classification',447,239,463,92);let c=node(s,'Gateway / Gemini\nmodel response',590,274,180,43);arrow(s,b,c);
region(s,'3. Result handling',447,360,463,109);let d=node(s,'Parse and\nnormalize',464,400,135,46),e=node(s,'Rule-based\nfallback',614,400,135,46),f=node(s,'Guidance\nresponse',764,400,130,46);arrow(s,c,d);arrow(s,c,e);let bypass=box(s,530,457,0.4,0.4);let end=box(s,829,457,0.4,0.4);arrow(s,d,bypass);arrow(s,bypass,end,'right','left');arrow(s,end,f,'top','bottom');arrow(s,e,f,'right','left');
note(s,'Fallback output explicitly identifies limited AI service. Rule-based urgency and domains do not establish legal correctness. Gateway or Gemini depends on configured environment.',['backend/src/services/aiService.js','backend/src/utils/legalDomain.js']);}
// 11.
{
let s=split('Advocate matching and urgent lookup',['Normal match: normalize the domain and require availability.','Ranking: sort by rating and return up to five profiles.','Profiles: show expertise, experience and languages.','Urgent lookup: pick one available advocate by rating, across domains.','Next step: validate language fit and response availability.']);
region(s,'Standard matching',447,115,224,354);region(s,'Urgent lookup',684,115,225,354);
let a=node(s,'Classified domain',465,156,188,45),b=node(s,'Expertise +\navailability filter',465,236,188,49),c=node(s,'Sort by rating\nReturn up to 5',465,322,188,48),d=node(s,'User selects\nadvocate',465,405,188,46);arrow(s,a,b);arrow(s,b,c);arrow(s,c,d);
let e=node(s,'Urgent action',703,156,188,45),f=node(s,'Available profiles\nAny practice area',703,236,188,49),g=node(s,'Highest rating\nReturn 1 profile',703,322,188,48),h=node(s,'User reviews\ncontact option',703,405,188,46);arrow(s,e,f);arrow(s,f,g);arrow(s,g,h);
note(s,'Current urgent lookup does not guarantee connection or response time, and does not filter by legal domain. Language data exists but normal API matching does not filter it.',['backend/src/controllers/advocateController.js','backend/src/controllers/emergencyController.js','backend/src/models/Advocate.js']);}
// 12.
{
let s=split('Booking and payment workflow',['Booking: the API records a user, advocate and requested date.','Order: create and save a Razorpay order.','Checkout: the browser opens the payment interface.','Verification: check the signature and update the record.','Unpaid option: demo confirmation keeps payment pending.']);
pipeline(s,[['1. Consultation request','Select advocate\nand date','Create booking','MongoDB\nrecord'],['2. Payment order','Create order\non server','Razorpay\ncheckout','Payment\nresponse'],['3. Status update','Signature\nverification','Save payment\nand booking status','User sees\nconfirmation']]);
note(s,'Diagram documents current code responsibilities. Before production: bind the callback to the stored order, enforce a server-controlled amount, restrict demo bypass, and add reconciliation. No successful payment transaction is claimed.',['backend/src/controllers/bookingController.js','backend/src/controllers/paymentController.js','backend/src/services/paymentService.js','frontend/src/pages/BookingPage.jsx']);}
// 13.
{
let s=split('Web interface and case information',['Chat: voice or typed messages retain recent case context.','Analysis: display the category, urgency, summary and actions.','Advocate panel: show profiles returned by matching.','Booking view: collect details and report confirmation or payment errors.']);
region(s,'1. React interface',447,115,461,91);let a=node(s,'Voice / text input',463,151,198,43),b=node(s,'Follow-up chat',694,151,198,43);arrow(s,a,b,'right','left');
region(s,'2. Shared case state',447,238,461,88);let c=node(s,'Messages and classification\nSelected advocate / booking',519,270,316,44);arrow(s,a,c);arrow(s,b,c);
region(s,'3. Result views',447,361,461,108);let d=node(s,'Summary\n+ actions',464,403,133,45),e=node(s,'Advocate\nprofiles',613,403,133,45),f=node(s,'Booking\nstatus',762,403,132,45);arrow(s,c,d);arrow(s,c,e);arrow(s,c,f);
note(s,'This is an interface data-flow diagram in the style of the reference web-console slide, not a fabricated application screenshot.',['frontend/src/state/AppContext.jsx','frontend/src/components/dashboard/AnalysisDashboard.jsx','frontend/src/components/dashboard/AdvocateMatchPanel.jsx','frontend/src/pages/BookingPage.jsx']);}
// 14.
{
let s=base('Current scope and remaining work');bullets(s,['Current code: Hindi/English voice input, contextual triage, matching, booking records and payment integration.','Language target: all 22 scheduled languages plus English, with recognition and playback tested separately.','Matching gap: language preference and location need explicit filtering and validation.','Operational gap: advocate verification, accepted slots and reliable urgent response need a defined workflow.','Production gap: authentication, consent, retention controls and payment reconciliation need implementation.'],36,110,888,350,24);
caption(s,'Live reliability and user outcomes still need evidence.');note(s,'Scope follows repository inspection and target language coverage in prior deck. The server currently registers no authentication middleware. No measured deployment, accuracy or impact is claimed.',['.codex-deck/final.mjs','backend/src/server.js','backend/src/controllers/advocateController.js']);}
// 15.
{
let s=base('Technology stack');table(s,[['Subsystem','Technology','Role'],['Frontend','React 18 + Vite 5','Voice input, chat, results and booking views'],['API server','Node.js + Express 4','Routes, input handling and provider calls'],['Database','MongoDB + Mongoose 8','Profiles, users, bookings and payment IDs'],['Voice','Browser Web Speech APIs','Speech recognition and spoken responses'],['AI service','Gateway / Gemini adapter','Issue classification and follow-up guidance'],['Payments','Razorpay SDK + Checkout','Order creation and signature verification'],['Data import','Cheerio + import scripts','Profile normalization and MongoDB upserts']], [180,276,432],108,355,19);
note(s,'Versions use the project dependency declarations, not a claim that these are the latest releases. Whisper is omitted because the current server has no registered voice route.',['frontend/package.json','backend/package.json','backend/src/server.js','backend/scripts/scrapeAdvocates.js']);}
// 16.
{
let s=base('V.E.T.S justification');table(s,[['Criterion','Project justification'],['V: Viability','The main prototype code paths exist. Provider configuration and integration testing remain.'],['E: Engineering depth','The project integrates speech, contextual triage, matching and verified payment callbacks.'],['T: Trend alignment','Conversational intake and speech services support the design. Broader language coverage needs testing.'],['S: Social impact','Expected benefit: clearer guidance and easier advocate discovery. User trials must verify comprehension and completion.']], [199,689],108,355,21);
note(s,'No semester-fit guarantee or measured social impact is claimed. This justification adapts the reference VETS structure to the actual project.',['README.md','SRS.md']);}
// 17.
{
let s=base('Expected outcomes and evaluation');bullets(s,['Demonstrable prototype: complete the spoken-input, analysis, matching and booking journey.','Language evaluation: check transcript quality and response comprehension.','Triage evaluation: compare labels with advocate-reviewed cases.','Matching evaluation: check expertise, availability and language fit.','Reliability evaluation: exercise model failure, microphone denial and interrupted checkout.','User evaluation: measure task completion and comprehension.'],36,109,888,349,23);
caption(s,'These are proposed evaluation measures. The project materials provide no measured results.');note(s,'Evaluation plan, not benchmark outcomes. Do not supply invented accuracy, latency or adoption numbers.',['SRS.md','PITCH_REPORT.md']);}
// 18.
{
let s=base('Proposed implementation timeline');table(s,[['Phase','Weeks','Activity'],['1','1–3','Confirm requirements, user flows, data model and evaluation cases.'],['2','4–7','Stabilize Hindi/English input, contextual triage and failure handling.'],['3','8–11','Validate matching, booking and payment flows with test services.'],['4','12–14','Add access controls and consent. Pilot additional languages.'],['5','15–16','Run user trials, record results and prepare the final demonstration.']], [111,100,677],108,312,21);
text(s,'Planning assumption: a 16-week semester. This schedule describes remaining validation and development.',36,450,888,49,21,C.muted);
note(s,'Illustrative 16-week plan adapted from the reference, not a confirmed calendar or completed milestone record. Existing code allows effort to focus on stabilization and validation.',['SRS.md']);}
// 19.
{
let s=p.slides.add();s.background.fill='#FFFFFF';text(s,'Summary',60,142,840,80,58,C.blue,true,'center');bullets(s,['Vakil Setu connects spoken intake with guidance and advocate discovery.','The current implementation focuses on Hindi and English.','React, Express and MongoDB support analysis, matching and booking.','The diagrams show architecture and each module’s workflow.','Broader language support and consultation reliability need validation.'],113,252,760,214,23);text(s,'19',895,502,30,24,18,'#777777',false,'right');note(s,'Closing summary. General guidance does not replace consultation. Targets are kept separate from implemented code paths.',['README.md','backend/src/server.js','.codex-deck/final.mjs']);}

for(const h of headers)h.bringToFront();
await (await PresentationFile.exportPptx(p)).save(BUILD+'/candidate.pptx');
for(let i=0;i<p.slides.items.length;i++){await fs.writeFile(BUILD+`/previews/slide-${i+1}.png`,new Uint8Array(await (await p.export({slide:p.slides.items[i],format:'png',scale:1.5})).arrayBuffer()));}
const result=await finalizePresentation({workspaceDir:ROOT,candidatePath:BUILD+'/candidate.pptx',finalPath:ROOT+'/output/presentations/Vakil_Setu_Reference_Style_Final.pptx',pythonExecutable:'C:/Users/DELL/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',integrityValidatorPath:SKILL+'/container_tools/inspect_presentation_package_integrity.py',layoutValidatorPath:SKILL+'/container_tools/inspect_presentation_layout_geometry.py',layoutArgs:['--expected-slide-size-emu','9144000,5143500','--validate-bullet-geometry','--validate-heading-fit',...[4,15,16,18].flatMap(n=>['--require-native-table-slide',String(n)])],explicitTotalSlideCount:19,requiredNativeTableOwnerSlides:[4,15,16,18],fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,receiptPath:BUILD+'/final-validation.json'});
console.log(JSON.stringify({final:result.finalPath,integrity:result.packageIntegrity.status,layout:result.presentationLayout}));
