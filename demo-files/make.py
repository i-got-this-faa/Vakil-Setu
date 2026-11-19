# Generates fictional sample documents for testing the app's "attach document" feature.
# All names, numbers and addresses are invented. Every file is marked SAMPLE.
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).parent
styles = getSampleStyleSheet()
body = ParagraphStyle("b", parent=styles["Normal"], fontSize=11, leading=16, spaceAfter=8)
head = ParagraphStyle("h", parent=styles["Title"], fontSize=15, spaceAfter=10)
small = ParagraphStyle("s", parent=body, fontSize=9, textColor=colors.grey)


def pdf(name, flow):
    doc = SimpleDocTemplate(str(OUT / name), pagesize=A4, leftMargin=22 * mm, rightMargin=22 * mm, topMargin=18 * mm, bottomMargin=18 * mm)
    doc.build([Paragraph("SAMPLE DOCUMENT FOR TESTING - NOT A REAL NOTICE", small), Spacer(1, 4)] + flow)


# 1. Legal notice for a bounced cheque (NI Act section 138) - the receiver asks "what should I do?"
pdf("1_cheque_bounce_legal_notice.pdf", [
    Paragraph("LEGAL NOTICE UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881", head),
    Paragraph("Date: 04 November 2026<br/>By Registered Post A.D.", body),
    Paragraph("To,<br/>Shri Rakesh Kumar Verma<br/>House No. 214, Gandhi Nagar, Jammu - 180004", body),
    Paragraph("Under instructions from my client, Shri Anil Gupta, resident of Trikuta Nagar, Jammu, I hereby serve you with the following notice:", body),
    Paragraph("1. That you had taken a friendly loan of Rs. 1,50,000/- (Rupees One Lakh Fifty Thousand only) from my client in March 2026 and promised to repay it by September 2026.", body),
    Paragraph("2. That towards repayment you issued cheque No. 004512 dated 10 October 2026 for Rs. 1,50,000/- drawn on Demo Cooperative Bank Ltd., Gandhi Nagar branch, Jammu.", body),
    Paragraph("3. That the said cheque, when presented by my client, was returned unpaid by the bank on 22 October 2026 with the remark <b>\"FUNDS INSUFFICIENT\"</b>.", body),
    Paragraph("4. That you are hereby called upon to pay the said amount of Rs. 1,50,000/- to my client <b>within 15 days</b> of receipt of this notice, failing which my client shall be constrained to initiate criminal proceedings against you under Section 138 of the Negotiable Instruments Act, 1881, besides civil proceedings for recovery, entirely at your risk as to costs and consequences.", body),
    Spacer(1, 10),
    Paragraph("Sd/-<br/>Adv. Meenakshi Sharma<br/>Advocate, District Court, Jammu<br/>Counsel for Shri Anil Gupta", body),
])

# 2. Termination letter withholding salary and gratuity - employee asks "is this legal?"
pdf("2_termination_letter_salary_withheld.pdf", [
    Paragraph("SUNRISE TEXTILES PVT. LTD.", head),
    Paragraph("Industrial Area, Phase II, Gangyal, Jammu - 180010", body),
    Paragraph("Ref: STPL/HR/2026/118 &nbsp;&nbsp;&nbsp; Date: 12 November 2026", body),
    Paragraph("To,<br/>Ms. Sunita Devi<br/>Machine Operator, Employee Code ST-0457", body),
    Paragraph("<b>Subject: Termination of Services</b>", body),
    Paragraph("This is to inform you that your services with the company are terminated with immediate effect due to restructuring of the production unit.", body),
    Paragraph("You have been employed with the company since 01 August 2019. Please note that your salary for the months of <b>September and October 2026</b> will be released only after the company's financial position improves. No gratuity will be payable as the company is facing losses this year.", body),
    Paragraph("You are requested to return your ID card and locker keys to the HR department by 15 November 2026. No notice pay will be given.", body),
    Spacer(1, 10),
    Paragraph("For Sunrise Textiles Pvt. Ltd.<br/>Sd/-<br/>R. K. Bhatia, HR Manager", body),
])

# 3. Photo of a bank cheque-return memo (image upload path)
W, H = 1240, 820
img = Image.new("RGB", (W, H), (252, 250, 243))
d = ImageDraw.Draw(img)
def font(size, bold=False):
    for p in (f"/usr/share/fonts/TTF/DejaVuSans{'-Bold' if bold else ''}.ttf", "/usr/share/fonts/TTF/DejaVuSans.ttf"):
        try: return ImageFont.truetype(p, size)
        except OSError: pass
    return ImageFont.load_default()
d.rectangle([20, 20, W - 20, H - 20], outline=(40, 60, 120), width=4)
d.text((50, 45), "DEMO COOPERATIVE BANK LTD. - Gandhi Nagar, Jammu", font=font(34, True), fill=(20, 40, 110))
d.text((50, 100), "CHEQUE RETURN MEMO", font=font(30, True), fill=(160, 20, 20))
d.text((W - 330, 105), "SAMPLE - NOT REAL", font=font(24, True), fill=(200, 0, 0))
rows = [
    ("Date of return", "22-10-2026"),
    ("Cheque No.", "004512"),
    ("Cheque date", "10-10-2026"),
    ("Amount", "Rs. 1,50,000/-"),
    ("Drawer", "Rakesh Kumar Verma, A/c XXXXXX4471"),
    ("Payee / presented by", "Anil Gupta"),
    ("Reason for return", "01 - FUNDS INSUFFICIENT"),
]
y = 170
for k, v in rows:
    d.text((60, y), k, font=font(28), fill=(60, 60, 60))
    d.text((470, y), ": " + v, font=font(28, k == "Reason for return"), fill=(150, 0, 0) if k == "Reason for return" else (20, 20, 20))
    y += 62
d.text((60, H - 140), "This cheque is returned unpaid for the reason marked above.", font=font(24), fill=(60, 60, 60))
d.ellipse([W - 300, H - 230, W - 80, H - 60], outline=(40, 60, 160), width=5)
d.text((W - 262, H - 160), "BRANCH STAMP", font=font(24, True), fill=(40, 60, 160))
img = img.rotate(-2, expand=True, fillcolor=(200, 200, 200))  # looks like a phone photo
img.save(OUT / "3_cheque_return_memo.jpg", quality=88)
print("ok")
