
# Employogram / GVAv2 — MEGA SPEC & PLAYBOOK
_Last updated: 2025-09-06 00:07:13 UTC_

> **Purpose:** This document is a single-source-of-truth for building the **voice → action** pipeline for Gantt operations in Employogram/GVAv2.  
> It is designed to be *implementation-ready*, *forward-looking*, and *strictly structured* to minimize drift and ambiguity.

---

## 0. Executive Summary
- **Goal:** Convert Croatian speech into **atomic, deterministic actions** over Gantt processes (shift planned dates; set status), with **streaming** previews, **Focus/Superfocus** execution, and minimal fallback.
- **Approach:** Use **OpenAI Responses API** with **SSE streaming** and **strict function-calling** tools.
- **Contract:** A single `emit_action` or `ask_clarify` per turn; **no narrative output**.
- **UX:** Low-latency ghost previews fed by `function_call_arguments.delta`; Focus to confirm, Superfocus to auto-commit.
- **Forward-thinking:** Modular tool surface; Realtime API path; policy toggles; telemetry; idempotency at the edge.

---

## 1. Problem Definition & Scope
We are aligning **voice-driven control** of Gantt "process units" with atomic operations:
- **A)** `shift` — move **plannedStart/End** by ±N days (preserve duration; do not touch actual*).
- **B)** `set_status` — change the `status` of one or more processes.

Other ops (set_start, set_end, set_range, distribute_chain, etc.) are part of the long-term surface but **not** required for this iteration of the report.

**In-database entities (excerpts):**
```json
{
  "name": "Prodaja",
  "status": "Završeno",
  "owner": { "id": "u3", "name": "Marko P.", "email": "marko@example.com" },
  "plannedStart": "2025-08-16",
  "plannedEnd": "2025-08-16",
  "actualStart": "2025-08-16",
  "actualEnd": "2025-08-16",
  "progress": 100,
  "notes": ""
}
```

---

## 2. Architecture Overview (Voice → Actions)
**Pipeline (Path A, recommended now):**
1. **Local ASR** produces Croatian transcript in ~160 ms chunks.
2. Send transcript into **OpenAI Responses API** with `stream: true` and **tools** configured.
3. The model outputs **only**:
   - `emit_action` (when all slots are present), or
   - `ask_clarify` (one precise question when exactly one slot is missing or ambiguous).
4. UI consumes **SSE events**. While arguments stream in (`function_call_arguments.delta`), UI shows **ghost preview** for dates/status.
5. **Focus mode:** user confirms or corrects. **Superfocus:** auto-commit with pause/intercept controls.
6. Backend executes action with idempotency and audit.

**Optional Pipeline (Path B, later):** **Realtime API** (WebRTC/WebSocket) for speech-to-speech agents and even lower latency.

---

## 3. Tool Surface (STRICT)
> _Exactly one tool call per turn; `parallel_tool_calls = false`._

### 3.1 `emit_action` (Execution)
- **Purpose:** Emit a single, atomic, backend-ready action.
- **Parameters (strict JSON Schema):**
```json
{
  "type": "object",
  "properties": {
    "type": { "type": "string", "enum": ["shift", "set_status"] },
    "targets": {
      "type": "array",
      "items": { "type": "string", "pattern": "^[A-ZČĆĐŠŽ0-9]+$" },
      "minItems": 1
    },
    "params": {
      "type": "object",
      "oneOf": [
        {
          "properties": { "days": { "type": "integer" } },
          "required": ["days"],
          "additionalProperties": false
        },
        {
          "properties": { "status": { "type": "string" } },
          "required": ["status"],
          "additionalProperties": false
        }
      ]
    },
    "client_action_id": { "type": "string", "minLength": 8 },
    "requested_at": { "type": "string", "format": "date-time" }
  },
  "required": ["type", "targets", "params", "client_action_id", "requested_at"],
  "additionalProperties": false
}
```

### 3.2 `ask_clarify` (Minimal Fallback)
- **Purpose:** Ask a single, precise question to complete **one** missing slot.
- **Parameters (strict):**
```json
{
  "type": "object",
  "properties": {
    "question": { "type": "string" },
    "missing_slots": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["intent", "targets", "days", "status"]
      },
      "minItems": 1,
      "maxItems": 2
    }
  },
  "required": ["question", "missing_slots"],
  "additionalProperties": false
}
```

---

## 4. Prompting (System + Developer)
> These prompts force tool-calling and suppress narrative output.

### 4.1 System Prompt
```
Ti si “Voice → Actions Orchestrator” za Employogram/GVAv2.
Zadatak: Pretvori hrvatske transkripte u točno jednu atomsku akciju.
U svakom odgovoru napravi točno jedno:
1) Pozovi tool `emit_action` ako su svi slotovi jasni.
2) Inače pozovi tool `ask_clarify` s jednim kratkim pitanjem.

Nikad ne odgovaraj narativnim tekstom; ne koristi paralelne tool-pozive.

Podržane akcije (emit_action.type):
- shift  — pomak planiranog raspona (očuvaj trajanje). params: { "days": signed int }
- set_status — promjena statusa. params: { "status": string (kanon) }

Slot-gating (deterministički):
- shift: potrebni `targets` i `days`.
- set_status: potrebni `targets` i `status` (kanon).
- inače `ask_clarify` s jednim pitanjem.

Normalizacije (HR):
- Aliasi/badgevi: makni razmake/točke/crtice, velika slova. “Kia 7”→KIA7; “POZICIJA 9”→POZICIJA9; “334”→334.
- Ako je transkript “KIA 7.3.3.4”, razdvoji u KIA7 i 334.
- Brojevi: riječi i brojke (“tri” / “3.”) → integer 3.
- Smjer: naprijed/plus ⇒ +; nazad/unazad/natrag/minus ⇒ −.
  - Ako smjer izostane, pretpostavi naprijed (ne pitaj).

Status whitelist: Planirano, U TIJEKU, Blokirano, Odgođeno, Čeka materijal, Završeno, Otkazano.
Sinonimi: “blokirane/blokiran”→Blokirano; “u procesu”→U TIJEKU; “na čekanju”→Čeka materijal; “gotovo/završena”→Završeno.

Poslovno pravilo:
- shift mijenja samo plannedStart/plannedEnd; actual* se ne diraju.
- set_status mijenja samo status.
```

### 4.2 Developer Prompt
```
Higijena tool-poziva:
- Poštuj strict sheme; bez dodatnih polja.
- `targets` su već normalizirani badge aliasi.
- Obavezno postavi `client_action_id` (UUID) i `requested_at` (ISO).
- Ako manjka točno jedan slot -> `ask_clarify` (jedno kratko pitanje).

Ne emitirati narativni `output_text`; samo tools.
```

---

## 5. Few-shot Examples
**1) Pomak unaprijed:**  
_Ulaz:_ “Pomakni Kia 7 za 3 dana naprijed.”  
_Izlaz (tool):_
```json
{
  "name": "emit_action",
  "arguments": {
    "type": "shift",
    "targets": ["KIA7"],
    "params": { "days": 3 },
    "client_action_id": "uuid-...",
    "requested_at": "2025-09-06T10:00:00Z"
  }
}
```

**2) Pomak nazad (skraćeno):**  
_Ulaz:_ “Kia 7 tri nazad.”  
_Izlaz:_ `emit_action` sa `"days": -3`.

**3) Smjer izostao (pretpostavi naprijed):**  
_Ulaz:_ “Pomakni KIA 7 za 5.”  
_Izlaz:_ `emit_action` sa `"days": 5`.

**4) Status na više procesa:**  
_Ulaz:_ “KIA 7.3.3.4 blokirano.”  
_Izlaz:_ `emit_action` sa `targets: ["KIA7","334"]`, `status: "Blokirano"`.

**5) Nedostaje slot (days):**  
_Ulaz:_ “Pomakni PZ 78 naprijed.”  
_Izlaz:_ `ask_clarify` s “Za koliko dana pomaknuti PZ78?” i `missing_slots: ["days"]`.

---

## 6. Streaming Event Map (SSE)
- `response.created` → Enter **Focus**; init blur/overlay.
- `response.function_call_arguments.delta` → Accumulate JSON deltas → live **ghost preview** (e.g., show new planned dates or status).
- `response.function_call_arguments.done` → Parse final JSON; route to Focus confirm or Superfocus auto-commit.
- `response.completed` → Enable Confirm/Correct/Cancel (Focus).
- `error` → Fallback UI notice + diagnostics.

**Preview Logic (ghost):**
- For `shift`: show `plannedStart/End` before → after (signed delta) per target.
- For `set_status`: paint new `status` badge on targets (non-destructive).

---

## 7. Slot-Gating (Deterministic)
| Intent     | Required Slots           | Action         |
|------------|---------------------------|----------------|
| shift      | targets, days             | emit_action    |
| set_status | targets, status (kanon)   | emit_action    |
| —          | any one missing           | ask_clarify    |

Ambiguities: multiple intents in one utterance → pick the **first clear intent** and emit exactly one action.

---

## 8. HR Normalization
**Aliases (badges)**: strip spaces/dots/dashes, uppercase.  
Mapping (provided set of 10):
```
POZ 1      → POZ1
POZICIJA 9 → POZICIJA9
5561       → 5561
POZICIJA 35→ POZICIJA35
POZ 14     → POZ14
PZR 3      → PZR3
PZ 78      → PZ78
KIA 7      → KIA7
AKO 5      → AKO5
334        → 334
```

**Numbers**: “tri/3/3.” → 3; “šest/6/6.” → 6; etc.  
**Direction**: naprijed/plus ⇒ +; nazad/unazad/natrag/minus ⇒ −.  
**Status (whitelist + synonyms)**:
- Kanon: `Planirano, U TIJEKU, Blokirano, Odgođeno, Čeka materijal, Završeno, Otkazano`  
- Mape: “blokirane/blokiran”→Blokirano; “u procesu”→U TIJEKU; “na čekanju”→Čeka materijal; “gotovo/završena”→Završeno.

---

## 9. Data Contract (Backend)
**Common envelope:**
```json
{
  "type": "<shift|set_status>",
  "targets": ["KIA7"],
  "params": { "days": 3 },
  "client_action_id": "uuid-...",
  "requested_at": "2025-09-06T10:00:00Z"
}
```

**Shift semantics:** preserve duration: `Δ = plannedEnd - plannedStart`; apply signed days to both; do not touch `actual*`.  
**Set_status semantics:** only set `status`; no other field mutated (unless later policy toggles say otherwise).

**Idempotency & Locking:**  
- Deduplicate by `client_action_id`.  
- Per-process lock for batch updates; whole batch as one transaction.  
- Audit: `actor`, `source="voice"`, `changed_fields`, `old→new` with timestamps.

---

## 10. UI/UX (Focus & Superfocus)
**Focus:**  
- Shows resolvable target aliases with overlays and a **ghost preview**.  
- Buttons: Confirm / Correct / Cancel.  
- If calendar policies exist (e.g., no Sundays), offer **snap** suggestions before Confirm.

**Superfocus:**  
- Autocommit when a single tool call arrives complete; still allow Pause/Abort/Take control.  
- Emit micro-events back to UI (e.g., “Validated KIA7”, “Batch 2/2 committed”).

**Accessibility & Latency:**  
- 160 ms transcript chunk cadence.  
- Hints/labels on badges for recognition in noisy environments.

---

## 11. Golden Test Set (30 utterances)
**Shift (15):**
1. “Pomakni Kia 7 za tri naprijed.” → KIA7, +3  
2. “Kia 7 tri nazad.” → KIA7, −3  
3. “POZ 1 plus tri.” → POZ1, +3  
4. “Vrati PZ 78 dva dana unazad.” → PZ78, −2  
5. “Stavi 5561 tri naprijed.” → 5561, +3  
6. “AKO 5 minus 1.” → AKO5, −1  
7. “Pomakni KIA 7 za pet.” → KIA7, +5  
8. “PZR 3 nazad za 4.” → PZR3, −4  
9. “POZICIJA 35 tri dana naprijed.” → POZICIJA35, +3  
10. “Kia sedam sedam naprijed.” → KIA7, +7  
11. “Zgurni KIA7 za 2.” (kolokvijalno) → KIA7, +2  
12. “Makni unazad POZ14 za 6.” → POZ14, −6  
13. “Gurni naprijed tri dana KIA 7.” → KIA7, +3  
14. “PZ 78 tri.” (bez smjera) → PZ78, +3 (default naprijed)  
15. “Ak 5 vrati dan.” → AKO5, −1

**Set_status (15):**
16. “KIA 7.3.3.4 blokirano.” → KIA7, 334 = Blokirano  
17. “POZICIJA 35 u procesu.” → U TIJEKU  
18. “PZR 3 na čekanju.” → Čeka materijal  
19. “5561 gotovo.” → Završeno  
20. “POZ 14 odgođeno.” → Odgođeno  
21. “PZ 78 otkazano.” → Otkazano  
22. “KIA 7 blokirane.” → Blokirano  
23. “POZICIJA 9 u tijeku.” → U TIJEKU  
24. “334 čekanje.” (nekanonski) → ask_clarify (status)  
25. “PZR 3 čeka materijal.” → Čeka materijal  
26. “AKO 5 planirano.” → Planirano  
27. “POZ 1 završena.” → Završeno  
28. “PZ 78 u procesu i POZ14 blokirano.” → Prva jasna (U TIJEKU) ili split policy → **emit single** (prefer first clear).  
29. “KIA7 status na čekanju, mislim čeka materijal.” → Čeka materijal  
30. “POZ 1 promijeni.” (bez statusa) → ask_clarify (status)

---

## 12. Implementation Notes
- **Streaming handlers:** consume `response.function_call_arguments.delta` to update preview **before** finalization.
- **Error handling:** When JSON parse fails for tool args, emit non-destructive UI error and re-prompt.
- **Time zone:** Europe/Zagreb for date math.
- **Policies:** Optional automations (e.g., `Završeno` → set `actualEnd=today`) should be **OFF** by default for research.

---

## 13. Roadmap (Forward-thinking)
1. **Expand tools:** `set_start`, `set_end`, `set_range`, `distribute_chain`, `normative_extend`.
2. **Realtime API**: speech-to-speech, server guardrails, and tool calls over WebRTC.
3. **Confidence-less gating** remains; add evaluators for **ambiguity scores** (not confidence).
4. **Personalization:** per-team synonyms and per-site dialect lexicon injection.
5. **Calendar policies:** factory-specific non-working days; automatic snapping suggestions.
6. **Telemetry & evals:** per-utterance success, time-to-commit, correction rate; nightly evaluation suite.
7. **Offline mode:** local intent parser as fallback with the same schema.

---

## 14. Appendices

### A) Data Model Impact (Shift)
Given:
```
plannedStart: 2025-08-16
plannedEnd  : 2025-08-16
```  
Shift +3 →
```
plannedStart: 2025-08-19
plannedEnd  : 2025-08-19
```
Actuals unchanged.

### B) Minimal Backend Pseudocode (Shift & Set Status)
```
if action.type == "shift":
    for alias in action.targets:
        p = db.get(alias)
        delta = action.params.days
        dur = p.plannedEnd - p.plannedStart
        p.plannedStart += delta days
        p.plannedEnd   = p.plannedStart + dur
        db.save(p)

if action.type == "set_status":
    for alias in action.targets:
        p = db.get(alias)
        p.status = action.params.status
        db.save(p)
```

### C) Glossary
- **Focus**: preview + confirm/correct.
- **Superfocus**: autonomous commit with interrupt controls.
- **Ghost preview**: UI visualization of pending changes as deltas stream in.
- **Idempotency**: using `client_action_id` to avoid duplicates.

---

**End of Mega Report.**
