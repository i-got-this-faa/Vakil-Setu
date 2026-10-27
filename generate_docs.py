import os
import subprocess
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

def create_docx():
    doc = Document()

    # Set Margins (1 inch all around)
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    # Styles & Colors
    # Primary: Deep Navy (#0C447C)
    # Secondary: Warm Amber (#B45309)
    # Slate Text: #1E293B

    COLOR_NAVY = RGBColor(12, 68, 124)
    COLOR_AMBER = RGBColor(180, 83, 9)
    COLOR_SLATE = RGBColor(30, 41, 59)
    COLOR_MUTED = RGBColor(100, 116, 139)

    # Document Header / Cover Meta
    p_meta = doc.add_paragraph()
    r_meta = p_meta.add_run("IEEE Std 830-1998 / ISO/IEC/IEEE 29148:2018 COMPLIANT SPECIFICATION")
    r_meta.font.size = Pt(9)
    r_meta.font.bold = True
    r_meta.font.color.rgb = COLOR_AMBER

    # Title
    p_title = doc.add_paragraph()
    r_title = p_title.add_run("Software Requirements Specification (SRS)\nfor Vakil Setu (वकील सेतु)")
    r_title.font.size = Pt(24)
    r_title.font.bold = True
    r_title.font.color.rgb = COLOR_NAVY
    p_title.space_after = Pt(4)

    # Subtitle
    p_sub = doc.add_paragraph()
    r_sub = p_sub.add_run("Voice-First Bilingual Legal Triage & Advocate Discovery Platform under Indian Jurisprudence")
    r_sub.font.size = Pt(13)
    r_sub.font.color.rgb = COLOR_MUTED
    p_sub.space_after = Pt(16)

    # Meta Table (Doc Control)
    meta_table = doc.add_table(rows=5, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_data = [
        ("Document Identifier", "SRS-VAKIL-SETU-2026-V1.0"),
        ("Project Phase / Scope", "MVP Phase 0 (Baseline) & Target Architecture (Phases 1–4)"),
        ("Author / Student Lead", "[Your Full Name] | Roll No: [Your Roll Number]"),
        ("Project Supervisor", "[Faculty Guide / Professor Name]"),
        ("Department & College", "Department of Computer Science & Engineering, [College Name]")
    ]
    for row_idx, (k, v) in enumerate(meta_data):
        row = meta_table.rows[row_idx]
        c0, c1 = row.cells[0], row.cells[1]
        c0.text = k
        c1.text = v
        c0.paragraphs[0].runs[0].font.bold = True
        c0.paragraphs[0].runs[0].font.size = Pt(9.5)
        c0.paragraphs[0].runs[0].font.color.rgb = COLOR_NAVY
        c1.paragraphs[0].runs[0].font.size = Pt(9.5)
        set_cell_background(c0, "F1F5F9")
        set_cell_background(c1, "F8FAFC")
        set_cell_margins(c0, 60, 60, 100, 100)
        set_cell_margins(c1, 60, 60, 100, 100)

    doc.add_paragraph().space_after = Pt(12)

    # Section 1: Introduction
    h1 = doc.add_heading("1. Introduction", level=1)
    h1.runs[0].font.color.rgb = COLOR_NAVY

    doc.add_heading("1.1 Purpose", level=2)
    p = doc.add_paragraph(
        "This document provides the formal software requirements specification for Vakil Setu, an AI-powered, "
        "voice-first legal triage and advocate consultation booking platform. It defines both the currently implemented "
        "functionality in the working prototype (Phase 0) and the engineering requirements for planned future milestones (Phases 1 through 4)."
    )
    p.runs[0].font.size = Pt(10.5)

    doc.add_heading("1.2 Project Scope & Regulatory Disclaimer", level=2)
    p = doc.add_paragraph(
        "Vakil Setu is an informational triage bridge and digital directory service operating under Indian legal frameworks. "
        "The software accepts spoken Hindi or English descriptions of disputes, classifies the grievance into canonical legal domains "
        "(Criminal, Civil, Family, Property), assesses statutory urgency, vocalizes plain-language procedural advice, matches users "
        "with verified enrolled advocates, and coordinates appointment scheduling with cryptographic payment verification."
    )
    p.runs[0].font.size = Pt(10.5)

    # Statutory Callout Box
    tbl_callout = doc.add_table(rows=1, cols=1)
    tbl_callout.alignment = WD_TABLE_ALIGNMENT.CENTER
    c = tbl_callout.rows[0].cells[0]
    set_cell_background(c, "FEF3C7")
    set_cell_margins(c, 80, 80, 150, 150)
    p_c = c.paragraphs[0]
    r_c = p_c.add_run(
        "STATUTORY COMPLIANCE DISCLAIMER: Vakil Setu is explicitly an informational triage tool and not an authorized legal "
        "practitioner under Section 29 of the Advocates Act, 1961. The platform does not dispense legal representation or draft court "
        "pleadings. All lawyer directory listings are strictly factual and non-promotional, adhering to Rule 36 of the Bar Council of India (BCI) rules."
    )
    r_c.font.size = Pt(9.5)
    r_c.font.bold = True
    r_c.font.color.rgb = COLOR_AMBER

    doc.add_paragraph().space_after = Pt(8)

    # Section 2: Feature Status Matrix
    h2 = doc.add_heading("2. Feature Status Matrix (Implemented vs. Planned)", level=1)
    h2.runs[0].font.color.rgb = COLOR_NAVY

    p_fsm = doc.add_paragraph(
        "The following matrix outlines the functional status of each system component across the current MVP and future engineering phases:"
    )
    p_fsm.runs[0].font.size = Pt(10.5)

    features = [
        ("Voice Input (STT)", "In-browser speech recognition in Hindi & English (Web Speech API)", "IMPLEMENTED", "Phase 0"),
        ("Voice Output (TTS)", "Speech synthesis reading triage summaries aloud (window.speechSynthesis)", "IMPLEMENTED", "Phase 0"),
        ("AI Legal Triage", "Dual-engine issue classification under Indian law (Domain, Urgency, Actions)", "IMPLEMENTED", "Phase 0"),
        ("Offline Failover", "Local rule-based regex engine for zero-downtime offline classification", "IMPLEMENTED", "Phase 0"),
        ("Advocate Matching", "Querying MongoDB for domain-matched available advocates sorted by rating", "IMPLEMENTED", "Phase 0"),
        ("Directory Web Scraper", "Autonomous Cheerio crawler parsing LawRato directory listings into MongoDB", "IMPLEMENTED", "Phase 0"),
        ("Razorpay Escrow", "Order creation and cryptographic HMAC SHA-256 signature verification", "IMPLEMENTED", "Phase 0"),
        ("Client Session Cache", "LocalStorage persistence for multi-turn history & triage results", "IMPLEMENTED", "Phase 0"),
        ("Dual Homepage Input", "Direct text box input on homepage alongside microphone for desktop fallback", "IN PROGRESS", "Phase 1"),
        ("Emergency SOS Hub", "Real 1-tap dials (112, 1091, 15100 NALSA) & statutory arrest rights card", "IN PROGRESS", "Phase 1"),
        ("Advocate Profile Modal", "Detailed modal displaying Bar Council credentials, courts, and fixed slots", "IN PROGRESS", "Phase 1"),
        ("Bar Council Verification", "State Bar Enrolment (e.g. D/1420/2019) & AIBE COP verification workflow", "PLANNED", "Phase 2"),
        ("My Bookings Dashboard", "Client portal to view upcoming appointments, status, and PDF booking slips", "PLANNED", "Phase 2"),
        ("Regulatory Suspension", "Automated query quarantine and Razorpay refund trigger for banned advocates", "PLANNED", "Phase 2"),
        ("Legal Document OCR", "Real PDF/Image file upload and text extraction for FIRs and legal notices", "PLANNED", "Phase 3"),
        ("Limitation Calculator", "Statutory countdown tracking under Indian Limitation Act, 1963", "PLANNED", "Phase 3"),
        ("Free Legal Aid Checker", "NALSA / DLSA eligibility evaluator under Legal Services Authorities Act", "PLANNED", "Phase 3"),
        ("Indic 8-Language STT", "Expanding speech recognition to Bengali, Marathi, Tamil, Telugu, etc.", "ROADMAP", "Phase 4"),
        ("e-Courts CNR Tracking", "Tracking court causes and next hearing dates via 16-digit CNR numbers", "ROADMAP", "Phase 4"),
        ("WebRTC Video Consult", "Built-in peer-to-peer encrypted video calling and screen sharing", "ROADMAP", "Phase 4")
    ]

    tbl_feat = doc.add_table(rows=len(features) + 1, cols=4)
    tbl_feat.alignment = WD_TABLE_ALIGNMENT.CENTER

    headers = ["Feature Module", "Description", "Status", "Phase"]
    for i, h in enumerate(headers):
        cell = tbl_feat.rows[0].cells[i]
        cell.text = h
        cell.paragraphs[0].runs[0].font.bold = True
        cell.paragraphs[0].runs[0].font.size = Pt(9.5)
        cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        set_cell_background(cell, "0C447C")
        set_cell_margins(cell, 80, 80, 100, 100)

    for row_idx, (f_name, f_desc, f_stat, f_phase) in enumerate(features, start=1):
        row = tbl_feat.rows[row_idx]
        row.cells[0].text = f_name
        row.cells[1].text = f_desc
        row.cells[2].text = f_stat
        row.cells[3].text = f_phase
        
        bg = "FFFFFF" if row_idx % 2 == 1 else "F8FAFC"
        for idx in range(4):
            c = row.cells[idx]
            c.paragraphs[0].runs[0].font.size = Pt(8.5)
            set_cell_background(c, bg)
            set_cell_margins(c, 60, 60, 80, 80)
        
        # Color status
        r_stat = row.cells[2].paragraphs[0].runs[0]
        r_stat.font.bold = True
        if f_stat == "IMPLEMENTED":
            r_stat.font.color.rgb = RGBColor(22, 101, 52)
        elif f_stat == "IN PROGRESS":
            r_stat.font.color.rgb = COLOR_AMBER
        else:
            r_stat.font.color.rgb = COLOR_NAVY

    doc.add_paragraph().space_after = Pt(12)

    # Section 3: Technical Architecture & System Design
    h3 = doc.add_heading("3. Technical Architecture & System Design", level=1)
    h3.runs[0].font.color.rgb = COLOR_NAVY

    p_arch = doc.add_paragraph(
        "Vakil Setu is engineered on a high-availability decoupled client-server architecture balancing low-latency "
        "client-side speech recognition with an asynchronous backend and a dual-engine AI failover pipeline."
    )
    p_arch.runs[0].font.size = Pt(10.5)

    arch_layers = [
        ("Layer 1: Client & Presentation Layer", "React 18 Single Page Application (Vite), W3C Web Speech API (webkitSpeechRecognition & window.speechSynthesis), AppContext state management, LocalStorage session cache."),
        ("Layer 2: API Gateway & Application Server", "Node.js (v20+ LTS) runtime, Express.js RESTful routing (/api/ai, /api/advocates, /api/bookings, /api/payments), CORS middleware, environment-isolated configurations."),
        ("Layer 3: AI & Intelligence Layer", "Dual-engine architecture: Primary Google Gemini 2.0 / OpenAI-compatible LLM with strict JSON schema contract; Local rule-based regex heuristics engine guaranteeing 100% triage uptime during API outages."),
        ("Layer 4: Data Persistence & Ingestion Layer", "MongoDB Atlas managed cluster via Mongoose ODM (Advocate, Booking, User collections); Cheerio-powered web scraping crawler ingesting public legal listings (LawRato)."),
        ("Layer 5: Payment & Transaction Security", "Razorpay Payment Gateway with server-side HMAC SHA-256 cryptographic signature recalculation and verification.")
    ]

    for l_title, l_desc in arch_layers:
        p_l = doc.add_paragraph()
        r_lt = p_l.add_run(f"• {l_title}: ")
        r_lt.font.bold = True
        r_lt.font.size = Pt(10)
        r_lt.font.color.rgb = COLOR_NAVY
        r_ld = p_l.add_run(l_desc)
        r_ld.font.size = Pt(9.5)
        p_l.space_after = Pt(4)

    doc.add_paragraph().space_after = Pt(12)

    # Section 4: Specific Functional Requirements
    h4 = doc.add_heading("4. Functional Requirements (FR)", level=1)
    h4.runs[0].font.color.rgb = COLOR_NAVY

    fr_items = [
        ("FR-1.1: Hands-Free Voice Ingestion", "The system SHALL capture spoken audio in real-time using the browser's native SpeechRecognition API without requiring third-party audio upload bandwidth."),
        ("FR-1.2: Bilingual Locale Tagging", "The system SHALL support hi-IN (Hindi) and en-IN (Indian English) recognition with dynamic BCP-47 locale tagging."),
        ("FR-1.3: Real-Time Interim Streaming", "The system SHALL stream intermediate transcription tokens into a visual draft bubble prior to submission."),
        ("FR-1.4: Direct Text Input Fallback", "The system SHALL provide a manual text entry area on all triage interfaces for users on desktop PCs or without microphone permissions."),
        ("FR-1.5: Accessibility Speech Synthesis", "The system SHALL vocalize generated legal summaries and immediate action items aloud via window.speechSynthesis in regional accents."),
        ("FR-2.1: Statutory Domain Triage", "The system SHALL classify grievances into exactly one canonical domain: criminal, civil, family, or property under Indian law."),
        ("FR-2.2: Procedural Urgency Estimation", "The system SHALL assign an urgency rating (low, medium, high, emergency) based on statutory limitation deadlines and arrest risks."),
        ("FR-2.3: Strict JSON Schema Contract", "The AI service SHALL constrain LLM outputs strictly to a valid JSON contract containing domain, urgency, summary, and actions."),
        ("FR-2.4: Deterministic Rule Failover", "If upstream LLM endpoints return HTTP 429 (rate-limit) or HTTP 503 (timeout), the system SHALL route the narrative through local regex heuristics without throwing an HTTP 500 error."),
        ("FR-3.1: Algorithmic Advocate Matching", "The system SHALL query MongoDB for active advocates matching the classified domain and availability, sorted by rating descending."),
        ("FR-3.2: Objective Credential Presentation", "Advocate profiles SHALL display verified years of practice, court practice areas, languages, and Bar Council verification shields in compliance with BCI Rule 36."),
        ("FR-4.1: Consultation Scheduling & Escrow", "Litigants SHALL schedule consultation appointments with server-side Razorpay order generation and HMAC SHA-256 signature verification."),
        ("FR-4.2: Automated Regulatory Refund", "In the event of advocate unavailability or regulatory suspension, the system SHALL trigger an automated refund via Razorpay Refund API."),
        ("FR-5.1: Instant Legal SOS Hub", "The emergency workflow SHALL render direct 1-tap call triggers to 112 (Police), 1091 (Women Helpline), and 15100 (NALSA Free Legal Aid)."),
        ("FR-5.2: Statutory Arrest Rights Checklist", "During criminal emergencies, the system SHALL display a verified checklist of rights under Section 35 of the Bharatiya Nagarik Suraksha Sanhita (BNSS) / Section 41 CrPC.")
    ]

    for fr_code, fr_text in fr_items:
        p_fr = doc.add_paragraph()
        r_c = p_fr.add_run(f"[{fr_code}] ")
        r_c.font.bold = True
        r_c.font.size = Pt(9.5)
        r_c.font.color.rgb = COLOR_AMBER
        r_t = p_fr.add_run(fr_text)
        r_t.font.size = Pt(9.5)
        p_fr.space_after = Pt(4)

    doc.add_paragraph().space_after = Pt(12)

    # Section 5: Non-Functional Requirements
    h5 = doc.add_heading("5. Non-Functional Requirements (NFR)", level=1)
    h5.runs[0].font.color.rgb = COLOR_NAVY

    nfrs = [
        ("NFR-PERF-1 (Speech Latency)", "Interim speech-to-text tokens SHALL render within 200 milliseconds on client devices."),
        ("NFR-PERF-2 (Triage Response Time)", "End-to-end AI triage processing round-trip SHALL complete within 3.5 seconds under standard broadband connections."),
        ("NFR-REL-1 (Failover Speed)", "Deterministic regex failover execution SHALL execute within 50 milliseconds upon upstream API timeout detection."),
        ("NFR-SEC-1 (Cryptographic Integrity)", "All financial transactions SHALL be validated using server-side HMAC SHA-256 signature verification; client-reported payment flags SHALL be rejected."),
        ("NFR-SEC-2 (Data Privacy & DPDP Act)", "Sensitive case descriptions SHALL remain stored in client LocalStorage; no unencrypted personal litigation narratives SHALL be permanently retained in the database."),
        ("NFR-USA-1 (WCAG 2.1 Accessibility)", "Every primary legal summary text SHALL have an auditory speech synthesis alternative with a minimum 4.5:1 visual contrast ratio.")
    ]

    for nfr_code, nfr_text in nfrs:
        p_n = doc.add_paragraph()
        r_c = p_n.add_run(f"[{nfr_code}] ")
        r_c.font.bold = True
        r_c.font.size = Pt(9.5)
        r_c.font.color.rgb = COLOR_NAVY
        r_t = p_n.add_run(nfr_text)
        r_t.font.size = Pt(9.5)
        p_n.space_after = Pt(4)

    # Save Word Document
    docx_path = os.path.join(os.getcwd(), "Vakil_Setu_SRS.docx")
    doc.save(docx_path)
    print(f"DOCX created at: {docx_path}")

def create_pdf_from_html():
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Vakil Setu — Software Requirements Specification</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.5;
      font-size: 10.5pt;
    }
    h1 {
      color: #0c447c;
      font-size: 22pt;
      margin-bottom: 4px;
      font-weight: 800;
    }
    h2 {
      color: #0c447c;
      font-size: 14pt;
      margin-top: 18pt;
      margin-bottom: 6pt;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 4px;
    }
    h3 {
      color: #b45309;
      font-size: 11pt;
      margin-top: 12pt;
      margin-bottom: 4pt;
    }
    .meta-tag {
      font-size: 8.5pt;
      font-weight: 700;
      color: #b45309;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .subtitle {
      font-size: 11pt;
      color: #64748b;
      margin-bottom: 14pt;
    }
    .doc-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12pt 0;
      font-size: 9pt;
    }
    .doc-table th, .doc-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      text-align: left;
    }
    .doc-table th {
      background-color: #0c447c;
      color: #ffffff;
      font-weight: 700;
    }
    .doc-table tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    .callout {
      background: #fef3c7;
      border-left: 4px solid #b45309;
      padding: 10px 14px;
      font-size: 9pt;
      margin: 12pt 0;
      font-weight: 600;
      color: #78350f;
    }
    .tag-impl { color: #15803d; font-weight: 700; }
    .tag-prog { color: #b45309; font-weight: 700; }
    .tag-plan { color: #0c447c; font-weight: 700; }
    ul { margin-left: 18px; margin-bottom: 8pt; }
    li { margin-bottom: 3pt; font-size: 9.5pt; }
    .page-break { page-break-before: always; }
  </style>
</head>
<body>

  <div class="meta-tag">IEEE Std 830-1998 / ISO/IEC/IEEE 29148:2018 Specification</div>
  <h1>Software Requirements Specification (SRS)<br>Vakil Setu (वकील सेतु)</h1>
  <div class="subtitle">Voice-First Bilingual Legal Triage & Advocate Discovery Platform under Indian Jurisprudence</div>

  <table class="doc-table">
    <tr>
      <th style="width: 28%;">Document Identifier</th>
      <td>SRS-VAKIL-SETU-2026-V1.0</td>
    </tr>
    <tr>
      <th>Project Scope</th>
      <td>MVP Phase 0 (Baseline) & Target Architecture (Phases 1–4)</td>
    </tr>
    <tr>
      <th>Student Lead</th>
      <td>[Your Full Name] | Roll No: [Your Roll Number]</td>
    </tr>
    <tr>
      <th>Project Supervisor</th>
      <td>[Faculty Guide / Professor Name]</td>
    </tr>
    <tr>
      <th>Department & College</th>
      <td>Department of Computer Science & Engineering, [College Name]</td>
    </tr>
  </table>

  <div class="callout">
    STATUTORY COMPLIANCE DISCLAIMER: Vakil Setu is explicitly an informational triage bridge and not an authorized legal practitioner under Section 29 of the Advocates Act, 1961. All advocate directory listings are strictly factual and non-promotional, adhering to Rule 36 of the Bar Council of India (BCI) rules.
  </div>

  <h2>1. Introduction & Executive Scope</h2>
  <p>Vakil Setu is an AI-powered, voice-first legal triage platform designed to bridge the first-mile justice divide in India. The software accepts spoken Hindi or English descriptions of legal disputes, classifies grievances into canonical legal domains (Criminal, Civil, Family, Property), assesses statutory urgency, vocalizes plain-language procedural guidance for low-literacy citizens, matches users with verified enrolled advocates, and coordinates appointment scheduling backed by cryptographic Razorpay payment verification.</p>

  <h2>2. Feature Status Matrix (Implemented vs. Planned)</h2>
  <table class="doc-table">
    <thead>
      <tr>
        <th style="width: 25%;">Feature Module</th>
        <th>Description</th>
        <th style="width: 18%;">Status</th>
        <th style="width: 14%;">Phase</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Voice Input (STT)</td><td>In-browser speech recognition in Hindi & English (Web Speech API)</td><td class="tag-impl">IMPLEMENTED</td><td>Phase 0</td></tr>
      <tr><td>Voice Output (TTS)</td><td>Speech synthesis reading triage summaries aloud (window.speechSynthesis)</td><td class="tag-impl">IMPLEMENTED</td><td>Phase 0</td></tr>
      <tr><td>AI Legal Triage</td><td>Dual-engine issue classification under Indian law (Domain, Urgency, Actions)</td><td class="tag-impl">IMPLEMENTED</td><td>Phase 0</td></tr>
      <tr><td>Offline Failover</td><td>Local rule-based regex engine for zero-downtime offline classification</td><td class="tag-impl">IMPLEMENTED</td><td>Phase 0</td></tr>
      <tr><td>Advocate Matching</td><td>Querying MongoDB for domain-matched available advocates sorted by rating</td><td class="tag-impl">IMPLEMENTED</td><td>Phase 0</td></tr>
      <tr><td>Directory Web Scraper</td><td>Autonomous Cheerio crawler parsing LawRato directory listings into MongoDB</td><td class="tag-impl">IMPLEMENTED</td><td>Phase 0</td></tr>
      <tr><td>Razorpay Escrow</td><td>Order creation and cryptographic HMAC SHA-256 signature verification</td><td class="tag-impl">IMPLEMENTED</td><td>Phase 0</td></tr>
      <tr><td>Client Session Cache</td><td>LocalStorage persistence for multi-turn history & triage results</td><td class="tag-impl">IMPLEMENTED</td><td>Phase 0</td></tr>
      <tr><td>Dual Homepage Input</td><td>Direct text box input on homepage alongside microphone for desktop fallback</td><td class="tag-prog">IN PROGRESS</td><td>Phase 1</td></tr>
      <tr><td>Emergency SOS Hub</td><td>Real 1-tap dials (112, 1091, 15100 NALSA) & statutory arrest rights card</td><td class="tag-prog">IN PROGRESS</td><td>Phase 1</td></tr>
      <tr><td>Advocate Profile Modal</td><td>Detailed modal displaying Bar Council credentials, courts, and fixed slots</td><td class="tag-prog">IN PROGRESS</td><td>Phase 1</td></tr>
      <tr><td>Bar Council Verification</td><td>State Bar Enrolment (e.g. D/1420/2019) & AIBE COP verification workflow</td><td class="tag-plan">PLANNED</td><td>Phase 2</td></tr>
      <tr><td>My Bookings Dashboard</td><td>Client portal to view upcoming appointments, status, and PDF booking slips</td><td class="tag-plan">PLANNED</td><td>Phase 2</td></tr>
      <tr><td>Regulatory Suspension</td><td>Automated query quarantine and Razorpay refund trigger for banned advocates</td><td class="tag-plan">PLANNED</td><td>Phase 2</td></tr>
      <tr><td>Legal Document OCR</td><td>Real PDF/Image file upload and text extraction for FIRs and legal notices</td><td class="tag-plan">Phase 3</td><td>Phase 3</td></tr>
      <tr><td>Limitation Calculator</td><td>Statutory countdown tracking under Indian Limitation Act, 1963</td><td class="tag-plan">PLANNED</td><td>Phase 3</td></tr>
      <tr><td>Free Legal Aid Checker</td><td>NALSA / DLSA eligibility evaluator under Legal Services Authorities Act</td><td class="tag-plan">PLANNED</td><td>Phase 3</td></tr>
      <tr><td>Indic 8-Language STT</td><td>Expanding speech recognition to Bengali, Marathi, Tamil, Telugu, etc.</td><td class="tag-plan">ROADMAP</td><td>Phase 4</td></tr>
      <tr><td>e-Courts CNR Tracking</td><td>Tracking court causes and next hearing dates via 16-digit CNR numbers</td><td class="tag-plan">ROADMAP</td><td>Phase 4</td></tr>
      <tr><td>WebRTC Video Consult</td><td>Built-in peer-to-peer encrypted video calling and screen sharing</td><td class="tag-plan">ROADMAP</td><td>Phase 4</td></tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <h2>3. Technical Architecture & System Design</h2>
  <ul>
    <li><strong>Client Layer:</strong> React 18 SPA (Vite), W3C Web Speech API (zero-cost client STT/TTS), AppContext state management.</li>
    <li><strong>API Gateway:</strong> Node.js (v20+ LTS) + Express.js RESTful routing, CORS security, custom error middleware.</li>
    <li><strong>AI Intelligence Layer:</strong> Dual-engine pipeline: Google Gemini 2.0 / Gateway LLM + Local regex heuristics failover engine.</li>
    <li><strong>Data Persistence:</strong> MongoDB Atlas via Mongoose ODM (Advocate, Booking, User schemas); Cheerio web crawler.</li>
    <li><strong>Payment Security:</strong> Razorpay API with server-side HMAC SHA-256 cryptographic signature recalculation.</li>
  </ul>

  <h2>4. Core Functional Requirements (FR)</h2>
  <ul>
    <li><strong>[FR-1.1: Hands-Free Voice Ingestion]</strong> The system SHALL capture spoken audio in real-time using browser SpeechRecognition without server-side audio upload overhead.</li>
    <li><strong>[FR-1.2: Bilingual Locale Tagging]</strong> The system SHALL support hi-IN and en-IN recognition with dynamic BCP-47 locale tagging.</li>
    <li><strong>[FR-1.4: Direct Text Fallback]</strong> The system SHALL provide a manual text entry area on all triage interfaces for users on desktop PCs.</li>
    <li><strong>[FR-1.5: Accessibility Speech Synthesis]</strong> The system SHALL vocalize generated legal summaries aloud via window.speechSynthesis in regional accents.</li>
    <li><strong>[FR-2.1: Statutory Domain Triage]</strong> The system SHALL classify grievances into exactly one canonical domain: criminal, civil, family, or property.</li>
    <li><strong>[FR-2.2: Procedural Urgency Estimation]</strong> The system SHALL assign an urgency rating (low, medium, high, emergency) based on statutory limitation deadlines.</li>
    <li><strong>[FR-2.4: Deterministic Rule Failover]</strong> If upstream LLM endpoints return HTTP 429/503, the system SHALL route the narrative through local regex heuristics with zero downtime.</li>
    <li><strong>[FR-3.1: Algorithmic Advocate Matching]</strong> The system SHALL query MongoDB for active advocates matching the classified domain, sorted by rating descending.</li>
    <li><strong>[FR-4.1: Consultation Scheduling & Escrow]</strong> Litigants SHALL schedule consultation appointments with server-side Razorpay order generation and HMAC SHA-256 signature verification.</li>
    <li><strong>[FR-5.1: Instant Legal SOS Hub]</strong> The emergency workflow SHALL render direct 1-tap call triggers to 112 (Police), 1091 (Women Helpline), and 15100 (NALSA Free Legal Aid).</li>
  </ul>

  <h2>5. Non-Functional Requirements (NFR)</h2>
  <ul>
    <li><strong>[NFR-PERF-1: Speech Latency]</strong> Interim speech-to-text tokens SHALL render within 200ms on client devices.</li>
    <li><strong>[NFR-PERF-2: Triage Response Time]</strong> End-to-end AI triage processing round-trip SHALL complete within 3.5 seconds.</li>
    <li><strong>[NFR-REL-1: Failover Speed]</strong> Deterministic regex failover execution SHALL execute within 50ms upon upstream timeout detection.</li>
    <li><strong>[NFR-SEC-1: Cryptographic Integrity]</strong> All financial transactions SHALL be validated using server-side HMAC SHA-256 signature verification.</li>
    <li><strong>[NFR-SEC-2: Data Privacy & DPDP Act]</strong> Sensitive case descriptions SHALL remain stored in client LocalStorage; no unencrypted personal litigation narratives SHALL be retained in the database.</li>
  </ul>

</body>
</html>
"""
    html_path = os.path.join(os.getcwd(), "SRS_print.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    pdf_path = os.path.join(os.getcwd(), "Vakil_Setu_SRS.pdf")
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    
    cmd = [
        chrome_path,
        "--headless",
        "--disable-gpu",
        f"--print-to-pdf={pdf_path}",
        html_path
    ]
    subprocess.run(cmd, check=True)
    print(f"PDF created at: {pdf_path}")

if __name__ == "__main__":
    create_docx()
    create_pdf_from_html()
