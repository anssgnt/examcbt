# CSS Minifier Script
$cssDir = "c:\laragon\www\cbtmo\temp"
$cssFiles = Get-ChildItem -Path $cssDir -Filter "*.css" | Where-Object { $_.Name -notmatch '\.min\.css$' }

Write-Host "Found $($cssFiles.Count) CSS files to minify:" -ForegroundColor Green
Write-Host ""

$totalOriginal = 0
$totalMinified = 0

foreach ($file in $cssFiles) {
    $filePath = $file.FullName
    $content = Get-Content -Path $filePath -Raw
    
    # Minify CSS
    $minified = $content `
        -replace '/\*[\s\S]*?\*/', '' `
        -replace '\s+', ' ' `
        -replace '\s*([{}:;,>+~])\s*', '$1' `
        -replace ';\}', '}' `
        -replace '^\s+|\s+$', ''
    
    $originalSize = $content.Length
    $minifiedSize = $minified.Length
    $reduction = [math]::Round((1 - $minifiedSize / $originalSize) * 100, 1)
    
    $totalOriginal += $originalSize
    $totalMinified += $minifiedSize
    
    # Write minified version
    $minFileName = $file.Name -replace '\.css$', '.min.css'
    $minFilePath = Join-Path $cssDir $minFileName
    Set-Content -Path $minFilePath -Value $minified -NoNewline
    
    Write-Host "OK $($file.Name)" -ForegroundColor Cyan
    Write-Host "   Original: $([math]::Round($originalSize/1024, 2)) KB -> Minified: $([math]::Round($minifiedSize/1024, 2)) KB ($reduction% reduction)"
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "Total Original: $([math]::Round($totalOriginal/1024, 2)) KB" -ForegroundColor White
Write-Host "Total Minified: $([math]::Round($totalMinified/1024, 2)) KB" -ForegroundColor White
$totalReduction = [math]::Round((1 - $totalMinified / $totalOriginal) * 100, 1)
Write-Host "Total Reduction: $totalReduction%" -ForegroundColor Green
Write-Host "Saved: $([math]::Round(($totalOriginal - $totalMinified)/1024, 2)) KB" -ForegroundColor Green
