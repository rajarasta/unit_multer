# Okvir za Dizajn Inteligentne, Persona-Vođene Poslovne Platforme

Ovaj dokument je istraživački “source-of-truth” za UI/UX odluke u aplikaciji. Služi kao temeljni nacrt koji ćemo nadograđivati tijekom razvoja i refaktora modula.

## Sažetak

Okvir definira četiri stupa: (1) skalabilnu informacijsku arhitekturu, (2) dizajn vođen personama, (3) senzitivni vizualni jezik (svjetlo/boja/pokret) i (4) agentsko korisničko sučelje koje je transparentno i prekidljivo. Cilj je platforma koja je moćna, intuitivna i prilagodljiva budućnosti rada.

---

## Dio I: Arhitektonski temelj — strukturiranje aplikacijskog ekosustava

### 1.1. Ukroćivanje složenosti: informacijska arhitektura za 26 modula

Moduli se grupiraju po domenama temeljenim na radnim procesima (princip “locus of attention”):

- Operacije i logistika: kretanje dobara i resursa
- Financijsko upravljanje: računovodstvo, troškovnici, nadzor
- AI i automatizacija: AI agenti, obrada dokumenata, orkestracija
- Suradnja i produktivnost: chat, zadaci, koordinacija
- Administracija i postavke: korisnici, sustav, izgled

Ova struktura stvara mentalni model tvrtke unutar aplikacije. Navigacija odražava uloge i odjele, smanjujući kognitivni trošak.

#### Tablica 1 — Grupiranje modula i hijerarhija (sažetak)

| Primarna domena | Ikona | Modul | Slug | Ciljane uloge |
|---|---|---|---|---|
| Operacije i logistika | truck | Skladište | `warehouse` | Skladištar, Poslovođa |
| Operacije i logistika | truck | Otprema | `dispatch` | Poslovođa |
| Operacije i logistika | truck | Tlocrt | `floorplan` | Poslovođa, Projektant |
| Operacije i logistika | qr | Barcode Scanner | `barcode-scanner` | Skladištar |
| Financijsko upravljanje | calculator | Accounting | `accounting` | Računovođa |
| Financijsko upravljanje | calculator | Invoice Processor 2 | `invoice2` | Računovođa |
| Financijsko upravljanje | calculator | Invoice Simple | `invoice-simple` | Svi |
| Financijsko upravljanje | calculator | Troškovnik | `BoQ` | Projektant, Računovođa |
| AI i automatizacija | sparkle | AI Inference | `ai-inference` | Napredni korisnici |
| AI i automatizacija | sparkle | AI File Processor | `ai-file-processor` | Svi |
| AI i automatizacija | mic | Glasovni Agent | `voice` | Svi |
| AI i automatizacija | book | AI Agent Guide | `ai-agent-guide` | Svi |
| AI i automatizacija | headphones | Hrvatski Glasovni Agent | `voice-agent-hr` | Svi |
| AI i automatizacija | mic | Voice HR V2 | `voice-hr-v2` | HR, Menadžment |
| AI i automatizacija | calendar | Gantt Voice Agent | `gantt-agent` | Projektant, Menadžment |
| AI i automatizacija | zap | Voice Orchestrator | `voice-orchestrator` | Napredni |
| AI i automatizacija | zap | Glasovno projektiranje | `circus` | Projektant |
| Suradnja i produktivnost | message | Chat | `chat` | Svi |
| Suradnja i produktivnost | folder | Task Hub | `task-hub` | Svi |
| Suradnja i produktivnost | network | Employogram | `employogram` | HR, Menadžment |
| Suradnja i produktivnost | layers | Procesor dokumenata | `proccessor` | Svi |
| Administracija i postavke | users | Upravljanje korisnicima | `users` | Administrator |
| Administracija i postavke | layers | Appearance | `background-lab` | Svi |
| Ostalo / spec. | smartphone | AGBIM Field Simulator | `agbim-field` | Projektant |
| Ostalo / spec. | sparkles | Animation Playground V2 | `animations-v2` | Dizajner, Dev |

> Napomena: G VAv2 (`gva-v2`) je nova varijanta Gantt Voice Agenta s modernim layoutom.

### 1.2. Dvorazinski bočni izbornik

- Primarna razina: uska traka s ikonama domena, tooltip na hover
- Sekundarna razina: susjedni panel s modulima i oznakama (badges)
- Vidljivost po ulozi: prikaz samo relevantnih modula
- Oznake (badges): broj stanja (npr. Chat, Otprema) + glow animacija

### 1.3. Mobilna i responzivna strategija

- Off‑canvas izbornik s harmonikama (accordions)
- Donja traka s 3–5 kontekstualnih kartica po ulozi
- Modularna arhitektura: lazy‑loaded moduli, deep‑linking

---

## Dio II: Dizajn vođen personama — prilagodba iskustva

Jedinstveni sustav dizajna + varijante po personama.

### 2.1. Skladište i otprema — brzina i točnost

- Tamna/kontrastna tema, velika tipografija, velike dodirne površine
- Barkod kao “prvi korak”, FAB gumb u Skladištu/Otprema
- Haptika i zvuk za potvrde/greške
- Pojednostavljena lista — naglasak na količini i lokaciji
- Pretraga: rezultati koji ne odgovaraju — smanjena neprozirnost (~30%) i blagi blur (brzi perceptivni filter)

### 2.2. Računovodstvo i financije — jasnoća u gustoći

- Minimalistički, neutralni UI; boja za status (zelena plaćeno, crvena dospjelo)
- Progresivno otkrivanje: sažetak → detalji (expand/modals)
- Mreže podataka: poravnavanje (tekst lijevo, brojevi desno), monospace za brojeve
- Kontrola gustoće (sažeto/normalno/opisno), prikazi stupaca (show/hide/reorder), inline edit i masovne akcije
- Kontekstualna pomoć: nakon obrade računa — prijedlozi budžeta/projekcije

### 2.3. Univerzalno iskustvo — konzistentan jezik

- Jedinstvene komponente (gumbi, tabovi, forme, tipografija, spacing, ikone)
- Navigacija tipkovnicom + Cmd/Ctrl+K naredbeni izbornik
- Predvidljivi rasporedi (header, sadržaj, desni/bočni panel)

#### Tablica 2 — Matrica prilagodbe po personama

| Princip | Skladište/Otprema | Računovodstvo/Financije | Univerzalno |
|---|---|---|---|
| Gustoća | Niska (opušteno) | Visoka (sažeto) | Srednja |
| Interakcija | Dodir + skeniranje | Tipkovnica + miš | Tipkovnica + miš |
| Vizualni stil | Visoki kontrast | Minimalistički | Čist, brendiran |
| Ključna komponenta | Barcode Scanner | Napredna mreža | Chat i liste |

---

## Dio III: Senzitivno sučelje — napredna vizualna interakcija

### 3.1. Kontekst kroz svjetlo/boju/pokret

- Dinamične pozadine: suptilni gradijenti kad radi AI; kritični moduli imaju drugačiji “ton”
- Kontekstualna promjena boje: krom sučelja tintan bojom projekta
- Smislene mikro‑interakcije: “potvrda akcije”, spinneri, state‑driven animacije
- Dubina: sjene/elevacija za hijerarhiju (modali, primarne akcije)

### 3.2. Fokusi: zamućenje, neprozirnost, dubina

- Glassmorphism za prekrivanja (zamućena pozadina održava prostorni kontekst)
- “Focus mode”: kad agent radi ili je u kritičnom okviru — ostatak UI zamračen i blago zamagljen
- Interaktivno isticanje:
  - Pretraga: ne‑match redovi izblijede i zamagle
  - Gantt: aktivna traka ostaje u fokusu; ostalo se zamagljuje

> Implementirano u aplikaciji: dinamična pozadina s highlight eventom (`bg:highlight`), “glass‑morph” sloj, tematski tintovi.

---

## Dio IV: Dizajniranje AI partnerstva — agentski način fokusa

### 4.1. Temeljni principi

- Transparentnost (status + što i zašto), kontrola (start/pause/resume/cancel), konzistentnost obrazaca, prihvaćanje nesigurnosti (signal niske pouzdanosti)

### 4.2. Obrazac u stvarnom vremenu

**Plutajuća pilula** — uvijek vidljiva, kratki opis akcije (razmišljam, dohvaćam, analiziram, ažuriram…). Klik otvara/skriva **ladicu s detaljima**.

**Ladica s detaljima** — korak‑po‑korak zapis plana i izvršenja s vrstom koraka, statusom (dovršeno/aktivno/na čekanju/greška), kratkim opisom, te proširivim ulaz/izlaz dijelovima za praćenje i otklanjanje pogrešaka.

Primjeri vrsta koraka: razmišljanje/planiranje, poziv API‑ja, analiza dokumenta, interakcija s UI‑jem, potreban unos korisnika.

### 4.3. Studija slučaja: “kritični put + odgoda 3 dana”

1) Pokretanje (glas) → fokus mode. 2) Pilula “Planiram izmjene…”, ladica prikazuje plan (čeklistu). 3) Korisnik potvrđuje. 4) Gantt vizualno označava kritični put i zavisnosti (žuta/plava), barovi “svjetlucaju” pri izmjeni, ostalo zamagljeno. 5) Ladica u realnom vremenu bilježi korake i API pozive. 6) Pauza/otkaz u svakom trenutku. 7) Završetak: uklanjanje zamućenja, sažeta potvrda izmjena.

---

## Plan implementacije (faze)

1) Temelj: sustav dizajna + IA + dvorazinski sidebar.
2) Persona‑varijante: Skladište i Financije (usability test po ulozi).
3) Napredno sučelje i agentika: senzitivni elementi + Agentski način (pilot: Gantt Voice Agent).

## Završna misao

Uspjeh ne ovisi o broju značajki, nego o promišljenoj organizaciji i prezentaciji koje osnažuju različite uloge. Ovaj okvir je putokaz do toga.

