$ErrorActionPreference = "Stop"

$genPath = "E:\ui64\aluminum-store-ui\src\components\tabs\InvoiceProcessing\styles.generated.js"
if (!(Test-Path $genPath)) { throw "Nedostaje: $genPath" }

$src = Get-Content -LiteralPath $genPath -Raw
Copy-Item -LiteralPath $genPath -Destination "$genPath.bak_strings" -Force

# 1) Popravi pattern { 'solid' } -> { borderStyle: 'solid' }
$src = [regex]::Replace($src, "(?ms)\{\s*'solid'\s*\}", "{ borderStyle: 'solid' }")
$src = [regex]::Replace($src, '(?ms)\{\s*"solid"\s*\}', '{ borderStyle: "solid" }')

# 2) U tijelu export const G = { ... } nađi linije key: <value>, i sanitiziraj kada <value> NIJE objekt ni funkcija
#    Heuristike:
#    - 'solid'|'dashed'|'dotted' => { borderStyle: '...' }
#    - linear-gradient(...)      => { backgroundImage: 'linear-gradient(...)' }
#    - boja (#..., rgb(...), hsl(...)) => { color: '...' }
#    - inače => {}

# Regex koji se “vozi” kroz stavke unutar G = { ... }
$pattern = '(?m)^\s*(?<key>[A-Za-z_]\w*)\s*:\s*(?<val>(?:[''"].*?[''"]|[^,]+))\s*,\s*$'

$src = [regex]::Replace($src, $pattern, {
  param($m)
  $key = $m.Groups['key'].Value
  $val = $m.Groups['val'].Value.Trim()

  # Preskoči funkcije i objekte
  if ($val -match '^\(ctx\)\s*=>\s*\(\s*\{' -or $val -match '^\{[\s\S]*\}$') {
    return $m.Value
  }

  # Ako je plain string literal '...' ili "..."
  if ($val -match "^(?:'([^']*)'|""([^""]*)"")$") {
    $s = $Matches[1]; if (-not $s) { $s = $Matches[2] }

    if ($s -match '^(solid|dashed|dotted)$') {
      return ("  {0}: {{ borderStyle: '{1}' }}," -f $key, $s)
    }
    if ($s -match '^\s*linear-gradient\(') {
      return ("  {0}: {{ backgroundImage: '{1}' }}," -f $key, $s)
    }
    if ($s -match '^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}))$' -or $s -match '^\s*(rgb|rgba|hsl|hsla)\(') {
      return ("  {0}: {{ color: '{1}' }}," -f $key, $s)
    }
    # fallback: prazan objekt
    return ("  {0}: {{ }}," -f $key)
  }

  # Ako je vrijednost nekakav identifikator (krivo izvađen), fallback na {}
  if ($val -match '^[A-Za-z_]\w*$') {
    return ("  {0}: {{ }}," -f $key)
  }

  # Inače pusti kako je (može biti izraz koji vraća objekt kroz () ili slično)
  return $m.Value
})

Set-Content -LiteralPath $genPath -Value $src -Encoding UTF8
Write-Host "✔ Sanitized: $genPath"

# 3) Kratka provjera - postoje li još string literal entries?
($src -split "`r`n") |
  Select-String -Pattern '^\s*\w+\s*:\s*[''"].*[''"]\s*,\s*$' |
  ForEach-Object { "LEFTOVER  {0:D5}: {1}" -f $_.LineNumber, $_.Line }

Write-Host "`nGotovo. Vite HMR bi trebao pokupiti promjene."
