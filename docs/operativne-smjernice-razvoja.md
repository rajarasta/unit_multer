# Operativne Smjernice Razvoja (iz CLAUDE.md)

Ovaj dokument sažima tehničke upute i obrasce rada iz `CLAUDE.md` – fokus je na kodu, build-u, proxyjima, event‑ima i izbjegavanju tipičnih grešaka. Držimo ga odvojeno od dizajnerskog okvira (docs/okvir‑dizajna‑inteligentne‑platforme.md).

## 1) Osnovne konvencije koda
- JavaScript‑only: nema TypeScript sintakse u `.jsx` (ukloniti `as const`, `interface`, generike u `useState<...>` itd.).
- Funkcionalne komponente + hooks; imena komponenti PascalCase, util funkcije camelCase.
- Tabovi moraju biti lazy‑loadani (`React.lazy`) i mapirani u `App.jsx` switch‑u.
- Svaki tab omotati `TabErrorBoundary` (izolira padove).
- Minimalni komentari u kodu; dokumentirati u `docs/` umjesto dugih inline komentara.

## 2) Arhitektura servisa i proxyji
- Portovi:
  - 3000 → `voice-server.cjs` (Vite proxy `'/api' → 3000`)
  - 3001 → `file-writer.cjs` (Vite proxy `'/fw' → 3001`)
  - 3002 → `server.js` (Document Registry / agent API)
  - 3004 → `runner.js` (izbjegnut sudar s 3002)
- `BackendService` koristi `/fw` za rute file-writera (`/llm/*`, `/transcribe`, `/upload`, `/save`).
- Uvijek provjeriti da `vite.config.js` i `BackendService` ostanu u skladu nakon promjena ruta.

### API problemi i rješenja (detaljno)

Najčešći uzroci i obrasci rješavanja kada “API ne radi” ili padaju pozivi:

- Pogrešan gateway/proxy:
  - Simptom: 404/502 na `fetch('/api/...')` dok endpoint postoji na 3001.
  - Fix: za file‑writer koristiti `'/fw'` (Vite proxy → 3001). Za voice‑server ostaje `'/api'` (→ 3000). Document Registry ide direktno na `http://localhost:3002`.
- CORS/Host headeri (dev):
  - Dodati `app.use(cors())` na Express serverima; u Vite proxy postaviti `changeOrigin: true` i `secure: false`.
- Krivi `Content-Type`:
  - Kod `FormData` nikad ručno ne postavljati `Content-Type`. Browser postavlja `multipart/form-data; boundary=...`.
  - Kod JSON: `headers: { 'Content-Type': 'application/json' }` i `body: JSON.stringify(data)`.
- Timeout/Retry strategija:
  - Koristiti `AbortController` + `setTimeout` za meke timeoute; prikazati korisniku status i mogućnost ponavljanja.
  - Exponential backoff (npr. 500ms, 1s, 2s) na idempotentne GET-ove.
- 4xx/5xx dijagnostika:
  - Prije `res.json()` uvijek provjeriti `res.ok`; u error branchu logirati `status`, `statusText`, `url` i response body (ako postoji).
- LM Studio / CUDA server:
  - `ERR_CONNECTION_REFUSED` → server nije pokrenut ili krivi URL.
  - Provjera: `start_cuda_llm.bat`, `MODEL_PATH`, `VITE_LM_STUDIO_URL`/`BG_SCREENSHOTS_DIR` u `.env.local`.
  - Napomena: lokalni portovi često blokirani firewallom; dozvoliti app‑u/portu pristup.
- Voice/Realtime API:
  - Wildcard rute u Expressu (npr. `*`) mogu bacati `Missing parameter name at index 1: *` — izbjegavati malformirane pattern-e, koristiti eksplicitne rute.
- Upload 413 (Payload Too Large):
  - Povećati `limits.fileSize` u `multer` ili smanjiti veličinu datoteka; korisniku prikazati jasnu poruku.
- `Unexpected token <` u `res.json()`:
  - HTML error stranica se pokušava parsirati kao JSON; koristiti `await res.text()` u error grani i logirati sadržaj.

Minimalni “robustan fetch” obrazac:

```js
async function robustFetch(url, opts = {}, { timeoutMs = 20000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    if (!res.ok) {
      const body = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText} @ ${url} :: ${isJson ? JSON.stringify(body) : body}`);
    }
    return isJson ? res.json() : res.text();
  } finally { clearTimeout(t); }
}
```

## 3) Rukovanje tajnama i env varijablama
- Ključeve držati u `.env.local`, ne committati.
- U repou koristiti `.env.example` kao predložak.
- Kad se ključevi slučajno pojave u repo‑u: rotirati ih i ukloniti iz povijesti ako je potrebno.

## 4) Event sustav (širi kontekst UI‑a)
- Postojeći eventovi (primjeri):
  - `switchToTab`, `media-ai:switch-to-chat`, `media-ai:post-to-chat`
  - teme/pozadine: `theme:changed`, `bg:randomize`, `bg:set-source`, `bg:set-animations`, `bg:highlight`, `bg:set-floating`
- Pravilo: dodavanje novog eventa mora biti dokumentirano (naziv, payload, tko emitira i sluša). 

## 5) Performanse i animacije
- Animirati `transform` i `opacity` (GPU); izbjegavati skupe layout promjene.
- Trajanja: 200–400 ms za fokus promjene; ~800 ms za veće prijelaze; prekidljivost je obavezna.
- Poštivati `prefers-reduced-motion` gdje je primjenjivo.

## 6) Velike datoteke i pretrage
- Čitati segmentirano (`Get-Content -TotalCount`, `rg -n`), ne otvarati 4k+ linija odjednom.
- Tražiti uzorke umjesto cijelih datoteka (brže i sigurnije).

## 7) Tipični problemi i kako smo ih rješavali
- Sidebar nevidljiv u light temi → globalni `button` stil prekrivao pozadinu; riješeno deklaracijom `.nav-link { background: transparent !important }` i tematskim util klasama (`.text-*`, `.border-theme`).
- Sudar portova 3002 (runner/server) → Runner prebačen na 3004; dodane npm skripte (`runner`, `servers:all`).
- Proxy zbrka (`/api` slalo na 3000, ali trebali 3001) → uveden dodatni proxy `'/fw' → 3001` i prilagođen `BackendService`.
- Tajne u `.env` → uveden `.env.example`, preporučena rotacija i `.env.local`.
- Tema/pozadina → uveden theme manager (`initTheme`), uklonjene fiksne pozadine, dodan dinamični background (blobs + glass‑morph slike, random iz Screenshots dir‑a, fallbackovi per tema, opcije u “Appearance” tabu).

### 🚨 KRITIČNI BUGOVI I RJEŠENJA

1) localStorage Quota Crisis
- Problem: QuotaExceededError (5–10 MB limit) s AGBIM podacima.
- Uzrok: velike chat historije i “field simulator” podaci.
- Rješenje: lightweight caching u `AgbimDataService.js`, startup cleanup (`performStartupCleanup()`), size monitoring s 1 MB pragom, zadržati zadnjih 10 poruka po projektu.

2) TypeScript syntax u JavaScriptu
- Problem: build failures zbog TS sintakse u `.jsx`.
- Rješenje: ukloniti TS anotacije.
```js
// ❌
const [tasks, setTasks] = useState/** <Task[]> */([]);
// ✅
const [tasks, setTasks] = useState([]);
```

3) Google Gemini SDK migracija
- Problem: `@google/generative-ai` deprecated.
- Rješenje: migracija na `@google/genai@1.16.0`, schema `Type.STRING → "STRING"`, inicijalizacija `new GoogleGenAI({ apiKey })`.

4) Infinite useEffect loops
- Problem: state u dependency arrayu koji sam sebe ažurira.
- Rješenje: ovisiti o uvjetu, ne o promjenjivom state-u koji se postavlja u efektu.

5) Hover timer memory leaks
- Problem: `setTimeout` ne “clear-an” na unmount.
- Rješenje: cleanup u `useEffect` return‑u, 200ms delay za UX.

6) AnimatePresence key errors
- Problem: glitch i errori bez jedinstvenih ključeva.
- Rješenje: `key={item.id}` na child elementima.

7) CUDA/LM Studio connection issues
- Problem: `ERR_CONNECTION_REFUSED`.
- Rješenje: pokrenuti server (bat), provjeriti model path i URL (`VITE_LM_STUDIO_URL`).

8) Process Stages transparencija
- Rješenje: `ProcessStagesPanel` (NLU → Plan → Apply) + status indikatori, prikaz tool‑callova + `Stop Agent` kontrola.

9) Voice system route malformation
- Problem: `TypeError: Missing parameter name at index 1: *`.
- Rješenje: ukloniti malformirane wildcard rute; koristiti eksplicitne putanje.

10) Cross-tab komunikacija
- Problem: nesinkronizirani podaci između tabova.
- Rješenje: window events (`switchToTab`, `media-ai:*`) + cleanup listenera.

## 8) Validacija i build checklista
- Pokretanje:
  - `yarn servers:all` (3000/3001/3002/3004) + `yarn dev` (ili `dev-full`/`dev-voice` prema potrebi)
- Provjere:
  - `navItems` ↔ `App.jsx` switch (svaki tab ima rutu)
  - Vite proxy ↔ `BackendService` usklađen
  - Tema i sidebar čitljivi u svim temama
  - Pozadina radi i bez Screenshots direktorija (fallback)
  - Nema TS sintakse u `.jsx`
  - Nema tajni u diffu

## 9) Kako pratimo širi kontekst aplikacije
- Dokumentacija: 
  - Dizajn: `docs/okvir-dizajna-inteligentne-platforme.md`
  - Tehnika: ovaj dokument + `CLAUDE.md`
- Invarianti koje čuvamo usklađenima:
  - Navigacija (`src/constants/navigation.js`) ↔ Router (`src/App.jsx`)
  - Proxy (`vite.config.js`) ↔ Servisi (`BackendService`) ↔ Portovi backend‑a
  - Theme Manager ↔ `src/theme/theme.css` util klase
  - Primitivi (`src/components/ui/Primitives.jsx`) ↔ nove komponente/tabovi
- Event registry: svaku novu integraciju upisati (naziv, payload, emiteri/listeneri).

## 10) Brzi “dos & don’ts”
- DO: minimalni difovi, fokus na uzrok problema, dokumentirati evente i rute
- DO: koristiti postojeće primitivne klase umjesto hard‑coded boja
- DON’T: unositi TS sintaksu u `.jsx` ili commitati .env s tajnama
- DON’T: mijenjati portove bez ažuriranja proxyja i skripti

> Ove smjernice držimo uz sebe kod svakog novog taba, refaktora i povezivanja servisa kako bismo izbjegli regresije.
