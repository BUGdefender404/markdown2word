# Open the generated sample docx in real Word (read-only) and report content stats.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$docx = Get-ChildItem -Path (Join-Path $root 'samples') -Filter '*.docx' | Select-Object -First 1
if (-not $docx) { Write-Output 'NO_DOCX'; exit 1 }
Write-Output ('opening: ' + $docx.Name)

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open($docx.FullName, $false, $true)
  Write-Output 'opened OK'
  Write-Output ('maths=' + $doc.OMaths.Count + ' tables=' + $doc.Tables.Count + ' hyperlinks=' + $doc.Hyperlinks.Count)
  Write-Output ('para2 style=' + $doc.Paragraphs.Item(2).Style.NameLocal)
  Write-Output ('inlineShapes=' + $doc.InlineShapes.Count)
  if ($doc.Hyperlinks.Count -ge 1) {
    Write-Output ('link1 text size=' + $doc.Hyperlinks.Item(1).Range.Font.Size + ' text=' + $doc.Hyperlinks.Item(1).Range.Text)
  }
  $doc.Close($false)
} finally {
  $word.Quit()
}
Write-Output 'DONE'
