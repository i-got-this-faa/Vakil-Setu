from pathlib import Path
from copy import deepcopy
from hashlib import sha256
from io import BytesIO
import zipfile
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).parent
SRC = Path(r'C:\Users\DELL\.t3\userdata\attachments\67007b4c-1109-48a2-a48b-5c966a852410-b261cdd1-e99a-48c7-8733-c982ffc4a6ed-docx.docx')
OUT = ROOT / 'Legal_Setu_Updated_Synopsis.docx'
d = Document(SRC)
source_hash = sha256(SRC.read_bytes()).hexdigest()

# Retain the source cover, institutional logo, page geometry and page furniture.
for el in list(d.element.body)[8:]:
    if el.tag != qn('w:sectPr'):
        d.element.body.remove(el)
title = d.paragraphs[0]
title.text = 'LEGAL SETU\nA VOICE FIRST MULTILINGUAL LEGAL ASSISTANCE\nAND ADVOCATE DISCOVERY PLATFORM'
title.style = d.styles['Title']
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
for r in title.runs:
    r.font.name = 'Times New Roman'; r.font.size = Pt(18); r.bold = True; r.font.color.rgb = RGBColor(0,0,0)
for section in d.sections:
    for p in section.header.paragraphs:
        p.text = 'Legal Setu | Mini Project Synopsis'
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.font.name='Times New Roman'; r.font.size=Pt(8); r.font.color.rgb=RGBColor(0,0,0)
    footer=section.footer.paragraphs[0]
    footer.clear(); footer.alignment=WD_ALIGN_PARAGRAPH.CENTER
    run=footer.add_run(); run.font.name='Times New Roman'; run.font.size=Pt(9)
    field=OxmlElement('w:fldSimple'); field.set(qn('w:instr'),'PAGE'); run._r.addnext(field)
for name in ['Title','Heading 1','Heading 2']:
    s = d.styles[name]; s.font.name='Times New Roman'; s.font.color.rgb=RGBColor(0,0,0)
    if s.element.pPr is not None:
        for border in list(s.element.pPr.findall(qn('w:pBdr'))): s.element.pPr.remove(border)

def para(text='', bold=False, size=11.5, align=None):
    p=d.add_paragraph(); p.alignment=align if align is not None else WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_after=Pt(7); p.paragraph_format.line_spacing=1.08
    p.paragraph_format.widow_control=True
    r=p.add_run(text); r.font.name='Times New Roman'; r.font.size=Pt(size); r.bold=bold; r.font.color.rgb=RGBColor(0,0,0)
    return p

def sub(text):
    p=para(text,True,12); p.paragraph_format.keep_with_next=True; p.paragraph_format.space_before=Pt(5)
    return p

def page_heading(text):
    p=d.add_paragraph(text,'Heading 1'); p.paragraph_format.page_break_before=True
    p.paragraph_format.space_after=Pt(10); p.paragraph_format.keep_with_next=True
    for r in p.runs: r.font.name='Times New Roman'; r.font.size=Pt(15); r.font.color.rgb=RGBColor(0,0,0)
    return p

def table(headers, rows, widths, size=10):
    t=d.add_table(rows=1, cols=len(headers)); t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.autofit=False
    for c,w in zip(t.columns,widths): c.width=Inches(w)
    for c,txt,w in zip(t.rows[0].cells,headers,widths): c.width=Inches(w); c.text=txt
    for row in rows:
        cells=t.add_row().cells
        for c,txt,w in zip(cells,row,widths): c.width=Inches(w); c.text=txt
    for i,row in enumerate(t.rows):
        trpr=row._tr.get_or_add_trPr()
        no_split=OxmlElement('w:cantSplit'); trpr.append(no_split)
        if i==0: trpr.append(OxmlElement('w:tblHeader'))
        for c in row.cells:
            c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            pr=c._tc.get_or_add_tcPr(); borders=OxmlElement('w:tcBorders')
            for edge in ['top','left','bottom','right']:
                e=OxmlElement('w:'+edge); e.set(qn('w:val'),'single'); e.set(qn('w:sz'),'4'); e.set(qn('w:color'),'D9D9D9'); borders.append(e)
            pr.append(borders)
            margins=OxmlElement('w:tcMar')
            for edge in ['top','left','bottom','right']:
                e=OxmlElement('w:'+edge); e.set(qn('w:w'),'85'); e.set(qn('w:type'),'dxa'); margins.append(e)
            pr.append(margins)
            if i==0:
                sh=OxmlElement('w:shd'); sh.set(qn('w:fill'),'E8EDF2'); pr.append(sh)
            for p in c.paragraphs:
                p.paragraph_format.space_after=Pt(3); p.paragraph_format.space_before=Pt(2); p.paragraph_format.line_spacing=1.02
                for r in p.runs: r.font.name='Times New Roman'; r.font.size=Pt(size); r.bold=i==0; r.font.color.rgb=RGBColor(0,0,0)
    para('',size=3).paragraph_format.space_after=Pt(1)
    return t

page_heading('Contents of Synopsis')
contents = table(['S No','Topic','Page'],[
 ['1','Project Overview','4'],['2','Problem Statement','5'],['3','Objectives of the Project','6'],
 ['4','Proposed Solution and Methodology','7'],['5','Key Technologies and Tools','8'],
 ['6','V E T S Justification','9'],['7','Expected Outcomes and Current Progress','10'],
 ['8','Implementation Timeline','11'],['9','References','12']], [.55,5.45,.7],11)
para('Key Technical Abbreviations and Nomenclature appears on page 3.',size=11)
sub('Synopsis revision')
para('Updated 5 November 2026. The project is named Legal Setu. The synopsis covers the browser prototype, recent legal-data and retrieval work, and the separate multilingual portal developed in the rebuild workspace. It distinguishes implemented components, recorded test results and remaining integration work.')
sub('Scope of the submission')
para('The academic deliverables include the application prototype, requirements, source audit, evaluation evidence and an implementation roadmap. The immediate goal is a reviewable pilot. A production legal service requires further integration, professional review and operational validation.')

page_heading('Key Technical Abbreviations and Nomenclature')
table(['Term','Meaning in this project'],[
 ['AI','Artificial intelligence used for preliminary issue analysis; not professional legal advice.'],
 ['LLM','Large language model invoked through a configured Gemini or gateway adapter.'],
 ['STT and TTS','Speech-to-text and text-to-speech; availability depends on the selected browser or speech engine.'],
 ['RAG','Retrieval-augmented generation using retrieved passages as evidence for a generated answer.'],
 ['BM25','Keyword-based ranking used to retrieve legal passages.'],
 ['E5 and ONNX','Multilingual embedding model family and model runtime format for local vector retrieval.'],
 ['RRF','Reciprocal-rank fusion, combining keyword and vector result rankings.'],
 ['BNS','Bharatiya Nyaya Sanhita, 2023; the indexed reference snapshot needs legal currency review.'],
 ['API','Application programming interface between clients, application functions and external providers.'],
 ['RBAC','Role-based access control for citizen, advocate and administrator operations.'],
 ['HMAC','Hash-based message authentication code used for payment signatures and provider verification.'],
 ['SHA-256','Cryptographic hash used to detect changes to downloaded source files and indexed content.'],
 ['MiB','Mebibyte, equal to 1,048,576 bytes; the portal case-attachment limit is 3 MiB per file.'],
 ['SPA','Single-page application; the React/Vite browser prototype.']], [1.15,5.55],10.5)

page_heading('1 Project Overview')
para('Legal Setu is a voice-oriented legal assistance and advocate discovery project intended to help citizens describe a concern, understand a preliminary issue category and approach an appropriate legal professional. The platform emphasizes plain language, review of AI output and a clear distinction between information and a confirmed consultation.')
para('The browser prototype uses React and Vite with an Express API and MongoDB. It supports typed intake, Hindi or English browser dictation, follow-up conversation, issue classification, spoken output, advocate profiles and consultation requests. Recent team changes add an animated advocate avatar, repair microphone and profile flows, validate future booking dates and improve payment-signature handling. WhatsApp has been removed from the website navigation; a separate messaging demonstration remains in the backend.')
para('A new legal knowledge subsystem collects official judgment PDFs and a BNS reference text, retains source metadata and retrieves passages with keyword, vector or hybrid search. A grounded-answer endpoint checks passage identifiers and supporting quotations. The browser triage endpoint remains separate from this RAG pipeline; their integration is a remaining milestone [1–4].')
para('The separate Next.js portal in rebuild adds Clerk identity, Convex persistence, citizen/advocate/administrator roles, credential review, private cases, reviewed summaries, consented Gemini chat, attachments and slot-based consultation workflows. English, Hindi and Punjabi are its pilot interface languages. These advances belong to a distinct implementation and are not all present in the Vite application [5].')
sub('Project boundaries')
para('The system provides preliminary information, not a legal opinion, guaranteed emergency response or case-outcome prediction. A stored availability flag does not prove a real advocate is available. Payment signature verification does not establish escrow, refunds or a completed consultation.')
para('Browser speech may use a browser vendor’s remote service. Interface localization does not prove recognition, pronunciation or legal comprehension in every language. Credential verification, privacy policy, retention, security review and legal review are required before a public service can be claimed.')

page_heading('2 Problem Statement')
para('Citizens can describe an event in everyday language while still being unable to identify the relevant legal domain, organize supporting facts or choose an appropriate advocate. A useful intake system must reduce this initial uncertainty without disguising automated suggestions as authoritative legal advice.')
sub('Information and language barriers')
para('Legal terminology and lengthy forms make it difficult to explain a concern under stress. Typed and spoken intake, editable transcripts and plain-language summaries offer alternative ways to begin. Recognition errors must remain visible and correctable before submission.')
sub('Evidence and legal currency')
para('An LLM can produce a plausible explanation with an incorrect section or unsupported conclusion. Retrieval must preserve original sources, page or section references and explicit insufficient-evidence outcomes. A complete section inventory alone does not establish that amendments, commencement and current applicability have been checked.')
sub('Trust and consultation status')
para('Users need to distinguish a sample advocate from an approved profile, a request from an accepted appointment and a payment order from a successful payment. The prototype and portal currently implement different parts of this workflow. Production claims require verified onboarding, authorization and a tested service process.')
sub('Privacy and integration')
para('Case narratives and attached documents can contain sensitive personal information. Browser storage is persistent local storage, not a compliance guarantee. The portal introduces backend access checks and explicit AI-sharing consent, while retention, deletion, provider terms and operational controls still need a defined policy.')
table(['Issue','Current response','Remaining need'],[
 ['Intake friction','Voice or typed input; editable transcript','Real device and human-language evaluation'],
 ['Unsupported answers','Source retrieval and quotation checks','Reviewed applicability and answer quality'],
 ['Unclear appointments','Requests and portal lifecycle states','Real advocate acceptance and operational validation'],
 ['Fragmented implementation','Prototype, RAG backend and portal','Agreed architecture and integration plan']], [1.3,2.7,2.7],10.5)

page_heading('3 Objectives of the Project')
para('The updated objectives extend the original bilingual triage prototype into a source-aware, multilingual and reviewable consultation workflow. Completion is assessed through observable behavior rather than unsupported latency or accuracy guarantees.')
table(['Objective','Implementation focus','Verification requirement'],[
 ['1 Accessible intake','Typed entry, Hindi/English dictation, transcript editing, avatar and read-aloud','Permission/error handling; editable output; device and language checks'],
 ['2 Preliminary analysis','Structured domain, urgency, summary, next steps and follow-up context','Input/output validation; visible provider failure; review before reliance'],
 ['3 Legal retrieval','Official-source ingestion, BM25, multilingual E5 vectors and hybrid ranking','Source hashes, page/section citations, stale-index checks and reviewed queries'],
 ['4 Private case workspace','Clerk/Convex roles, saved cases, reviewed summaries, consented chat and files','Ownership enforcement, consent boundaries and persistence checks'],
 ['5 Advocate workflow','Profile review, discovery, future slots, requests, acceptance and cancellation','Authorization, atomic reservation/release and duplicate-request handling'],
 ['6 Measured readiness','Functional tests, source audits, language review and pilot scenarios','Publish actual results and failures; separate mocks from live services']], [.95,2.8,2.95],10.5)
sub('Acceptance principles')
para('The citizen must be able to review the transcript and summary, save privately where supported and choose whether case text or selected documents are sent to an AI provider. Failure must not be shown as a successful analysis or booking.')
para('The retrieval objective includes a larger lawyer-reviewed Hindi, English and mixed-language dataset. The existing four-query smoke evaluation is useful diagnostic evidence, not a legal-accuracy benchmark. Payment, emergency dispatch and native mobile delivery remain outside the portal MVP.')

page_heading('4 Proposed Solution and Methodology')
para('Development proceeds through separate, explicit application paths. The existing website offers intake and triage; the knowledge backend adds source-aware retrieval; the portal implements authenticated case and consultation workflows. Consolidation is planned rather than assumed.')

# Replace the obsolete embedded architecture with a readable source-derived diagram.
im=Image.new('RGB',(1600,640),'white'); draw=ImageDraw.Draw(im)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',25)
bold=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',29)
def box(x,y,w,h,head,lines):
    draw.rectangle((x,y,x+w,y+h),fill='#F3F5F7',outline='#606870',width=2)
    draw.text((x+20,y+16),head,font=bold,fill='black')
    for i,line in enumerate(lines): draw.text((x+20,y+67+i*35),line,font=font,fill='black')
box(20,20,750,255,'Browser prototype',['React and Vite → Express → MongoDB','Voice or text → triage → advocate request','Animated avatar and optional spoken response','Website chat is not yet connected to RAG'])
box(820,20,750,255,'Separate multilingual portal',['Next.js → Clerk identity → Convex','Private cases and reviewed summaries','Consented Gemini chat and selected attachments','Profile approval and consultation lifecycle'])
box(20,335,750,270,'Legal knowledge backend',['Official PDFs and BNS reference → source records','BM25 + multilingual E5 vectors → hybrid ranking','Knowledge search → grounded answer checks','Integration point for future website RAG'])
box(820,335,750,270,'Standalone messaging extension',['Signed Twilio or Meta adapter → consent','Retrieval → source excerpt or configured LLM','Speech reply → pending consultation request','Local demonstrations do not prove live delivery'])
draw.line((395,278,395,330),fill='#606870',width=3)
draw.text((415,290),'Integration pending',font=font,fill='black')
im.save(ROOT/'architecture.png')
p=d.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.add_run().add_picture(str(ROOT/'architecture.png'),width=Inches(6.65))
para('Figure 4.1  Current Legal Setu application boundaries',size=10,align=WD_ALIGN_PARAGRAPH.CENTER)
sub('Processing stages')
para('1. Intake and review. Capture speech or typed text, allow corrections and request only the information needed for the concern. The portal permits private saving without an AI call.')
para('2. Analysis and retrieval. The browser triage API invokes the configured model or rule-based fallback. Separately, knowledge search retrieves passages and validates index freshness; grounded generation checks returned passage IDs and exact source quotations.')
para('3. Private case conversation. In the portal, save reviewed summaries and case history. Send case text and selected files to Gemini only with explicit consent. PDF, JPG, PNG and TXT attachments are limited to 3 MiB each.')
para('4. Consultation lifecycle. Discover eligible advocates and request a future slot. The portal reserves slots atomically and supports acceptance, cancellation, expiry and notifications. The Vite booking record is a simpler request and does not provide the same lifecycle.')

page_heading('5 Key Technologies and Tools')
table(['Subsystem','Technology','Scope'],[
 ['Existing website','React 18 and Vite','Browser intake, conversation, avatar, profiles and booking interface'],
 ['Prototype backend','Node.js, Express, MongoDB and Mongoose','Triage, matching, requests, knowledge endpoints and payment prototype'],
 ['Speech and avatar','Web Speech API; animated image states and GLB asset','Browser-dependent recognition/playback; visual assistant without guaranteed lip synchronization'],
 ['Legal ingestion','Fetch, Cheerio, Firecrawl adapter and PDF extraction','Official-source collection, metadata, source hashes, page/section passages'],
 ['Semantic retrieval','Transformers.js, multilingual-e5-small and ONNX','384-dimensional local CPU embeddings; BM25/vector/RRF hybrid modes'],
 ['Portal frontend','Next.js, React, TypeScript, Tailwind and shadcn/ui','Separate responsive multilingual application'],
 ['Portal identity and data','Clerk and Convex','Sessions, backend permissions, private storage and booking state transitions'],
 ['AI providers','Server-side Gemini; configurable legacy gateway','Preliminary analysis and consented conversation; credentials stay on the server'],
 ['Development and tests','Bun, Turborepo, native TypeScript compiler and test runners','Portal workspaces, type checks, focused tests and builds'],
 ['Optional integrations','Razorpay; Twilio/Meta; local Whisper and speech output','Prototype payments and separate messaging experiments']], [1.25,2.0,3.45],10)
sub('Execution and deployment')
para('The website runs locally on port 5173 with an API on port 5000 and a local MongoDB instance. The separate portal uses its own Next.js server and hosted Clerk/Convex configuration. HTTPS and operational monitoring are deployment requirements, not evidence of a configured production environment.')
para('Embedding inference can run on CPU after model download. Corpus files, vectors and cached models are excluded from Git and must be restored or rebuilt. A fresh clone does not automatically contain the previously audited legal dataset.')

page_heading('6 V E T S Justification')
sub('V  Viability')
para('The application can be developed and demonstrated on commodity hardware. Browser speech avoids building a custom recognition service for the website, while local embeddings avoid an embedding API dependency at query time. Initial model/database downloads, provider usage, hosting and maintenance still have costs. The separate implementations require an explicit consolidation decision to keep the academic scope manageable.')
sub('E  Engineering depth')
para('The engineering contribution combines editable speech intake, structured model integration, deterministic fallback, source ingestion and provenance, multilingual embeddings, hybrid retrieval and evidence validation. The portal adds backend-owned permissions, private document access, reviewed summaries, provider consent and atomic consultation-state transitions.')
para('These mechanisms address concrete failure cases: an edited transcript, an unavailable provider, a changed source, a stale vector index, a duplicate request, an unauthorized document read or an expired reservation. Correct behavior in those cases is more meaningful than an unmeasured claim of universal reliability.')
sub('T  Technology and public service relevance')
para('Legal Setu applies conversational interfaces and source-aware AI to early legal assistance. Its focus on Indian legal materials and English/Hindi/Punjabi portal interfaces is relevant to language accessibility. Legal accuracy, statutory currency and privacy compliance require professional review and defined procedures; they do not follow automatically from the technology stack.')
sub('S  Social and industry impact')
para('The intended benefit is a clearer first step: citizens can organize a concern, review preliminary information and request professional assistance. This benefit depends on comprehensible language, truthful service status and available advocates. The project does not claim measured reductions in legal costs, court pendency or case duration.')
sub('Responsible deployment')
para('Pilot operation should use clearly labelled synthetic data until access controls, source review, retention/deletion, provider terms and real consultation handling have been approved. AI outputs must remain reviewable and must not be presented as judicial conclusions or professional representation.')

page_heading('7 Expected Outcomes and Current Progress')
table(['Deliverable','Current progress','Qualification'],[
 ['Browser prototype','Voice/text intake, avatar, triage, profiles and booking code','Local homepage and API health checked; speech and model accuracy need live evaluation'],
 ['Legal corpus','Recorded audit: 3 judgments, 26 pages, 44 judgment passages; 358 BNS sections, 432 statute passages','476 passages total; corpus is external to Git; current-law certification pending'],
 ['Hybrid retrieval','BM25, local multilingual embeddings, vector/hybrid modes and evidence checks','Website triage is separate; model/index setup required on a new clone'],
 ['Multilingual portal','Roles, review, private cases, summaries, chat, documents and consultation lifecycle','Separate implementation; English/Hindi/Punjabi pilot; wider language support incomplete'],
 ['Messaging extension','Consent, signed adapters, source replies and pending requests','Standalone demonstration; live delivery and real multilingual speech unverified'],
 ['Payment prototype','Order creation and HMAC verification; improved validation','No verified escrow/refund service; paid bookings deferred in the portal MVP']], [1.15,3.1,2.45],10)
sub('Recorded evaluation and its limits')
para('The 5 November developer smoke evaluation returned the expected BNS section among the top five results for 3 of 4 queries. The Hindi fraud query missed its expected section. This small developer-labelled sample is not a lawyer-reviewed accuracy score [3].')
para('The source audit records matching hashes for the three official judgment PDFs and reconstruction checks for indexed passages. This verifies source-text integrity; it does not verify legal applicability or every generated conclusion [4].')
para('Further evaluation should cover transcription errors, refusal behavior, multilingual retrieval, source changes, ownership violations, consent withdrawal, concurrent requests and booking expiry. Report functional, live-provider and human-review results separately.')

page_heading('8 Implementation Timeline')
para('The original twelve-week schedule is retained as the academic planning framework. Progress is described by workstream because the prototype, knowledge backend and portal have developed separately. These week allocations are planning estimates, not a reconstructed completion history.')
table(['Phase','Workstream','Progress and next gate','Allocation'],[
 ['1','Requirements and scope','Rename to Legal Setu; define application boundaries, roles and evidence requirements. Agree the consolidation path.','Weeks 1–2'],
 ['2','Accessible browser intake','Existing voice/text intake and avatar; recent voice/profile repairs. Complete real-device speech and accessibility review.','Weeks 3–4'],
 ['3','Source retrieval and analysis','Ingestion, BM25, vectors and hybrid retrieval implemented. Restore corpus/index; connect website RAG; expand reviewed queries.','Weeks 5–7'],
 ['4','Private cases and consultations','Portal roles, documents, reviewed summaries and reservation lifecycle implemented. Validate hosted user/advocate/admin workflows.','Weeks 8–10'],
 ['5','Evaluation and submission','Record actual test outcomes, human language/legal review, privacy controls and final demonstration. Update report and presentation.','Weeks 11–12']], [.5,1.25,3.85,1.1],10.5)
sub('Remaining priority milestones')
para('1. Choose the application that will be submitted and integrate the knowledge backend through a reviewed contract. Do not present the separate stacks as one completed deployment.')
para('2. Review corpus currency and add representative Hindi, English and mixed-language legal queries. Measure retrieval and answer quality, including refusal cases and known misses.')
para('3. Validate real identity, private files, consent, advocate approval, slot contention, acceptance and expiry in the selected hosted environment. Define retention, deletion and incident handling.')
para('4. Complete a controlled demonstration using synthetic cases. Treat payment rollout, guaranteed emergency connection, native mobile clients and legal drafting as later work.')

page_heading('9 References')
refs=[
 '[1] Project repository, i-got-this-faa/Vakil-Setu, main snapshot 30812b9, 5 November 2026. README.md and frontend/backend source. https://github.com/i-got-this-faa/Vakil-Setu',
 '[2] Project documentation, Local multilingual vector retrieval, docs/VECTOR_RETRIEVAL.md, main snapshot 30812b9, 5 November 2026. Describes embedding setup, retrieval modes and integration boundaries.',
 '[3] Project documentation, Retrieval smoke evaluation, docs/RETRIEVAL_EVALUATION.md, generated 5 November 2026. Four developer-labelled queries; expected-section top-five hits in 3 of 4 cases.',
 '[4] Project documentation, RAG data audit, docs/RAG_DATA_AUDIT.md, generated 5 November 2026. Source hashes, passage reconstruction and unresolved BNS currency limitations.',
 '[5] Legal Setu rebuild workspace, README.md and docs/chat-and-documents.md, verification.md, requirements.md and branding-rename.md, inspected 5 November 2026. Source and progress records for the separate multilingual portal.',
 '[6] MDN Web Docs, Web Speech API, accessed 5 November 2026. https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API',
 '[7] L. Wang et al., Multilingual E5 Text Embeddings A Technical Report, 2024; multilingual-e5-small model card. https://huggingface.co/intfloat/multilingual-e5-small',
 '[8] Convex, Developer documentation, accessed 5 November 2026. https://docs.convex.dev/',
 '[9] Razorpay, Node.js Standard Checkout integration steps, accessed 5 November 2026. https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps',
 '[10] Project documentation, docs/IMPLEMENTATION_STATUS.md and docs/TWILIO_SANDBOX.md, main snapshot 30812b9. Historical progress and standalone messaging limits; newer retrieval findings are recorded in references [2–4].'
]
for text in refs: para(text,size=11)
sub('Evidence interpretation')
para('Repository source establishes that an implementation exists. Recorded tests establish only the scenarios and environments exercised. Model documentation describes the model, not Legal Setu’s application accuracy. A proposed requirement or earlier synopsis is not proof of a completed service.',size=11)

d.core_properties.title='Legal Setu Updated Mini Project Synopsis'
d.core_properties.subject='Updated project scope and implementation progress as of 5 November 2026'
d.core_properties.keywords='Legal Setu, legal triage, multilingual retrieval, advocate discovery'
d.save(OUT)
assert sha256(SRC.read_bytes()).hexdigest()==source_hash
(ROOT/'artifact.md').write_text(f'''# Synopsis editing contract
Reference: {SRC}
SHA256: {source_hash}
Reference render: reference.pdf, 12 pages.
A4 portrait, 0.75 inch margins, one section. Retain original institutional cover logo, submitter details and page furniture. Times New Roman; black headings 15 pt; body 11.5 pt; source-derived pale table header. Retain nine-section order. Update all content slots and obsolete architecture figure; add distinct glossary page and correct contents pagination. Student placeholder remains unchanged. Tables wrap and repeat headers; automatic heights. Rebuilt body is intentional for substantive update. Source remains unchanged. Renderer lacks pdf2image and no workspace dependency loader is available; native Word PDF export and PyMuPDF PNG rasterization provide visual QA.
''',encoding='utf-8')
print(OUT)
