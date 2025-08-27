# =====================================================================
# AL APP — POSTFIX: očisti theme import-e i doda ispravno na vrh.
# Također doda "import { S } from './styles'" ako datoteka koristi S.
# Pokrenuti iz root-a repoa: .\scripts\al-style-postfix.ps1
# Radi backup .bak izmijenjenih datoteka.
# =====================================================================

$ErrorActionPreference = "Stop"
$root = (Get-Location).Path
$src  = Join-Path $root "src"
if (-not (Test-Path $src)) { throw "Nema ./src u $root" }

$RegexOptions = [System.Text.RegularExpressions.RegexOptions]
$optM = $RegexOptions::Multiline
$optS = $RegexOptions::Singleline

# Patterni (pisani single-quoted radi jednostavnog escapanja ' i ")
$patImportTheme = '^\s*import\s+theme\s+from\s+["''][^"'']*theme[^"'']*["'']\s*;\s*\r?\n?'
$patDestructure = '^\s*const\s*\{\s*colors\s*,\s*fontStack\s*\}\s*=\s*theme\s*;\s*\r?\n?'
$patComments    = '(?s)/\*.*?\*/|//.*?$'      # za privremeno uklanjanje komentara pri detekciji
$patHasS        = 'S\s*\.'
$patHasStylesImport = 'from\s+["'']\./styles["'']'
$patUsesColors  = 'colors\s*\.'
$patUsesFont    = '\bfontStack\b'

$files = Get-ChildItem -Recurse -Path $src -Include *.js,*.jsx,*.tsx -File |
         Where-Object { $_.FullName -notmatch '\\src\\theme\\' }   # ne diramo theme fajlove

foreach ($f in $files) {
  $code = Get-Content $f.FullName -Raw
  $orig = $code

  # 1) Ukloni sve postojeće theme import-e + destrukturiranje (gdje god se nalazili)
  $code = [regex]::Replace($code, $patImportTheme, '', $optM)
  $code = [regex]::Replace($code, $patDestructure, '', $optM)

  # 2) Treba li uopće tema u ovom fajlu?
  $tmp = [regex]::Replace($code, $patComments, '', $optM)
  $needsTheme = ($tmp -match $patUsesColors) -or ($tmp -match $patUsesFont)

  if ($needsTheme) {
    $insert = "import theme from '@al/theme';`r`nconst { colors, fontStack } = theme;`r`n"
    $code = $insert + $code
  }

  # 3) Ako koristi S i postoji styles.js u tom diru, a nema import — dodaj
  if ($code -match $patHasS) {
    $stylesPath = Join-Path $f.DirectoryName "styles.js"
    if (Test-Path $stylesPath) {
      if ($code -notmatch $patHasStylesImport) {
        $code = "import { S } from './styles';`r`n" + $code
      }
    }
  }

  if ($code -ne $orig) {
    Copy-Item $f.FullName "$($f.FullName).bak" -Force
    Set-Content -Encoding UTF8 $f.FullName $code
    Write-Host "🛠  Fixed: $($f.FullName.Replace($root+'\',''))"
  }
}

Write-Host "`n✅ Postfix gotovo. Ako dev radi, samo reload; inače zalijepi prvi error (path + poruka)."
