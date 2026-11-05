import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def add_callout(doc, text, title="STATUTORY NOTICE & COMPLIANCE DISCLAIMER"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    c = tbl.rows[0].cells[0]
    set_cell_background(c, "FEF3C7")
    set_cell_margins(c, 100, 100, 150, 150)
    p = c.paragraphs[0]
    r_t = p.add_run(f"{title}\n")
    r_t.font.bold = True
    r_t.font.size = Pt(10)
    r_t.font.color.rgb = RGBColor(180, 83, 9)
    r_b = p.add_run(text)
    r_b.font.size = Pt(9.5)
    r_b.font.color.rgb = RGBColor(120, 53, 15)
    doc.add_paragraph().space_after = Pt(6)

def build_srs_report():
    doc = Document()

    # Page Margins: 1 inch (72 pt) all around
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    COLOR_NAVY = RGBColor(12, 68, 124)       # Primary #0C447C
    COLOR_AMBER = RGBColor(180, 83, 9)       # Accent #B45309
    COLOR_DARK = RGBColor(15, 23, 42)        # Slate 900
    COLOR_MUTED = RGBColor(100, 116, 139)    # Slate 500
    COLOR_GREEN = RGBColor(22, 101, 52)      # Forest Green

    # =========================================================================
    # COVER PAGE
    # =========================================================================
    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_m = p_meta.add_run("SOFTWARE REQUIREMENTS SPECIFICATION (SRS) REPORT\nIEEE Std 830-1998 / ISO/IEC/IEEE 29148:2018 COMPLIANT")
    r_m.font.size = Pt(9.5)
    r_m.font.bold = True
    r_m.font.color.rgb = COLOR_AMBER
    p_meta.space_after = Pt(24)

    # Main Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_t = p_title.add_run("VAKIL SETU (वकील सेतु)")
    r_t.font.size = Pt(32)
    r_t.font.bold = True
    r_t.font.color.rgb = COLOR_NAVY
    p_title.space_after = Pt(8)

    # Subtitle
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_s = p_sub.add_run("Voice-First Bilingual Legal Triage & Advocate Discovery Platform\nUnder Indian Jurisprudence")
    r_s.font.size = Pt(14)
    r_s.font.bold = True
    r_s.font.color.rgb = COLOR_DARK
    p_sub.space_after = Pt(36)

    # Academic submission note
    p_subm = doc.add_paragraph()
    p_subm.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_subm = p_subm.add_run("A Capstone Project Report Submitted in Partial Fulfillment of the\nRequirements for the Degree of\nBachelor of Technology / Master of Technology\nin Computer Science & Engineering")
    r_subm.font.size = Pt(11)
    r_subm.font.italic = True
    r_subm.font.color.rgb = COLOR_MUTED
    p_subm.space_after = Pt(40)

    # Project Details Table (Authors & Guide)
    tbl_meta = doc.add_table(rows=6, cols=2)
    tbl_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    details = [
        ("Document Identifier", "SRS-VAKIL-SETU-2026-V1.0"),
        ("Project Lead / Candidate", "[Your Full Name] | Roll No: [Your Roll Number]"),
        ("Project Teammates", "[Teammate 2 Name] (Roll No: ...)\n[Teammate 3 Name] (Roll No: ...)\n[Teammate 4 Name] (Roll No: ...)"),
        ("Project Supervisor / Guide", "[Faculty Guide / Professor Name], [Designation]"),
        ("Academic Department", "Department of Computer Science & Engineering"),
        ("Institution & Academic Year", "[College / Institute / University Name] | Session 2025–2026")
    ]
    for idx, (label, val) in enumerate(details):
        r = tbl_meta.rows[idx]
        c0, c1 = r.cells[0], r.cells[1]
        c0.text = label
        c1.text = val
        c0.paragraphs[0].runs[0].font.bold = True
        c0.paragraphs[0].runs[0].font.size = Pt(9.5)
        c0.paragraphs[0].runs[0].font.color.rgb = COLOR_NAVY
        c1.paragraphs[0].runs[0].font.size = Pt(9.5)
        set_cell_background(c0, "F1F5F9")
        set_cell_background(c1, "F8FAFC")
        set_cell_margins(c0, 60, 60, 100, 100)
        set_cell_margins(c1, 60, 60, 100, 100)

    doc.add_page_break()

    # =========================================================================
    # PRELIMINARY PAGES: CERTIFICATE & DECLARATION
    # =========================================================================
    h_cert = doc.add_heading("Certificate of Approval", level=1)
    h_cert.runs[0].font.color.rgb = COLOR_NAVY

    p_cert = doc.add_paragraph(
        "This is to certify that the project entitled \"VAKIL SETU: Voice-First Bilingual Legal Triage & Advocate Discovery Platform\" "
        "is a bonafide record of work carried out by [Your Full Name] (Roll No: [Your Roll Number]) and teammates under my supervision "
        "and guidance in partial fulfillment of the requirements for the award of the Degree in Computer Science & Engineering. "
        "The software requirements and implementation concepts presented in this document have been reviewed and approved."
    )
    p_cert.runs[0].font.size = Pt(10.5)
    p_cert.space_after = Pt(40)

    # Signature lines
    tbl_sig = doc.add_table(rows=1, cols=2)
    tbl_sig.alignment = WD_TABLE_ALIGNMENT.CENTER
    s0 = tbl_sig.rows[0].cells[0]
    s1 = tbl_sig.rows[0].cells[1]
    s0.text = "______________________________\n[Faculty Guide / Mentor Name]\nProject Supervisor\nDepartment of CSE"
    s1.text = "______________________________\n[Head of Department]\nProfessor & Head\nDepartment of CSE"
    for c in tbl_sig.rows[0].cells:
        if c.paragraphs and c.paragraphs[0].runs:
            c.paragraphs[0].runs[0].font.size = Pt(9.5)
        set_cell_margins(c, 40, 40, 60, 60)

    doc.add_paragraph().space_after = Pt(24)

    h_decl = doc.add_heading("Candidate Declaration", level=1)
    h_decl.runs[0].font.color.rgb = COLOR_NAVY

    p_decl = doc.add_paragraph(
        "We hereby declare that this Software Requirements Specification (SRS) report entitled \"Vakil Setu\" represents our original work "
        "conducted under the guidance of our project mentor. The system features, architecture diagrams, and specification matrices described herein "
        "accurately reflect the current functional implementation and the planned roadmap of the platform, adhering to academic integrity standards."
    )
    p_decl.runs[0].font.size = Pt(10.5)
    p_decl.space_after = Pt(30)

    p_cand = doc.add_paragraph("Date: October 2026\nPlace: [City / Campus Name]\n\nCandidates: [Your Full Name] & Team")
    p_cand.runs[0].font.size = Pt(10)
    p_cand.runs[0].font.italic = True

    doc.add_page_break()

    # =========================================================================
    # EXECUTIVE ABSTRACT
    # =========================================================================
    h_abs = doc.add_heading("Executive Abstract", level=1)
    h_abs.runs[0].font.color.rgb = COLOR_NAVY

    p_abs1 = doc.add_paragraph(
        "Over 50 million cases remain pending across Indian courts. For the vast majority of Indian citizens, access to justice is impeded "
        "not by a lack of substantive law, but by severe first-mile friction: an inability to categorize their grievance into statutory legal domains "
        "(Criminal, Civil, Family, or Property), unfamiliarity with mandatory limitation deadlines, and linguistic exclusion caused by traditional "
        "legal platforms that rely exclusively on English and dense procedural jargon."
    )
    p_abs1.runs[0].font.size = Pt(10.5)

    p_abs2 = doc.add_paragraph(
        "Vakil Setu is an artificial intelligence-driven, voice-first legal triage platform built specifically for the Indian socio-legal landscape. "
        "The system allows citizens to speak their dispute naturally in Hindi, English, or mixed colloquial speech using in-browser speech recognition. "
        "An intelligent dual-engine triage pipeline analyzes the narrative under Indian statutory codes (BNS/IPC, CrPC, and CPC), classifies the domain, "
        "estimates urgency level, and generates actionable procedural guidance in plain language. For low-literacy citizens, the platform vocalizes the "
        "guidance back in regional accents via speech synthesis. The system algorithmically matches litigants with verified enrolled advocates and enables "
        "instant consultation booking backed by Razorpay cryptographic payment escrow."
    )
    p_abs2.runs[0].font.size = Pt(10.5)

    add_callout(
        doc,
        "Vakil Setu functions strictly as an informational triage bridge and professional directory service under Indian law. "
        "It does not practice law or dispense direct legal representation under Section 29 of the Advocates Act, 1961. "
        "All advocate profiles adhere to Rule 36 of the Bar Council of India (BCI) rules regarding non-promotional publication.",
        "STATUTORY COMPLIANCE & LEGAL NOTICE"
    )

    doc.add_page_break()

    # =========================================================================
    # CHAPTER 1: INTRODUCTION
    # =========================================================================
    h_ch1 = doc.add_heading("Chapter 1: Introduction", level=1)
    h_ch1.runs[0].font.color.rgb = COLOR_NAVY

    doc.add_heading("1.1 Background & Motivation", level=2)
    p = doc.add_paragraph(
        "Access to justice is recognized as a fundamental facet of Article 21 and Article 39A of the Constitution of India. "
        "However, the operational reality of India's legal ecosystem presents immense cognitive and systemic barriers to everyday litigants. "
        "When an ordinary citizen faces a legal dispute—such as a tenant eviction, workplace harassment, property boundary conflict, or cheque bounce—"
        "they rarely know where to begin. Most citizens cannot distinguish whether their problem requires an immediate police complaint (FIR), "
        "a civil suit for injunction, or a statutory legal notice. Compounding this challenge, traditional legal websites are English-heavy, text-centric, "
        "and packed with Latin maxims and complex statutory citations."
    )
    p.runs[0].font.size = Pt(10)

    doc.add_heading("1.2 The First-Mile Dilemma", level=2)
    p = doc.add_paragraph(
        "The \"First-Mile Dilemma\" encompasses four critical structural failures:\n"
        "1. Domain Ambiguity: Inability to determine whether the dispute is Criminal, Civil, Family, or Property law.\n"
        "2. Statutory Limitation Expiry: Inability to gauge time-sensitive deadlines (e.g., the 30-day notice window for Cheque Bounce under Section 138 NI Act).\n"
        "3. Linguistic Exclusion: Exclusion of over 70% of the population who are comfortable speaking in Hindi or regional dialects rather than typing legal English.\n"
        "4. Trust Deficit & Touts: Dependency on unregulated middlemen and court touts charging arbitrary consultation fees without specialization guarantees."
    )
    p.runs[0].font.size = Pt(10)

    doc.add_heading("1.3 Project Objectives", level=2)
    p = doc.add_paragraph(
        "The core objectives of Vakil Setu are:\n"
        "• To provide an accessible, hands-free voice-first interface supporting Hindi and English dictation with zero server audio latency.\n"
        "• To engineer a dual-engine AI legal triage pipeline that categorizes legal domains and procedural urgency under Indian law.\n"
        "• To guarantee zero-downtime availability through a deterministic rule-based regex fallback engine.\n"
        "• To provide speech synthesis audio feedback for semi-literate citizens.\n"
        "• To implement specialization-based advocate discovery and secure consultation booking via Razorpay HMAC SHA-256 escrow."
    )
    p.runs[0].font.size = Pt(10)

    doc.add_heading("1.4 Definitions and Acronyms", level=2)
    def_data = [
        ("AIBE", "All India Bar Examination — Mandatory exam conducted by BCI for advocate certification."),
        ("BCI", "Bar Council of India — Statutory body regulating legal practice under the Advocates Act, 1961."),
        ("BNS / BNSS", "Bharatiya Nyaya Sanhita / Bharatiya Nagarik Suraksha Sanhita — Modern Indian criminal codes."),
        ("CNR", "Case Number Record — Unique 16-digit alphanumeric case identifier used in Indian e-Courts."),
        ("COP", "Certificate of Practice — Official certificate granting lifelong practice rights to enrolled advocates."),
        ("CPC / CrPC", "Code of Civil Procedure / Code of Criminal Procedure."),
        ("DLSA / NALSA", "District / National Legal Services Authority — Statutory bodies providing free legal aid."),
        ("HMAC", "Hash-based Message Authentication Code — Cryptographic signature verification using SHA-256."),
        ("LLM", "Large Language Model — Generative artificial intelligence model used for triage parsing."),
        ("SPA", "Single Page Application — Web architecture using React 18 and Vite for dynamic rendering."),
        ("STT / TTS", "Speech-to-Text (Transcription) / Text-to-Speech (Synthesis).")
    ]
    tbl_def = doc.add_table(rows=len(def_data)+1, cols=2)
    tbl_def.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_def.rows[0].cells[0].text = "Term / Acronym"
    tbl_def.rows[0].cells[1].text = "Definition & Indian Legal Context"
    for idx, c in enumerate(tbl_def.rows[0].cells):
        c.paragraphs[0].runs[0].font.bold = True
        c.paragraphs[0].runs[0].font.size = Pt(9.5)
        c.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        set_cell_background(c, "0C447C")
        set_cell_margins(c, 60, 60, 100, 100)

    for i, (k, v) in enumerate(def_data, start=1):
        r = tbl_def.rows[i]
        r.cells[0].text = k
        r.cells[1].text = v
        r.cells[0].paragraphs[0].runs[0].font.bold = True
        for c_idx in range(2):
            cell = r.cells[c_idx]
            cell.paragraphs[0].runs[0].font.size = Pt(8.5)
            set_cell_background(cell, "FFFFFF" if i % 2 == 1 else "F8FAFC")
            set_cell_margins(cell, 50, 50, 80, 80)

    doc.add_page_break()

    # =========================================================================
    # CHAPTER 2: OVERALL SYSTEM DESCRIPTION & ARCHITECTURE
    # =========================================================================
    h_ch2 = doc.add_heading("Chapter 2: Overall System Description & Architecture", level=1)
    h_ch2.runs[0].font.color.rgb = COLOR_NAVY

    doc.add_heading("2.1 Product Perspective", level=2)
    p = doc.add_paragraph(
        "Vakil Setu is architected as an event-driven, decoupled client-server web platform. The frontend operates as a responsive "
        "Single Page Application built with React 18 and Vite. It directly interfaces with the client browser's native W3C Web Speech API, "
        "ensuring real-time transcription with zero network audio streaming overhead. The backend application server, built with Node.js and Express, "
        "acts as a stateless API gateway orchestrating triage requests, advocate matching, scraper ingestion, and payment escrow."
    )
    p.runs[0].font.size = Pt(10)

    doc.add_heading("2.2 Five-Tier System Architecture", level=2)
    tiers = [
        ("Tier 1: Client Presentation Layer", "React 18 SPA (Vite), Web Speech Recognition (STT), Web Speech Synthesis (TTS), AppContext state management, LocalStorage session persistence."),
        ("Tier 2: API Gateway & Application Server", "Node.js (v20+ LTS) with Express.js REST API (/api/ai, /api/advocates, /api/bookings, /api/payments), CORS middleware, centralized error handlers."),
        ("Tier 3: AI & Intelligence Layer", "Dual-Engine Pipeline: Primary Google Gemini 2.0 / Gateway LLM with strict JSON schema enforcement; Secondary deterministic rule-based regex fallback engine guaranteeing 100% uptime."),
        ("Tier 4: Data Persistence & Ingestion Layer", "MongoDB Atlas managed cluster with Mongoose ODM (Advocate, Booking, User schemas); Cheerio-based web scraper crawling public advocate listings (LawRato)."),
        ("Tier 5: Transaction & Security Layer", "Razorpay Payment Gateway with server-side HMAC SHA-256 cryptographic signature recalculation and verification.")
    ]
    for t_name, t_desc in tiers:
        p_t = doc.add_paragraph()
        r1 = p_t.add_run(f"• {t_name}: ")
        r1.font.bold = True
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = COLOR_NAVY
        r2 = p_t.add_run(t_desc)
        r2.font.size = Pt(9.5)
        p_t.space_after = Pt(4)

    doc.add_heading("2.3 User Classes & Personas", level=2)
    users = [
        ("Citizen / Litigant", "Requires simple spoken interaction in Hindi or English, plain-language legal clarity, estimated procedural urgency, and transparent advocate booking."),
        ("Advocate / Legal Professional", "Requires pre-qualified, domain-relevant case leads matching practice specialization, structured client briefs, and guaranteed consultation fee escrow."),
        ("System Administrator", "Requires advocate credential verification (Bar Council Enrolment, AIBE COP), regulatory suspension management, and system availability monitoring.")
    ]
    for u_title, u_desc in users:
        p_u = doc.add_paragraph()
        r1 = p_u.add_run(f"• {u_title}: ")
        r1.font.bold = True
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = COLOR_AMBER
        r2 = p_u.add_run(u_desc)
        r2.font.size = Pt(9.5)
        p_u.space_after = Pt(4)

    doc.add_page_break()

    # =========================================================================
    # CHAPTER 3: FEATURE MATRIX & IMPLEMENTATION STATUS
    # =========================================================================
    h_ch3 = doc.add_heading("Chapter 3: Feature Matrix & Implementation Status", level=1)
    h_ch3.runs[0].font.color.rgb = COLOR_NAVY

    p = doc.add_paragraph(
        "The following matrix outlines the complete inventory of features across the current working MVP (Phase 0) "
        "and the planned engineering roadmap (Phases 1 through 4):"
    )
    p.runs[0].font.size = Pt(10)

    feat_matrix = [
        ("Voice Speech-to-Text (STT)", "Client-side Web Speech recognition in Hindi and English", "IMPLEMENTED", "Phase 0 (MVP)"),
        ("Voice Speech Synthesis (TTS)", "Spoken audio summary in Devanagari Hindi or English", "IMPLEMENTED", "Phase 0 (MVP)"),
        ("AI Legal Triage Engine", "Classification under Indian Law (Domain, Urgency, Actions)", "IMPLEMENTED", "Phase 0 (MVP)"),
        ("Offline Regex Fallback Engine", "Local rule-based pattern matcher for zero-downtime failover", "IMPLEMENTED", "Phase 0 (MVP)"),
        ("Advocate Matching Query", "Domain-based matching in MongoDB sorted by rating descending", "IMPLEMENTED", "Phase 0 (MVP)"),
        ("Cheerio Directory Scraper", "Automated crawler parsing LawRato directory listings into MongoDB", "IMPLEMENTED", "Phase 0 (MVP)"),
        ("Razorpay Escrow & Verify", "Order generation and server-side HMAC SHA-256 signature verify", "IMPLEMENTED", "Phase 0 (MVP)"),
        ("Client Session Cache", "LocalStorage multi-turn conversation and triage state memory", "IMPLEMENTED", "Phase 0 (MVP)"),
        ("Dual Homepage Input", "Direct text box input on homepage alongside mic for desktop fallback", "IN PROGRESS", "Phase 1"),
        ("Emergency SOS Hub", "Real 1-tap call triggers (112, 1091, 15100 NALSA) & arrest rights card", "IN PROGRESS", "Phase 1"),
        ("Advocate Profile Modal", "Detailed modal displaying Bar Council credentials, courts, and fixed slots", "IN PROGRESS", "Phase 1"),
        ("Bar Council Verification", "State Bar Enrolment (e.g. D/1420/2019) & AIBE COP verification", "PLANNED", "Phase 2"),
        ("My Bookings Dashboard", "Client portal to view upcoming appointments, status, and PDF slips", "PLANNED", "Phase 2"),
        ("Regulatory Suspension Hook", "Automated query quarantine and Razorpay refund trigger for banned lawyers", "PLANNED", "Phase 2"),
        ("Legal Document OCR Parser", "Real PDF/Image file upload and text extraction for FIRs and notices", "PLANNED", "Phase 3"),
        ("Limitation Period Tracker", "Statutory countdown tracking under Indian Limitation Act, 1963", "PLANNED", "Phase 3"),
        ("Free Legal Aid Checker", "NALSA / DLSA eligibility evaluator under Legal Services Authorities Act", "PLANNED", "Phase 3"),
        ("Indic 8-Language Voice", "Expanding speech recognition to Bengali, Marathi, Tamil, Telugu, etc.", "ROADMAP", "Phase 4"),
        ("e-Courts CNR Integration", "Tracking court causes and next hearing dates via 16-digit CNR numbers", "ROADMAP", "Phase 4"),
        ("WebRTC Video Consult", "Built-in peer-to-peer encrypted video calling and screen sharing", "ROADMAP", "Phase 4")
    ]

    tbl_fm = doc.add_table(rows=len(feat_matrix)+1, cols=4)
    tbl_fm.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ["Feature Module", "Functional Scope", "Status", "Milestone"]
    for idx, h in enumerate(headers):
        c = tbl_fm.rows[0].cells[idx]
        c.text = h
        c.paragraphs[0].runs[0].font.bold = True
        c.paragraphs[0].runs[0].font.size = Pt(9.5)
        c.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        set_cell_background(c, "0C447C")
        set_cell_margins(c, 70, 70, 100, 100)

    for row_idx, (f_name, f_scope, f_stat, f_phase) in enumerate(feat_matrix, start=1):
        row = tbl_fm.rows[row_idx]
        row.cells[0].text = f_name
        row.cells[1].text = f_scope
        row.cells[2].text = f_stat
        row.cells[3].text = f_phase
        
        bg = "FFFFFF" if row_idx % 2 == 1 else "F8FAFC"
        for c_idx in range(4):
            cell = row.cells[c_idx]
            cell.paragraphs[0].runs[0].font.size = Pt(8.5)
            set_cell_background(cell, bg)
            set_cell_margins(cell, 50, 50, 70, 70)
        
        r_stat = row.cells[2].paragraphs[0].runs[0]
        r_stat.font.bold = True
        if f_stat == "IMPLEMENTED":
            r_stat.font.color.rgb = COLOR_GREEN
        elif f_stat == "IN PROGRESS":
            r_stat.font.color.rgb = COLOR_AMBER
        else:
            r_stat.font.color.rgb = COLOR_NAVY

    doc.add_page_break()

    # =========================================================================
    # CHAPTER 4: SPECIFIC FUNCTIONAL REQUIREMENTS
    # =========================================================================
    h_ch4 = doc.add_heading("Chapter 4: Specific Functional Requirements", level=1)
    h_ch4.runs[0].font.color.rgb = COLOR_NAVY

    doc.add_heading("4.1 Module 1: Voice & Conversational Input Subsystem", level=2)
    fr_m1 = [
        ("FR-1.1: Hands-Free Voice Capture", "The system SHALL capture spoken audio in real time using the browser's native webkitSpeechRecognition API without requiring third-party audio upload bandwidth."),
        ("FR-1.2: Bilingual Locale Tagging", "The system SHALL support hi-IN (Hindi) and en-IN (Indian English) recognition with dynamic BCP-47 locale tagging."),
        ("FR-1.3: Real-Time Interim Streaming", "The system SHALL stream intermediate transcription tokens into a visual draft bubble prior to submission."),
        ("FR-1.4: Direct Text Input Fallback", "The system SHALL provide a manual text entry area on all triage interfaces for users on desktop PCs or without microphone permissions."),
        ("FR-1.5: Accessibility Speech Synthesis", "The system SHALL vocalize generated legal summaries and immediate action items aloud via window.speechSynthesis in regional accents.")
    ]
    for code, desc in fr_m1:
        p = doc.add_paragraph()
        r1 = p.add_run(f"[{code}] ")
        r1.font.bold = True
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = COLOR_AMBER
        r2 = p.add_run(desc)
        r2.font.size = Pt(9.5)
        p.space_after = Pt(4)

    doc.add_heading("4.2 Module 2: Legal Triage & AI Intelligence Subsystem", level=2)
    fr_m2 = [
        ("FR-2.1: Canonical Domain Classification", "The system SHALL categorize grievances into exactly one canonical domain: criminal, civil, family, or property under Indian law."),
        ("FR-2.2: Statutory Urgency Scoring", "The system SHALL evaluate procedural urgency into low, medium, high, or emergency based on statutory limitation deadlines and threats of arrest or violence."),
        ("FR-2.3: Strict JSON Schema Enforcement", "The AI service SHALL constrain LLM outputs strictly to a valid JSON contract containing domain, urgency, summary, and actions."),
        ("FR-2.4: Deterministic Failover Engine", "If upstream LLM endpoints return HTTP 429 (rate-limit) or HTTP 503 (timeout), the system SHALL route the narrative through local regex heuristics without throwing an HTTP 500 error."),
        ("FR-2.5: Multi-Turn Conversation Memory", "Follow-up conversational queries SHALL retain the preceding 10 dialogue turns to provide contextual legal assistance.")
    ]
    for code, desc in fr_m2:
        p = doc.add_paragraph()
        r1 = p.add_run(f"[{code}] ")
        r1.font.bold = True
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = COLOR_AMBER
        r2 = p.add_run(desc)
        r2.font.size = Pt(9.5)
        p.space_after = Pt(4)

    doc.add_heading("4.3 Module 3: Advocate Discovery & Directory Subsystem", level=2)
    fr_m3 = [
        ("FR-3.1: Algorithmic Domain Matching", "The system SHALL query MongoDB for active advocates matching the classified domain and availability, sorted by rating descending."),
        ("FR-3.2: Objective Credential Presentation", "Advocate profiles SHALL display verified years of practice, court practice areas, languages, and Bar Council verification shields in compliance with BCI Rule 36."),
        ("FR-3.3: Directory Ingestion Crawler", "The scraper script (scrapeAdvocates.js) SHALL crawl public advocate registries, parse embedded schema.org JSON-LD and DOM cards, and upsert records into MongoDB."),
        ("FR-3.4: Regulatory Suspension Filter", "The matching query SHALL exclude any advocate marked with isSuspended: true or verificationStatus: 'suspended'.")
    ]
    for code, desc in fr_m3:
        p = doc.add_paragraph()
        r1 = p.add_run(f"[{code}] ")
        r1.font.bold = True
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = COLOR_AMBER
        r2 = p.add_run(desc)
        r2.font.size = Pt(9.5)
        p.space_after = Pt(4)

    doc.add_heading("4.4 Module 4: Consultation Booking & Payment Escrow Subsystem", level=2)
    fr_m4 = [
        ("FR-4.1: Consultation Scheduling & Escrow", "Litigants SHALL schedule consultation appointments with server-side Razorpay order generation and HMAC SHA-256 signature verification."),
        ("FR-4.2: Cryptographic Signature Verification", "The backend SHALL recalculate and verify the payment signature using crypto.createHmac('sha256') before confirming any booking."),
        ("FR-4.3: Automated Regulatory Refund", "In the event of advocate unavailability or regulatory suspension, the system SHALL trigger an automated refund via Razorpay Refund API.")
    ]
    for code, desc in fr_m4:
        p = doc.add_paragraph()
        r1 = p.add_run(f"[{code}] ")
        r1.font.bold = True
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = COLOR_AMBER
        r2 = p.add_run(desc)
        r2.font.size = Pt(9.5)
        p.space_after = Pt(4)

    doc.add_heading("4.5 Module 5: Emergency Legal SOS & Public Aid Subsystem", level=2)
    fr_m5 = [
        ("FR-5.1: Instant Legal SOS Hub", "The emergency workflow SHALL render direct 1-tap call triggers to 112 (Police), 1091 (Women Helpline), and 15100 (NALSA Free Legal Aid)."),
        ("FR-5.2: Statutory Arrest Rights Checklist", "During criminal emergencies, the system SHALL display a verified checklist of rights under Section 35 of the Bharatiya Nagarik Suraksha Sanhita (BNSS) / Section 41 CrPC."),
        ("FR-5.3: Priority Advocate Routing", "Acute emergencies SHALL automatically route the user to the highest-rated active advocate available on duty.")
    ]
    for code, desc in fr_m5:
        p = doc.add_paragraph()
        r1 = p.add_run(f"[{code}] ")
        r1.font.bold = True
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = COLOR_AMBER
        r2 = p.add_run(desc)
        r2.font.size = Pt(9.5)
        p.space_after = Pt(4)

    doc.add_page_break()

    # =========================================================================
    # CHAPTER 5: NON-FUNCTIONAL REQUIREMENTS
    # =========================================================================
    h_ch5 = doc.add_heading("Chapter 5: Non-Functional Requirements (NFR)", level=1)
    h_ch5.runs[0].font.color.rgb = COLOR_NAVY

    nfr_items = [
        ("NFR-PERF-1: Speech Recognition Latency", "Interim speech-to-text tokens SHALL render within 200 milliseconds on standard client devices."),
        ("NFR-PERF-2: Triage Response Round-Trip", "End-to-end AI triage processing round-trip SHALL complete within 3.5 seconds under standard 4G/broadband connectivity."),
        ("NFR-REL-1: Failover Execution Speed", "Deterministic regex failover execution SHALL complete within 50 milliseconds upon upstream API timeout detection."),
        ("NFR-REL-2: System Availability Target", "The platform SHALL maintain an operational availability target of 99.9% uptime."),
        ("NFR-SEC-1: Cryptographic Financial Integrity", "All financial transactions SHALL be validated using server-side HMAC SHA-256 signature verification; client-reported payment flags SHALL be rejected."),
        ("NFR-SEC-2: Privacy & DPDP Act Compliance", "Sensitive case descriptions SHALL remain stored in client LocalStorage; no unencrypted personal litigation narratives SHALL be permanently retained in the database."),
        ("NFR-USA-1: Accessibility & WCAG 2.1 AA", "Every primary legal summary text SHALL have an auditory speech synthesis alternative with a minimum 4.5:1 visual contrast ratio."),
        ("NFR-REG-1: Advocates Act 1961 Compliance", "The application SHALL display prominent disclaimers affirming it is an informational triage bridge, not a practicing advocate."),
        ("NFR-REG-2: BCI Rule 36 Adherence", "Advocate directory listings SHALL remain non-promotional, objective, and neutral.")
    ]
    for code, desc in nfr_items:
        p = doc.add_paragraph()
        r1 = p.add_run(f"[{code}] ")
        r1.font.bold = True
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = COLOR_NAVY
        r2 = p.add_run(desc)
        r2.font.size = Pt(9.5)
        p.space_after = Pt(4)

    doc.add_page_break()

    # =========================================================================
    # CHAPTER 6: DATA MODELS & SCHEMA SPECIFICATIONS
    # =========================================================================
    h_ch6 = doc.add_heading("Chapter 6: Data Models & Schema Specifications", level=1)
    h_ch6.runs[0].font.color.rgb = COLOR_NAVY

    doc.add_heading("6.1 Advocate Data Model (Advocate.js)", level=2)
    p_code1 = doc.add_paragraph()
    r = p_code1.add_run(
        "{\n"
        "  name: { type: String, required: true },\n"
        "  expertise: { type: [String], required: true, index: true }, // ['criminal', 'civil', ...]\n"
        "  rating: { type: Number, default: 0, index: -1 },\n"
        "  experienceYears: { type: Number, default: 0 },\n"
        "  availability: { type: Boolean, default: true },\n"
        "  languages: { type: [String], default: ['English', 'Hindi'] },\n"
        "  // Regulatory Credentials (Phases 1-2)\n"
        "  barCouncilState: { type: String },\n"
        "  enrolmentNumber: { type: String, unique: true, sparse: true }, // e.g. 'D/1420/2019'\n"
        "  copNumber: { type: String }, // AIBE Certificate of Practice\n"
        "  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected', 'suspended'], default: 'verified' },\n"
        "  isSuspended: { type: Boolean, default: false }\n"
        "}"
    )
    r.font.name = "Consolas"
    r.font.size = Pt(8.5)
    p_code1.paragraph_format.left_indent = Inches(0.4)

    doc.add_heading("6.2 Booking Data Model (Booking.js)", level=2)
    p_code2 = doc.add_paragraph()
    r = p_code2.add_run(
        "{\n"
        "  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },\n"
        "  advocateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Advocate', required: true },\n"
        "  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },\n"
        "  scheduledAt: { type: Date, required: true },\n"
        "  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },\n"
        "  amount: { type: Number, default: 500 },\n"
        "  razorpayOrderId: { type: String },\n"
        "  razorpayPaymentId: { type: String },\n"
        "  isEmergency: { type: Boolean, default: false }\n"
        "}"
    )
    r.font.name = "Consolas"
    r.font.size = Pt(8.5)
    p_code2.paragraph_format.left_indent = Inches(0.4)

    doc.add_heading("6.3 AI Triage Response JSON Contract", level=2)
    p_code3 = doc.add_paragraph()
    r = p_code3.add_run(
        "{\n"
        "  \"domain\": \"criminal\",\n"
        "  \"domain_label\": \"आपराधिक कानून\",\n"
        "  \"urgency\": \"high\",\n"
        "  \"response_language\": \"hi\",\n"
        "  \"summary\": \"शिकायतकर्ता के अनुसार चेक अनादर और पुलिस नोटिस प्राप्त हुआ है।\",\n"
        "  \"actions\": [\n"
        "    \"चेक अनादर का बैंक मेमो सुरक्षित रखें।\",\n"
        "    \"नोटिस प्राप्ति की तारीख से 15 दिनों के भीतर लिखित उत्तर दें।\",\n"
        "    \"अपने क्षेत्र के योग्य आपराधिक/चेक बाउंस वकील से तुरंत संपर्क करें।\"\n"
        "  ]\n"
        "}"
    )
    r.font.name = "Consolas"
    r.font.size = Pt(8.5)
    p_code3.paragraph_format.left_indent = Inches(0.4)

    doc.add_page_break()

    # =========================================================================
    # CHAPTER 7: TRACEABILITY MATRIX & REFERENCES
    # =========================================================================
    h_ch7 = doc.add_heading("Chapter 7: Traceability Matrix & References", level=1)
    h_ch7.runs[0].font.color.rgb = COLOR_NAVY

    doc.add_heading("7.1 Verification & Validation Matrix", level=2)
    vm_data = [
        ("FR-1.1 / FR-1.2", "Browser Functional Test", "Spoken Hindi/English renders transcribed text accurately within 200ms."),
        ("FR-2.1 / FR-2.3", "Automated API Test (/api/ai/classify)", "Output conforms 100% to JSON contract schema."),
        ("FR-2.4", "Simulated Outage Test", "Disconnecting network triggers regex fallback within 50ms with HTTP 200."),
        ("FR-3.1 / FR-3.2", "MongoDB Integration Test", "Returned advocates strictly match classified domain and sort by rating descending."),
        ("FR-4.2 / NFR-SEC-1", "Cryptographic Signature Test", "Manipulated Razorpay signatures return HTTP 400 rejection; valid HMAC passes."),
        ("NFR-PERF-2", "Load & Performance Benchmark", "Mean response time for /api/ai/triage < 3.5 seconds.")
    ]
    tbl_vm = doc.add_table(rows=len(vm_data)+1, cols=3)
    tbl_vm.alignment = WD_TABLE_ALIGNMENT.CENTER
    vm_headers = ["Requirement Index", "Verification Method", "Pass / Acceptance Criteria"]
    for idx, h in enumerate(vm_headers):
        c = tbl_vm.rows[0].cells[idx]
        c.text = h
        c.paragraphs[0].runs[0].font.bold = True
        c.paragraphs[0].runs[0].font.size = Pt(9.5)
        c.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        set_cell_background(c, "0C447C")
        set_cell_margins(c, 60, 60, 100, 100)

    for i, (req, meth, crit) in enumerate(vm_data, start=1):
        r = tbl_vm.rows[i]
        r.cells[0].text = req
        r.cells[1].text = meth
        r.cells[2].text = crit
        r.cells[0].paragraphs[0].runs[0].font.bold = True
        for c_idx in range(3):
            cell = r.cells[c_idx]
            cell.paragraphs[0].runs[0].font.size = Pt(8.5)
            set_cell_background(cell, "FFFFFF" if i % 2 == 1 else "F8FAFC")
            set_cell_margins(cell, 50, 50, 80, 80)

    doc.add_heading("7.2 Formal References", level=2)
    refs = [
        ("IEEE Computer Society", "IEEE Std 830-1998: IEEE Recommended Practice for Software Requirements Specifications."),
        ("Law Commission of India", "Report No. 245 & 272 on Access to Justice, Court Arrears, and Institutional Legal Aid."),
        ("Ministry of Law and Justice, Govt. of India", "The Advocates Act, 1961 (Act No. 25 of 1961) & Bar Council of India Rules."),
        ("Department of Justice, Govt. of India", "Tele-Law Programme: Mainstreaming Legal Aid across Gram Panchayats."),
        ("Ministry of Electronics and Information Technology (MeitY)", "The Digital Personal Data Protection (DPDP) Act, 2023."),
        ("W3C Community Group", "W3C Web Speech API Specification (webkitSpeechRecognition & window.speechSynthesis)."),
        ("Razorpay Developer Platform", "Cryptographic HMAC SHA-256 API Signature Verification & Security Guidelines.")
    ]
    for author, citation in refs:
        p_r = doc.add_paragraph()
        r1 = p_r.add_run(f"[{author}] ")
        r1.font.bold = True
        r1.font.size = Pt(9)
        r1.font.color.rgb = COLOR_NAVY
        r2 = p_r.add_run(citation)
        r2.font.size = Pt(9)
        p_r.space_after = Pt(3)

    # Save Document
    report_path = os.path.join(os.getcwd(), "Vakil_Setu_SRS_Report.docx")
    doc.save(report_path)
    print(f"Full Project SRS Report successfully generated at: {report_path}")

if __name__ == "__main__":
    build_srs_report()
