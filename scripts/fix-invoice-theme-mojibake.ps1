$ErrorActionPreference = "Stop"
$root = 'E:\ui64\aluminum-store-ui'
$invoice = Join-Path $root 'src\components\tabs\InvoiceProcessing\index.jsx'

# ---------- 1) Fix InvoiceProcessing: avoid "Identifier 'theme' has already been declared" ----------
if (!(Test-Path $invoice)) { Write-Error "Not found: $invoice"; exit 1 }

$txt = Get-Content -LiteralPath $invoice -Raw
Copy-Item -LiteralPath $invoice -Destination "$invoice.bak" -Force

# Remove any default theme imports and destructures that cause duplication.
$txt = [regex]::Replace($txt, '(?m)^\s*import\s+theme\s+from\s+["'']@?[^"'']+["'']\s*;\s*', '')
$txt = [regex]::Replace($txt, '(?m)^\s*const\s*\{\s*colors\s*,\s*fontStack\s*\}\s*=\s*theme\s*;\s*', '')

# Insert a single named-token import from the local theme once after the import block.
# Path from src/components/tabs/InvoiceProcessing -> src/theme
$tokensImport = "import { colors, fontStack, radius, shadow } from '../../../theme';`r`n"
if ($txt -notmatch 'from\s+["'']\.\.\/\.\.\/\.\.\/theme["'']') {
  $txt = [regex]::Replace($txt, '(?ms)(^\s*(?:import .+;\s*)+)', "$1`r`n$tokensImport")
}

# ---------- 2) Normalize pdf.js worker in that file (safe CDN) ----------
if ($txt -match 'GlobalWorkerOptions') {
  $txt = [regex]::Replace($txt,
    'GlobalWorkerOptions\.workerSrc\s*=\s*[^;]+;',
    "GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.mjs';")
} else {
  $inject = "import { GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';`r`nGlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.mjs';`r`n"
  $txt = [regex]::Replace($txt, '(?ms)(^\s*(?:import .+;\s*)+)', "$1`r`n$inject")
}

Set-Content -LiteralPath $invoice -Value $txt -Encoding UTF8
Write-Host "Patched theme/pdf.js in: $invoice"

# ---------- 3) Mojibake transliteration across src (very conservative) ----------
# We only replace known mojibake sequences to ASCII fallbacks to keep code identifiers stable.
$map = @{
  'kaÅ¡njenje'='kasnjenje'; 'KaÅ¡ni'='Kasni'; 'kasniÅ¡'='kasnis';
  'Äeka'='ceka'; 'Äeka'='ceka'; 'ÄŒeka'='Ceka';
  'Å¾uta'='zuta'; 'Å½uta'='Zuta';
  'Å¡'='s'; 'Å½'='Z'; 'Å¾'='z'; 'Ä'='c'; 'Ä'='C'; 'Ä‡'='c'
}
$src = Join-Path $root 'src'
$exts = '*.js','*.jsx','*.ts','*.tsx'
Get-ChildItem -Path $src -Recurse -Include $exts | ForEach-Object {
  $c = Get-Content -LiteralPath $_.FullName -Raw
  $orig = $c
  foreach($k in $map.Keys){ $c = $c -replace [regex]::Escape($k), $map[$k] }
  if ($c -ne $orig) {
    Copy-Item -LiteralPath $_.FullName -Destination "$($_.FullName).bak" -Force
    Set-Content -LiteralPath $_.FullName -Value $c -Encoding UTF8
    Write-Host "Transliterated mojibake in: $($_.FullName)"
  }
}

# ---------- 4) Show quick verification from InvoiceProcessing ----------
(Get-Content -LiteralPath $invoice -Raw -Encoding UTF8 -ErrorAction SilentlyContinue -TotalCount 200000 -ReadCount 0 -Delimiter "`n") `
  -split "`r?`n" |
  Select-String -Pattern 'from ''\.\.\/\.\.\/\.\.\/theme''|LM_STUDIO_CONFIG|workerSrc|ka.snj|ceka' -SimpleMatch |
  ForEach-Object { "{0:D5}: {1}" -f $_.LineNumber, $_.Line }
