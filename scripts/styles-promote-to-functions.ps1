$ErrorActionPreference = "Stop"

function New-HashKey([string]$text) {
  $md5 = [System.Security.Cryptography.MD5]::Create()
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
  $hex = -join ($md5.ComputeHash($bytes) | ForEach-Object { $_.ToString("x2") })
  return "s_{0}" -f $hex.Substring(0,8)
}

# ----- Paths -----
$root = "E:\ui64\aluminum-store-ui"
$indexPath = Join-Path $root "src\components\tabs\InvoiceProcessing\index.jsx"
$indexBak  = "$indexPath.bak"
$genPath   = Join-Path $root "src\components\tabs\InvoiceProcessing\styles.generated.js"

if (!(Test-Path $indexBak)) { throw "Nedostaje backup $indexBak (treba ga v3 skripta). Prekida se." }
if (!(Test-Path $genPath)) { throw "Nedostaje $genPath. Prekida se." }

# ----- Učitaj originalne inline style iz .bak -----
$orig = Get-Content -LiteralPath $indexBak -Raw
$pattern = 'style=\s*\{\s*\{([\s\S]*?)\}\s*\}'  # inner je JS objekt bez vanjskih zagrada
$matches = [System.Text.RegularExpressions.Regex]::Matches($orig, $pattern, 'IgnoreCase')

# Map: key -> { inner, idents[] }
$entries = @{}

# Allowlista tokena/identifikatora koje NE smijemo tretirati kao "lokalne"
$allow = @(
  'theme','colors','radius','shadow','zIndex','spacing','fontStack',
  'Math','Number','String','Boolean','Array','Object','Date','JSON',
  'true','false','null','undefined'
)

foreach ($m in $matches) {
  $inner = $m.Groups[1].Value.Trim()
  if ([string]::IsNullOrWhiteSpace($inner)) { continue }
  $key = New-HashKey $inner

  # Detektiraj kandidate-riječi
  $words = [System.Text.RegularExpressions.Regex]::Matches($inner, '\b[A-Za-z_]\w*\b') | ForEach-Object { $_.Value } | Select-Object -Unique

  # Ukloni JS ključne riječi
  $jsKw = @('if','else','return','let','const','var','function','new','switch','case','break','continue','for','while','do','try','catch','finally','in','of','await','async','yield','this','class','extends','super','import','from','export','default','delete','instanceof','typeof','void')
  $words = $words | Where-Object { $jsKw -notcontains $_ }

  # Ukloni stvari koje gotovo sigurno nisu lokalne varijable
  $words = $words | Where-Object { $allow -notcontains $_ }

  # Grubi filtar: ako se riječ pojavljuje kao KEY (tj. slijedi :), onda je to css-prop, ne lokalna var.
  $maybeLocals = @()
  foreach ($w in $words) {
    # je li negdje "w :" (kao ključ)? ako da, preskoči kao lokal
    if ($inner -match ('(?m)(?:^|,)\s*' + [regex]::Escape($w) + '\s*:')) {
      # ključ u objektu — preskačemo iz opreza
      continue
    }
    $maybeLocals += $w
  }

  # Ako nema lokalnih, stavi prazno
  $entries[$key] = [pscustomobject]@{
    inner  = $inner
    idents = ($maybeLocals | Select-Object -Unique)
  }
}

# ----- Uredi styles.generated.js: pretvori u (ctx)=>… gdje treba -----
$gen = Get-Content -LiteralPath $genPath -Raw
Copy-Item -LiteralPath $genPath -Destination "$genPath.bak" -Force

foreach ($k in $entries.Keys) {
  $info = $entries[$k]
  $inner = $info.inner
  $idents = @($info.idents)

  if ($idents.Count -gt 0) {
    # Zamijeni unutar inner sve slobodne identifikatore s ctx.<ident>
    foreach ($id in $idents) {
      # zamijeni samo ako ident N I J E property key (tj. nije odmah iza njega dvotočka)
      # i ako N I J E nakon točke (npr. theme.progress)
      $inner = [regex]::Replace(
        $inner,
        ('(?<![\w\.])\b' + [regex]::Escape($id) + '\b(?!\s*:)'),
        ('ctx.' + $id)
      )
    }

    # U generated fajlu pronađi "  key: { ... }," i pretvori u "  key: (ctx) => ({ ... }),"
    $patternEntry = '(?ms)^\s*' + [regex]::Escape($k) + '\s*:\s*\{\s*.*?\s*\}\s*,\s*$'
    if ($gen -match $patternEntry) {
      $replacement = ('  {0}: (ctx) => ({{ {1} }}),' -f $k, $inner)  # dvostruke zagrade za literal
      $gen = [regex]::Replace($gen, $patternEntry, [System.Text.RegularExpressions.MatchEvaluator]{ param($mm) $replacement })
    }
  }
}

Set-Content -LiteralPath $genPath -Value $gen -Encoding UTF8
Write-Host "✔ styles.generated.js: kontekstualni stilovi pretvoreni u funkcije"

# ----- Uredi index.jsx: za te ključeve zamijeni style={G.k} u style={G.k({ a,b,c })}
$idx = Get-Content -LiteralPath $indexPath -Raw
Copy-Item -LiteralPath $indexPath -Destination "$indexPath.bak2" -Force

foreach ($k in $entries.Keys) {
  $idents = @($entries[$k].idents)
  if ($idents.Count -eq 0) { continue }

  $arg = '{ ' + ( ($idents | ForEach-Object { $_ }) -join ', ' ) + ' }'

  # patterni koje mijenjamo:
  # style={{G.k}}  -> style={G.k({ ... })}
  # style={G.k}    -> style={G.k({ ... })}
  $idx = [regex]::Replace(
    $idx, ('style=\s*\{\s*\{\s*G\.' + [regex]::Escape($k) + '\s*\}\s*\}'),
    ('style={G.' + $k + '(' + $arg + ')}')
  )
  $idx = [regex]::Replace(
    $idx, ('style=\s*\{\s*G\.' + [regex]::Escape($k) + '\s*\}'),
    ('style={G.' + $k + '(' + $arg + ')}')
  )
}

Set-Content -LiteralPath $indexPath -Value $idx -Encoding UTF8
Write-Host "✔ index.jsx: pozivi G.key( { … } ) dodani gdje je potrebno"

# ----- Brza provjera -----
($gen -split "`r`n") |
  Select-String -Pattern ':\s*\(ctx\)\s*=>\s*\(\{' -SimpleMatch |
  ForEach-Object { "GEN  {0:D5}: {1}" -f $_.LineNumber, $_.Line }

($idx -split "`r`n") |
  Select-String -Pattern 'style=\{G\.\w+\(\{\s*.*\}\)\}' |
  ForEach-Object { "IDX  {0:D5}: {1}" -f $_.LineNumber, $_.Line }
