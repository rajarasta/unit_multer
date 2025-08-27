$ErrorActionPreference = "Stop"

$root = 'E:\ui64\aluminum-store-ui'
$invoice = Join-Path $root 'src\components\tabs\InvoiceProcessing\index.jsx'

if (!(Test-Path $invoice)) { Write-Error "Not found: $invoice"; exit 1 }

# ========== 1) Patch InvoiceProcessing/index.jsx ==========
$txt = Get-Content -LiteralPath $invoice -Raw
Copy-Item -LiteralPath $invoice -Destination "$invoice.bak" -Force

# Remove ANY default theme imports (from anywhere)
$txt = [regex]::Replace($txt, '(?m)^\s*import\s+theme\s+from\s+["''][^"'']+["'']\s*;\s*', '')

# Remove ANY destructure from a local variable named theme
$txt = [regex]::Replace($txt, '(?m)^\s*const\s*\{\s*[^}]*\}\s*=\s*theme\s*;\s*', '')

# Remove any previous token imports from ../../../theme (will re-add a single canonical one)
$txt = [regex]::Replace($txt, '(?m)^\s*import\s*\{[^}]*\}\s*from\s*[''"]\.\.\/\.\.\/\.\.\/theme[''"]\s*;\s*', '')

# Remove an inline object declaration "const theme = { ... };"
$txt = [regex]::Replace($txt, '(?ms)^\s*const\s+theme\s*=\s*\{.*?\}\s*;\s*', '')

# Insert a single named import of tokens after the import block
$tokensImport = "import { colors, fontStack, radius, shadow, zIndex, spacing } from '../../../theme';`r`n"
if ($txt -notmatch 'from\s+["'']\.\.\/\.\.\/\.\.\/theme["'']') {
  $txt = [regex]::Replace($txt, '(?ms)(^\s*(?:import .+;\s*)+)', "$1`r`n$tokensImport")
}

# Normalize pdf.js worker
if ($txt -match 'GlobalWorkerOptions') {
  $txt = [regex]::Replace(
    $txt,
    'GlobalWorkerOptions\.workerSrc\s*=\s*[^;]+;',
    "GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.mjs';"
  )
} else {
  $inject = "import { GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';`r`nGlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.mjs';`r`n"
  $txt = [regex]::Replace($txt, '(?ms)(^\s*(?:import .+;\s*)+)', "$1`r`n$inject")
}

Set-Content -LiteralPath $invoice -Value $txt -Encoding UTF8
Write-Host "Patched theme/pdf.js in: $invoice"

# ========== 2) Conservative mojibake transliteration (deduplicated map) ==========
$map = @{
  'kaÅ¡njenje'='kasnjenje'
  'KaÅ¡ni'='Kasni'
  'kasniÅ¡'='kasnis'
  'Äeka'='ceka'
  'ÄŒeka'='Ceka'
  'Å¾uta'='zuta'
  'Å½uta'='Zuta'
  'Å¡'='s'
  'Å½'='Z'
  'Å¾'='z'
  'Ä'='c'
  'Ä'='C'
  'Ä‡'='c'
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

# ========== 3) Verification lines from InvoiceProcessing ==========
($txt -split "`r`n") |
  Select-String -Pattern 'from ''\.\.\/\.\.\/\.\.\/theme''|GlobalWorkerOptions|LM_STUDIO_CONFIG' -SimpleMatch |
  ForEach-Object { "{0:D5}: {1}" -f $_.LineNumber, $_.Line }
