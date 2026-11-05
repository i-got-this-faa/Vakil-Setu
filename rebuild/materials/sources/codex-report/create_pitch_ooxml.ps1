$ErrorActionPreference = 'Stop'
$taskRoot = 'C:\Users\DELL\Vakil-Setu'
$outputPath = Join-Path $taskRoot 'output\reports\Vakil_Setu_Director_Pitch.docx'
$qaDir = Join-Path $taskRoot '.codex-report\director-pitch-qa'
New-Item -ItemType Directory -Path (Split-Path $outputPath), $qaDir -Force | Out-Null
$script:body = [Text.StringBuilder]::new()
function Add-Paragraph([string]$text, [string]$style = 'Normal') {
    $styleId = $style.Replace(' ', '')
    [void]$script:body.Append('<w:p><w:pPr><w:pStyle w:val="' + $styleId + '"/></w:pPr>')
    $lines = $text -split '\r?\n'
    for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($i -gt 0) { [void]$script:body.Append('<w:r><w:br/></w:r>') }
        [void]$script:body.Append('<w:r><w:t xml:space="preserve">' + [Security.SecurityElement]::Escape($lines[$i]) + '</w:t></w:r>')
    }
    [void]$script:body.Append('</w:p>')
}
$source = [IO.File]::ReadAllText((Join-Path $taskRoot '.codex-report\build_director_pitch.ps1'))
$start = $source.IndexOf("    Add-Paragraph 'Vakil Setu Project Pitch'")
$stop = $source.IndexOf('    $document.BuiltInDocumentProperties')
$content = $source.Substring($start, $stop - $start)
$content = [regex]::Replace($content, '    \$endRange = .*\r?\n    \$endRange.InsertBreak\(7\)', '[void]$script:body.Append(''<w:p><w:r><w:br w:type="page"/></w:r></w:p>'')')
Invoke-Expression $content
$styles = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:color w:val="000000"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="140" w:line="255" w:lineRule="auto"/><w:widowControl/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:after="100"/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="48"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:after="240"/></w:pPr><w:rPr><w:color w:val="000000"/><w:sz w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="150" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="29"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="130" w:after="60"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="22"/></w:rPr></w:style>
</w:styles>
'@
$files = @{
    '[Content_Types].xml' = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'
    '_rels/.rels' = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
    'word/_rels/document.xml.rels' = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
    'word/styles.xml' = $styles
    'word/document.xml' = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + $script:body.ToString() + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="1100" w:bottom="850" w:left="1100" w:header="400" w:footer="400"/></w:sectPr></w:body></w:document>'
}
Add-Type -AssemblyName System.IO.Compression
$stream = [IO.File]::Open($outputPath, [IO.FileMode]::Create)
$zip = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($name in $files.Keys) {
        $entry = $zip.CreateEntry($name)
        $writer = [IO.StreamWriter]::new($entry.Open(), [Text.UTF8Encoding]::new($false))
        $writer.Write($files[$name])
        $writer.Dispose()
    }
} finally { $zip.Dispose(); $stream.Dispose() }
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $null
try {
    $doc = $word.Documents.Open($outputPath, $false, $true)
    $doc.Repaginate()
    Write-Output ('PAGES=' + $doc.ComputeStatistics(2))
    Write-Output ('WORDS=' + $doc.ComputeStatistics(0))
    $doc.ActiveWindow.View.Type = 3
    $pages = $doc.ActiveWindow.ActivePane.Pages
    Write-Output ('RENDERPAGES=' + $pages.Count)
    for ($pageIndex = 1; $pageIndex -le $pages.Count; $pageIndex++) {
        [byte[]]$emfBytes = $pages.Item($pageIndex).EnhMetaFileBits
        [IO.File]::WriteAllBytes((Join-Path $qaDir ('page-' + $pageIndex + '.emf')), $emfBytes)
    }
} finally {
    if ($null -ne $doc) { $doc.Close(0) }
    $word.Quit()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word)
}
Write-Output ('DOCX=' + $outputPath)
