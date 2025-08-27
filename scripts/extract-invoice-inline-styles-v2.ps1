$ErrorActionPreference = "Stop"

function New-HashKey([string]$text) {
  $md5 = [System.Security.Cryptography.MD5]::Create()
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
  $hex = -join ($md5.ComputeHash($bytes) | ForEach-Object { $_.ToString("x2") })
  return "s_{0}" -f $hex.Substring(0,8)
}

$root = "E:\ui64\aluminum-store-ui"
$indexPath = Join-Path $root "src\components\tabs\InvoiceProcessing\index.jsx"
$genPath   = Join-Path $root "src\components\tabs\InvoiceProcessing\styles.generated.js"

if (!(Test-Path $indexPath)) { throw "Ne postoji: $indexPath" }

# --- Učitavanje i backup ---
$src = Get-Content -LiteralPath $indexPath -Raw
Copy-Item -LiteralPath $indexPath -Destination "$indexPath.bak" -Force

# --- Regex: style={{ ... }} (DOTALL, minimalno) ---
$pattern = 'style=\s*\{\s*\{([\s\S]*?)\}\s*\}'
$matches = [System.Text.RegularExpressions.Regex]::Matches($src, $pattern, 'IgnoreCase')

if ($matches.Count -eq 0) {
  Write-Host "✅ Nema inline style={{...}} u: $indexPath"
  exit 0
}

# --- Unikatni stilovi -> key -> content ---
$ordered = New-Object System.Collections.Specialized.OrderedDictionary
foreach ($m in $matches) {
  $inner = $m.Groups[1].Value.Trim()
  if (-not [string]::IsNullOrWhiteSpace($inner)) {
    $key = New-HashKey $inner
    if (-not $ordered.Contains($key)) { $ordered.Add($key, $inner) }
  }
}

# --- Sadržaj styles.generated.js ---
$header = @"
// ⚠️ AUTO-GENERATED: inline stilovi iz index.jsx
// Po potrebi ručno presložiti u semantički 'S' objekt.
// Dostupni theme tokeni iz @al/theme.
import theme, { colors, radius, shadow, zIndex, spacing, fontStack } from '@al/theme';

export const G = {
"@

$lines = @()
foreach ($k in $ordered.Keys) {
  $v = $ordered[$k]
  # format string + escape vitičastih za literalne JS objekte
  $lines += ('  {0}: {{ {1} }},' -f $k, $v)
}

$footer = @"
};

export default G;
"@

$genContent = $header + "`r`n" + ($lines -join "`r`n") + "`r`n" + $footer

# --- Zapiši generated fajl (s backupom ako postoji) ---
if (Test-Path $genPath) { Copy-Item -LiteralPath $genPath -Destination "$genPath.bak" -Force }
Set-Content -LiteralPath $genPath -Value $genContent -Encoding UTF8
Write-Host "✔ Generirano: $genPath"

# --- Ubaci import { G } ako ga nema ---
if ($src -notmatch "(?m)^\s*import\s*\{\s*G\s*\}\s*from\s*['""]\./styles\.generated['""]\s*;") {
  $src = [regex]::Replace($src, "(?ms)(^\s*(?:import .+;\s*)+)", "`$1`r`nimport { G } from './styles.generated';`r`n")
}

# --- Zamijeni svaki style={{...}} -> style={G.<key>} ---
$sb = New-Object System.Text.StringBuilder
$lastIndex = 0
foreach ($m in $matches) {
  $start = $m.Index
  $len   = $m.Length
  $inner = $m.Groups[1].Value.Trim()
  $key   = New-HashKey $inner
  $null = $sb.Append($src.Substring($lastIndex, $start - $lastIndex))
  $null = $sb.Append(("style={G.{0}}" -f $key))
  $lastIndex = $start + $len
}
$null = $sb.Append($src.Substring($lastIndex))
$patched = $sb.ToString()

Set-Content -LiteralPath $indexPath -Value $patched -Encoding UTF8
Write-Host "✔ Zamijenjeni inline stilovi u: $indexPath"

# --- Kratka provjera ---
($patched -split "`r`n") |
  Select-String -Pattern 'import \{ G \} from ''\.\/styles\.generated''|style=\{G\.' -SimpleMatch |
  ForEach-Object { "{0:D5}: {1}" -f $_.LineNumber, $_.Line }
