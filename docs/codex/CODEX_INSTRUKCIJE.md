# Codex: Upute i Postavke Suradnje

Ovaj dokument definira kako Codex radi u tvom projektu i koje opcije možeš podešavati iz taba Codex Control.

## Inicijalizacija Sesije
- Kontekst: ovaj chat + datoteke u repo‑u (nema trajne memorije).
- Alati: `shell` (naredbe), `apply_patch` (izmjene datoteka), `update_plan` (plan/TODO).
- Politike: filesystem full‑access, network enabled, approvals: never.
- Ponašanje: sažet output, kratke najave prije naredbi, plan za višekoračne zadatke.
- Sigurnost: bez destruktivnih radnji bez izričite upute.

## Što Čitam Prvo
- Dokument vodilja: `AGENTS.md` (ako postoji) ili dogovor u chatu.
- Arhitektura/proizvod: `docs/`, `design/`, `adr/` (npr. `docs/okvir-dizajna-inteligentne-platforme.md`).
- Osnove repo‑a: `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`.
- Build/test: `package.json` skripte, `docker-compose.yml`, `.env.example`, CI konfiguracije.
- API specifikacije: `openapi*`/`swagger*`, Postman kolekcije, generirani tipovi.

## Brza Procjena API Stanja
- Spec/kontrakti: `openapi.*` za mapiranje endpointa.
- Rute/kontroleri: `routes/*`, `controllers/*`, `urls.py`, anotacije (@Get/@RestController).
- Testovi: postojeći API testovi; po dogovoru pokrenuti mali “smoke” subset.
- Skripte: `npm run dev/start/test/lint`.
- Verifikacija: health endpoint i 1–2 ključna poziva (curl/fetch) uz dogovor.

## Modovi Rada
- Lean: bez skeniranja koda; rad po tvojoj uputi i ciljanim datotekama.
- Standard: ključni dokumenti + skripte, bez pokretanja sustava.
- Deep: mape ruta, testovi i ovisnosti; izradim plan i rizike.
- API‑focused: specifikacija + rute + testovi; mali smoke set.

## Session Flags (podešavanje u tabu)
- `discovery`: `none|min|standard|deep`
- `docs_priority`: popis putanja ili kategorija (npr. “instrukcijski dokumenti”)
- `run_tests`: `auto|on-request|never`
- `plan`: `on|off` (vidljiv TODO/plan)
- `changes`: `read-only|allowed`
- `verbosity`: `low|normal|high`
- `stack_hint`: kratak opis stacka (npr. “Node/Express”) ili `none`

## Zadani Profil (prema dogovoru)
- `discovery`: `deep`
- `docs_priority`: `instrukcijski dokumenti`
- `run_tests`: `on-request`
- `plan`: `on`
- `changes`: `allowed`
- `verbosity`: `high`
- `stack_hint`: `none`

## Kickoff Primjer
- Mode: deep
- docs_priority: `docs/okvir-dizajna-inteligentne-platforme.md`, `README.md`
- run_tests: on-request
- changes: allowed
- plan: on
- stack_hint: none

## Dnevni Start – Preporučeni Tok
1) Pokreni aplikaciju (Dev).
2) Otvori tab “Codex Control”.
3) Postavi/confirm postavke i Spremi.
4) Otvori VS Code i pokreni Codex.
5) Kreni razvijati (API/feature) prateći Upute.

