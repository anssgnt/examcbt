$content = Get-Content 'admin-core.min.js' -Raw
$target = '(e.hasil||[]).forEach(e=>{a&&e.examId!==a||("number"==typeof e.skor&&(i+=e.skor,o++),e.userId&&d.has(e.userId)&&s.add(e.userId))})'
$replacement = '(e.hasil||[]).forEach(e=>{a&&e.examId!==a||("number"==typeof e.skor&&(i+=e.skor,o++))})'

if ($content.Contains($target)) {
    $content = $content.Replace($target, $replacement)
    Set-Content 'admin-core.min.js' -Value $content -NoNewline
    Write-Host 'Success!'
} else {
    Write-Host 'Target not found!'
}
