$ErrorActionPreference = "Stop"

$root = "E:\ui64\aluminum-store-ui"
$idxPath = Join-Path $root "src\components\tabs\InvoiceProcessing\index.jsx"
$genPath = Join-Path $root "src\components\tabs\InvoiceProcessing\styles.generated.js"

if (!(Test-Path $idxPath)) { throw "Nije pronađen index.jsx: $idxPath" }
if (!(Test-Path $genPath)) {
  throw "Nedostaje styles.generated.js: $genPath (pokreni extractor pa ponovno ovaj skript)."
}

# 1) Učitaj i backup
$src = Get-Content -LiteralPath $idxPath -Raw
Copy-Item -LiteralPath $idxPath -Destination "$idxPath.bak_Gimport" -Force

# 2) Ako nema importa G, ubaci ga odmah nakon import bloka
if ($src -notmatch "(?m)^\s*import\s*\{\s*G\s*\}\s*from\s*['""]\./styles\.generated['""]\s*;") {
  $src = [regex]::Replace(
    $src,
    "(?ms)(^\s*(?:import .+;\s*)+)",
    "`$1`r`nimport { G } from './styles.generated';`r`n"
  )
  Set-Content -LiteralPath $idxPath -Value $src -Encoding UTF8
  Write-Host "✔ Dodan import { G } u index.jsx"
} else {
  Write-Host "• Import { G } već postoji u index.jsx"
}

# 3) Brza provjera
($src -split "`r`n") |
  Select-String -Pattern "import \{ G \} from './styles.generated'|style=\{G\." -SimpleMatch |
  ForEach-Object { "{0:D5}: {1}" -f $_.LineNumber, $_.Line }
