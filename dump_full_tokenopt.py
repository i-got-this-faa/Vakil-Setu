import pymupdf

doc = pymupdf.open('tokenopt.pdf')

for i, page in enumerate(doc):
    with open(f'tokenopt_page_{i+1}.txt', 'w', encoding='utf-8') as f:
        f.write(f"=== PAGE {i+1} ===\n")
        f.write(page.get_text('text'))

print("All 11 pages dumped into tokenopt_page_*.txt")
