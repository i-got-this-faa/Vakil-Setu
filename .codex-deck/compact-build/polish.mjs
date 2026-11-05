import fs from 'node:fs/promises';
const file=new URL('./build.mjs',import.meta.url);let s=await fs.readFile(file,'utf8');
for(const [a,b] of [
['DATA AND PROVIDER LAYER','DATA AND SERVICES'],
["left:48,width:270","left:48,width:190"],
['JSON requests and responses','JSON API requests'],
['Classification + fallback','Model classification'],
['Speech recognition and playback run through browser Web Speech APIs. Provider keys stay on the server.','Browser Web Speech handles recognition/playback. The backend holds keys and handles AI fallback.'],
['2  Classify domain, urgency and actions','2  Request issue classification'],
['3  Structured result or local fallback','3  Model response or provider error'],
['Before submission: the user reviews the transcript. After the response: the interface displays guidance and profiles, with optional spoken playback.','The user reviews the transcript before submission. The backend applies fallback on AI failure. Results include guidance and advocate profiles.'],
['Advocate access and consultation booking','Advocate matching and booking'],
['Vakil_Setu_Compact_9_Slides.pptx','Vakil_Setu_Compact_Final.pptx'],
["receiptPath:BUILD+'/validation.json'","receiptPath:BUILD+'/final-validation.json'"]
]){s=s.replaceAll(a,b);}
await fs.writeFile(file,s);
