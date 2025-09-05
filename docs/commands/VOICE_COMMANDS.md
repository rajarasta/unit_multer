# VOICE AND TEXT COMMANDS (GVAv2)

Centralni popis podržanih naredbi i ponašanja u GVAv2.

Osnovno
- Wake word: "agent" — aktivira Focus Mode (PR bedževi, glow, auto‑alias do 12 traka).
- Potvrda: "potvrdi", "primijeni", "ok", "u redu", "da" — potvrđuje prvu čekajuću akciju (ghost vidljiv).
- Poništenje: "odustani", "poništi", "ne" — odbacuje prvu čekajuću akciju.
- Spremi i izađi: "dalje" — persistira queued promjene i izlazi iz fokusa.
- Izađi bez spremanja: "prekini" — zatvara fokus bez persista promjena.

Pojedinačne trake
- Pomak po danima: "pomakni PR5 za 2 dana"
  - Podržane riječi: jedan, dva, tri, četiri/cetiri, pet, šest/sest…; plus/minus (npr. "plus jedan", "minus 3").
  - Podržane jedinice: dan/dana, tjedan/tjedna (tjedan = 7 dana).
- Pomak na konkretan datum: "pomakni početak PR3 na 2025-10-01"
- Pomak na početak mjeseca: "pomakni početak PR2 na početak rujna" (prepoznaje hrvatske mjesece i varijante)
- Kratki datum: "start pr4 na 1.9" (ili "1.9.2025")
- PZ aliasi: moguće i "start pz02 na 1.9" — PZxx kodovi se automatski mapiraju na trake u fokusu.

Globalne operacije
- "pomakni sve za 2 dana" — pomiče sve trake za N dana (podržani i negativni pomaci).
- "rasporedi početke sa krajevima" — sortira trake po početku i postavlja da svaka iduća krene dan nakon završetka prethodne (trajanje se zadržava).
- "korigiraj trajanje prema normativu" — svim trakama produžuje trajanje za +2 dana (pomiče kraj).

Zadaci i čitanje
- "dodaj zadatak" — otvara modal za diktiranje/unos teksta, lokalno sprema bilješke.
- U modal kontekstu: "upiši <tekst>" — upisuje zadani tekst u bilješku (scope: samo u modalu).
- "pročitaj mi" — pročita zadnju spremljenu bilješku hrvatskim TTS glasom (ako je dostupan u sustavu).

Potvrda i Ghost pregled
- Pojedinačne promjene prvo ulaze u "Čekaju potvrdu" i prikazuje se ghost traka na novoj poziciji.
- U fokusu agent automatski sluša dok postoje čekajuće akcije (nije potreban klik na mikrofon).
- Iznad gantta prikazuje se banner s uputom: reci "potvrdi" / "poništi".

Alias i prečaci
- PR aliasi (PR1, PR2…) se automatski dodjeljuju prvim vidljivim trakama u Focus Mode-u.
- PZ prečaci (npr. PZ02) se heuristički mapiraju na trake prema `id`/`naziv` i dostupni su za naredbe "start …".

Primjeri
- "agent" → aktivira fokus.
- "pomakni pr4 za jedan dan" → ghost + potvrda glasom.
- "start pz02 na 1.9" → postavlja početak kratkim datumom.
- "pomakni sve za 2 dana" → globalni pomak svih traka.
- "rasporedi početke sa krajevima" → formira lanac bez preklapanja.
- "korigiraj trajanje prema normativu" → svim trakama +2 dana trajanja.
- "dodaj zadatak" → otvara modal za diktat; "pročitaj mi" → TTS čitanje zadnje bilješke.
- "dalje" → spremi queued promjene i izađi; "prekini" → izađi bez spremanja.

Napomene
- Globalne radnje se potvrđuju glasom kao i pojedinačne; ghost overlay se prikazuje za pojedinačne trake.
- Persist se izvršava na "dalje" (best‑effort patch u ProjectDataService); "prekini" zatvara bez spremanja.
