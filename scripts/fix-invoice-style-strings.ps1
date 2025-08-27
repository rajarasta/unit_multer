$ErrorActionPreference = "Stop"

$idxPath = "E:\ui64\aluminum-store-ui\src\components\tabs\InvoiceProcessing\index.jsx"
$genPath = "E:\ui64\aluminum-store-ui\src\components\tabs\InvoiceProcessing\styles.generated.js"

if (!(Test-Path $idxPath)) { throw "Missing: $idxPath" }
if (!(Test-Path $genPath)) { throw "Missing: $genPath" }

# 1) index.jsx: style={{G.xxx ...}} -> style={G.xxx ...}
$idx = Get-Content -LiteralPath $idxPath -Raw
Copy-Item -LiteralPath $idxPath -Destination "$idxPath.bak_styleBraces" -Force
$idx = [regex]::Replace($idx, 'style=\s*\{\s*\{\s*G\.', 'style={G.')
Set-Content -LiteralPath $idxPath -Value $idx -Encoding UTF8
Write-Host "✔ index.jsx: normalized style={{G.*}} -> style={G.*}"

# 2) styles.generated.js: append normalizer (once)
$gen = Get-Content -LiteralPath $genPath -Raw
Copy-Item -LiteralPath $genPath -Destination "$genPath.bak_norm" -Force

if ($gen -notmatch 'AUTO-NORMALIZE-G') {
  $normalizer = @"
  
/* AUTO-NORMALIZE-G: ensure every G[key] is a valid style object */
for (const key of Object.keys(G)) {
  const v = G[key];
  if (typeof v === 'string') {
    if (/^\s*linear-gradient\(/.test(v))       { G[key] = { backgroundImage: v }; continue; }
    if (/^(solid|dashed|dotted)$/.test(v))     { G[key] = { borderStyle: v };     continue; }
    if (/^#[0-9a-fA-F]{3,6}$/.test(v) ||
        /^(rgb|rgba|hsl|hsla)\(/.test(v))      { G[key] = { color: v };           continue; }
    if (/^(pointer|auto|default|move|text|crosshair|not-allowed|grab|grabbing)$/.test(v)) { G[key] = { cursor: v }; continue; }
    if (/^(none|block|inline|inline-block|flex|grid)$/.test(v)) { G[key] = { display: v }; continue; }
    if (/^(left|center|right|justify)$/.test(v)) { G[key] = { textAlign: v }; continue; }
    G[key] = {}; // safe fallback
  }
}
"@
  # append after file end
  $gen = $gen + $normalizer
  Set-Content -LiteralPath $genPath -Value $gen -Encoding UTF8
  Write-Host "✔ styles.generated.js: appended normalizer"
} else {
  Write-Host "• styles.generated.js: normalizer already present"
}

# 3) Quick scan for any leftover string entries like: key: '...',
($gen -split "`r`n") |
  Select-String -Pattern '^\s*\w+\s*:\s*[''"].+[''"]\s*,\s*$' |
  ForEach-Object { "LEFTOVER  {0:D5}: {1}" -f $_.LineNumber, $_.Line }
