import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=80, bottom=80, left=100, right=100):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_synopsis_docx():
    doc = Document()
    
    # Page setup: A4, 0.75 in (54 pt) margins
    for section in doc.sections:
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)
        
        # Configure Header & Footer
        header = section.header
        p_hdr = header.paragraphs[0]
        p_hdr.text = "Vakil Setu: A Voice-First Bilingual Legal Triage Platform | Mini Project Synopsis"
        p_hdr.runs[0].font.name = "Times New Roman"
        p_hdr.runs[0].font.size = Pt(8.5)
        p_hdr.runs[0].font.color.rgb = RGBColor(100, 116, 139)

    COLOR_NAVY = RGBColor(12, 68, 124)
    COLOR_DARK = RGBColor(15, 23, 42)

    # -------------------------------------------------------------
    # PAGE 1: COVER
    # -------------------------------------------------------------
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("VAKIL SETU: A VOICE-FIRST BILINGUAL LEGAL TRIAGE\nAND ADVOCATE DISCOVERY PLATFORM")
    r.font.name = "Times New Roman"
    r.font.size = Pt(18)
    r.font.bold = True
    p.space_after = Pt(16)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("A MINI PROJECT SYNOPSIS SUBMITTED\nIN PARTIAL FULFILLMENT OF THE REQUIREMENTS\nFOR THE AWARD OF DEGREE OF\n")
    r.font.name = "Times New Roman"
    r.font.size = Pt(12)
    r.font.bold = True
    r2 = p.add_run("BACHELOR OF TECHNOLOGY\n")
    r2.font.name = "Times New Roman"
    r2.font.size = Pt(14)
    r2.font.bold = True
    r3 = p.add_run("In\n")
    r3.font.name = "Times New Roman"
    r3.font.size = Pt(12)
    r4 = p.add_run("COMPUTER SCIENCE AND ENGINEERING")
    r4.font.name = "Times New Roman"
    r4.font.size = Pt(14)
    r4.font.bold = True
    p.space_after = Pt(20)

    # Logo Image
    if os.path.exists("extracted_p1_img1.png"):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.add_run().add_picture("extracted_p1_img1.png", width=Inches(3.8))
        p_img.space_after = Pt(20)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("SUBMITTED BY\n")
    r.font.name = "Times New Roman"
    r.font.size = Pt(11)
    r.font.bold = True
    r2 = p.add_run("Summar Kumar\n")
    r2.font.name = "Times New Roman"
    r2.font.size = Pt(13)
    r2.font.bold = True
    r3 = p.add_run("Roll Number: 2023a1r033\n\n")
    r3.font.name = "Times New Roman"
    r3.font.size = Pt(11)
    r4 = p.add_run("[Teammate Name]\n")
    r4.font.name = "Times New Roman"
    r4.font.size = Pt(13)
    r4.font.bold = True
    r5 = p.add_run("Roll Number: [Roll Number]")
    r5.font.name = "Times New Roman"
    r5.font.size = Pt(11)
    p.space_after = Pt(20)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("SUBMITTED TO\n")
    r.font.name = "Times New Roman"
    r.font.size = Pt(12)
    r.font.bold = True
    r2 = p.add_run("Department of Computer Science and Engineering\n")
    r2.font.name = "Times New Roman"
    r2.font.size = Pt(13)
    r2.font.bold = True
    r3 = p.add_run("Model Institute of Engineering and Technology (Autonomous)\n")
    r3.font.name = "Times New Roman"
    r3.font.size = Pt(12)
    r3.font.bold = True
    r4 = p.add_run("Jammu, India\n")
    r4.font.name = "Times New Roman"
    r4.font.size = Pt(12)
    r5 = p.add_run("2026")
    r5.font.name = "Times New Roman"
    r5.font.size = Pt(12)
    r5.font.bold = True

    doc.add_page_break()

    # -------------------------------------------------------------
    # PAGE 2: TABLE OF CONTENTS & ABBREVIATIONS
    # -------------------------------------------------------------
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("CONTENTS OF SYNOPSIS")
    r.font.name = "Times New Roman"
    r.font.size = Pt(16)
    r.font.bold = True
    p.space_after = Pt(10)

    toc_data = [
        ("1", "Project Overview", "3"),
        ("2", "Problem Statement", "4"),
        ("3", "Objectives of the Project", "5"),
        ("4", "Proposed Solution / Methodology", "6"),
        ("5", "Key Technologies and Tools", "7"),
        ("6", "V.E.T.S Justification", "8"),
        ("7", "Expected Outcomes", "9"),
        ("8", "Implementation Timeline", "10"),
        ("9", "References", "11")
    ]
    tbl_toc = doc.add_table(rows=len(toc_data)+1, cols=3)
    tbl_toc.alignment = WD_TABLE_ALIGNMENT.CENTER
    for idx, h in enumerate(["S. No", "Topic", "Page No"]):
        c = tbl_toc.rows[0].cells[idx]
        c.text = h
        c.paragraphs[0].runs[0].font.name = "Times New Roman"
        c.paragraphs[0].runs[0].font.bold = True
        c.paragraphs[0].runs[0].font.size = Pt(11)
        set_cell_background(c, "F1F5F9")
        set_cell_margins(c, 60, 60, 80, 80)
    for i, (s, t, pg) in enumerate(toc_data, start=1):
        row = tbl_toc.rows[i]
        row.cells[0].text, row.cells[1].text, row.cells[2].text = s, t, pg
        for c_idx in range(3):
            cell = row.cells[c_idx]
            cell.paragraphs[0].runs[0].font.name = "Times New Roman"
            cell.paragraphs[0].runs[0].font.size = Pt(10)
            set_cell_margins(cell, 40, 40, 60, 60)

    p = doc.add_paragraph()
    r = p.add_run("Key Technical Abbreviations & Nomenclature")
    r.font.name = "Times New Roman"
    r.font.size = Pt(13)
    r.font.bold = True
    p.space_before = Pt(14)
    p.space_after = Pt(6)

    abbrev_data = [
        ("LLM", "Large Language Model (e.g., Gemini 2.0 Flash, Claude Sonnet 3.7, GPT-4o)"),
        ("STT", "Speech-to-Text; browser-native speech recognition via W3C Web Speech API"),
        ("TTS", "Text-to-Speech; speech synthesis vocalizing legal summaries in Devanagari/English"),
        ("BNS", "Bharatiya Nyaya Sanhita, 2023; modern Indian criminal penal code succeeding IPC"),
        ("BNSS", "Bharatiya Nagarik Suraksha Sanhita, 2023; procedural criminal code succeeding CrPC"),
        ("CPC", "Code of Civil Procedure, 1908; statutory framework governing civil litigation in India"),
        ("BCI", "Bar Council of India; apex statutory body regulating legal profession and ethics"),
        ("COP", "Certificate of Practice; mandatory credential granted upon passing AIBE examination"),
        ("AIBE", "All India Bar Examination; mandatory examination for lifelong bar practice rights"),
        ("HMAC", "Hash-based Message Authentication Code; SHA-256 signature verifying Razorpay escrow"),
        ("NALSA", "National Legal Services Authority; statutory provider of free legal aid under Art. 39A"),
        ("CNR", "Case Number Record; 16-digit alphanumeric unique identifier in Indian e-Courts"),
        ("SPA", "Single Page Application; React 18 client architecture executing on user device")
    ]
    tbl_abb = doc.add_table(rows=len(abbrev_data)+1, cols=2)
    tbl_abb.alignment = WD_TABLE_ALIGNMENT.CENTER
    for idx, h in enumerate(["Acronym", "Definition and Systems Scope"]):
        c = tbl_abb.rows[0].cells[idx]
        c.text = h
        c.paragraphs[0].runs[0].font.name = "Times New Roman"
        c.paragraphs[0].runs[0].font.bold = True
        c.paragraphs[0].runs[0].font.size = Pt(11)
        set_cell_background(c, "F1F5F9")
        set_cell_margins(c, 60, 60, 80, 80)
    for i, (ac, df) in enumerate(abbrev_data, start=1):
        row = tbl_abb.rows[i]
        row.cells[0].text, row.cells[1].text = ac, df
        row.cells[0].paragraphs[0].runs[0].font.bold = True
        for c_idx in range(2):
            cell = row.cells[c_idx]
            cell.paragraphs[0].runs[0].font.name = "Times New Roman"
            cell.paragraphs[0].runs[0].font.size = Pt(9.5)
            set_cell_margins(cell, 40, 40, 60, 60)

    doc.add_page_break()

    # -------------------------------------------------------------
    # PAGE 3: 1. PROJECT OVERVIEW
    # -------------------------------------------------------------
    h = doc.add_heading("1. Project Overview", level=1)
    h.runs[0].font.name = "Times New Roman"
    h.runs[0].font.size = Pt(15)
    h.runs[0].font.color.rgb = COLOR_DARK

    p = doc.add_paragraph(
        "Vakil Setu is an artificial intelligence-powered, voice-first legal triage and advocate discovery platform "
        "designed to bridge the severe \"first-mile\" justice divide in India. Situated at the intersection of Conversational "
        "Artificial Intelligence, Legal Informatics, and Web Systems, the project addresses the immense cognitive, linguistic, "
        "and financial barriers that confront everyday citizens when navigating legal crises."
    )
    p.runs[0].font.name = "Times New Roman"
    p.runs[0].font.size = Pt(11)

    p = doc.add_paragraph(
        "In the Indian judicial landscape, over 50 million cases remain pending across courts. However, for an ordinary citizen facing a legal conflict—"
        "such as illegal tenancy eviction, employer wage denial, workplace harassment, property boundary encroachment, or cheque dishonor—"
        "the primary obstacle is not courtroom litigation itself, but knowing where, when, and how to start. Traditional digital legal platforms in India "
        "operate exclusively as static, English-heavy directories saturated with Latin maxims and complex statutory citations. They assume high typing proficiency "
        "and structured legal comprehension, entirely alienating the over 70% of Indian litigants residing in semi-urban and rural areas who are comfortable "
        "speaking in Hindi or regional dialects."
    )
    p.runs[0].font.name = "Times New Roman"
    p.runs[0].font.size = Pt(11)

    p = doc.add_paragraph(
        "Vakil Setu eliminates this asymmetry by introducing a hands-free, bilingual conversational interface operating directly within modern web browsers. "
        "Citizens simply speak their dispute naturally in Hindi, English, or mixed colloquial speech. Utilizing a dual-engine triage architecture, the platform "
        "analyzes unstructured spoken narratives against Indian statutory codes (Bharatiya Nyaya Sanhita, Bharatiya Nagarik Suraksha Sanhita, and Code of Civil Procedure), "
        "determines the primary legal domain (Criminal, Civil, Family, or Property), estimates procedural urgency, and extracts immediate action items. For low-literacy "
        "citizens, the platform vocalizes the legal guidance back in clear regional speech. Finally, it algorithmically matches litigants with verified, specialized advocates "
        "and enables direct consultation scheduling backed by cryptographic Razorpay payment escrow."
    )
    p.runs[0].font.name = "Times New Roman"
    p.runs[0].font.size = Pt(11)

    p = doc.add_paragraph()
    r = p.add_run("Architectural Scope & Boundary Constraints")
    r.font.name = "Times New Roman"
    r.font.size = Pt(13)
    r.font.bold = True
    p.space_before = Pt(8)
    p.space_after = Pt(4)

    constraints = [
        ("In-Browser Zero-Cost Audio Processing", "Audio capture and transcription execute client-side via the browser's native W3C Web Speech API (webkitSpeechRecognition), dynamically tagging BCP-47 locales (hi-IN and en-IN). This eliminates server-side audio streaming bandwidth and external cloud STT compute costs."),
        ("Statutory Non-Solicitation Adherence", "The platform strictly complies with Section 29 of the Advocates Act, 1961, functioning as an informational triage bridge rather than an unauthorized practitioner. All advocate directory listings adhere to Rule 36 of the Bar Council of India (BCI) rules regarding non-promotional publication."),
        ("Dual-Engine Failover Resilience", "To guarantee 100% operational uptime during upstream API rate-limits (HTTP 429) or gateway timeouts (HTTP 503), the server integrates a deterministic local regex pattern-matching engine that provides instant, rule-based legal triage without returning 500 server errors."),
        ("Client-Side Session Data Ephemerality", "In compliance with the Digital Personal Data Protection (DPDP) Act, 2023, sensitive case narratives are cached locally within browser LocalStorage, preventing permanent, unencrypted storage of private litigation facts in the cloud database.")
    ]
    for c_title, c_desc in constraints:
        p_c = doc.add_paragraph()
        r1 = p_c.add_run(f"• {c_title}: ")
        r1.font.name = "Times New Roman"
        r1.font.size = Pt(10.5)
        r1.font.bold = True
        r2 = p_c.add_run(c_desc)
        r2.font.name = "Times New Roman"
        r2.font.size = Pt(10.5)
        p_c.space_after = Pt(3)

    doc.add_page_break()

    # -------------------------------------------------------------
    # PAGE 4: 2. PROBLEM STATEMENT
    # -------------------------------------------------------------
    h = doc.add_heading("2. Problem Statement", level=1)
    h.runs[0].font.name = "Times New Roman"
    h.runs[0].font.size = Pt(15)
    h.runs[0].font.color.rgb = COLOR_DARK

    p = doc.add_paragraph(
        "Modern access to justice in India suffers from an acute first-mile information failure. When citizens encounter legal distress, "
        "they lack the legal literacy required to structure their grievances into actionable legal complaints. Mathematically, the cumulative "
        "procedural friction and informational asymmetry F_friction experienced by an aggrieved citizen over elapsed time t can be formalized as:"
    )
    p.runs[0].font.name = "Times New Roman"
    p.runs[0].font.size = Pt(11)

    p_eq = doc.add_paragraph()
    p_eq.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_eq = p_eq.add_run("F_friction = ∑ [ α_i · L_jargon + β_i / (τ_limitation - t) + γ_i · C_intermediary ]")
    r_eq.font.name = "Times New Roman"
    r_eq.font.size = Pt(12)
    r_eq.font.bold = True
    p_eq.space_before = Pt(6)
    p_eq.space_after = Pt(6)

    p = doc.add_paragraph(
        "Where L_jargon represents linguistic and statutory complexity, τ_limitation denotes the statutory limitation deadline under the "
        "Limitation Act, 1963, and C_intermediary represents the financial friction imposed by unregulated touts. When t approaches τ_limitation, "
        "procedural friction diverges to infinity, resulting in the permanent forfeiture of statutory legal remedies.\n\n"
        "This systemic crisis is characterized by four structural failure modes:\n"
        "1. Statutory Domain & Limitation Ambiguity: Citizens cannot identify whether their dispute falls under Criminal, Civil, Family, or Property law. "
        "Inability to gauge statutory deadlines (such as the 30-day notice window under Section 138 of the Negotiable Instruments Act or bail limitation periods) "
        "leads to irreversible procedural default.\n"
        "2. Linguistic & Jargon Exclusion: Over 90% of existing legal resources are published in dense, formal English. Semi-urban and rural litigants "
        "comfortable speaking Hindi or colloquial dialects are completely shut out, inducing severe cognitive helplessness.\n"
        "3. The Unregulated Intermediary Trap: Finding an advocate specializing in the relevant practice area is a lottery. Litigants face arbitrary consultation "
        "fee demands, opaque practitioner credentials, and exploitation by court touts.\n"
        "4. High-Stress Typing & Cognitive Overload: Under acute emotional trauma (threat of arrest, domestic abuse, unlawful eviction), formulating and typing "
        "structured text is unrealistic."
    )
    p.runs[0].font.name = "Times New Roman"
    p.runs[0].font.size = Pt(10.5)

    p_tbl_lbl = doc.add_paragraph()
    p_tbl_lbl.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p_tbl_lbl.add_run("Table 2.1: Comparative Analysis of Legal Discovery Paradigms")
    r.font.name = "Times New Roman"
    r.font.size = Pt(10.5)
    r.font.bold = True
    p_tbl_lbl.space_before = Pt(6)

    comp_data = [
        ("Traditional Legal Portals (LawRato, Vakilsearch)", "English-heavy; text typing only", "Static directory; no instant procedural triage", "Third-party redirection; opaque pricing"),
        ("Generic Conversational LLMs (ChatGPT, Claude)", "Multilingual text prompts", "General knowledge; high risk of non-Indian hallucination", "Zero booking or verified advocate connection"),
        ("Vakil Setu Legal Triage Gateway", "Hands-free bilingual voice (hi-IN / en-IN)", "Tuned for Indian statutes (BNS, CrPC, CPC)", "Integrated Razorpay HMAC-SHA256 escrow")
    ]
    tbl_comp = doc.add_table(rows=len(comp_data)+1, cols=4)
    tbl_comp.alignment = WD_TABLE_ALIGNMENT.CENTER
    for idx, h in enumerate(["Discovery Paradigm", "Linguistic Mode", "Indian Law Triage", "Escrow & Booking"]):
        c = tbl_comp.rows[0].cells[idx]
        c.text = h
        c.paragraphs[0].runs[0].font.name = "Times New Roman"
        c.paragraphs[0].runs[0].font.bold = True
        c.paragraphs[0].runs[0].font.size = Pt(10)
        set_cell_background(c, "F1F5F9")
        set_cell_margins(c, 50, 50, 60, 60)
    for i, row_vals in enumerate(comp_data, start=1):
        row = tbl_comp.rows[i]
        for c_idx, val in enumerate(row_vals):
            cell = row.cells[c_idx]
            cell.text = val
            cell.paragraphs[0].runs[0].font.name = "Times New Roman"
            cell.paragraphs[0].runs[0].font.size = Pt(9)
            if i == 3: # Vakil Setu row bold
                cell.paragraphs[0].runs[0].font.bold = True
            set_cell_margins(cell, 40, 40, 60, 60)

    doc.add_page_break()

    # -------------------------------------------------------------
    # PAGE 5: 3. OBJECTIVES OF THE PROJECT
    # -------------------------------------------------------------
    h = doc.add_heading("3. Objectives of the Project", level=1)
    h.runs[0].font.name = "Times New Roman"
    h.runs[0].font.size = Pt(15)
    h.runs[0].font.color.rgb = COLOR_DARK

    p = doc.add_paragraph("The core technical objectives of the Vakil Setu project are formulated across five architectural milestones:")
    p.runs[0].font.name = "Times New Roman"
    p.runs[0].font.size = Pt(11)

    objs = [
        ("Objective 1 — Hands-Free In-Browser Voice Intake & Locale Tagging", "Engineer a client-side speech recognition pipeline utilizing the W3C Web Speech API that captures spoken Hindi and English with sub-200ms interim token streaming, dynamic BCP-47 locale tagging (hi-IN and en-IN), and zero cloud audio streaming costs."),
        ("Objective 2 — Dual-Engine Statutory Legal Triage & Urgency Scoring", "Construct an intelligent triage service powered by Google Gemini 2.0 / Gateway LLM with strict JSON schema constraints that categorizes spoken narratives into 4 canonical legal domains (Criminal, Civil, Family, Property), evaluates statutory urgency (Low, Medium, High, Emergency), and outputs actionable next steps."),
        ("Objective 3 — High-Availability Deterministic Failover Engine", "Implement an embedded rule-based regex heuristics engine within the Node.js backend that intercepts failed or rate-limited LLM calls (HTTP 429/503) and provides immediate, vetted legal triage in sub-50ms with 100% service uptime."),
        ("Objective 4 — Specialization-Based Advocate Matching & Directory Ingestion", "Develop an automated Cheerio web scraping pipeline that continuously indexes practicing advocates from public legal registries into MongoDB, coupled with an algorithmic matching query that pairs litigants with verified specialists sorted by rating and experience."),
        ("Objective 5 — Cryptographic Consultation Escrow & Multi-Turn Assistant", "Integrate the Razorpay Orders API with server-side HMAC SHA-256 signature verification to ensure transparent, tamper-proof consultation booking, accompanied by a 10-turn sliding memory conversational assistant for follow-up legal queries.")
    ]
    for o_title, o_desc in objs:
        p_o = doc.add_paragraph()
        r1 = p_o.add_run(f"• {o_title}: ")
        r1.font.name = "Times New Roman"
        r1.font.size = Pt(10.5)
        r1.font.bold = True
        r2 = p_o.add_run(o_desc)
        r2.font.name = "Times New Roman"
        r2.font.size = Pt(10.5)
        p_o.space_after = Pt(3)

    p_tbl_lbl = doc.add_paragraph()
    p_tbl_lbl.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p_tbl_lbl.add_run("Table 3.1: Objectives, Systems Mechanisms, and Verification Gates")
    r.font.name = "Times New Roman"
    r.font.size = Pt(10.5)
    r.font.bold = True
    p_tbl_lbl.space_before = Pt(6)

    gate_data = [
        ("Obj 1", "Voice Ingestion", "W3C Web Speech API (hi-IN / en-IN)", "Sub-200ms interim token latency; zero cloud audio cost"),
        ("Obj 2", "AI Statutory Triage", "Prompt engineering with strict JSON contract", "100% schema conformity; domain precision over 90%"),
        ("Obj 3", "Failover Engine", "Bilingual regex pattern-matching engine", "Sub-50ms execution; zero 500 errors on API timeout"),
        ("Obj 4", "Advocate Ingestion", "Cheerio crawler + MongoDB compound indexing", "Atomic upserts; sub-100ms domain query resolution"),
        ("Obj 5", "Escrow Booking", "Razorpay API + Crypto HMAC-SHA256", "100% tamper-proof signature verification; multi-turn chat")
    ]
    tbl_gate = doc.add_table(rows=len(gate_data)+1, cols=4)
    tbl_gate.alignment = WD_TABLE_ALIGNMENT.CENTER
    for idx, h in enumerate(["Obj.", "Architectural Focus", "Technical Implementation", "Target Metric / Gate"]):
        c = tbl_gate.rows[0].cells[idx]
        c.text = h
        c.paragraphs[0].runs[0].font.name = "Times New Roman"
        c.paragraphs[0].runs[0].font.bold = True
        c.paragraphs[0].runs[0].font.size = Pt(10)
        set_cell_background(c, "F1F5F9")
        set_cell_margins(c, 50, 50, 60, 60)
    for i, row_vals in enumerate(gate_data, start=1):
        row = tbl_gate.rows[i]
        for c_idx, val in enumerate(row_vals):
            cell = row.cells[c_idx]
            cell.text = val
            cell.paragraphs[0].runs[0].font.name = "Times New Roman"
            cell.paragraphs[0].runs[0].font.size = Pt(9)
            set_cell_margins(cell, 40, 40, 60, 60)

    doc.add_page_break()

    # -------------------------------------------------------------
    # PAGE 6: 4. PROPOSED SOLUTION / METHODOLOGY
    # -------------------------------------------------------------
    h = doc.add_heading("4. Proposed Solution / Methodology", level=1)
    h.runs[0].font.name = "Times New Roman"
    h.runs[0].font.size = Pt(15)
    h.runs[0].font.color.rgb = COLOR_DARK

    p = doc.add_paragraph(
        "Vakil Setu is architected as an asynchronous, decoupled five-tier legal gateway. The client application runs as a responsive "
        "React 18 Single Page Application interfacing with an Express.js API gateway. Rather than routing heavy raw audio to cloud servers, "
        "audio transcription occurs locally on the client's device, transmitting lightweight text payloads to the backend intelligence pipeline."
    )
    p.runs[0].font.name = "Times New Roman"
    p.runs[0].font.size = Pt(11)

    # Architecture Image
    if os.path.exists("vakil_setu_architecture.png"):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.add_run().add_picture("vakil_setu_architecture.png", width=Inches(6.5))
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p_cap.add_run("Figure 4.1: Decoupled Five-Tier Execution Topology of the Vakil Setu Legal Triage Gateway")
        r.font.name = "Times New Roman"
        r.font.size = Pt(9.5)
        r.font.italic = True
        p_cap.space_after = Pt(8)

    p = doc.add_paragraph("The internal processing pipeline operates across four decoupled systems modules:")
    p.runs[0].font.name = "Times New Roman"
    p.runs[0].font.size = Pt(11)

    stages = [
        ("Stage 1 — Voice Ingestion & Live Interim Streaming", "The user speaks their grievance into the browser. The native webkitSpeechRecognition engine captures the microphone stream, dynamically tagging the language locale (hi-IN or en-IN) and rendering intermediate transcription tokens character-by-character into a draft preview bubble."),
        ("Stage 2 — Dual-Engine Legal Triage & Prompt Schema Enforcement", "The narrative is transmitted via HTTPS REST to /api/ai/triage. The primary engine invokes Google Gemini 2.0 with a strict JSON contract enforcing Indian jurisprudence. If an API timeout, rate-limit (HTTP 429), or network drop occurs, the server seamlessly falls back to the local deterministic regex engine."),
        ("Stage 3 — Auditory Feedback & Specialization-Based Advocate Matching", "The legal summary and concrete steps are vocalized back to the user via native speech synthesis in regional accents. Concurrently, the backend queries MongoDB for verified advocates matching the identified domain, sorted by rating."),
        ("Stage 4 — Cryptographic Consultation Escrow & Multi-Turn Assistant", "The litigant selects a consultation appointment slot. The backend generates a Razorpay Order and verifies the transaction using server-side HMAC SHA-256 signatures, while a multi-turn assistant maintains the last 10 dialogue turns for follow-up legal queries.")
    ]
    for s_title, s_desc in stages:
        p_s = doc.add_paragraph()
        r1 = p_s.add_run(f"• {s_title}: ")
        r1.font.name = "Times New Roman"
        r1.font.size = Pt(10)
        r1.font.bold = True
        r2 = p_s.add_run(s_desc)
        r2.font.name = "Times New Roman"
        r2.font.size = Pt(10)
        p_s.space_after = Pt(3)

    doc.add_page_break()

    # -------------------------------------------------------------
    # PAGE 7: 5. KEY TECHNOLOGIES AND TOOLS
    # -------------------------------------------------------------
    h = doc.add_heading("5. Key Technologies and Tools", level=1)
    h.runs[0].font.name = "Times New Roman"
    h.runs[0].font.size = Pt(15)
    h.runs[0].font.color.rgb = COLOR_DARK

    p = doc.add_paragraph("The technical implementation of Vakil Setu is built upon an enterprise-grade, open-source stack designed to ensure sub-second response times, zero server audio processing overhead, and robust fault-tolerance:")
    p.runs[0].font.name = "Times New Roman"
    p.runs[0].font.size = Pt(11)

    tech_table_data = [
        ("Presentation Layer", "React 18 & Vite", "Fast Single Page Application (SPA) offering component modularity and optimized DOM hydration."),
        ("Voice Ingestion / TTS", "W3C Web Speech API", "Browser-native STT and TTS engines; eliminates cloud audio upload latency and streaming costs."),
        ("API Gateway & Server", "Node.js (v20+) & Express", "Asynchronous, non-blocking I/O event loop handling high-concurrency triage and webhook dispatch."),
        ("Primary AI Engine", "Google Gemini 2.0 / LLM", "Frontier generative language model operating with strict JSON schema constraints for Indian law."),
        ("Failover Engine", "Bilingual Regex Matcher", "Local deterministic pattern matcher providing sub-50ms failover triage during cloud API downtime."),
        ("Persistence Layer", "MongoDB Atlas & Mongoose", "Document database indexing polymorphic advocate profiles, booking ledgers, and user sessions."),
        ("Directory Crawler", "Cheerio & Fetch API", "Headless DOM and schema.org JSON-LD parser aggregating public advocate listings (LawRato)."),
        ("Financial Escrow", "Razorpay API & Crypto", "Payment order generation and server-side HMAC SHA-256 cryptographic signature verification."),
        ("Session Persistence", "AppContext & LocalStorage", "Client-side session caching complying with DPDP Act 2023 by preventing unencrypted cloud data leaks.")
    ]
    tbl_tech = doc.add_table(rows=len(tech_table_data)+1, cols=3)
    tbl_tech.alignment = WD_TABLE_ALIGNMENT.CENTER
    for idx, h in enumerate(["Subsystem", "Technology / Stack", "Systems Role & Architectural Justification"]):
        c = tbl_tech.rows[0].cells[idx]
        c.text = h
        c.paragraphs[0].runs[0].font.name = "Times New Roman"
        c.paragraphs[0].runs[0].font.bold = True
        c.paragraphs[0].runs[0].font.size = Pt(10)
        set_cell_background(c, "F1F5F9")
        set_cell_margins(c, 50, 50, 60, 60)
    for i, row_vals in enumerate(tech_table_data, start=1):
        row = tbl_tech.rows[i]
        for c_idx, val in enumerate(row_vals):
            cell = row.cells[c_idx]
            cell.text = val
            cell.paragraphs[0].runs[0].font.name = "Times New Roman"
            cell.paragraphs[0].runs[0].font.size = Pt(9)
            if c_idx == 0:
                cell.paragraphs[0].runs[0].font.bold = True
            set_cell_margins(cell, 40, 40, 60, 60)

    p = doc.add_paragraph()
    r = p.add_run("Hardware & Deployment Environment Specifications")
    r.font.name = "Times New Roman"
    r.font.size = Pt(13)
    r.font.bold = True
    p.space_before = Pt(8)
    p.space_after = Pt(4)

    env_specs = [
        ("Host Operating System", "Cross-platform deployment on Linux (Ubuntu 22.04 LTS / Debian 12) or Windows 11."),
        ("Compute & Memory Resources", "Standard lightweight virtual machine (2 vCPUs, 4 GB RAM; zero dedicated GPU compute required)."),
        ("Network Topology", "HTTPS / TLS 1.3 reverse-proxied via Nginx; stateless RESTful API communicating over standard TCP ports (5000/443)."),
        ("Client System Requirements", "Any modern desktop or mobile browser supporting the W3C Web Speech API (Google Chrome 90+, Microsoft Edge 90+, Safari 14.1+).")
    ]
    for e_title, e_desc in env_specs:
        p_e = doc.add_paragraph()
        r1 = p_e.add_run(f"• {e_title}: ")
        r1.font.name = "Times New Roman"
        r1.font.size = Pt(10)
        r1.font.bold = True
        r2 = p_e.add_run(e_desc)
        r2.font.name = "Times New Roman"
        r2.font.size = Pt(10)
        p_e.space_after = Pt(2)

    doc.add_page_break()

    # -------------------------------------------------------------
    # PAGE 8: 6. V.E.T.S JUSTIFICATION
    # -------------------------------------------------------------
    h = doc.add_heading("6. V.E.T.S Justification", level=1)
    h.runs[0].font.name = "Times New Roman"
    h.runs[0].font.size = Pt(15)
    h.runs[0].font.color.rgb = COLOR_DARK

    p = doc.add_paragraph("The Vakil Setu project is systematically validated against the institutional V.E.T.S evaluation framework:")
    p.runs[0].font.name = "Times New Roman"
    p.runs[0].font.size = Pt(11)

    vets = [
        ("V — Viability", "The project is thoroughly feasible within the standard 12-week academic timeline. Development utilizes commodity workstation hardware without requiring expensive multi-GPU clusters. All core technologies—including React 18, Node.js, the W3C Web Speech API, MongoDB Atlas, and the Razorpay Checkout SDK—are production-stable, well-documented, and freely accessible. The system architecture directly leverages the candidate's core competencies in full-stack web engineering, API integration, and asynchronous distributed systems."),
        ("E — Engineering Depth", "Vakil Setu represents substantial systems engineering that goes far beyond trivial CRUD applications or basic AI wrappers. Key engineering challenges successfully solved include:\n1. Client-side audio stream lifecycle management with real-time interim token rendering and BCP-47 locale tagging.\n2. Dual-engine AI orchestration featuring structured JSON schema prompt enforcement and deterministic regex failover.\n3. Autonomous web scraping and data normalization pipeline using Cheerio to crawl, deduplicate, and upsert public lawyer profiles.\n4. Cryptographic payment escrow verification using server-side HMAC SHA-256 hash recalculation.\n5. Client-side session state hydration and multi-turn sliding context preservation adhering to data minimization standards."),
        ("T — Trend / Statutory Alignment", "The project directly aligns with contemporary 2026 technological and national policy priorities:\n• Digital India and the Ministry of Law and Justice's Tele-Law mission to mainstream access to justice across Gram Panchayats.\n• Modern Indic language computing initiatives (such as Bhashini) delivering multilingual public services.\n• Full compliance with Section 29 of the Advocates Act, 1961, Rule 36 of Bar Council of India advertising norms, and the Digital Personal Data Protection (DPDP) Act, 2023."),
        ("S — Social / Industry Impact", "In India, the lack of timely legal guidance exacerbates poverty, domestic distress, and unlawful exploitation. By providing free, hands-free bilingual legal triage in spoken Hindi and English, Vakil Setu empowers everyday citizens to understand their rights, preserves critical evidence before statutory limitation periods expire under the Limitation Act 1963, and connects underprivileged citizens to statutory free legal aid (NALSA/DLSA).")
    ]
    for v_title, v_desc in vets:
        p_v = doc.add_paragraph()
        r1 = p_v.add_run(f"{v_title}: ")
        r1.font.name = "Times New Roman"
        r1.font.size = Pt(10.5)
        r1.font.bold = True
        r2 = p_v.add_run(v_desc)
        r2.font.name = "Times New Roman"
        r2.font.size = Pt(10.5)
        p_v.space_after = Pt(4)

    doc.add_page_break()

    # -------------------------------------------------------------
    # PAGE 9: 7. EXPECTED OUTCOMES
    # -------------------------------------------------------------
    h = doc.add_heading("7. Expected Outcomes", level=1)
    h.runs[0].font.name = "Times New Roman"
    h.runs[0].font.size = Pt(15)
    h.runs[0].font.color.rgb = COLOR_DARK

    p = doc.add_paragraph("Upon successful completion of the project, the following concrete deliverables will be produced:")
    p.runs[0].font.name = "Times New Roman"
    p.runs[0].font.size = Pt(11)

    outcomes = [
        ("1. Vakil Setu Web Application Prototype", "A fully functional, responsive Single Page Application supporting voice dictation in Hindi and English, dynamic case analysis dashboards, advocate discovery, and appointment booking."),
        ("2. Dual-Engine Legal Triage Service", "A fault-tolerant Node.js microservice (/api/ai/triage) providing structured legal domain categorization, urgency estimation, and plain-language action recommendations with sub-50ms regex failover."),
        ("3. Autonomous Directory Ingestion Engine", "A production-ready Cheerio web scraping pipeline that extracts, normalizes, and upserts public lawyer profiles into MongoDB with domain taxonomy mapping."),
        ("4. Cryptographic Escrow & Booking Gateway", "A secure transaction gateway supporting Razorpay order creation, HMAC SHA-256 signature verification, and automated regulatory refunds."),
        ("5. Statutory Emergency SOS & Arrest Rights Hub", "A dedicated crisis intervention module providing direct 1-tap call triggers to 112, 1091, and 15100 (NALSA), alongside a verified checklist of statutory rights under Section 35 of the Bharatiya Nagarik Suraksha Sanhita (BNSS)."),
        ("6. Empirical Triage Evaluation Report", "A comprehensive experimental evaluation validating triage accuracy across 100 sample legal dispute narratives spanning Criminal, Civil, Family, and Property law.")
    ]
    for o_num, o_text in outcomes:
        p_o = doc.add_paragraph()
        r1 = p_o.add_run(f"{o_num}: ")
        r1.font.name = "Times New Roman"
        r1.font.size = Pt(10.5)
        r1.font.bold = True
        r2 = p_o.add_run(o_text)
        r2.font.name = "Times New Roman"
        r2.font.size = Pt(10.5)
        p_o.space_after = Pt(3)

    p = doc.add_paragraph()
    r = p.add_run("Verification & Demonstration Setup")
    r.font.name = "Times New Roman"
    r.font.size = Pt(13)
    r.font.bold = True
    p.space_before = Pt(8)
    p.space_after = Pt(4)

    p = doc.add_paragraph(
        "The final prototype will be demonstrated in a live side-by-side browser and terminal environment evaluating 5 representative "
        "real-world legal dispute scenarios (landlord tenant dispute, cheque bounce notice, domestic violence complaint, unlawful police detention, and property title contest):\n"
        "• Baseline Scenario: An unassisted litigant navigating a traditional English legal portal or generic chatbot, displaying high cognitive burden and legal hallucinations.\n"
        "• Vakil Setu Scenario: Identical dispute dictated via Hindi voice, demonstrating real-time transcription, sub-3s statutory triage, spoken audio summary, verified advocate matching, and simulated Razorpay escrow booking."
    )
    p.runs[0].font.name = "Times New Roman"
    p.runs[0].font.size = Pt(10.5)

    doc.add_page_break()

    # -------------------------------------------------------------
    # PAGE 10: 8. IMPLEMENTATION TIMELINE
    # -------------------------------------------------------------
    h = doc.add_heading("8. Implementation Timeline", level=1)
    h.runs[0].font.name = "Times New Roman"
    h.runs[0].font.size = Pt(15)
    h.runs[0].font.color.rgb = COLOR_DARK

    p = doc.add_paragraph("The project development lifecycle is structured across five sequential phases spanning a 12-week schedule:")
    p.runs[0].font.name = "Times New Roman"
    p.runs[0].font.size = Pt(11)

    timeline_data = [
        ("Phase 1", "Requirement Study & Legal Taxonomy", "Cataloging Indian statutory domains (BNS, CrPC, CPC); formalizing JSON schema contracts and speech recognition pipeline specifications.", "Weeks 1–2"),
        ("Phase 2", "Core Gateway & Voice Pipeline", "Scaffolding React 18 SPA and Express API gateway; implementing Web Speech STT/TTS and BCP-47 locale tagging.", "Weeks 3–4"),
        ("Phase 3", "Dual-Engine Triage & Scraper", "Integrating Google Gemini 2.0 API; building local deterministic regex failover engine; developing Cheerio directory crawler.", "Weeks 5–7"),
        ("Phase 4", "Escrow Booking & Emergency Hub", "Connecting Razorpay Orders API; implementing HMAC SHA-256 signature verification; deploying Emergency SOS and arrest rights module.", "Weeks 8–9"),
        ("Phase 5", "Benchmarking & Documentation", "Executing triage accuracy evaluations across 100 legal test cases; compiling final IEEE SRS report; project defense.", "Weeks 10–12")
    ]
    tbl_time = doc.add_table(rows=len(timeline_data)+1, cols=4)
    tbl_time.alignment = WD_TABLE_ALIGNMENT.CENTER
    for idx, h in enumerate(["Phase", "Stage", "Key Activities & Deliverables", "Duration"]):
        c = tbl_time.rows[0].cells[idx]
        c.text = h
        c.paragraphs[0].runs[0].font.name = "Times New Roman"
        c.paragraphs[0].runs[0].font.bold = True
        c.paragraphs[0].runs[0].font.size = Pt(10)
        set_cell_background(c, "F1F5F9")
        set_cell_margins(c, 50, 50, 60, 60)
    for i, row_vals in enumerate(timeline_data, start=1):
        row = tbl_time.rows[i]
        for c_idx, val in enumerate(row_vals):
            cell = row.cells[c_idx]
            cell.text = val
            cell.paragraphs[0].runs[0].font.name = "Times New Roman"
            cell.paragraphs[0].runs[0].font.size = Pt(9)
            if c_idx == 0:
                cell.paragraphs[0].runs[0].font.bold = True
            set_cell_margins(cell, 40, 40, 60, 60)

    p = doc.add_paragraph()
    r = p.add_run("Milestone Review Criteria & Risk Mitigation Plan")
    r.font.name = "Times New Roman"
    r.font.size = Pt(13)
    r.font.bold = True
    p.space_before = Pt(8)
    p.space_after = Pt(4)

    milestones = [
        ("Milestone 1 (Week 4)", "Client-side voice engine successfully captures spoken Hindi and English with live token streaming and under 200ms rendering latency."),
        ("Milestone 2 (Week 7)", "Dual-engine triage pipeline achieves over 90% domain categorization precision with zero 500 errors during simulated cloud API dropouts."),
        ("Milestone 3 (Week 9)", "Razorpay payment gateway successfully validates genuine signatures and rejects 100% of tampered transaction tokens; emergency SOS hub functions reliably."),
        ("Risk Mitigation Strategy", "If upstream LLM endpoints experience prolonged downtime or quota exhaustion, Vakil Setu automatically engages the local regex pattern-matching engine, guaranteeing uninterrupted citizen advisory without service degradation.")
    ]
    for m_title, m_desc in milestones:
        p_m = doc.add_paragraph()
        r1 = p_m.add_run(f"• {m_title}: ")
        r1.font.name = "Times New Roman"
        r1.font.size = Pt(10)
        r1.font.bold = True
        r2 = p_m.add_run(m_desc)
        r2.font.name = "Times New Roman"
        r2.font.size = Pt(10)
        p_m.space_after = Pt(2)

    doc.add_page_break()

    # -------------------------------------------------------------
    # PAGE 11: 9. REFERENCES
    # -------------------------------------------------------------
    h = doc.add_heading("9. References", level=1)
    h.runs[0].font.name = "Times New Roman"
    h.runs[0].font.size = Pt(15)
    h.runs[0].font.color.rgb = COLOR_DARK

    ref_items = [
        "[1] Law Commission of India, \"Arrears and Backlog: Creating Additional Judicial (wo)manpower,\" Government of India, Report No. 245, 2014.",
        "[2] Ministry of Law and Justice, Government of India, \"The Advocates Act, 1961 (Act No. 25 of 1961),\" New Delhi, 1961.",
        "[3] Bar Council of India, \"Rules Governing Advocates: Standards of Professional Conduct and Etiquette (Rule 36),\" Bar Council of India, New Delhi, 2008.",
        "[4] Department of Justice, Ministry of Law and Justice, \"Tele-Law: Reaching the Unreached through Mainstreaming Legal Aid,\" Government of India, 2023.",
        "[5] Ministry of Electronics and Information Technology (MeitY), \"The Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023),\" The Gazette of India, 2023.",
        "[6] Law Commission of India, \"Assessment of Statutory Frameworks on Assessment of Delays and Court Arrears,\" Government of India, Report No. 272, 2017.",
        "[7] W3C Web Speech Working Group, \"Web Speech API Specification,\" W3C Community Group Report, Aug. 2023. [Online: w3c.github.io/speech-api/]",
        "[8] Google DeepMind, \"Gemini: A Family of Highly Capable Multimodal Models,\" arXiv preprint arXiv:2312.11805, 2023.",
        "[9] National Legal Services Authority (NALSA), \"Handbook on Legal Aid and Lok Adalats under the Legal Services Authorities Act, 1987,\" New Delhi, 2022.",
        "[10] Razorpay Developer Platform, \"Payment Gateway Security and Cryptographic HMAC-SHA256 Signature Verification Standards,\" Developer Documentation, 2024.",
        "[11] Supreme Court of India, \"e-Courts Project: Phase III Vision Document,\" e-Committee, Supreme Court of India, New Delhi, 2023.",
        "[12] K. D. Gaur, \"A Textbook on the Indian Penal Code and Bharatiya Nyaya Sanhita,\" 8th ed., Universal Law Publishing, New Delhi, 2024.",
        "[13] M. P. Jain, \"Indian Constitutional Law: Access to Justice under Article 21 and Article 39A,\" 9th ed., LexisNexis Butterworths, 2023.",
        "[14] V. N. Shukla, \"Constitution of India: Directive Principles of State Policy and Free Legal Aid,\" 14th ed., Eastern Book Company, Lucknow, 2022."
    ]
    for ref in ref_items:
        p_rf = doc.add_paragraph()
        r = p_rf.add_run(ref)
        r.font.name = "Times New Roman"
        r.font.size = Pt(9.5)
        p_rf.space_after = Pt(4)

    # Save Word document
    out_path = os.path.join(os.getcwd(), "Vakil_Setu_Synopsis.docx")
    doc.save(out_path)
    print(f"Vakil_Setu_Synopsis.docx generated successfully at: {out_path}")

if __name__ == "__main__":
    create_synopsis_docx()
