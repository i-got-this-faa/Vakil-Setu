import matplotlib.pyplot as plt
import matplotlib.patches as patches

# Set high DPI for crisp publication quality (16:9 aspect ratio: 3840 x 2160)
fig, ax = plt.subplots(figsize=(16, 9), dpi=240)
fig.patch.set_facecolor('#0B0F19') # Sleek dark slate canvas matching modern systems diagrams
ax.set_facecolor('#0B0F19')
ax.set_xlim(0, 1600)
ax.set_ylim(0, 900)
ax.axis('off')

# Color Palette: Clean Systems Engineering (Deep Navy, Slate, Gold/Amber, Emerald, Crimson, Cyan)
C_DARK = '#0F172A'
C_CARD = '#1E293B'
C_BORDER = '#334155'
C_NAVY_BANNER = '#0C447C'
C_AMBER = '#D97706'
C_AMBER_BANNER = '#B45309'
C_GREEN = '#15803D'
C_BLUE = '#1E40AF'
C_CYAN = '#0284C7'
C_TEXT_WHITE = '#F8FAFC'
C_TEXT_MUTED = '#94A3B8'
C_ARROW = '#38BDF8'

def draw_box(x, y, w, h, title, banner_color, subtext="", items=None, border_color=C_BORDER):
    # Main Card
    rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=12",
                                  facecolor=C_CARD, edgecolor=border_color, linewidth=2)
    ax.add_patch(rect)
    
    # Header Banner
    banner_h = 42
    banner = patches.FancyBboxPatch((x, y + h - banner_h), w, banner_h,
                                    boxstyle="round,pad=0,rounding_size=12",
                                    facecolor=banner_color, edgecolor=banner_color, linewidth=1)
    ax.add_patch(banner)
    # Square off the bottom of the banner
    rect_sq = patches.Rectangle((x, y + h - banner_h), w, 12, facecolor=banner_color, edgecolor=banner_color)
    ax.add_patch(rect_sq)
    
    ax.text(x + w/2, y + h - banner_h/2, title, color=C_TEXT_WHITE, fontsize=13, fontweight='bold',
            ha='center', va='center')
    
    curr_y = y + h - banner_h - 22
    if subtext:
        ax.text(x + w/2, curr_y, subtext, color=C_AMBER, fontsize=10.5, fontweight='bold', ha='center', va='center')
        curr_y -= 26
        
    if items:
        for it in items:
            ax.text(x + 20, curr_y, f"• {it}", color=C_TEXT_WHITE, fontsize=10, ha='left', va='center')
            curr_y -= 24

# Title Banner
ax.text(800, 865, "VAKIL SETU: SYSTEM ARCHITECTURE & DATA PIPELINE", color=C_TEXT_WHITE, fontsize=20,
        fontweight='bold', ha='center', va='center')
ax.text(800, 835, "Decoupled Five-Tier Execution Topology: In-Browser STT ──► Dual-Engine AI Triage ──► MongoDB Directory ──► Razorpay Escrow",
        color=C_AMBER, fontsize=11, fontweight='semibold', ha='center', va='center')

# Tier 1: Client Layer (Left Column)
draw_box(40, 240, 360, 540, "1. CLIENT PRESENTATION LAYER", C_NAVY_BANNER, "React 18 + Vite (SPA) on Localhost",
         [
             "Hands-Free Voice Ingestion",
             "  - W3C Web Speech API",
             "  - Dynamic BCP-47 (hi-IN / en-IN)",
             "  - Live Interim Token Streaming",
             "",
             "Accessibility Speech Synthesis",
             "  - Native window.speechSynthesis",
             "  - Spoken Hindi/English Audio",
             "",
             "Interactive Case Hero & UI",
             "  - Urgency Gauge & Domain Badges",
             "  - Emergency 1-Tap SOS Hub",
             "",
             "Client State & Cache",
             "  - React AppContext Provider",
             "  - LocalStorage Session Storage"
         ])

# Tier 2: API Gateway & Runtime (Middle-Left)
draw_box(440, 240, 340, 540, "2. API GATEWAY & RUNTIME", C_BLUE, "Node.js (v20+ LTS) + Express.js",
         [
             "Stateless REST Routing:",
             "  - POST /api/ai/triage",
             "  - POST /api/ai/classify",
             "  - POST /api/advocates/match",
             "  - POST /api/bookings",
             "  - POST /api/payments/*",
             "  - POST /api/emergency",
             "",
             "Security & Interceptors:",
             "  - Strict CORS Policy",
             "  - Request Body Sanitization",
             "  - Environment Isolation (.env)",
             "  - Centralized Error Middleware",
             "",
             "Async Non-Blocking I/O:",
             "  - Low Memory Footprint",
             "  - High Concurrency Dispatch"
         ])

# Tier 3: Dual-Engine AI Intelligence Layer (Top-Right)
draw_box(820, 530, 370, 250, "3. DUAL-ENGINE AI TRIAGE", C_AMBER_BANNER, "Resilient Statutory Intelligence",
         [
             "Primary: Google Gemini 2.0 / LLM",
             "  - Strict JSON Schema Output",
             "  - Indian Statutory Codes (BNS, CPC)",
             "  - Sliding 10-Turn Context Window",
             "",
             "Failover: Local Regex Engine",
             "  - Zero-Downtime Rule Matcher",
             "  - Instant Trigger on 429 / 503 / Drops",
             "  - Bilingual Heuristic Logic (hi / en)"
         ])

# Tier 4: Data Persistence & Ingestion Layer (Bottom-Right)
draw_box(820, 240, 370, 260, "4. DATA & INGESTION LAYER", C_GREEN, "MongoDB Atlas + Cheerio Crawler",
         [
             "MongoDB Atlas via Mongoose ODM:",
             "  - Advocate Collection (Domain index)",
             "  - Booking Ledger (Status & order IDs)",
             "  - User Collection (Guest sessions)",
             "",
             "Autonomous Scraper Pipeline:",
             "  - Cheerio Headless Parser",
             "  - Schema.org LD+JSON Extractor",
             "  - LawRato Directory Crawler",
             "  - Deduplication & Atomic Upserts"
         ])

# Tier 5: External Security & Payment Rail (Far Right)
draw_box(1230, 240, 330, 540, "5. ESCROW & EXTERNAL RAILS", C_CYAN, "Razorpay API & Statutory Services",
         [
             "Razorpay Escrow Gateway:",
             "  - Orders API (Order Generation)",
             "  - Checkout Modal SDK",
             "  - HMAC SHA-256 Sign Verification",
             "  - Automated Regulatory Refund API",
             "",
             "Regulatory Verification Hook:",
             "  - State Bar Council Enrolment",
             "  - AIBE COP Validation Status",
             "  - 24-Hour Suspension Quarantine",
             "",
             "Public Legal Aid Connectors:",
             "  - NALSA 24/7 Helpline (15100)",
             "  - Emergency SOS Dial (112, 1091)",
             "  - DLSA Legal Aid Clinic Directory"
         ])

# Connector Arrows & Protocols
def draw_arrow(x1, y1, x2, y2, label=""):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="->", color=C_ARROW, lw=2.5, mutation_scale=18))
    if label:
        mx, my = (x1 + x2)/2, (y1 + y2)/2
        ax.text(mx, my + 14, label, color=C_TEXT_WHITE, fontsize=9.5, fontweight='bold',
                ha='center', va='center', bbox=dict(boxstyle="round,pad=0.2", facecolor='#0B0F19', edgecolor=C_ARROW, lw=1))

draw_arrow(400, 510, 440, 510, "JSON / HTTPS")
draw_arrow(780, 655, 820, 655, "Triage Payload")
draw_arrow(780, 370, 820, 370, "Mongoose ODM")
draw_arrow(1190, 655, 1230, 655, "Triage Contract")
draw_arrow(1190, 370, 1230, 370, "HMAC SHA-256")

# Bottom System Footnote & Standards
ax.text(800, 150, "Data Security & Compliance: Transport Layer Security (TLS 1.3)  •  DPDP Act 2023 Ephemeral Caching  •  Advocates Act 1961 Section 29 Compliance  •  BCI Rule 36 Adherence",
        color=C_TEXT_MUTED, fontsize=10, ha='center', va='center')

plt.tight_layout()
plt.savefig("vakil_setu_architecture.png", facecolor='#0B0F19', edgecolor='none')
print("vakil_setu_architecture.png successfully generated (16:9 ratio, 3840x2160)")
