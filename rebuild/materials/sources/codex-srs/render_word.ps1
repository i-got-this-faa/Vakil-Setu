$srsWord = New-Object -ComObject Word.Application
$srsWord.Visible = $false
$srsWord.DisplayAlerts = 0
$srsDocument = $null
try {
    $srsDocument = $srsWord.Documents.Open('C:\Users\DELL\Vakil-Setu\output\reports\Vakil_Setu_SRS_From_Scratch.docx', $false, $true)
    $srsDocument.Repaginate()
    Write-Output ('Page count: ' + $srsDocument.ComputeStatistics(2))
    $srsDocument.ExportAsFixedFormat('C:\Users\DELL\Vakil-Setu\.codex-srs\render\srs.pdf', 17)
} finally {
    if ($null -ne $srsDocument) { $srsDocument.Close(0); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($srsDocument) }
    $srsWord.Quit()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($srsWord)
}
