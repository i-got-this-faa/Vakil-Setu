import os
import pptx
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    # 16:9 widescreen layout
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Color Palette: Professional Legal Tech (No AI Slop)
    # Deep Navy, Slate, Warm Amber/Bronze, Clean White, Crisp Borders
    COLOR_BG_DARK = RGBColor(15, 23, 42)       # Slate 900
    COLOR_CARD_DARK = RGBColor(30, 41, 59)     # Slate 800
    COLOR_BG_LIGHT = RGBColor(248, 250, 252)   # Slate 50
    COLOR_WHITE = RGBColor(255, 255, 255)
    COLOR_PRIMARY = RGBColor(15, 23, 42)       # Slate 900
    COLOR_NAVY = RGBColor(12, 68, 124)         # Legal Navy
    COLOR_AMBER = RGBColor(217, 119, 6)        # Warm Amber / Bronze
    COLOR_AMBER_LIGHT = RGBColor(254, 243, 199)
    COLOR_CRIMSON = RGBColor(185, 28, 28)      # Legal Red
    COLOR_SLATE_700 = RGBColor(51, 65, 85)
    COLOR_MUTED = RGBColor(100, 116, 139)      # Slate 500
    COLOR_BORDER = RGBColor(226, 232, 240)     # Slate 200
    COLOR_CARD_BG = RGBColor(255, 255, 255)    # Clean White
    COLOR_ACCENT_BG = RGBColor(241, 245, 249)  # Slate 100
    COLOR_GREEN = RGBColor(22, 101, 52)        # Forest Green
    COLOR_GREEN_BG = RGBColor(240, 253, 244)

    def add_header(slide, title, category, light=True):
        # Header banner text
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.45), Inches(11.7), Inches(1.1))
        tf = title_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        
        p_cat = tf.paragraphs[0]
        p_cat.text = category.upper()
        p_cat.font.size = Pt(10)
        p_cat.font.bold = True
        p_cat.font.color.rgb = COLOR_AMBER if light else RGBColor(245, 158, 11)
        
        p_title = tf.add_paragraph()
        p_title.text = title
        p_title.font.size = Pt(22)
        p_title.font.bold = True
        p_title.font.color.rgb = COLOR_PRIMARY if light else COLOR_WHITE
        p_title.space_before = Pt(4)

    def draw_card(slide, left, top, width, height, bg_color=COLOR_CARD_BG, border_color=COLOR_BORDER):
        shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        shape.fill.solid()
        shape.fill.fore_color.rgb = bg_color
        if border_color:
            shape.line.color.rgb = border_color
            shape.line.width = Pt(1.2)
        else:
            shape.line.fill.background()
        return shape

    # =========================================================================
    # SLIDE 1: TITLE SLIDE (Cover / Front Page)
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    bg1 = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg1.fill.solid()
    bg1.fill.fore_color.rgb = COLOR_BG_DARK
    bg1.line.fill.background()

    # Left accent bar
    bar = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.2), Inches(0.12), Inches(4.8))
    bar.fill.solid()
    bar.fill.fore_color.rgb = COLOR_AMBER
    bar.line.fill.background()

    # Main Title Box
    tbox = s1.shapes.add_textbox(Inches(1.2), Inches(1.1), Inches(11.0), Inches(2.2))
    tf = tbox.text_frame
    tf.word_wrap = True
    
    p0 = tf.paragraphs[0]
    p0.text = "ACADEMIC CAPSTONE PROJECT PRESENTATION"
    p0.font.size = Pt(11)
    p0.font.bold = True
    p0.font.color.rgb = RGBColor(245, 158, 11)
    
    p1 = tf.add_paragraph()
    p1.text = "VAKIL SETU (वकील सेतु)"
    p1.font.size = Pt(36)
    p1.font.bold = True
    p1.font.color.rgb = COLOR_WHITE
    p1.space_before = Pt(6)

    p2 = tf.add_paragraph()
    p2.text = "Voice-First Bilingual Legal Triage & Advocate Discovery Platform"
    p2.font.size = Pt(18)
    p2.font.color.rgb = RGBColor(203, 213, 225)
    p2.space_before = Pt(4)

    # Sub-tagline
    p3 = tf.add_paragraph()
    p3.text = "Bridging the First-Mile Justice Divide with In-Browser Voice Processing, AI Legal Triage under Indian Law, and Secure Consultation Booking"
    p3.font.size = Pt(12)
    p3.font.color.rgb = RGBColor(148, 163, 184)
    p3.space_before = Pt(6)

    # Two metadata cards: Team Details & Institution
    # Card 1: Team Members
    c_team = draw_card(s1, Inches(1.2), Inches(3.8), Inches(5.6), Inches(2.8), COLOR_CARD_DARK, RGBColor(51, 65, 85))
    tb_team = s1.shapes.add_textbox(Inches(1.4), Inches(3.9), Inches(5.2), Inches(2.6))
    tf_team = tb_team.text_frame
    tf_team.word_wrap = True
    
    p_th = tf_team.paragraphs[0]
    p_th.text = "PRESENTED BY (STUDENT DETAILS)"
    p_th.font.size = Pt(11)
    p_th.font.bold = True
    p_th.font.color.rgb = RGBColor(245, 158, 11)

    members = [
        ("Student 1 (Lead):", "[Your Full Name]  |  Roll No: [Your Roll Number]"),
        ("Teammate 2:", "[Teammate 2 Name]  |  Roll No: [Roll Number]"),
        ("Teammate 3:", "[Teammate 3 Name]  |  Roll No: [Roll Number]"),
        ("Teammate 4:", "[Teammate 4 Name]  |  Roll No: [Roll Number]")
    ]
    for label, val in members:
        p = tf_team.add_paragraph()
        p.text = f"{label} {val}"
        p.font.size = Pt(10)
        p.font.color.rgb = RGBColor(226, 232, 240)
        p.space_before = Pt(5)

    # Card 2: Faculty & Institution
    c_inst = draw_card(s1, Inches(7.1), Inches(3.8), Inches(5.2), Inches(2.8), COLOR_CARD_DARK, RGBColor(51, 65, 85))
    tb_inst = s1.shapes.add_textbox(Inches(7.3), Inches(3.9), Inches(4.8), Inches(2.6))
    tf_inst = tb_inst.text_frame
    tf_inst.word_wrap = True

    p_ih = tf_inst.paragraphs[0]
    p_ih.text = "SUPERVISION & INSTITUTION"
    p_ih.font.size = Pt(11)
    p_ih.font.bold = True
    p_ih.font.color.rgb = RGBColor(245, 158, 11)

    inst_data = [
        ("Project Supervisor:", "[Faculty Guide / Professor Name]"),
        ("Designation:", "[Assistant Professor / Associate Professor]"),
        ("Department:", "Department of Computer Science & Engineering"),
        ("Institution:", "[Institute / University Name]"),
        ("Academic Session:", "2025 – 2026")
    ]
    for label, val in inst_data:
        p = tf_inst.add_paragraph()
        p.text = f"{label} {val}"
        p.font.size = Pt(10)
        p.font.color.rgb = RGBColor(226, 232, 240)
        p.space_before = Pt(5)

    # =========================================================================
    # SLIDE 2: PROBLEM STATEMENT
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    add_header(s2, "The First-Mile Crisis in Access to Legal Justice", "Problem Statement & Context")

    # Overview Subtitle
    sub_box = s2.shapes.add_textbox(Inches(0.8), Inches(1.6), Inches(11.7), Inches(0.55))
    sub_tf = sub_box.text_frame
    sub_p = sub_tf.paragraphs[0]
    sub_p.text = "Over 50 Million cases are pending in Indian courts. Yet for the average citizen facing a legal dispute, the biggest hurdle is not inside the courtroom—it is knowing where, when, and how to start."
    sub_p.font.size = Pt(12)
    sub_p.font.color.rgb = COLOR_MUTED

    # 4 Visual Problem Pillar Cards
    problems = [
        ("01", "Domain & Urgency Ambiguity", 
         "The First-Mile Confusion",
         "Citizens cannot identify whether their crisis falls under Criminal, Civil, Family, or Property law. Inability to gauge statutory urgency (bail windows, notice response limits) leads to critical procedural lapses.",
         "Impact: Missed deadlines, escalated penalties, loss of legal remedies."),
        
        ("02", "Linguistic & Literacy Barrier", 
         "The Jargon Exclusion",
         "90%+ of existing legal resources and portals are English-heavy and dense with statutory jargon (IPC/BNS, CrPC, CPC). Semi-urban and rural litigants comfortable in Hindi or spoken dialects are completely shut out.",
         "Impact: Severe cognitive overload, helplessness, dependency on touts."),
        
        ("03", "Trust Deficit & Opaque Discovery", 
         "The Unregulated Intermediary Trap",
         "Finding an advocate who genuinely specializes in the relevant domain is a gamble. Citizens rely on unverified referrals, face arbitrary consultation pricing, and risk exploitation by middlemen.",
         "Impact: Exorbitant initial costs, mismatched legal representation."),
        
        ("04", "Lack of Accessibility & Triage Tools", 
         "Typing vs. Speaking Gap",
         "Traditional portals assume high-speed typing and structured query formulation. Under stressful situations (police harassment, evictions, domestic abuse), typing a structured complaint is unrealistic.",
         "Impact: Inaction during early-stage dispute resolution when settlement is easiest.")
    ]

    card_w = Inches(2.75)
    card_h = Inches(4.6)
    spacing = Inches(0.23)
    start_x = Inches(0.8)
    start_y = Inches(2.25)

    for i, (num, title, subtitle, desc, impact) in enumerate(problems):
        x = start_x + i * (card_w + spacing)
        # Card Background
        draw_card(s2, x, start_y, card_w, card_h, COLOR_CARD_BG, COLOR_BORDER)
        
        # Inner Text
        tb = s2.shapes.add_textbox(x + Inches(0.2), start_y + Inches(0.2), card_w - Inches(0.4), card_h - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True
        
        # Number Badge
        p_num = tf.paragraphs[0]
        p_num.text = num
        p_num.font.size = Pt(18)
        p_num.font.bold = True
        p_num.font.color.rgb = COLOR_AMBER
        
        # Title
        p_t = tf.add_paragraph()
        p_t.text = title
        p_t.font.size = Pt(13)
        p_t.font.bold = True
        p_t.font.color.rgb = COLOR_PRIMARY
        p_t.space_before = Pt(4)

        # Subtitle
        p_sub = tf.add_paragraph()
        p_sub.text = subtitle.upper()
        p_sub.font.size = Pt(8.5)
        p_sub.font.bold = True
        p_sub.font.color.rgb = COLOR_NAVY
        p_sub.space_before = Pt(2)

        # Description
        p_desc = tf.add_paragraph()
        p_desc.text = desc
        p_desc.font.size = Pt(9.5)
        p_desc.font.color.rgb = COLOR_SLATE_700
        p_desc.space_before = Pt(8)

        # Impact Highlight Box (Bottom)
        p_imp = tf.add_paragraph()
        p_imp.text = impact
        p_imp.font.size = Pt(9)
        p_imp.font.bold = True
        p_imp.font.color.rgb = COLOR_CRIMSON
        p_imp.space_before = Pt(10)

    # =========================================================================
    # SLIDE 3: SOLUTION - VAKIL SETU
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    add_header(s3, "Vakil Setu: An End-to-End Voice-First Legal Bridge", "Proposed Solution & Value Proposition")

    # Overview Subtitle
    sub_box3 = s3.shapes.add_textbox(Inches(0.8), Inches(1.55), Inches(11.7), Inches(0.5))
    sub_tf3 = sub_box3.text_frame
    sub_p3 = sub_tf3.paragraphs[0]
    sub_p3.text = "A complete, closed-loop legal triage system that transforms unstructured spoken Hindi/English narratives into structured legal intelligence, expert advocate matching, and immediate appointment booking."
    sub_p3.font.size = Pt(11.5)
    sub_p3.font.color.rgb = COLOR_MUTED

    # 3 Large Feature Columns
    cols = [
        ("VOICE-FIRST INTAKE & TRIAGE", COLOR_NAVY, [
            ("Hands-Free Voice Recognition", "Native Web Speech API allows users to speak their dispute in Hindi, English, or mixed vernacular speech directly via the browser without typing."),
            ("AI-Driven Legal Domain Triage", "Intelligent LLM engine classifies narratives under Indian law into Criminal, Civil, Family, or Property law with 90%+ categorization precision."),
            ("Statutory Urgency Estimation", "Estimates severity across Low, Medium, High, and Emergency levels to prevent expired limitation windows and procedural defaults."),
            ("Devanagari / English TTS Audio Summary", "Converts legal triage summaries back into spoken audio for semi-literate users, explaining their rights without intimidating jargon.")
        ]),
        ("ADVOCATE MATCHING & DIRECTORY", COLOR_AMBER, [
            ("Specialization-Driven Matching", "Matches litigants only with verified advocates practicing in the identified domain, eliminating irrelevant referrals."),
            ("Transparent Professional Profiles", "Litigants inspect verified experience (years), bar practice credentials, spoken languages, and real user ratings."),
            ("Autonomous Directory Crawling", "Built-in web scraping engine (Cheerio) aggregates and standardizes public advocate profiles across legal registries into a unified database."),
            ("Emergency Priority Escalation", "High-stakes crises (arrest threats, domestic danger) trigger 1-tap priority advocate dispatch.")
        ]),
        ("TRANSACTION RAIL & ASSISTANT", COLOR_GREEN, [
            ("Integrated Consultation Booking", "Direct scheduling workflow linking the citizen's case context with the advocate's consultation calendar."),
            ("Cryptographic Razorpay Escrow", "End-to-end payment creation and verification using HMAC SHA-256 signatures, ensuring transparent, fixed consultation fees."),
            ("Context-Aware Legal Follow-Up Chat", "Multi-turn assistant maintains dialogue state, allowing users to ask follow-up questions about required documents, notices, and fees."),
            ("Zero-Barrier Guest Access", "Session-based local caching allows citizens to receive emergency guidance immediately without tedious registration walls.")
        ])
    ]

    col_w = Inches(3.73)
    col_h = Inches(4.8)
    col_spacing = Inches(0.25)

    for i, (title, accent_color, features) in enumerate(cols):
        cx = start_x + i * (col_w + col_spacing)
        draw_card(s3, cx, Inches(2.1), col_w, col_h, COLOR_CARD_BG, COLOR_BORDER)
        
        # Header banner inside card
        banner = s3.shapes.add_shape(MSO_SHAPE.RECTANGLE, cx, Inches(2.1), col_w, Inches(0.55))
        banner.fill.solid()
        banner.fill.fore_color.rgb = accent_color
        banner.line.fill.background()
        
        b_tb = s3.shapes.add_textbox(cx + Inches(0.15), Inches(2.15), col_w - Inches(0.3), Inches(0.45))
        b_tf = b_tb.text_frame
        b_p = b_tf.paragraphs[0]
        b_p.text = title
        b_p.font.size = Pt(11)
        b_p.font.bold = True
        b_p.font.color.rgb = COLOR_WHITE
        
        # Feature Items
        f_tb = s3.shapes.add_textbox(cx + Inches(0.2), Inches(2.75), col_w - Inches(0.4), col_h - Inches(0.75))
        f_tf = f_tb.text_frame
        f_tf.word_wrap = True
        
        first = True
        for f_title, f_desc in features:
            p_head = f_tf.paragraphs[0] if first else f_tf.add_paragraph()
            first = False
            p_head.text = f"• {f_title}"
            p_head.font.size = Pt(10)
            p_head.font.bold = True
            p_head.font.color.rgb = COLOR_PRIMARY
            p_head.space_before = Pt(6) if not first else Pt(0)
            
            p_body = f_tf.add_paragraph()
            p_body.text = f_desc
            p_body.font.size = Pt(8.5)
            p_body.font.color.rgb = COLOR_SLATE_700
            p_body.space_before = Pt(2)

    # =========================================================================
    # SLIDE 4: TECHNICAL ARCHITECTURE DIAGRAM (VISUAL HEAVY!)
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    add_header(s4, "System Architecture & High-Level Technical Design", "System Design & Architecture")

    # Architecture Container
    # 5 Horizontal Architecture Blocks (Layers)
    layers = [
        ("1. CLIENT & PRESENTATION LAYER (Vite + React 18 SPA)", Inches(1.7), Inches(1.1), COLOR_NAVY, [
            ("Voice Input & STT Engine", "Browser Web Speech API (hi-IN / en-IN) with interim live streaming"),
            ("Interactive Case Hero & Triage UI", "Visual domain badges, urgency gauges, and action item lists"),
            ("Bilingual Speech Synthesis (TTS)", "Native window.speechSynthesis reading legal actions aloud"),
            ("Session State & Local Cache", "React AppContext with resilient LocalStorage state persistence")
        ]),
        ("2. API GATEWAY & APPLICATION SERVER (Node.js + Express REST API)", Inches(3.0), Inches(1.0), RGBColor(30, 58, 138), [
            ("/api/ai (Triage & Classify)", "Orchestrates LLM prompts & multi-turn history"),
            ("/api/advocates (Directory & Match)", "Matches domain, rating, and availability"),
            ("/api/bookings (Appointment Lifecycle)", "Creates guest records & consultation slots"),
            ("/api/payments (Razorpay Gateway)", "Issues order IDs & verifies HMAC SHA-256")
        ]),
        ("3. AI & INTELLIGENCE ORCHESTRATION LAYER (Dual-Engine Failover)", Inches(4.2), Inches(1.15), RGBColor(120, 53, 15), [
            ("Primary: Gemini 2.0 / LLM Gateway", "Temperature 0.35, structured JSON schema, prompt engineering tailored to Indian statutes"),
            ("Language Detection & Normalizer", "Detects Devanagari / Roman-Hindi tokens to enforce native language UI responses"),
            ("Deterministic Rule-Based Failover", "Regex heuristics engine guarantees 100% triage uptime during network / API outages"),
            ("Multi-Turn Context Tracker", "Injects prior 10 dialogue turns to support follow-up legal queries without losing context")
        ]),
        ("4. DATA PERSISTENCE & INGESTION LAYER (MongoDB Atlas + Scraper)", Inches(5.55), Inches(1.0), RGBColor(22, 101, 52), [
            ("Advocate Collection", "Indexed by expertise, rating, experience, and availability"),
            ("Booking & Payment Ledger", "Tracks consultation time, payment status, and order IDs"),
            ("Cheerio Scraper Pipeline", "Crawls public legal directories (LawRato, etc.), normalizes & upserts lawyers"),
            ("User / Guest Identity Store", "Frictionless guest record provisioning with phone & language tags")
        ])
    ]

    for layer_title, top_y, layer_h, banner_color, submodules in layers:
        # Layer Box
        draw_card(s4, Inches(0.8), top_y, Inches(11.73), layer_h, COLOR_BG_LIGHT, COLOR_BORDER)
        
        # Left Accent Tab
        tab = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), top_y, Inches(2.8), layer_h)
        tab.fill.solid()
        tab.fill.fore_color.rgb = banner_color
        tab.line.fill.background()
        
        tab_tb = s4.shapes.add_textbox(Inches(0.9), top_y + Inches(0.1), Inches(2.6), layer_h - Inches(0.2))
        tab_tf = tab_tb.text_frame
        tab_tf.word_wrap = True
        tab_p = tab_tf.paragraphs[0]
        tab_p.text = layer_title
        tab_p.font.size = Pt(9.5)
        tab_p.font.bold = True
        tab_p.font.color.rgb = COLOR_WHITE
        
        # 4 Submodule blocks inside the layer
        sub_w = Inches(2.05)
        sub_h = layer_h - Inches(0.2)
        sub_start_x = Inches(3.75)
        
        for idx, (m_title, m_desc) in enumerate(submodules):
            mx = sub_start_x + idx * (sub_w + Inches(0.18))
            draw_card(s4, mx, top_y + Inches(0.1), sub_w, sub_h, COLOR_WHITE, COLOR_BORDER)
            
            m_tb = s4.shapes.add_textbox(mx + Inches(0.08), top_y + Inches(0.12), sub_w - Inches(0.16), sub_h - Inches(0.24))
            m_tf = m_tb.text_frame
            m_tf.word_wrap = True
            
            p_mt = m_tf.paragraphs[0]
            p_mt.text = m_title
            p_mt.font.size = Pt(8.5)
            p_mt.font.bold = True
            p_mt.font.color.rgb = COLOR_PRIMARY
            
            p_md = m_tf.add_paragraph()
            p_md.text = m_desc
            p_md.font.size = Pt(7.5)
            p_md.font.color.rgb = COLOR_SLATE_700
            p_md.space_before = Pt(2)

    # Bottom Protocol & Security Note
    sec_box = s4.shapes.add_textbox(Inches(0.8), Inches(6.75), Inches(11.73), Inches(0.4))
    sec_tf = sec_box.text_frame
    sec_p = sec_tf.paragraphs[0]
    sec_p.text = "Data Flow: HTTPS REST (JSON Payload)  •  Web Speech API (Browser Native STT/TTS)  •  Mongoose ODM (MongoDB Atlas)  •  Razorpay Webhook (HMAC SHA-256 Signature Verification)"
    sec_p.font.size = Pt(9)
    sec_p.font.bold = True
    sec_p.font.color.rgb = COLOR_NAVY
    sec_p.alignment = PP_ALIGN.CENTER

    # =========================================================================
    # SLIDE 5: TECHNICAL APPROACH & IMPLEMENTATION DEEP-DIVE
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    add_header(s5, "Core Technical Modules & Implementation Logic", "Technical Approach & Deep Dive")

    # 4 Detailed Technical Implementation Cards
    tech_cards = [
        ("VOICE PROCESSING PIPELINE", "In-Browser Low Latency Speech", [
            ("Zero Server Audio Cost", "Utilizes browser's native Web Speech Recognition API (`webkitSpeechRecognition`), processing audio locally on the device with zero cloud STT API expense."),
            ("Bilingual Locale Tagging", "Dynamically injects `hi-IN` or `en-IN` BCP-47 language codes based on user preference or automated character-set inference."),
            ("Real-Time Interim Streaming", "Displays intermediate transcripts character-by-character, allowing immediate user correction before submission."),
            ("Hands-Free Speech Synthesis", "Executes `window.speechSynthesis` with Indian accent locales to speak key analysis points back to the citizen.")
        ]),
        ("DUAL-ENGINE LEGAL TRIAGE", "Resilient AI Orchestration", [
            ("Strict Schema Enforcement", "Constrains LLM output into a strict JSON contract (`domain`, `urgency`, `summary`, `actions`), eliminating hallucinated UI payloads."),
            ("Indian Jurisprudence Context", "Prompt engineering tuned specifically for Indian legal principles (IPC/BNS criminal thresholds, CPC property disputes, family courts)."),
            ("Multi-Turn Context Window", "Maintains a sliding window of the last 10 conversational turns so users can ask contextual follow-ups without re-stating their case."),
            ("Deterministic Rule-Based Failover", "If the LLM endpoint suffers 429 rate-limiting or 503 gateway timeouts, regex pattern-matching automatically returns vetted legal advice.")
        ]),
        ("SCRAPING & DIRECTORY INGESTION", "Automated Knowledge Acquisition", [
            ("Cheerio DOM & LD+JSON Crawler", "Scrapes legal aggregators (LawRato) using multi-pattern heuristics to extract names, bar experience, ratings, and specialties."),
            ("Profile Enrichment & Deduplication", "Visits linked individual lawyer profiles to enrich secondary practice fields; deduplicates by slug and standardized full name."),
            ("Automated Domain Normalization", "Maps arbitrary practice descriptions into 4 canonical legal categories (Criminal, Civil, Family, Property) using keyword taxonomy."),
            ("MongoDB Upsert Pipeline", "Persists verified advocates into MongoDB with atomic upsert operations, preventing redundant record creation.")
        ]),
        ("TRANSACTION & SECURITY LIFECYCLE", "End-to-End Integrity Rail", [
            ("Cryptographic Payment Escrow", "Integrates Razorpay Orders API with server-side validation; authenticates consultation transactions with HMAC SHA-256 hashes."),
            ("Consultation Slot State Machine", "Implements booking status transitions (`pending` -> `confirmed` / `failed`) linked to verified payment IDs."),
            ("Session & Privacy Safeguards", "User case narratives and consultation history are cached in client-side LocalStorage, avoiding unencrypted storage of sensitive litigation facts."),
            ("Emergency Prioritization Router", "Autonomous emergency router queries top-rated active advocates with availability=true for critical legal interventions.")
        ])
    ]

    card5_w = Inches(5.7)
    card5_h = Inches(2.4)
    positions = [
        (Inches(0.8), Inches(1.8)),
        (Inches(6.8), Inches(1.8)),
        (Inches(0.8), Inches(4.5)),
        (Inches(6.8), Inches(4.5))
    ]

    for idx, (head, sub, bullets) in enumerate(tech_cards):
        x, y = positions[idx]
        draw_card(s5, x, y, card5_w, card5_h, COLOR_CARD_BG, COLOR_BORDER)
        
        tb = s5.shapes.add_textbox(x + Inches(0.2), y + Inches(0.15), card5_w - Inches(0.4), card5_h - Inches(0.3))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p_h = tf.paragraphs[0]
        p_h.text = head
        p_h.font.size = Pt(11)
        p_h.font.bold = True
        p_h.font.color.rgb = COLOR_NAVY
        
        p_s = tf.add_paragraph()
        p_s.text = sub.upper()
        p_s.font.size = Pt(8.5)
        p_s.font.bold = True
        p_s.font.color.rgb = COLOR_AMBER
        p_s.space_before = Pt(1)

        for b_title, b_text in bullets:
            p = tf.add_paragraph()
            p.text = f"• {b_title}: {b_text}"
            p.font.size = Pt(8.5)
            p.font.color.rgb = COLOR_SLATE_700
            p.space_before = Pt(3)

    # =========================================================================
    # SLIDE 6: FEASIBILITY & VIABILITY ANALYSIS
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    add_header(s6, "Multidimensional Feasibility & Viability Analysis", "Feasibility & Viability Analysis")

    # 4 Feasibility Pillars (Technical, Economic, Legal/Ethical, Operational)
    feasibility = [
        ("TECHNICAL FEASIBILITY", COLOR_NAVY, [
            ("Client-Side Speech API", "Eliminates high-cost cloud audio processing servers; Web Speech API is natively supported in 80%+ modern browsers (Chrome, Edge, Safari)."),
            ("Asynchronous Node.js Pipeline", "Non-blocking event loop handles high-concurrency consultation and triage requests with negligible CPU overhead."),
            ("Flexible Document Model", "MongoDB handles unstructured lawyer bios, case notes, and dynamic multilingual triage schemas without schema migration bottlenecks."),
            ("Zero-Dependency AI Fallback", "System continues providing immediate legal guidance even under complete cloud LLM API outage.")
        ]),
        ("ECONOMIC VIABILITY", COLOR_GREEN, [
            ("Minimal Infrastructure Cost", "Serverless/lightweight backend running on standard cloud compute; zero per-second audio streaming server costs."),
            ("Scalable Unit Economics", "API token costs are capped by strict token budgets (max 4096 tokens, temperature 0.35) and client-side conversation caching."),
            ("Sustainable Monetization", "Platform sustains via nominal convenience fee per confirmed consultation booking (e.g., 5-10%) and premium lawyer profile verification badges."),
            ("High Return on Investment", "Addresses a massive addressable legal market of 1.4B citizens with practically zero physical branch footprint.")
        ]),
        ("LEGAL & REGULATORY VIABILITY", COLOR_AMBER, [
            ("Advocates Act 1961 Compliance", "Platform acts strictly as an informational triage bridge, not a legal practitioner; clearly marked non-legal advice disclaimers protect against ethics violations."),
            ("Bar Council Advertising Norms", "Advocate listings are neutral, objective, and directory-based without hyperbolic promotional guarantees, complying with Rule 36 of BCI rules."),
            ("Citizen Data Confidentiality", "Case summaries are client-cached; sensitive litigation secrets are not permanently logged or sold to third-party ad networks."),
            ("Verified Payment Rails", "Razorpay integration ensures tax-compliant digital invoices and audit trails for all client-lawyer fee collections.")
        ]),
        ("OPERATIONAL & MARKET VIABILITY", RGBColor(124, 45, 18), [
            ("Massive Unserved Market", "Over 70% of Indian litigants reside in Tier-2, Tier-3, and rural areas where English-only portals fail completely."),
            ("Automated Advocate Supply", "Scraping pipeline continuously discovers and indexes practicing advocates without requiring manual data entry teams."),
            ("Frictionless Onboarding", "Guest-checkout allows immediate booking during high-stress crises without forcing account creation or password fatigue."),
            ("Court Decongestion Alignment", "Directly complements Govt. of India's Tele-Law and NALSA access-to-justice missions by filtering trivial disputes early.")
        ])
    ]

    card6_w = Inches(5.7)
    card6_h = Inches(2.4)

    for idx, (title, banner_color, points) in enumerate(feasibility):
        x, y = positions[idx]
        draw_card(s6, x, y, card6_w, card6_h, COLOR_CARD_BG, COLOR_BORDER)
        
        # Banner
        banner = s6.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, card6_w, Inches(0.42))
        banner.fill.solid()
        banner.fill.fore_color.rgb = banner_color
        banner.line.fill.background()
        
        b_tb = s6.shapes.add_textbox(x + Inches(0.15), y + Inches(0.05), card6_w - Inches(0.3), Inches(0.35))
        b_tf = b_tb.text_frame
        b_p = b_tf.paragraphs[0]
        b_p.text = title
        b_p.font.size = Pt(10.5)
        b_p.font.bold = True
        b_p.font.color.rgb = COLOR_WHITE
        
        # Points
        tb = s6.shapes.add_textbox(x + Inches(0.2), y + Inches(0.48), card6_w - Inches(0.4), card6_h - Inches(0.55))
        tf = tb.text_frame
        tf.word_wrap = True
        
        first = True
        for p_title, p_desc in points:
            p = tf.paragraphs[0] if first else tf.add_paragraph()
            first = False
            p.text = f"• {p_title}: {p_desc}"
            p.font.size = Pt(8.5)
            p.font.color.rgb = COLOR_SLATE_700
            p.space_before = Pt(3) if not first else Pt(0)

    # =========================================================================
    # SLIDE 7: IMPACTS & BENEFITS
    # =========================================================================
    s7 = prs.slides.add_slide(blank_layout)
    add_header(s7, "Multi-Stakeholder Impacts & Measurable Benefits", "Impacts & Ecosystem Benefits")

    # 3 Large Vertical Stakeholder Cards
    stakeholders = [
        ("FOR CITIZENS & LITIGANTS", "Empowerment & Inclusion", COLOR_NAVY, [
            ("80% Reduction in First-Mile Friction", "Instant clarity on case domain, urgency, and required paperwork eliminates weeks of confusion and anxiety."),
            ("Voice-First Linguistic Freedom", "Citizens comfortably narrate problems in Hindi or colloquial speech without needing English typing proficiency."),
            ("Elimination of Middleman Exploitation", "Direct access to verified advocates with transparent consultation pricing ends tout commissions."),
            ("Emergency Safety Net", "Instant priority escalation for victims facing imminent arrest, violence, or unlawful eviction.")
        ]),
        ("FOR ADVOCATES & LEGAL PRACTITIONERS", "Practice Efficiency & Growth", COLOR_AMBER, [
            ("Pre-Qualified, Domain-Specific Inquiries", "Advocates only receive inquiries matching their specific practice areas (e.g. Criminal vs. Property), ending wasted exploratory calls."),
            ("Automated Digital Practice Presence", "Legitimate advocates gain digital visibility and client discovery without violating Bar Council advertising restrictions."),
            ("Guaranteed Consultation Fee Escrow", "Digital booking eliminates unpaid consultations and payment disputes through upfront Razorpay escrow."),
            ("Structured Client Briefs", "Advocates receive a pre-synthesized AI case summary and timeline before the consultation starts.")
        ]),
        ("FOR THE JUDICIAL ECOSYSTEM & NATION", "Decongestion & Public Good", COLOR_GREEN, [
            ("Reduction in Frivolous Litigation", "Early triage informs citizens when their dispute is non-cognizable or better resolved via mediation, saving court resources."),
            ("Awareness of Free Legal Aid", "Directs underprivileged citizens to legal remedies and rights under Indian statutory frameworks."),
            ("Support for Digital India & e-Courts", "Acts as the citizen-facing bridge into India's evolving digital justice infrastructure (e-Courts, Tele-Law)."),
            ("Democratization of Legal Intelligence", "Transforms legal knowledge from a privileged luxury into an accessible, everyday public utility.")
        ])
    ]

    for i, (title, sub, accent_color, benefits) in enumerate(stakeholders):
        cx = start_x + i * (col_w + col_spacing)
        draw_card(s7, cx, Inches(1.8), col_w, Inches(5.1), COLOR_CARD_BG, COLOR_BORDER)
        
        # Banner
        banner = s7.shapes.add_shape(MSO_SHAPE.RECTANGLE, cx, Inches(1.8), col_w, Inches(0.6))
        banner.fill.solid()
        banner.fill.fore_color.rgb = accent_color
        banner.line.fill.background()
        
        b_tb = s7.shapes.add_textbox(cx + Inches(0.15), Inches(1.85), col_w - Inches(0.3), Inches(0.5))
        b_tf = b_tb.text_frame
        b_p = b_tf.paragraphs[0]
        b_p.text = title
        b_p.font.size = Pt(10.5)
        b_p.font.bold = True
        b_p.font.color.rgb = COLOR_WHITE
        
        b_p2 = b_tf.add_paragraph()
        b_p2.text = sub.upper()
        b_p2.font.size = Pt(7.5)
        b_p2.font.bold = True
        b_p2.font.color.rgb = RGBColor(241, 245, 249)
        
        # Items
        tb = s7.shapes.add_textbox(cx + Inches(0.2), Inches(2.55), col_w - Inches(0.4), Inches(4.2))
        tf = tb.text_frame
        tf.word_wrap = True
        
        first = True
        for b_title, b_desc in benefits:
            p_h = tf.paragraphs[0] if first else tf.add_paragraph()
            first = False
            p_h.text = f"✔ {b_title}"
            p_h.font.size = Pt(10)
            p_h.font.bold = True
            p_h.font.color.rgb = COLOR_PRIMARY
            p_h.space_before = Pt(8) if not first else Pt(0)
            
            p_b = tf.add_paragraph()
            p_b.text = b_desc
            p_b.font.size = Pt(8.5)
            p_b.font.color.rgb = COLOR_SLATE_700
            p_b.space_before = Pt(2)

    # =========================================================================
    # SLIDE 8: FUTURE ROADMAP & REFERENCES
    # =========================================================================
    s8 = prs.slides.add_slide(blank_layout)
    add_header(s8, "Future Engineering Roadmap & Academic References", "Roadmap & References")

    # Left Card: Future Roadmap (Inches 5.7 wide)
    draw_card(s8, Inches(0.8), Inches(1.8), Inches(5.7), Inches(5.1), COLOR_CARD_BG, COLOR_BORDER)
    tb_rm = s8.shapes.add_textbox(Inches(1.0), Inches(1.95), Inches(5.3), Inches(4.8))
    tf_rm = tb_rm.text_frame
    tf_rm.word_wrap = True
    
    p_rh = tf_rm.paragraphs[0]
    p_rh.text = "STRATEGIC FUTURE ROADMAP"
    p_rh.font.size = Pt(12)
    p_rh.font.bold = True
    p_rh.font.color.rgb = COLOR_NAVY

    roadmap_items = [
        ("Phase 1: Multi-Regional Indic Voice Expansion", "Extend beyond Hindi/English into 8 regional Indian languages (Bengali, Marathi, Tamil, Telugu, Punjabi, Gujarati) via Whisper fine-tuned on Indic dialects."),
        ("Phase 2: Legal Document OCR & Clause Analyzer", "Enable citizens to upload FIR copies, property lease agreements, and legal notices; extract critical deadlines, liabilities, and contradictory clauses automatically."),
        ("Phase 3: e-Courts CNR & Live Case Tracking", "Integrate directly with Indian e-Courts API to allow litigants to track pending hearing dates, court causes, and daily interim orders via case number (CNR)."),
        ("Phase 4: WebRTC In-Browser Encrypted Video Consult", "Introduce built-in, peer-to-peer encrypted video consultations and document screen-sharing between advocates and clients directly inside the platform.")
    ]

    for r_title, r_desc in roadmap_items:
        p = tf_rm.add_paragraph()
        p.text = f"• {r_title}"
        p.font.size = Pt(9.5)
        p.font.bold = True
        p.font.color.rgb = COLOR_PRIMARY
        p.space_before = Pt(7)
        
        pd = tf_rm.add_paragraph()
        pd.text = r_desc
        pd.font.size = Pt(8.5)
        pd.font.color.rgb = COLOR_SLATE_700
        pd.space_before = Pt(2)

    # Right Card: References (Inches 5.7 wide)
    draw_card(s8, Inches(6.8), Inches(1.8), Inches(5.7), Inches(5.1), COLOR_CARD_BG, COLOR_BORDER)
    tb_ref = s8.shapes.add_textbox(Inches(7.0), Inches(1.95), Inches(5.3), Inches(4.8))
    tf_ref = tb_ref.text_frame
    tf_ref.word_wrap = True
    
    p_refh = tf_ref.paragraphs[0]
    p_refh.text = "ACADEMIC, LEGAL & TECHNICAL REFERENCES"
    p_refh.font.size = Pt(12)
    p_refh.font.bold = True
    p_refh.font.color.rgb = COLOR_AMBER

    references = [
        ("Law Commission of India (Report No. 245 & 272)", "Recommendations on access to justice, court arrears, and institutional legal aid deployment."),
        ("Advocates Act, 1961 & Bar Council of India (BCI) Rules", "Standards of Professional Conduct and Etiquette (Rule 36 regarding legal directories and dignified publication)."),
        ("Ministry of Law and Justice, Govt. of India (2023)", "Tele-Law Programme: Reaching the Unreached through mainstreaming legal aid across Gram Panchayats."),
        ("Google DeepMind & Gemini 2.0 Technical Reports (2024)", "Capabilities in structured multilingual extraction, low-resource NLP, and latency-optimized reasoning."),
        ("W3C Web Speech API Specification (Community Group)", "Standards for in-browser speech recognition (`webkitSpeechRecognition`) and speech synthesis interfaces."),
        ("Razorpay Developer Platform & RBI Digital Payments Guidelines", "Cryptographic HMAC SHA-256 signature verification standards and tokenization for online escrow transactions.")
    ]

    for ref_title, ref_desc in references:
        p = tf_ref.add_paragraph()
        p.text = f"[{ref_title}]"
        p.font.size = Pt(9)
        p.font.bold = True
        p.font.color.rgb = COLOR_PRIMARY
        p.space_before = Pt(6)
        
        pd = tf_ref.add_paragraph()
        pd.text = ref_desc
        pd.font.size = Pt(8)
        pd.font.color.rgb = COLOR_SLATE_700
        pd.space_before = Pt(1)

    # Save presentation
    output_path = os.path.join(os.getcwd(), "Vakil_Setu_Presentation.pptx")
    prs.save(output_path)
    print(f"Presentation successfully created at: {output_path}")

if __name__ == "__main__":
    create_deck()
