# fix-invoice-processing.ps1
$ErrorActionPreference = "Stop"

$file = 'E:\ui64\aluminum-store-ui\src\components\tabs\InvoiceProcessing\index.jsx'
if (!(Test-Path $file)) { Write-Error "File not found: $file"; exit 1 }

# 1) Backup
$backup = "$file.bak"
Copy-Item -LiteralPath $file -Destination $backup -Force

# 2) Load file
$content = Get-Content -LiteralPath $file -Raw

# 3) Remove duplicate named theme import (keep the default theme import + destructure)
$content = [regex]::Replace(
  $content,
  '(?ms)^\s*import\s*\{\s*colors\s*,\s*fontStack\s*\}\s*from\s*[''"]@al/theme[''"]\s*;\s*',
  ''
)

# 4) Ensure base theme import + destructure once
if ($content -notmatch 'import\s+theme\s+from\s+[''"]@al/theme[''"]') {
  $content = "import theme from '@al/theme';`r`nconst { colors, fontStack } = theme;`r`n" + $content
} elseif ($content -notmatch 'const\s*\{\s*colors\s*,\s*fontStack\s*\}\s*=\s*theme\s*;') {
  $content = [regex]::Replace(
    $content,
    '(?ms)(import\s+theme\s+from\s+[''"]@al/theme[''"]\s*;\s*)',
    "$1`r`nconst { colors, fontStack } = theme;`r`n"
  )
}

# 5) Replace (or insert) a clean LM_STUDIO_CONFIG block (ends with semicolon)
$goodConfig = @"
const LM_STUDIO_CONFIG = {
  endpoint: "http://localhost:1234/v1/chat/completions",
  model: "local-model",
  max_tokens: 4096,
  temperature: 0.2,
  headers: { "Content-Type": "application/json" }
};
"@

if ($content -match '(?ms)(?:export\s+)?const\s+LM_STUDIO_CONFIG\s*=\s*\{.*?\};') {
  $content = [regex]::Replace(
    $content,
    '(?ms)(?:export\s+)?const\s+LM_STUDIO_CONFIG\s*=\s*\{.*?\};',
    $goodConfig
  )
} else {
  # Insert just after the first import block if it doesn't exist
  $content = [regex]::Replace(
    $content,
    '(?ms)(^\s*(?:import .+;\s*)+)',
    "$1`r`n$goodConfig"
  )
}

# 6) Normalize PDF.js worker (import if missing, or just replace assignment)
if ($content -notmatch 'GlobalWorkerOptions') {
  $inject = "import { GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';`r`nGlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.mjs';`r`n"
  $content = [regex]::Replace(
    $content,
    '(?ms)(^\s*(?:import .+;\s*)+)',
    "$1`r`n$inject"
  )
} else {
  $content = [regex]::Replace(
    $content,
    'GlobalWorkerOptions\.workerSrc\s*=\s*[^;]+;',
    "GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.mjs';"
  )
}

# 7) Save
Set-Content -LiteralPath $file -Value $content -Encoding UTF8

Write-Host "Patched: $file"
Write-Host "Backup : $backup"

# 8) Show verification lines
($content -split "`r`n") |
  Select-String -Pattern 'LM_STUDIO_CONFIG|workerSrc|@al/theme' -SimpleMatch |
  ForEach-Object { "{0:D5}: {1}" -f $_.LineNumber, $_.Line }
