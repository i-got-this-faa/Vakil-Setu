import typst
import pymupdf

typ_source = """
#set page(
  paper: "a4",
  margin: (x: 54pt, top: 54pt, bottom: 54pt),
  header: context {
    if counter(page).get().first() > 2 [
      #text(size: 8.5pt, fill: rgb("#64748b"), font: "Liberation Serif")[Vakil Setu: A Voice-First Bilingual Legal Triage Platform | Mini Project Synopsis]
    ]
  },
  footer: context {
    if counter(page).get().first() > 1 [
      #align(center, text(size: 9.5pt, font: "Liberation Serif")[#counter(page).get().first()])
    ]
  }
)

#set text(
  font: "Liberation Serif",
  size: 11.5pt,
  lang: "en"
)

#set par(justify: true, leading: 0.62em)

// =========================================================================
// PAGE 1: TITLE / COVER PAGE
// =========================================================================

#v(10pt)
#align(center)[
  #text(size: 18.0pt, weight: "bold")[VAKIL SETU: A VOICE-FIRST BILINGUAL LEGAL TRIAGE\\AND ADVOCATE DISCOVERY PLATFORM]
]

#v(18pt)
#align(center)[
  #text(size: 12.0pt, weight: "bold")[A MINI PROJECT SYNOPSIS SUBMITTED\\IN PARTIAL FULFILLMENT OF THE REQUIREMENTS\\FOR THE AWARD OF DEGREE OF]
  
  #v(4pt)
  #text(size: 14.0pt, weight: "bold")[BACHELOR OF TECHNOLOGY]
  
  #v(2pt)
  #text(size: 12.0pt, weight: "regular")[In]
  
  #v(2pt)
  #text(size: 14.0pt, weight: "bold")[COMPUTER SCIENCE AND ENGINEERING]
]

#v(24pt)
#align(center)[
  #image("extracted_p1_img1.png", width: 55%)
]

#v(24pt)
#align(center)[
  #text(size: 11.0pt, weight: "bold")[SUBMITTED BY]
  
  #v(4pt)
  #text(size: 13.0pt, weight: "bold")[Summar Kumar]
  
  #text(size: 11.0pt)[Roll Number: 2023a1r033]
  
  #v(6pt)
  #text(size: 13.0pt, weight: "bold")[[Teammate Name]]
  
  #text(size: 11.0pt)[Roll Number: [Roll Number]]
]

#v(20pt)
#align(center)[
  #text(size: 12.0pt, weight: "bold")[SUBMITTED TO]
  
  #v(4pt)
  #text(size: 13.0pt, weight: "bold")[Department of Computer Science and Engineering]
  
  #text(size: 12.0pt, weight: "bold")[Model Institute of Engineering and Technology (Autonomous)]
  
  #text(size: 12.0pt)[Jammu, India]
  
  #v(4pt)
  #text(size: 12.0pt, weight: "bold")[2026]
]

#pagebreak()

// =========================================================================
// PAGE 2: TABLE OF CONTENTS & ABBREVIATIONS
// =========================================================================

#align(center)[
  #text(size: 16.0pt, weight: "bold")[CONTENTS OF SYNOPSIS]
]

#v(10pt)
#table(
  columns: (1fr, 6.5fr, 1.5fr),
  align: (center, left, center),
  stroke: 0.5pt + rgb("#cbd5e1"),
  fill: (col, row) => if row == 0 { rgb("#f1f5f9") } else { none },
  table.header(
    [*S. No*], [*Topic*], [*Page No*]
  ),
  [1], [Project Overview], [3],
  [2], [Problem Statement], [4],
  [3], [Objectives of the Project], [5],
  [4], [Proposed Solution / Methodology], [6],
  [5], [Key Technologies and Tools], [7],
  [6], [V.E.T.S Justification], [8],
  [7], [Expected Outcomes], [9],
  [8], [Implementation Timeline], [10],
  [9], [References], [11]
)

#v(16pt)
#text(size: 13.0pt, weight: "bold")[Key Technical Abbreviations & Nomenclature]

#v(8pt)
#table(
  columns: (2.2fr, 6.8fr),
  align: (left, left),
  stroke: 0.5pt + rgb("#cbd5e1"),
  fill: (col, row) => if row == 0 { rgb("#f1f5f9") } else { none },
  table.header(
    [*Acronym*], [*Definition and Systems Scope*]
  ),
  [*LLM*], [Large Language Model (e.g., Gemini 2.0 Flash, Claude Sonnet 3.7, GPT-4o)],
  [*STT*], [Speech-to-Text; browser-native speech recognition via W3C Web Speech API],
  [*TTS*], [Text-to-Speech; speech synthesis vocalizing legal summaries in Devanagari/English],
  [*BNS*], [Bharatiya Nyaya Sanhita, 2023; modern Indian criminal penal code succeeding IPC],
  [*BNSS*], [Bharatiya Nagarik Suraksha Sanhita, 2023; procedural criminal code succeeding CrPC],
  [*CPC*], [Code of Civil Procedure, 1908; statutory framework governing civil litigation in India],
  [*BCI*], [Bar Council of India; apex statutory body regulating legal profession and ethics],
  [*COP*], [Certificate of Practice; mandatory credential granted upon passing AIBE examination],
  [*AIBE*], [All India Bar Examination; mandatory examination for lifelong bar practice rights],
  [*HMAC*], [Hash-based Message Authentication Code; SHA-256 signature verifying Razorpay escrow],
  [*NALSA*], [National Legal Services Authority; statutory provider of free legal aid under Art. 39A],
  [*CNR*], [Case Number Record; 16-digit alphanumeric unique identifier in Indian e-Courts],
  [*SPA*], [Single Page Application; React 18 client architecture executing on user device]
)

#pagebreak()

// =========================================================================
// PAGE 3: 1. PROJECT OVERVIEW
// =========================================================================

#text(size: 15.0pt, weight: "bold")[1. Project Overview]

#v(4pt)
Vakil Setu is an artificial intelligence-powered, voice-first legal triage and advocate discovery platform designed to bridge the severe "first-mile" justice divide in India. Situated at the intersection of Conversational Artificial Intelligence, Legal Informatics, and Web Systems, the project addresses the immense cognitive, linguistic, and financial barriers that confront everyday citizens when navigating legal crises.

In the Indian judicial landscape, over 50 million cases remain pending across courts. However, for an ordinary citizen facing a legal conflict—such as illegal tenancy eviction, employer wage denial, workplace harassment, property boundary encroachment, or cheque dishonor—the primary obstacle is not courtroom litigation itself, but knowing where, when, and how to start. Traditional digital legal platforms in India operate exclusively as static, English-heavy directories saturated with Latin maxims and complex statutory citations. They assume high typing proficiency and structured legal comprehension, entirely alienating the over 70% of Indian litigants residing in semi-urban and rural areas who are comfortable speaking in Hindi or regional dialects.

Vakil Setu eliminates this asymmetry by introducing a hands-free, bilingual conversational interface operating directly within modern web browsers. Citizens simply speak their dispute naturally in Hindi, English, or mixed colloquial speech. Utilizing a dual-engine triage architecture, the platform analyzes unstructured spoken narratives against Indian statutory codes (Bharatiya Nyaya Sanhita, Bharatiya Nagarik Suraksha Sanhita, and Code of Civil Procedure), determines the primary legal domain (Criminal, Civil, Family, or Property), estimates procedural urgency, and extracts immediate action items. For low-literacy citizens, the platform vocalizes the legal guidance back in clear regional speech. Finally, it algorithmically matches litigants with verified, specialized advocates and enables direct consultation scheduling backed by cryptographic Razorpay payment escrow.

#v(4pt)
#text(size: 13.0pt, weight: "bold")[Architectural Scope & Boundary Constraints]

#v(2pt)
- *In-Browser Zero-Cost Audio Processing:* Audio capture and transcription execute client-side via the browser's native W3C Web Speech API (`webkitSpeechRecognition`), dynamically tagging BCP-47 locales (`hi-IN` and `en-IN`). This eliminates server-side audio streaming bandwidth and external cloud STT compute costs.
- *Statutory Non-Solicitation Adherence:* The platform strictly complies with Section 29 of the Advocates Act, 1961, functioning as an informational triage bridge rather than an unauthorized practitioner. All advocate directory listings adhere to Rule 36 of the Bar Council of India (BCI) rules regarding non-promotional publication.
- *Dual-Engine Failover Resilience:* To guarantee 100% operational uptime during upstream API rate-limits (HTTP 429) or gateway timeouts (HTTP 503), the server integrates a deterministic local regex pattern-matching engine that provides instant, rule-based legal triage without returning 500 server errors.
- *Client-Side Session Data Ephemerality:* In compliance with the Digital Personal Data Protection (DPDP) Act, 2023, sensitive case narratives are cached locally within browser LocalStorage, preventing permanent, unencrypted storage of private litigation facts in the cloud database.

#pagebreak()

// =========================================================================
// PAGE 4: 2. PROBLEM STATEMENT
// =========================================================================

#text(size: 15.0pt, weight: "bold")[2. Problem Statement]

#v(4pt)
Modern access to justice in India suffers from an acute first-mile information failure. When citizens encounter legal distress, they lack the legal literacy required to structure their grievances into actionable legal complaints. Mathematically, the cumulative procedural friction and informational asymmetry $cal(F)_"friction"$ experienced by an aggrieved citizen over elapsed time $t$ can be formalized as:

$ cal(F)_"friction" = sum_(i=1)^N (alpha_i dot cal(L)_"jargon" + frac(beta_i, tau_"limitation" - t) + gamma_i dot cal(C)_"intermediary") $

Where $cal(L)_"jargon"$ represents linguistic and statutory complexity, $tau_"limitation"$ denotes the statutory limitation deadline under the Limitation Act, 1963, and $cal(C)_"intermediary"$ represents the financial friction imposed by unregulated touts. When $t$ approaches $tau_"limitation"$, procedural friction diverges to infinity, resulting in the permanent forfeiture of statutory legal remedies.

This systemic crisis is characterized by four structural failure modes:

1. *Statutory Domain & Limitation Ambiguity:* Citizens cannot identify whether their dispute falls under Criminal, Civil, Family, or Property law. Inability to gauge statutory deadlines (such as the 30-day notice window under Section 138 of the Negotiable Instruments Act or bail limitation periods) leads to irreversible procedural default.
2. *Linguistic & Jargon Exclusion:* Over 90% of existing legal resources are published in dense, formal English. Semi-urban and rural litigants comfortable speaking Hindi or colloquial dialects are completely shut out, inducing severe cognitive helplessness.
3. *The Unregulated Intermediary Trap:* Finding an advocate specializing in the relevant practice area is a lottery. Litigants face arbitrary consultation fee demands, opaque practitioner credentials, and exploitation by court touts.
4. *High-Stress Typing & Cognitive Overload:* Under acute emotional trauma (threat of arrest, domestic abuse, unlawful eviction), formulating and typing structured text is unrealistic.

#v(6pt)
#align(center)[#text(size: 10.5pt, weight: "bold")[Table 2.1: Comparative Analysis of Legal Discovery Paradigms]]
#v(2pt)
#table(
  columns: (2.2fr, 2.3fr, 2.3fr, 2.2fr),
  align: (left, left, left, left),
  stroke: 0.5pt + rgb("#cbd5e1"),
  fill: (col, row) => if row == 0 { rgb("#f1f5f9") } else { none },
  table.header(
    [*Discovery Paradigm*], [*Linguistic Mode*], [*Indian Law Triage*], [*Escrow & Booking*]
  ),
  [Traditional Legal Portals (LawRato, Vakilsearch)], [English-heavy; text typing only], [Static directory; no instant procedural triage], [Third-party redirection; opaque pricing],
  [Generic Conversational LLMs (ChatGPT, Claude)], [Multilingual text prompts], [General knowledge; high risk of non-Indian hallucination], [Zero booking or verified advocate connection],
  [*Vakil Setu Legal Triage Gateway*], [*Hands-free bilingual voice (hi-IN / en-IN)*], [*Tuned for Indian statutes (BNS, CrPC, CPC)*], [*Integrated Razorpay HMAC-SHA256 escrow*]
)

#pagebreak()

// =========================================================================
// PAGE 5: 3. OBJECTIVES OF THE PROJECT
// =========================================================================

#text(size: 15.0pt, weight: "bold")[3. Objectives of the Project]

#v(4pt)
The core technical objectives of the Vakil Setu project are formulated across five architectural milestones:

- *Objective 1 — Hands-Free In-Browser Voice Intake & Locale Tagging:* Engineer a client-side speech recognition pipeline utilizing the W3C Web Speech API that captures spoken Hindi and English with sub-200ms interim token streaming, dynamic BCP-47 locale tagging (`hi-IN` and `en-IN`), and zero cloud audio streaming costs.
- *Objective 2 — Dual-Engine Statutory Legal Triage & Urgency Scoring:* Construct an intelligent triage service powered by Google Gemini 2.0 / Gateway LLM with strict JSON schema constraints that categorizes spoken narratives into 4 canonical legal domains (Criminal, Civil, Family, Property), evaluates statutory urgency (Low, Medium, High, Emergency), and outputs actionable next steps.
- *Objective 3 — High-Availability Deterministic Failover Engine:* Implement an embedded rule-based regex heuristics engine within the Node.js backend that intercepts failed or rate-limited LLM calls (HTTP 429/503) and provides immediate, vetted legal triage in sub-50ms with 100% service uptime.
- *Objective 4 — Specialization-Based Advocate Matching & Directory Ingestion:* Develop an automated Cheerio web scraping pipeline that continuously indexes practicing advocates from public legal registries into MongoDB, coupled with an algorithmic matching query that pairs litigants with verified specialists sorted by rating and experience.
- *Objective 5 — Cryptographic Consultation Escrow & Multi-Turn Assistant:* Integrate the Razorpay Orders API with server-side HMAC SHA-256 signature verification to ensure transparent, tamper-proof consultation booking, accompanied by a 10-turn sliding memory conversational assistant for follow-up legal queries.

#v(8pt)
#align(center)[#text(size: 10.5pt, weight: "bold")[Table 3.1: Objectives, Systems Mechanisms, and Verification Gates]]
#v(2pt)
#table(
  columns: (1fr, 2.3fr, 3.2fr, 2.5fr),
  align: (center, left, left, left),
  stroke: 0.5pt + rgb("#cbd5e1"),
  fill: (col, row) => if row == 0 { rgb("#f1f5f9") } else { none },
  table.header(
    [*Obj.*], [*Architectural Focus*], [*Technical Implementation*], [*Target Metric / Gate*]
  ),
  [Obj 1], [Voice Ingestion], [W3C Web Speech API (hi-IN / en-IN)], [Sub-200ms interim token latency; zero cloud audio cost],
  [Obj 2], [AI Statutory Triage], [Prompt engineering with strict JSON contract], [100% schema conformity; domain precision over 90%],
  [Obj 3], [Failover Engine], [Bilingual regex pattern-matching engine], [Sub-50ms execution; zero 500 errors on API timeout],
  [Obj 4], [Advocate Ingestion], [Cheerio crawler + MongoDB compound indexing], [Atomic upserts; sub-100ms domain query resolution],
  [Obj 5], [Escrow Booking], [Razorpay API + Crypto HMAC-SHA256], [100% tamper-proof signature verification; multi-turn chat]
)

#pagebreak()

// =========================================================================
// PAGE 6: 4. PROPOSED SOLUTION / METHODOLOGY
// =========================================================================

#text(size: 15.0pt, weight: "bold")[4. Proposed Solution / Methodology]

#v(4pt)
Vakil Setu is architected as an asynchronous, decoupled five-tier legal gateway. The client application runs as a responsive React 18 Single Page Application interfacing with an Express.js API gateway. Rather than routing heavy raw audio to cloud servers, audio transcription occurs locally on the client's device, transmitting lightweight text payloads to the backend intelligence pipeline.

#v(6pt)
#align(center)[
  #image("vakil_setu_architecture.png", width: 88%)
  #v(2pt)
  #text(size: 9.0pt, style: "italic")[Figure 4.1: Decoupled Five-Tier Execution Topology of the Vakil Setu Legal Triage Gateway]
]
#v(6pt)

The internal processing pipeline operates across four decoupled systems modules:

- *Stage 1 — Voice Ingestion & Live Interim Streaming:* The user speaks their grievance into the browser. The native `webkitSpeechRecognition` engine captures the microphone stream, dynamically tagging the language locale (`hi-IN` or `en-IN`) and rendering intermediate transcription tokens character-by-character into a draft preview bubble.
- *Stage 2 — Dual-Engine Legal Triage & Prompt Schema Enforcement:* The narrative is transmitted via HTTPS REST to `/api/ai/triage`. The primary engine invokes Google Gemini 2.0 with a strict JSON contract enforcing Indian jurisprudence. If an API timeout, rate-limit (HTTP 429), or network drop occurs, the server seamlessly falls back to the local deterministic regex engine.
- *Stage 3 — Auditory Feedback & Specialization-Based Advocate Matching:* The legal summary and concrete steps are vocalized back to the user via native speech synthesis in regional accents. Concurrently, the backend queries MongoDB for verified advocates matching the identified domain, sorted by rating.
- *Stage 4 — Cryptographic Consultation Escrow & Multi-Turn Assistant:* The litigant selects a consultation appointment slot. The backend generates a Razorpay Order and verifies the transaction using server-side HMAC SHA-256 signatures, while a multi-turn assistant maintains the last 10 dialogue turns for follow-up legal queries.

#pagebreak()

// =========================================================================
// PAGE 7: 5. KEY TECHNOLOGIES AND TOOLS
// =========================================================================

#text(size: 15.0pt, weight: "bold")[5. Key Technologies and Tools]

#v(4pt)
The technical implementation of Vakil Setu is built upon an enterprise-grade, open-source stack designed to ensure sub-second response times, zero server audio processing overhead, and robust fault-tolerance:

#v(2pt)
#table(
  columns: (2.2fr, 2.5fr, 4.3fr),
  align: (left, left, left),
  stroke: 0.5pt + rgb("#cbd5e1"),
  fill: (col, row) => if row == 0 { rgb("#f1f5f9") } else { none },
  table.header(
    [*Subsystem*], [*Technology / Stack*], [*Systems Role & Architectural Justification*]
  ),
  [Presentation Layer], [React 18 & Vite], [Fast Single Page Application (SPA) offering component modularity and optimized DOM hydration.],
  [Voice Ingestion / TTS], [W3C Web Speech API], [Browser-native STT and TTS engines; eliminates cloud audio upload latency and streaming costs.],
  [API Gateway & Server], [Node.js (v20+) & Express], [Asynchronous, non-blocking I/O event loop handling high-concurrency triage and webhook dispatch.],
  [Primary AI Engine], [Google Gemini 2.0 / LLM], [Frontier generative language model operating with strict JSON schema constraints for Indian law.],
  [Failover Engine], [Bilingual Regex Matcher], [Local deterministic pattern matcher providing sub-50ms failover triage during cloud API downtime.],
  [Persistence Layer], [MongoDB Atlas & Mongoose], [Document database indexing polymorphic advocate profiles, booking ledgers, and user sessions.],
  [Directory Crawler], [Cheerio & Fetch API], [Headless DOM and schema.org JSON-LD parser aggregating public advocate listings (LawRato).],
  [Financial Escrow], [Razorpay API & Crypto], [Payment order generation and server-side HMAC SHA-256 cryptographic signature verification.],
  [Session Persistence], [AppContext & LocalStorage], [Client-side session caching complying with DPDP Act 2023 by preventing unencrypted cloud data leaks.]
)

#v(8pt)
#text(size: 13.0pt, weight: "bold")[Hardware & Deployment Environment Specifications]

#v(4pt)
- *Host Operating System:* Cross-platform deployment on Linux (Ubuntu 22.04 LTS / Debian 12) or Windows 11.
- *Compute & Memory Resources:* Standard lightweight virtual machine (2 vCPUs, 4 GB RAM; zero dedicated GPU compute required).
- *Network Topology:* HTTPS / TLS 1.3 reverse-proxied via Nginx; stateless RESTful API communicating over standard TCP ports (5000/443).
- *Client System Requirements:* Any modern desktop or mobile browser supporting the W3C Web Speech API (Google Chrome 90+, Microsoft Edge 90+, Safari 14.1+).

#pagebreak()

// =========================================================================
// PAGE 8: 6. V.E.T.S JUSTIFICATION
// =========================================================================

#text(size: 15.0pt, weight: "bold")[6. V.E.T.S Justification]

#v(4pt)
The Vakil Setu project is systematically validated against the institutional V.E.T.S evaluation framework:

*V — Viability:* The project is thoroughly feasible within the standard 12-week academic timeline. Development utilizes commodity workstation hardware without requiring expensive multi-GPU clusters. All core technologies—including React 18, Node.js, the W3C Web Speech API, MongoDB Atlas, and the Razorpay Checkout SDK—are production-stable, well-documented, and freely accessible. The system architecture directly leverages the candidate's core competencies in full-stack web engineering, API integration, and asynchronous distributed systems.

*E — Engineering Depth:* Vakil Setu represents substantial systems engineering that goes far beyond trivial CRUD applications or basic AI wrappers. Key engineering challenges successfully solved include:
1. Client-side audio stream lifecycle management with real-time interim token rendering and BCP-47 locale tagging.
2. Dual-engine AI orchestration featuring structured JSON schema prompt enforcement and deterministic regex failover.
3. Autonomous web scraping and data normalization pipeline using Cheerio to crawl, deduplicate, and upsert public lawyer profiles.
4. Cryptographic payment escrow verification using server-side HMAC SHA-256 hash recalculation.
5. Client-side session state hydration and multi-turn sliding context preservation adhering to data minimization standards.

*T — Trend / Statutory Alignment:* The project directly aligns with contemporary 2026 technological and national policy priorities:
- Digital India and the Ministry of Law and Justice's Tele-Law mission to mainstream access to justice across Gram Panchayats.
- Modern Indic language computing initiatives (such as Bhashini) delivering multilingual public services.
- Full compliance with Section 29 of the Advocates Act, 1961, Rule 36 of Bar Council of India advertising norms, and the Digital Personal Data Protection (DPDP) Act, 2023.

*S — Social / Industry Impact:* In India, the lack of timely legal guidance exacerbates poverty, domestic distress, and unlawful exploitation. By providing free, hands-free bilingual legal triage in spoken Hindi and English, Vakil Setu empowers everyday citizens to understand their rights, preserves critical evidence before statutory limitation periods expire under the Limitation Act 1963, and connects underprivileged citizens to statutory free legal aid (NALSA/DLSA).

#pagebreak()

// =========================================================================
// PAGE 9: 7. EXPECTED OUTCOMES
// =========================================================================

#text(size: 15.0pt, weight: "bold")[7. Expected Outcomes]

#v(4pt)
Upon successful completion of the project, the following concrete deliverables will be produced:

1. *Vakil Setu Web Application Prototype:* A fully functional, responsive Single Page Application supporting voice dictation in Hindi and English, dynamic case analysis dashboards, advocate discovery, and appointment booking.
2. *Dual-Engine Legal Triage Service:* A fault-tolerant Node.js microservice (`/api/ai/triage`) providing structured legal domain categorization, urgency estimation, and plain-language action recommendations with sub-50ms regex failover.
3. *Autonomous Directory Ingestion Engine:* A production-ready Cheerio web scraping pipeline that extracts, normalizes, and upserts public lawyer profiles into MongoDB with domain taxonomy mapping.
4. *Cryptographic Escrow & Booking Gateway:* A secure transaction gateway supporting Razorpay order creation, HMAC SHA-256 signature verification, and automated regulatory refunds.
5. *Statutory Emergency SOS & Arrest Rights Hub:* A dedicated crisis intervention module providing direct 1-tap call triggers to `112`, `1091`, and `15100` (NALSA), alongside a verified checklist of statutory rights under Section 35 of the Bharatiya Nagarik Suraksha Sanhita (BNSS).
6. *Empirical Triage Evaluation Report:* A comprehensive experimental evaluation validating triage accuracy across 100 sample legal dispute narratives spanning Criminal, Civil, Family, and Property law.

#v(8pt)
#text(size: 13.0pt, weight: "bold")[Verification & Demonstration Setup]

#v(4pt)
The final prototype will be demonstrated in a live side-by-side browser and terminal environment evaluating 5 representative real-world legal dispute scenarios (landlord tenant dispute, cheque bounce notice, domestic violence complaint, unlawful police detention, and property title contest):
- *Baseline Scenario:* An unassisted litigant navigating a traditional English legal portal or generic chatbot, displaying high cognitive burden and legal hallucinations.
- *Vakil Setu Scenario:* Identical dispute dictated via Hindi voice, demonstrating real-time transcription, sub-3s statutory triage, spoken audio summary, verified advocate matching, and simulated Razorpay escrow booking.

#pagebreak()

// =========================================================================
// PAGE 10: 8. IMPLEMENTATION TIMELINE
// =========================================================================

#text(size: 15.0pt, weight: "bold")[8. Implementation Timeline]

#v(4pt)
The project development lifecycle is structured across five sequential phases spanning a 12-week schedule:

#v(2pt)
#table(
  columns: (1.5fr, 2.5fr, 4.5fr, 1.5fr),
  align: (center, left, left, center),
  stroke: 0.5pt + rgb("#cbd5e1"),
  fill: (col, row) => if row == 0 { rgb("#f1f5f9") } else { none },
  table.header(
    [*Phase*], [*Stage*], [*Key Activities & Deliverables*], [*Duration*]
  ),
  [Phase 1], [Requirement Study & Legal Taxonomy], [Cataloging Indian statutory domains (BNS, CrPC, CPC); formalizing JSON schema contracts and speech recognition pipeline specifications.], [Weeks 1–2],
  [Phase 2], [Core Gateway & Voice Pipeline], [Scaffolding React 18 SPA and Express API gateway; implementing Web Speech STT/TTS and BCP-47 locale tagging.], [Weeks 3–4],
  [Phase 3], [Dual-Engine Triage & Scraper], [Integrating Google Gemini 2.0 API; building local deterministic regex failover engine; developing Cheerio directory crawler.], [Weeks 5–7],
  [Phase 4], [Escrow Booking & Emergency Hub], [Connecting Razorpay Orders API; implementing HMAC SHA-256 signature verification; deploying Emergency SOS and arrest rights module.], [Weeks 8–9],
  [Phase 5], [Benchmarking & Documentation], [Executing triage accuracy evaluations across 100 legal test cases; compiling final IEEE SRS report; project defense.], [Weeks 10–12]
)

#v(8pt)
#text(size: 13.0pt, weight: "bold")[Milestone Review Criteria & Risk Mitigation Plan]

#v(4pt)
- *Milestone 1 (Week 4):* Client-side voice engine successfully captures spoken Hindi and English with live token streaming and under 200ms rendering latency.
- *Milestone 2 (Week 7):* Dual-engine triage pipeline achieves over 90% domain categorization precision with zero 500 errors during simulated cloud API dropouts.
- *Milestone 3 (Week 9):* Razorpay payment gateway successfully validates genuine signatures and rejects 100% of tampered transaction tokens; emergency SOS hub functions reliably.
- *Risk Mitigation Strategy:* If upstream LLM endpoints experience prolonged downtime or quota exhaustion, Vakil Setu automatically engages the local regex pattern-matching engine, guaranteeing uninterrupted citizen advisory without service degradation.

#pagebreak()

// =========================================================================
// PAGE 11: 9. REFERENCES
// =========================================================================

#text(size: 15.0pt, weight: "bold")[9. References]

#v(6pt)
#set text(size: 9.5pt)
#set par(leading: 0.55em)

[1] Law Commission of India, "Arrears and Backlog: Creating Additional Judicial (wo)manpower," Government of India, Report No. 245, 2014.

[2] Ministry of Law and Justice, Government of India, "The Advocates Act, 1961 (Act No. 25 of 1961)," New Delhi, 1961.

[3] Bar Council of India, "Rules Governing Advocates: Standards of Professional Conduct and Etiquette (Rule 36)," Bar Council of India, New Delhi, 2008.

[4] Department of Justice, Ministry of Law and Justice, "Tele-Law: Reaching the Unreached through Mainstreaming Legal Aid," Government of India, 2023.

[5] Ministry of Electronics and Information Technology (MeitY), "The Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023)," The Gazette of India, 2023.

[6] Law Commission of India, "Assessment of Statutory Frameworks on Assessment of Delays and Court Arrears," Government of India, Report No. 272, 2017.

[7] W3C Web Speech Working Group, "Web Speech API Specification," W3C Community Group Report, Aug. 2023. [Online: w3c.github.io/speech-api/]

[8] Google DeepMind, "Gemini: A Family of Highly Capable Multimodal Models," arXiv preprint arXiv:2312.11805, 2023.

[9] National Legal Services Authority (NALSA), "Handbook on Legal Aid and Lok Adalats under the Legal Services Authorities Act, 1987," New Delhi, 2022.

[10] Razorpay Developer Platform, "Payment Gateway Security and Cryptographic HMAC-SHA256 Signature Verification Standards," Developer Documentation, 2024.

[11] Supreme Court of India, "e-Courts Project: Phase III Vision Document," e-Committee, Supreme Court of India, New Delhi, 2023.

[12] K. D. Gaur, "A Textbook on the Indian Penal Code and Bharatiya Nyaya Sanhita," 8th ed., Universal Law Publishing, New Delhi, 2024.

[13] M. P. Jain, "Indian Constitutional Law: Access to Justice under Article 21 and Article 39A," 9th ed., LexisNexis Butterworths, 2023.

[14] V. N. Shukla, "Constitution of India: Directive Principles of State Policy and Free Legal Aid," 14th ed., Eastern Book Company, Lucknow, 2022.
"""

with open("vakil_setu_synopsis.typ", "w", encoding="utf-8") as f:
    f.write(typ_source)

print("vakil_setu_synopsis.typ successfully written.")

# Compile with typst
typst.compile("vakil_setu_synopsis.typ", output="Vakil_Setu_Synopsis.pdf")
print("Vakil_Setu_Synopsis.pdf compiled successfully via Typst!")

# Verify page count
doc = pymupdf.open("Vakil_Setu_Synopsis.pdf")
print("Total pages in generated Vakil_Setu_Synopsis.pdf:", len(doc))
for i in range(len(doc)):
    page = doc[i]
    imgs = page.get_images()
    print(f"Page {i+1}: {len(imgs)} image(s)")
