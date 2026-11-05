import fs from 'node:fs/promises';
const path=new URL('./build.mjs',import.meta.url);let s=await fs.readFile(path,'utf8');
const edits=[
['logo.png','logo-alpha.png'],
["return s.shapes.connect(a,b,{kind:'straight',","let q=s.shapes.connect(a,b,{kind:'straight',"],
["length:'sm'}});}","length:'sm'}});q.bringToFront();return q;}"],
['The interface displays guidance and advocate matches.','The interface displays the results.'],
['The client submits text and recent chat history.','The client submits text and chat history.'],
['Matching queries available profiles by domain.','Matching queries profiles by domain.'],
['Profile details: expertise, experience and languages support user selection.','Profiles: show expertise, experience and languages.'],
['Urgent lookup: return the highest-rated available advocate, independent of domain.','Urgent lookup: pick one available advocate by rating, across domains.'],
['Next step: add language filtering and verified response availability.','Next step: validate language fit and response availability.'],
['Order: the server creates a Razorpay order and saves its identifier.','Order: create and save a Razorpay order.'],
['Verification: the server checks the payment signature and updates the record.','Verification: check the signature and update the record.'],
['Unpaid option: current demo flow can confirm a booking with payment still pending.','Unpaid option: demo confirmation keeps payment pending.'],
['Code presence establishes implementation scope. Live service reliability and user outcomes need evidence.','Live reliability and user outcomes still need evidence.'],
['User evaluation: measure task completion and whether people understand the next step.','User evaluation: measure task completion and comprehension.'],
['Language evaluation: check transcript quality and response comprehension per supported language.','Language evaluation: check transcript quality and response comprehension.'],
['Triage evaluation: compare domain and urgency labels with an advocate-reviewed case set.','Triage evaluation: compare labels with advocate-reviewed cases.'],
['Matching evaluation: check expertise relevance, usable availability and language suitability.','Matching evaluation: check expertise, availability and language fit.'],
['Vakil Setu connects voice input with preliminary legal guidance and advocate discovery.','Vakil Setu connects spoken intake with guidance and advocate discovery.'],
['React, Express and MongoDB connect the interface to analysis, profiles and booking records.','React, Express and MongoDB support analysis, matching and booking.'],
['Architecture, request sequence and module workflows show the system responsibilities.','The diagrams show architecture and each module’s workflow.'],
['Broader language support and reliable consultation operations require validation.','Broader language support and consultation reliability need validation.'],
["'--validate-heading-fit'],explicitTotal","'--validate-heading-fit',...[4,15,16,18].flatMap(n=>['--require-native-table-slide',String(n)])],explicitTotal"],
// Keep the successful parse and fallback branches distinct.
["arrow(s,d,f,'right','left');arrow(s,e,f,'right','left');","let bypass=box(s,530,457,0.4,0.4);let end=box(s,829,457,0.4,0.4);arrow(s,d,bypass);arrow(s,bypass,end,'right','left');arrow(s,end,f,'top','bottom');arrow(s,e,f,'right','left');"],
];
for(const [a,b] of edits){if(!s.includes(a))throw Error('Missing '+a);s=s.replaceAll(a,b);}
// Put the yellow grouping rectangles beneath native connectors.
s=s.replace("box(s,x,y,w,h,C.pale,'#C8C889');","box(s,x,y,w,h,C.pale,'#C8C889').sendToBack();");
await fs.writeFile(path,s);
