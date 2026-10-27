import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {Presentation, PresentationFile} from '@oai/artifact-tool';
import sharp from 'sharp';

const ROOT='C:/Users/DELL/Vakil-Setu';
const BUILD=path.join(ROOT,'.codex-deck/project-framework');
const OUT=path.join(ROOT,'output/project-presentation');
const SKILL='C:/Users/DELL/.codex/plugins/cache/openai-primary-runtime/presentations/26.1013.11914/skills/presentations';
const PYTHON='C:/Users/DELL/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const {slides}=JSON.parse(await fs.readFile(path.join(BUILD,'content.json'),'utf8'));
await fs.mkdir(path.join(BUILD,'previews'),{recursive:true});
await fs.mkdir(OUT,{recursive:true});
const p=Presentation.create({slideSize:{width:1280,height:720}});
const C={red:'#B12632',ink:'#172A35',muted:'#52616A',grey:'#EDF0F1',white:'#FFFFFF',green:'#326C64'};
function text(s,t,x,y,w,h,size=27,color=C.ink,bold=false){
 const o=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 o.text=t;o.text.style={typeface:'Arial',fontSize:size,color,bold,verticalAlignment:'middle',autoFit:'none'};return o;
}
function rect(s,x,y,w,h,fill){return s.shapes.add({geometry:'rect',position:{left:x,top:y,width:w,height:h},fill,line:{fill:'none',width:0}});}
const screenshot=await sharp(path.join(ROOT,'rebuild/.runtime/browser-qa/landing-en-1280.png')).extract({left:0,top:0,width:1280,height:800}).png().toBuffer();
for(let i=0;i<slides.length;i++){
 const d=slides[i],s=p.slides.add();s.background.fill=C.white;
 if(d.layout==='cover'){
   text(s,'VAKIL SETU',65,155,1130,115,85,C.red,true);
   text(s,d.subtitle,70,286,1120,85,38,C.ink);
   text(s,'Problem   Reason   Objective   Journey',72,482,1120,48,27,C.muted);
   text(s,'Execution   Contribution   Takeaway',72,533,1120,48,27,C.muted);
   text(s,'Faculty project presentation',72,638,700,28,19,C.muted);
 }else if(d.layout==='closing'){
   text(s,d.section,62,43,1120,40,27,C.red,true);
   text(s,d.title,62,156,1120,100,74,C.red,true);
   text(s,d.subtitle,66,272,1130,65,38);
   d.rows.forEach((r,j)=>{text(s,r[0],70,403+j*93,260,44,25,C.red,true);text(s,r[1],330,394+j*93,855,66,27);});
   text(s,'Questions',70,611,1000,48,32,C.ink,true);
 }else{
   text(s,d.section,62,32,1120,39,26,C.red,true);
   text(s,d.title,62,84,1160,67,46,C.ink,true);
   text(s,d.subtitle,65,155,1150,47,25,C.muted);
   if(d.layout==='rows'){
     d.rows.forEach((r,j)=>{
       const y=225+j*96;
       if(j%2===0)rect(s,62,y-2,1156,86,C.grey);
       text(s,r[0],78,y+7,275,63,27,C.red,true);
       text(s,r[1],372,y+3,821,72,27);
     });
   }else if(d.layout==='columns'){
     d.columns.forEach((col,j)=>{
       const x=70+j*610;
       text(s,col.title,x,228,535,45,31,C.red,true);
       col.items.forEach((t,k)=>text(s,t,x,300+k*76,535,64,28));
     });
   }else if(d.layout==='screenshot'){
     s.images.add({blob:screenshot.buffer.slice(screenshot.byteOffset,screenshot.byteOffset+screenshot.byteLength),contentType:'image/png',alt:'Implemented Vakil Setu public landing page',fit:'contain',position:{left:62,top:217,width:741,height:420}});
     d.rows.forEach((r,j)=>{text(s,r[0],840,234+j*135,350,40,29,C.red,true);text(s,r[1],840,279+j*135,350,82,26);});
   }
   if(d.footnote)text(s,d.footnote,65,650,1125,39,18,C.muted);
 }
 text(s,String(i+1).padStart(2,'0'),1210,677,42,25,17,C.muted);
 s.speakerNotes.textFrame.setText(d.script+'\n\nPresenter cue: '+d.cue+'\n\nSources:\n'+d.sources.map(x=>x.startsWith('http')?x:ROOT+'/'+x).join('\n'));
 await fs.writeFile(path.join(BUILD,`previews/slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await (await p.export({slide:s,format:'png',scale:1})).arrayBuffer()));
 console.log('Rendered '+(i+1));
}
const candidate=path.join(BUILD,'candidate.pptx');
await(await PresentationFile.exportPptx(p)).save(candidate);
const {finalizePresentation}=await import(pathToFileURL(path.join(SKILL,'container_tools/artifact_tool_utils.mjs')).href);
const result=await finalizePresentation({
 workspaceDir:ROOT,candidatePath:candidate,finalPath:path.join(OUT,'Vakil_Setu_PROJECT_Final.pptx'),
 pythonExecutable:PYTHON,
 integrityValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],
 explicitTotalSlideCount:14,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],
 fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,
 receiptPath:path.join(BUILD,'validation.json')
});
console.log(JSON.stringify(result));
