
#set page(
  paper: "a4",
  margin: (x: 54pt, top: 54pt, bottom: 54pt),
  header: context {
    if counter(page).get().first() > 2 [
      #text(size: 8.5pt, fill: rgb("#64748b"))[Vakil Setu: A Voice-First Bilingual Legal Triage Platform | Mini Project Synopsis]
    ]
  },
  footer: context {
    if counter(page).get().first() > 1 [
      #align(center, text(size: 9.5pt)[#counter(page).get().first()])
    ]
  }
)
#set text(font: "Liberation Serif", size: 11.5pt)

= Page 1 (Cover)
This is cover.
#pagebreak()
= Page 2 (TOC)
This is TOC.
#pagebreak()
= Page 3 (Overview)
This is Overview with header.
