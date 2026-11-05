$ErrorActionPreference = 'Stop'
$taskRoot = 'C:\Users\DELL\Vakil-Setu'
$outputPath = Join-Path $taskRoot 'output\reports\Vakil_Setu_Director_Pitch.docx'
$qaDir = Join-Path $taskRoot '.codex-report\director-pitch-qa'
New-Item -ItemType Directory -Path (Split-Path $outputPath), $qaDir -Force | Out-Null

function Add-Paragraph([string]$text, [string]$style = 'Normal') {
    $paragraph = $script:document.Content.Paragraphs.Add()
    $paragraph.Range.Text = $text
    $styleIds = @{ Normal = -1; Title = -63; Subtitle = -75; 'Heading 1' = -2; 'Heading 2' = -3 }; $paragraph.Range.Style = $styleIds[$style]
    $paragraph.Range.InsertParagraphAfter()
}

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$document = $null
try {
    $script:document = $word.Documents.Add()
    $document = $script:document
    $document.PageSetup.PaperSize = 7
    $document.PageSetup.TopMargin = 48
    $document.PageSetup.BottomMargin = 48
    $document.PageSetup.LeftMargin = 57
    $document.PageSetup.RightMargin = 57
    foreach ($styleName in @('Normal','Title','Subtitle','Heading 1','Heading 2')) {
        $style = $document.Styles.Item($styleName)
        $style.Font.Name = 'Calibri'
        $style.Font.Color = 0
        $style.Font.Underline = 0
        $style.ParagraphFormat.Borders.Enable = 0
    }
    $normal = $document.Styles.Item('Normal')
    $normal.Font.Size = 11
    $normal.ParagraphFormat.SpaceAfter = 7
    $normal.ParagraphFormat.LineSpacingRule = 0
    $normal.ParagraphFormat.WidowControl = -1
    $document.Styles.Item('Title').Font.Size = 25
    $document.Styles.Item('Title').Font.Bold = -1
    $document.Styles.Item('Title').ParagraphFormat.SpaceAfter = 4
    $document.Styles.Item('Subtitle').Font.Size = 11
    $document.Styles.Item('Subtitle').ParagraphFormat.SpaceAfter = 14
    $document.Styles.Item('Heading 1').Font.Size = 15
    $document.Styles.Item('Heading 1').Font.Bold = -1
    $document.Styles.Item('Heading 1').ParagraphFormat.SpaceBefore = 9
    $document.Styles.Item('Heading 1').ParagraphFormat.SpaceAfter = 7
    $document.Styles.Item('Heading 1').ParagraphFormat.KeepWithNext = -1
    $document.Styles.Item('Heading 2').Font.Size = 11
    $document.Styles.Item('Heading 2').Font.Bold = -1
    $document.Styles.Item('Heading 2').ParagraphFormat.SpaceBefore = 7
    $document.Styles.Item('Heading 2').ParagraphFormat.SpaceAfter = 3
    $document.Styles.Item('Heading 2').ParagraphFormat.KeepWithNext = -1

    Add-Paragraph 'Vakil Setu Project Pitch' 'Title'
    Add-Paragraph 'Presentation to the College Director' 'Subtitle'
    Add-Paragraph 'Presentation script' 'Heading 1'
    Add-Paragraph 'Good morning, Sir or Ma''am.'
    Add-Paragraph 'Our project is Vakil Setu, a multilingual web platform that helps people explain a legal problem, find an appropriate advocate, and request a consultation.'
    Add-Paragraph 'The problem we address is the difficulty of taking the first step. Someone facing a property dispute, an employment issue, or a consumer complaint may not know which type of advocate to approach or how to explain the situation. Language can make this harder.'
    Add-Paragraph 'Vakil Setu brings that journey into one platform. A user creates an account, selects a language, and describes the problem. Our initial language scope is English, Hindi, and Punjabi. Users review and edit their text before saving it as a private case. Read-aloud functionality is included, while optional browser voice input still needs real microphone and language testing.'
    Add-Paragraph 'Users can discover advocates by expertise, language, location, and available consultation slots. They review the case summary they want to share before requesting a consultation. The advocate can accept or decline the request, and the user can track its status.'
    Add-Paragraph 'There are three roles: user, advocate, and administrator. Advocates submit professional details and credentials. Administrators review applications before profiles become publicly discoverable. The backend checks who is allowed to access private cases and perform each action.'
    Add-Paragraph 'We have also built an integration path for AI to produce a preliminary summary and legal category. The inference service is not connected and validated yet. Any future AI output will require review, and professional legal advice remains the advocate''s responsibility.'
    Add-Paragraph 'The current application uses Next.js and TypeScript, Clerk for authentication, and Convex for backend operations and storage. Development checks have demonstrated real sign-in and saving and retrieving a Punjabi intake. Consultation workflows are implemented and locally tested; complete hosted testing with separate accounts remains.'
    Add-Paragraph 'Our next step is a controlled pilot with advocates and users to evaluate usability, language quality, and the consultation process. We seek the college''s guidance and introductions to legal professionals to help organize that pilot.'
    Add-Paragraph 'Vakil Setu aims to make the first step toward legal help clearer, more accessible, and easier to manage. Thank you.'

    $endRange = $document.Range($document.Content.End - 1, $document.Content.End - 1)
    $endRange.InsertBreak(7)
    Add-Paragraph 'Director questions and demo notes' 'Heading 1'
    Add-Paragraph 'Use these notes for discussion after the pitch. The script takes approximately three minutes at a measured pace.'

    Add-Paragraph 'What makes this different from a lawyer directory' 'Heading 2'
    Add-Paragraph 'Vakil Setu connects multilingual problem intake, reviewed case sharing, advocate discovery, and consultation requests. A pilot must establish whether this combined workflow actually helps users.'
    Add-Paragraph 'Is the AI working now' 'Heading 2'
    Add-Paragraph 'The integration code exists, but the inference service is not connected and validated. We cannot yet claim working AI classification, legal accuracy, or DGX backed inference.'
    Add-Paragraph 'What has actually been demonstrated' 'Heading 2'
    Add-Paragraph 'Real application sign-in and saving and reloading a Punjabi intake have been demonstrated in development. Recorded local checks include 60 backend tests and 12 language tests. Those tests do not establish live legal accuracy or a complete real consultation journey.'
    Add-Paragraph 'How do you handle trust and privacy' 'Heading 2'
    Add-Paragraph 'The implementation restricts private cases and credentials by identity and role, requires approval before advocate discovery, and records consent for the summary shared with a consultation request. Real credential review procedures, retention rules, and checks across separate hosted accounts remain pilot requirements.'
    Add-Paragraph 'Is the project ready for public launch' 'Heading 2'
    Add-Paragraph 'It is a development prototype. Complete advocate onboarding and consultation checks, human language review, microphone testing, and operational policies are still required. Payments, ratings, guaranteed emergency connections, and a native mobile app are outside this MVP.'
    Add-Paragraph 'What support do you need from the college' 'Heading 2'
    Add-Paragraph 'Faculty mentorship, introductions to advocates or a legal aid partner, and support for a small supervised pilot beginning with synthetic cases. Costs and any business model need measurement before commercial claims.'

    Add-Paragraph 'Recommended demonstration' 'Heading 1'
    Add-Paragraph ('1. Sign in and select English, Hindi, or Punjabi.' + [Environment]::NewLine + '2. Enter a clearly labelled sample issue without personal case details.' + [Environment]::NewLine + '3. Review and edit the text, then save the private intake.' + [Environment]::NewLine + '4. Reopen it to show that the language and text were preserved.' + [Environment]::NewLine + '5. Explain discovery and consultation screens as implemented workflows whose complete hosted acceptance testing remains.')
    Add-Paragraph 'Before presenting, rehearse the exact demo with the current server and account. Keep screenshots as a fallback. Describe AI and speech limits plainly; avoid claims of support for all 22 scheduled languages, guaranteed outcomes, or production readiness.'

    $document.BuiltInDocumentProperties.Item('Title').Value = 'Vakil Setu Project Pitch'
    $document.BuiltInDocumentProperties.Item('Subject').Value = 'College director presentation script and preparation notes'
    $document.BuiltInDocumentProperties.Item('Author').Value = ''
    $document.BuiltInDocumentProperties.Item('Keywords').Value = 'Vakil Setu, project pitch, college presentation'
    $document.Repaginate()
    $pageCount = $document.ComputeStatistics(2)
    $document.SaveAs2($outputPath, 16)
    $pdfPath = Join-Path $qaDir 'Vakil_Setu_Director_Pitch.pdf'
    $document.ExportAsFixedFormat($pdfPath, 17)
    Write-Output ('DOCX=' + $outputPath)
    Write-Output ('PDF=' + $pdfPath)
    Write-Output ('PAGES=' + $pageCount)
    Write-Output ('WORDS=' + $document.ComputeStatistics(0))
} finally {
    if ($null -ne $document) { $document.Close(0) }
    $word.Quit()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word)
}
