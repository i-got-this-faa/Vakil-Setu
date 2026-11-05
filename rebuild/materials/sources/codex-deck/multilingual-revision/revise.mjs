import fs from 'node:fs/promises';
const root='C:/Users/DELL/Vakil-Setu';
let s=await fs.readFile(root+'/.codex-deck/compact-build/build.mjs','utf8');
const edits=[
["const BUILD=ROOT+'/.codex-deck/compact-build'","const BUILD=ROOT+'/.codex-deck/multilingual-revision'"],
['People seeking initial legal orientation, especially Hindi/English speakers who prefer voice input, and advocates receiving consultation requests.','People seeking legal orientation in their preferred Indian language, especially those who prefer voice input, and advocates receiving consultation requests.'],
['Speak or type in Hindi or English. Review the transcript.','Speak or type in an Indian language. Review the transcript.'],
['Current explicit language modes cover Hindi and English. Broader language support remains a development target.','Indian multilingual scope includes voice input, explanations and spoken playback. Quality needs validation for each language.'],
['System architecture of current source code.','System architecture of the project.'],
['Current scope and validation plan','Project scope and validation plan'],
['Implemented in the code','Multilingual project scope'],
['Hindi/English voice and typed input with spoken playback.','Voice and typed input across Indian languages, with spoken playback.'],
['Implementation scope is based on code inspection. No measured accuracy, latency, live adoption or impact is claimed. Four domain slugs appear in the classification prompt.','Indian multilingual coverage is the project scope confirmed by the user. Language-by-language recognition, response and playback quality require validation. The repository inspected here has explicit Hindi/English paths and does not establish complete language coverage. No measured accuracy, latency or impact is claimed.'],
['Test Hindi/English speech, model failure and the complete consultation journey.','Test speech across Indian languages, model failure and the complete consultation journey.'],
['Expand languages','Validate languages'],
['Target 22 scheduled languages plus English. Validate each language before rollout.','Scope includes 22 scheduled languages plus English. Validate each language before rollout.'],
['The product provides general orientation. A qualified advocate handles case-specific advice. Voice depends on browser and provider support.','The project has Indian multilingual scope as clarified by the user. Voice and response quality depend on browser and provider support, and need testing for each language. General orientation supports preparation for a qualified advocate.'],
['Vakil_Setu_Short_Detailed.pptx','Vakil_Setu_Short_Detailed_Multilingual.pptx'],
["receiptPath:BUILD+'/delivery-validation.json'","receiptPath:BUILD+'/validation.json'"]
];
for(const [a,b] of edits){s=s.replaceAll(a,b);}
await fs.writeFile(root+'/.codex-deck/multilingual-revision/build.mjs',s);
