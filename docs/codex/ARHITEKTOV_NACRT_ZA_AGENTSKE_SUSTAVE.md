# Arhitektov nacrt za agentske sustave: Od temeljnih principa do napredne implementacije

Ovaj dokument služi kao istraživački nacrt i praktični vodič za dizajniranje i implementaciju agentskih sustava — od filozofije do inženjerstva i UX-a. Namijenjen je timovima koji grade agente s glasom i/ili tekstom, uz fokus na povjerenje, transparentnost i kontrolu.

## Dio 1: Temeljni principi dizajna agenta

Ovaj temeljni odjeljak uspostavlja ključne filozofije koje moraju poduprijeti svaki uspješan agentski sustav. Prelazimo s jednostavne funkcionalnosti na čovjeku usmjerene aspekte dizajna interakcije koji grade povjerenje, osiguravaju upotrebljivost i stvaraju besprijekorno korisničko iskustvo.

### 1.1 Anatomija modernog agenta
Dekonstrukcija bitnih stupova agentskog sustava i uspostavljanje zajedničkog rječnika:

- NLU jezgra: mozak koji tumači namjeru i kontekst, robustan na dvosmislenost, sleng i složene strukture.
- Upravljanje dijalogom: orkestrator koji održava kontekst i usmjerava tijek razgovora kroz više izmjena.
- UI/UX sloj: lice agenta (GUI/VUI) — točka interakcije i ključ upotrebljivosti i zadovoljstva.
- Integracija alata i akcije: ruke agenta koje izvršavaju akcije kroz API-je i sustave.
- Upravljanje stanjem: memorija agenta (trenutno stanje + povijest) za kontekst, oporavak i višekoračne zadatke.

### 1.2 Principi dizajna konverzacijskih i glasovnih sučelja
Najbolje prakse iz VUI i konverzacijskog dizajna primjenjive i na tekstualne agente:

- Pojednostavljivanje interakcija: prirodan jezik, kratke i pamtljive naredbe.
- Jasna i sažeta povratna informacija: statusi (slušam, obrađujem, govorim) uvijek vidljivi.
- Pristupačnost i inkluzija: alternativni unosi i jasni mehanizmi povratne sprege.
- Jezik korisnika: prilagodba sustava korisnikovom jeziku, bez žargona.

### 1.3 Dizajniranje za povjerenje i kontrolu
Psihologija interakcije čovjek–agent:

- Kontrola i sloboda: prekid, povratak, pomoć i preuzimanje kontrole u svakom trenutku.
- Transparentnost: agent nije crna kutija — statusi, razlozi i odluke dostupni na zahtjev.
- Privatnost i sigurnost: jasna komunikacija o podacima i izričit pristanak za snimanje govora.

## Dio 2: Kognitivna jezgra — NLU arhitektura i strategija

### 2.1 Odabir pravog NLU modela
Okvir za odabir između generativnih modela i klasične orkestracije:

- Generativna AI (LLM): fleksibilna, minimalno postavljanje, prirodni razgovori; manje predvidljiva.
- Klasična orkestracija (NLU/NLU+/CLU): deterministička, visoka kontrola i ponovljivost; veći napor.
- Komparativno: birati prema predvidljivosti, fleksibilnosti, trošku i zahtjevu domene.

### 2.2 Dilema: Na uređaju vs. u oblaku (hibrid preporučen)

| Kriterij | On-Device | Cloud | Hibrid |
|---|---|---|---|
| Latencija | Vrlo niska | Varijabilna | Niska za primarne |
| Privatnost | Vrlo visoka | Ovisna o dobavljaču | Uravnotežena |
| Offline | Potpuna | Nikakva | Ograničena |
| Snaga modela | Ograničena | Vrlo visoka | Fleksibilna |
| Skalabilnost | Niska | Vrlo visoka | Visoka |
| Troškovi | Niski | Visoki | Varijabilni |

Napomena: odabir okvira (npr. Rasa vs. Dialogflow) je strateška odluka. Rasa omogućuje prilagođene JSON terete (ključ za „minichat“), dok zatvoreniji sustavi mogu ograničiti kasnije UX inovacije.

### 2.3 Dizajn namjera i entiteta za skalabilnost
- Sveobuhvatna taksonomija: namjere s okidačima, parametrima i ishodima.
- NLU > NLP: fokus na razumijevanje cilja korisnika, ne samo strukture rečenice.
- Tijek dijaloga: od sretnih putanja do scenarija pogrešaka i razjašnjenja (sjeme „minichata“).

## Dio 3: Sučelje agent–korisnik — Obrasci i psihologija

### 3.1 Obrasci interakcije
- Tradicionalni (Kanban, dashboard, inbox) prilagođeni agentima.
- Konverzacijski (tekst/glas) za razbijanje složenosti.
- Proaktivni poticaji (nudges) — pravovremeni, nenametljivi.
- Generativno UI — AI sastavlja sučelje po potrebi zadatka.

### 3.2 Vizualizacija stanja agenta
- Statusi: „Slušam“, „Razmišljam“, „Pretražujem“, „Čekam potvrdu“, „Izvršavam“.
- Galerija animacija: pulsirajuće kugle (slušanje), morfiranje (obrada), čestice/tokovi (pretraživanje), ambijentalna povratna informacija.
- Mikrointerakcije: klik povratne informacije, indikatori tipkanja, napredak.

Primjer CSS ambijentalnog sjaja:

```css
.ambiguous-token {
  background-color: rgba(255, 204, 0, 0.2);
  border-radius: 4px;
  cursor: pointer;
  animation: pulse-glow 2s infinite alternate;
}
@keyframes pulse-glow {
  from { box-shadow: 0 0 2px #ffcc00, 0 0 4px #ffcc00, 0 0 6px #ffcc00; }
  to   { box-shadow: 0 0 4px #ffcc00, 0 0 8px #ffcc00, 0 0 12px #ffcc00; }
}
```

### 3.3 Psihologija pokreta
- Svrhovitost: animacija mora služiti upotrebljivosti.
- Brzina: 200–500 ms, ne blokira korisnika.
- Easing/realizam: prirodan osjećaj ubrzanja/usporavanja.

„Sučelje“ je zapravo niz prijelaza stanja kroz vrijeme. Primarni artefakt je storyboard/prototip prijelaza (mirovanje → slušanje → obrada → rezultat). Framer Motion postaje arhitektonski alat, ne samo dekoracija.

## Dio 4: Upravljanje složenošću strojevima stanja

### 4.1 Uvod u FSM za UI logiku
Višestruke booleovske zastavice vode u nemoguća stanja. FSM jamči legalna stanja i predvidive prijelaze.

### 4.2 Implementacija s XState
- Definiranje stroja: `createMachine({ id, initial, context, states, on })`.
- Hijerarhijska stanja: npr. `fokus` → `osnovni_fokus`/`super_fokus`.
- Paralelna stanja: ortogonalna (npr. UI vizualno stanje i background sync).

### 4.3 Orkestracija asinkronih operacija
- Pozvani akteri (invoked actors) umjesto „fire-and-forget“ akcija.
- Pozivanje obećanja (Promises) uz `fromPromise`, `onDone`, `onError`, `assign` u context.
- Testiranje asinkronih strojeva: `waitFor` i izolacija životnog ciklusa aktera.

XState kao orkestracijski sloj: modelira cijeli životni ciklus suradnje i zadataka, ne samo UI status.

## Dio 5: Napredna implementacija — „Minichat“ protokol za razjašnjavanje

### 5.1 Arhitektonski zahtjevi i API ugovor
NLU usluga mora vratiti prilagođeni JSON teret kad je pouzdanost niska.

Primjer JSON strukture:

```json
{
  "status": "clarification_needed",
  "original_command": "Prikaži mi trendove prihoda za Sjevernu regiju",
  "ambiguous_tokens": [
    { "text": "Sjevernu", "type": "region", "candidates": ["Sjeverna HR", "Sjeverna EU"] }
  ],
  "suggested_clarifications": [
    { "label": "Sjeverna HR", "payload": { "region": "hr_north" } },
    { "label": "Sjeverna EU", "payload": { "region": "eu_north" } }
  ]
}
```

### 5.2 Modeliranje stroja stanja za razjašnjavanje
Stanja: `idle` → `processingCommand` → `awaitingClarification` → `reprocessingWithContext` → `executing` → `failure`.
Događaji: `SUBMIT_COMMAND`, `NLU_SUCCESS`, `NLU_CLARIFICATION_NEEDED`, `CLARIFICATION_RECEIVED`, `NLU_ERROR`, `CANCEL`.

### 5.3 Implementacija UI/UX-a
- Dinamičko renderiranje naredbe s isticanjem dvosmislenih tokena.
- Predstavljanje prijedloga (`suggested_clarifications`) kao interaktivnih gumba.
- Fluidni prijelazi s `AnimatePresence` i mikrointerakcije.

### 5.4 Rukovanje rubnim slučajevima
- Timeout za `awaitingClarification`; nježni podsjetnik ili povratak u `idle`.
- Ponovljena dvosmislenost: 1–2 kruga, zatim ponuditi „otkaži“.
- Sistemske pogreške: jasan failure UI i povratne informacije.
- Nepovezan tekst: detektirati novu namjeru i prekinuti tijek razjašnjenja.

## Dio 6: Višekratni nacrt i biblioteka

### 6.1 Kontrolni popis implementacije
- Dizajn i arhitektura: potrebe, NLU arhitektura i okvir, taksonomija namjera.
- Osnovna logika: XState stroj, invoked promise actors, clarificationMachine.
- UI: statusi i animacije, komponenta „Minichat“.
- Testiranje: jedinice za stroj i asinkrono, korisnički testovi, rubni slučajevi.

### 6.2 Biblioteka osnovnih komponenti
- XState: `apiCallMachine`, `clarificationMachine`.
- React: `<AgentStatusIndicator>`, `<HighlightedCommand>`.
- Rasa: predložak prilagođene akcije za `clarification_needed` JSON.

---

Napomena: Ovaj nacrt je nastavak „Okvir za Dizajn Inteligentne, Persona-Vođene Poslovne Platforme“ i služi kao uputni materijal za „Codex Control“ tab (Dokumenti + Upute) te kao temelj za specifikaciju agentskih značajki poput GVAv2 i „minichata“.

