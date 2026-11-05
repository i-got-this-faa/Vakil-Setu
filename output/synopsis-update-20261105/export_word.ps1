param([string]$InputPath,[string]$PdfPath)
$ErrorActionPreference='Stop'
$word=New-Object -ComObject Word.Application
$word.Visible=$false
$word.DisplayAlerts=0
try {
  $doc=$word.Documents.Open($InputPath,$false,$false)
  $doc.Repaginate()
  $doc.Fields.Update() | Out-Null
  $doc.Save()
  $doc.ExportAsFixedFormat($PdfPath,17)
  $doc.Close(0)
} finally { $word.Quit() }
