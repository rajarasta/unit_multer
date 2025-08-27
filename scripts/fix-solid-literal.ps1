$ErrorActionPreference = "Stop"

$root = "E:\ui64\aluminum-store-ui"
$genPath = Join-Path $root "src\components\tabs\InvoiceProcessing\styles.generated.js"
$idxPath = Join-Path $root "src\components\tabs\InvoiceProcessing\index.jsx"

if (!(Test-Path $genPath)) { throw "Nije pronađen styles.generated.js: $genPath" }
if (!(Test-Path $idxPath)) { throw "Nije pronađen index.jsx: $idxPath" }

# --- 1) styles.generated.js: ctx.solid -> 'solid'
$gen = Get-Content -LiteralPath $genPath -Raw
Copy-Item -LiteralPath $genPath -Destination "$genPath.bak_solid" -Force

$gen = [regex]::Replace($gen, '\bctx\.solid\b', "'solid'")

Set-Content -LiteralPath $genPath -Value $gen -Encoding UTF8
Write-Host "✔ styles.generated.js: ctx.solid -> 'solid'"

# --- 2) index.jsx: ukloni 'solid' iz G.xxx({ ... }) argumenata
$idx = Get-Content -LiteralPath $idxPath -Raw
Copy-Item -LiteralPath $idxPath -Destination "$idxPath.bak_solid" -Force

# varijanta A: style={G.key({ solid, something })}
$idx = [regex]::Replace($idx, '(\bG\.\w+\(\{\s*)solid\s*,\s*', '$1')
# varijanta B: style={G.key({ something, solid })}
$idx = [regex]::Replace($idx, ',\s*solid\s*(\}\))', '$1')
# varijanta C: style={G.key({ solid })}
$idx = [regex]::Replace($idx, '(\bG\.\w+\()\{\s*solid\s*\}(\))', '${1}{}$2')

Set-Content -LiteralPath $idxPath -Value $idx -Encoding UTF8
Write-Host "✔ index.jsx: uklonjen 'solid' iz G.xxx({ ... }) poziva"

# --- Brza provjera
($gen -split "`r`n") | Select-String -Pattern "ctx.solid" | ForEach-Object { "GEN  {0:D5}: {1}" -f $_.LineNumber, $_.Line }
($idx -split "`r`n") | Select-String -Pattern "G\.\w+\(\{\s*solid|\s*solid\s*\}\)" | ForEach-Object { "IDX  {0:D5}: {1}" -f $_.LineNumber, $_.Line }

Write-Host "`nGotovo. Reload/HMR će pokupiti izmjene."
