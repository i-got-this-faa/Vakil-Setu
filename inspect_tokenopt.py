import pymupdf
import json

doc = pymupdf.open('tokenopt.pdf')

print("Total pages:", len(doc))

for i, page in enumerate(doc):
    print(f"\n==================== PAGE {i+1} ====================")
    rect = page.rect
    print(f"Page rect: width={rect.width}, height={rect.height}")
    
    # Check images
    images = page.get_images()
    print(f"Images ({len(images)}): {images}")

    # Inspect text blocks
    text_page = page.get_text("dict")
    for b in text_page["blocks"]:
        if "lines" in b:
            for l in b["lines"]:
                for s in l["spans"]:
                    t = s["text"].strip()
                    if t:
                        font = s["font"]
                        sz = round(s["size"], 1)
                        col = hex(s["color"])
                        bbox = [round(x, 1) for x in s["bbox"]]
                        print(f"[{sz}pt | {font} | {col}] {t}")
