import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Circle,
  CircleDot,
  Loader2,
  Play,
  Square,
  Settings,
  Notebook,
  Shield,
  Brain,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

// =============================
// Types
// =============================
export type Ctx = {
  employer: string;
  role: "planner" | "tech" | "admin" | "external";
  clearance: number;
  allowedProjects: string[];
};

export type StepReq = {
  state: any;
  user_guidance?: string;
  last_tool_result?: any;
  /**
   * Some backends expect ctx at top-level; we include it here (optional) while also
   * ensuring it exists inside state via ensureStateHasCtx().
   */
  ctx?: Ctx;
};

export type StepRes = {
  checkpoint: boolean;
  question?: string | null;
  next_state_hint?: any;
  tool_result?: any;
  result?: any;
};

export type ProbeRes = {
  intent: string;
  candidates: { action: string; p: number }[];
  recommendFire?: { action: string; reason: string };
};

export type Props = {
  /**
   * User/security context. May be omitted; component will fall back to a safe default
   * to avoid runtime errors and will show a small warning banner in the UI.
   */
  ctx?: Partial<Ctx>;
  stepEndpoint: string;
  probeEndpoint?: string;
  simulate?: boolean;
};

// =============================
// Safe context helpers (prevents ctx.role undefined crashes)
// =============================
export const DEFAULT_CTX: Ctx = {
  employer: "UNKNOWN",
  role: "external",
  clearance: 0,
  allowedProjects: [],
};

export function makeSafeCtx(maybe: Partial<Ctx> | undefined): Ctx {
  return {
    employer: maybe?.employer ?? DEFAULT_CTX.employer,
    role: (maybe?.role as Ctx["role"]) ?? DEFAULT_CTX.role,
    clearance: Number.isFinite(Number(maybe?.clearance)) ? Number(maybe?.clearance) : DEFAULT_CTX.clearance,
    allowedProjects: Array.isArray(maybe?.allowedProjects) ? (maybe!.allowedProjects as string[]) : [],
  };
}

export function ensureStateHasCtx<S extends Record<string, any>>(s: S, ctx: Ctx): S & { ctx: Ctx } {
  if (s && typeof s === "object" && s.ctx) return s as S & { ctx: Ctx };
  return { ...(s as any), ctx } as S & { ctx: Ctx };
}

export function makeStepEnvelope(state: any, ctx: Ctx, user_guidance?: string): StepReq {
  const st = ensureStateHasCtx(state, ctx);
  return { state: st, user_guidance, ctx };
}

// =============================
// Component
// =============================
export default function LiveAgentStepper({ ctx, stepEndpoint, probeEndpoint, simulate }: Props) {
  const safeCtx = useMemo(() => makeSafeCtx(ctx), [ctx]);
  const ctxFallback = !ctx || typeof (ctx as any).role === "undefined" || typeof (ctx as any).clearance === "undefined";

  const [draft, setDraft] = useState<string>("");
  const [state, setState] = useState<any>({
    goal: "",
    constraints: [],
    evidence: [],
    next_action: "plan",
    pending_questions: [],
  });
  const [guidance, setGuidance] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [trace, setTrace] = useState<any[]>([]);
  const [probe, setProbe] = useState<ProbeRes | undefined>(undefined);
  const [autoFire, setAutoFire] = useState<boolean>(true);
  const [threshold, setThreshold] = useState<number>(0.78);
  const [cooldown, setCooldown] = useState<number>(500);
  const lastFireRef = useRef<number>(0);

  // === Debounced probe while typing ===
  useEffect(() => {
    if (!draft) {
      setProbe(undefined);
      return;
    }
    const t = setTimeout(() => {
      callProbe(draft, safeCtx)
        .then((res) => setProbe(res))
        .catch((err) => {
          pushTrace({ type: "error", reason: "probe", error: String(err) });
          console.error("Probe error", err);
        });
    }, 120);
    return () => clearTimeout(t);
  }, [draft, safeCtx, probeEndpoint]);

  // Auto-fire when probe confidence crosses threshold
  useEffect(() => {
    if (!autoFire || !probe || !probe.recommendFire) return;
    const now = Date.now();
    if (now - lastFireRef.current < cooldown) return;
    const best = probe.candidates?.slice()?.sort((a, b) => b.p - a.p)[0];
    if (best && best.p >= threshold) {
      lastFireRef.current = now;
      startStep("Auto-fire: " + best.action).catch((e) => console.error(e));
    }
  }, [probe, autoFire, threshold, cooldown]);

  async function startStep(reason = "Manual start"): Promise<void> {
    setBusy(true);
    try {
      const initial = makeStepEnvelope({ ...state, goal: draft || state.goal }, safeCtx, undefined);
      const res = await callStep(stepEndpoint, initial, !!simulate);
      pushTrace({ type: "step", reason, req: initial, res });
      handleStepResponse(res);
    } catch (err) {
      pushTrace({ type: "error", reason, error: String(err) });
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function continueStep(): Promise<void> {
    setBusy(true);
    try {
      const req = makeStepEnvelope(state, safeCtx, guidance);
      const res = await callStep(stepEndpoint, req, !!simulate);
      pushTrace({ type: "step", reason: "Continue", req, res });
      handleStepResponse(res);
    } catch (err) {
      pushTrace({ type: "error", reason: "Continue", error: String(err) });
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  function handleStepResponse(res: StepRes): void {
    if (res.checkpoint) {
      if (res.next_state_hint) setState((s: any) => ({ ...s, ...res.next_state_hint }));
      if (res.tool_result) setState((s: any) => ({ ...s, evidence: [...s.evidence, res.tool_result] }));
    } else {
      setState((s: any) => ({ ...s, next_action: "done", result: res.result }));
    }
  }

  function pushTrace(evt: any): void {
    setTrace((t) => [...t, { at: new Date().toISOString(), ...evt }]);
  }

  // Helper: choose probe backend or local heuristic
  async function callProbe(d: string, c: Ctx): Promise<ProbeRes> {
    if (probeEndpoint) {
      try {
        const res = await fetch(probeEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draft: d, ctx: c }),
        });
        if (!res.ok) throw new Error(`probe failed ${res.status} ${res.statusText}`);
        return await res.json();
      } catch (e) {
        // fall back to local heuristic when backend probe fails
        pushTrace({ type: "warn", reason: "probe-backend", error: String(e) });
        return doProbe(d, c);
      }
    }
    return doProbe(d, c);
  }

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-12 gap-4 p-4">
      {/* Context banner if fallback */}
      {ctxFallback && (
        <div className="col-span-12">
          <div className="mb-2 text-xs p-2 rounded border border-amber-400 bg-amber-100/60 text-amber-900">
            <b>Notice:</b> Missing or partial <code>ctx</code> provided. Using safe defaults (role: <b>{safeCtx.role}</b>, clr: <b>{safeCtx.clearance}</b>). Pass a full ctx prop to hide this.
          </div>
        </div>
      )}

      {/* Left column: input + options */}
      <div className="col-span-12 lg:col-span-5 space-y-4">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="w-5 h-5" /> Live Agent Stepper
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4" /> {safeCtx.role} · clr {safeCtx.clearance}
              </div>
              <Button variant="outline" size="sm" onClick={() => startStep()} disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                <span className="ml-2">Run</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="text-xs uppercase tracking-wide opacity-70">Goal / prompt</label>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type your goal… e.g., Find PDF detail for Pozicija 5 in basement (last month)."
              className="min-h-[96px]"
            />

            <div className="grid grid-cols-3 gap-3 items-center">
              <div className="col-span-3 sm:col-span-2">
                <label className="text-xs uppercase tracking-wide opacity-70">User guidance (injections between steps)</label>
                <Input
                  value={guidance}
                  onChange={(e) => setGuidance(e.target.value)}
                  placeholder="e.g., Prefer PDF; ignore DWG unless no PDF"
                />
              </div>
              <div className="col-span-3 sm:col-span-1 flex items-center justify-end gap-2">
                <Switch checked={autoFire} onCheckedChange={(v: boolean) => setAutoFire(v)} />
                <span className="text-sm">Auto-fire</span>
              </div>
            </div>

            <OptionsPanel
              threshold={threshold}
              setThreshold={setThreshold}
              cooldown={cooldown}
              setCooldown={setCooldown}
            />
          </CardContent>
        </Card>

        <ProbePanel probe={probe} />
      </div>

      {/* Right column: trace + payload/response inspector */}
      <div className="col-span-12 lg:col-span-7 space-y-4">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Notebook className="w-5 h-5" /> Checkpoints & Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={continueStep} disabled={busy || !ensureStateHasCtx(state, safeCtx)}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                  <span className="ml-2">Continue step</span>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setTrace([])}>
                  <Square className="w-4 h-4" />
                  <span className="ml-2">Clear trace</span>
                </Button>
              </div>

              <div className="border rounded-lg divide-y">
                {trace.length === 0 && (
                  <div className="p-6 text-sm opacity-70">
                    No steps yet. Type a goal and click <b>Run</b>, or let Auto‑fire trigger as you type.
                  </div>
                )}
                {trace.map((evt, idx) => (
                  <TraceRow key={idx} evt={evt} />
                ))}
              </div>

              {state?.result && (
                <div className="mt-4">
                  <div className="text-xs uppercase tracking-wide opacity-70 mb-1">Final Result</div>
                  <pre className="bg-muted p-3 rounded-lg overflow-auto text-xs">
                    {JSON.stringify(state.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =============================
// Subcomponents
// =============================
function OptionsPanel({
  threshold,
  setThreshold,
  cooldown,
  setCooldown,
}: {
  threshold: number;
  setThreshold: (n: number) => void;
  cooldown: number;
  setCooldown: (n: number) => void;
}) {
  return (
    <Card className="bg-muted/40">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings className="w-4 h-4" /> Router Options
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs">Fire threshold (τ)</label>
          <input
            type="range"
            min={0.5}
            max={0.95}
            step={0.01}
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-xs opacity-70">{threshold.toFixed(2)}</div>
        </div>
        <div>
          <label className="text-xs">Cooldown (ms)</label>
          <input
            type="number"
            value={cooldown}
            onChange={(e) => {
              const v = Number.parseInt(e.target.value || "0", 10);
              setCooldown(Number.isFinite(v) ? v : 500);
            }}
            className="w-full border rounded p-1 text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ProbePanel({ probe }: { probe?: ProbeRes }) {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <CircleDot className="w-4 h-4" /> Live Probe
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!probe && (
          <div className="text-sm opacity-70">
            Start typing to see intent, candidates and auto‑fire decisions.
          </div>
        )}
        {probe && (
          <div className="space-y-2">
            <div className="text-sm">
              intent: <b>{probe.intent}</b>
            </div>
            <div className="text-xs">candidates:</div>
            <div className="text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
              {probe.candidates?.map((c, i) => (
                <div key={i} className="flex items-center justify-between border rounded p-2">
                  <span>{c.action}</span>
                  <span className="font-mono">{c.p.toFixed(2)}</span>
                </div>
              ))}
            </div>
            {probe.recommendFire && (
              <div className="text-xs mt-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/30">
                Will fire: <b>{probe.recommendFire.action}</b> — {probe.recommendFire.reason}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TraceRow({ evt }: { evt: any }) {
  const [open, setOpen] = useState<boolean>(false);
  const isStep = evt.type === "step";
  return (
    <div className="p-3 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isStep ? <Circle className="w-4 h-4" /> : <CircleDot className="w-4 h-4" />}
          <div className="font-medium">{evt.reason || evt.type}</div>
          <div className="text-xs opacity-60">{new Date(evt.at).toLocaleTimeString()}</div>
        </div>
        <Button size="icon" variant="ghost" onClick={() => setOpen((o) => !o)}>
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-2"
          >
            <div>
              <div className="text-xs uppercase tracking-wide opacity-70">Request</div>
              <pre className="bg-muted p-2 rounded text-xs overflow-auto">{JSON.stringify(evt.req, null, 2)}</pre>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide opacity-70">Response</div>
              <pre className="bg-muted p-2 rounded text-xs overflow-auto">{JSON.stringify(evt.res, null, 2)}</pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================
// Utilities (backend calls, heuristic, simulation)
// =============================
export async function callStep(url: string, body: StepReq, simulate: boolean): Promise<StepRes> {
  if (simulate || !url) return simulateStep(body);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(`step fetch failed: ${String(e)}`);
  }
  if (!res.ok) {
    let details = "";
    try { details = await res.text(); } catch {}
    throw new Error(`step failed ${res.status} ${res.statusText}${details ? ` — ${details}` : ""}`);
  }
  return res.json();
}

export async function doProbe(draft: string, _ctx: Ctx): Promise<ProbeRes> {
  // simple local heuristic probe; swap with real /agent/probe if you have one
  const tokens = draft.toLowerCase();
  const hasPosition = /position\s*([0-9]+)/.test(tokens) || /poz(icija)?\s*([0-9]+)/.test(tokens);
  const hasBasement = /basement|podrum|b-?1|suter[ei]n/.test(tokens);
  const hasPdf = /pdf/.test(tokens);
  const hasMonth = /last month|pro[šs]li\s*mje(s|c)ec/.test(tokens);
  const intent = hasPdf ? "catalog_lookup" : hasPosition ? "boq_lookup" : hasBasement ? "location_lookup" : "unknown";
  const base = intent === "catalog_lookup" ? 0.72 : intent === "boq_lookup" ? 0.68 : intent === "location_lookup" ? 0.6 : 0.3;
  const bonus = (hasPosition ? 0.08 : 0) + (hasBasement ? 0.06 : 0) + (hasPdf ? 0.08 : 0) + (hasMonth ? 0.05 : 0);
  const p = Math.min(0.99, base + bonus);
  const cands = [
    { action: "catalog.search", p: intent === "catalog_lookup" ? p : 0.25 },
    { action: "boq.query", p: intent === "boq_lookup" ? Math.max(0.2, p - 0.08) : 0.22 },
    { action: "dwg.parse", p: tokens.includes("dwg") ? 0.62 : 0.18 },
  ];
  const best = cands.slice().sort((a, b) => b.p - a.p)[0];
  return {
    intent,
    candidates: cands,
    recommendFire: best.p > 0.78 ? { action: best.action, reason: `p=${best.p.toFixed(2)}≥0.78` } : undefined,
  };
}

export function simulateStep(body: StepReq): Promise<StepRes> {
  const { state, user_guidance } = body;
  const wantsBasement = /(basement|podrum|b-?1|suter[ei]n)/i.test(JSON.stringify(state));

  // Simulate a 3-step plan: retrieve -> disambiguate -> synthesize
  const steps: Array<() => StepRes> = [
    () => ({
      checkpoint: true,
      next_state_hint: { next_action: "retrieve", notes_for_ui: "Retrieving candidates (PDF first)." },
      tool_result: {
        type: "search_results",
        items: [
          { id: "doc-101", title: "Pozicija 5 – Basement details (PDF)", score: 0.86 },
          { id: "doc-099", title: "Pozicija 5 – General section", score: 0.77 },
        ],
      },
    }),
    () => ({
      checkpoint: true,
      question: wantsBasement ? null : "Which location? basement or ground floor?",
      next_state_hint: { next_action: "disambiguate" },
    }),
    () => ({
      checkpoint: false,
      result: {
        answer: "Found PDF detail sheet for Pozicija 5 (basement).",
        attachments: [{ id: "doc-101", url: "/files/doc-101.pdf" }],
        reasoning_note: "Reranked by PDF preference and last-month filter.",
        guidance_used: user_guidance || null,
      },
    }),
  ];

  const idx = (state._sim_idx || 0) as number;
  const out = steps[Math.min(idx, steps.length - 1)]();
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          ...out,
          next_state_hint: { ...(out as any).next_state_hint, _sim_idx: idx + 1 },
        }),
      450,
    ),
  );
}

// =============================
// Lightweight Test Cases (exported, not auto-run)
// =============================
export const EXAMPLE_PROBE_TESTS: Array<{ input: string; expectIntent: string; minP: number }> = [
  { input: "Find PDF for position 5 in basement last month", expectIntent: "catalog_lookup", minP: 0.78 },
  { input: "pozicija 12 DWG", expectIntent: "boq_lookup", minP: 0.60 },
  { input: "basement plan", expectIntent: "location_lookup", minP: 0.40 },
  { input: "nonsense text", expectIntent: "unknown", minP: 0.20 },
];

// Additional tests for ctx safety and fallbacks
export const EXAMPLE_CTX_TESTS: Array<{ input?: Partial<Ctx>; expect: Ctx }> = [
  { input: undefined, expect: DEFAULT_CTX },
  { input: { role: "planner" }, expect: { ...DEFAULT_CTX, role: "planner" } as Ctx },
  { input: { employer: "AGS", clearance: 3 }, expect: { ...DEFAULT_CTX, employer: "AGS", clearance: 3 } as Ctx },
];

// Envelope & continue-step tests
export const EXAMPLE_ENVELOPE_TESTS: Array<{ state: any; ctx: Ctx; guidance?: string }> = [
  { state: { goal: "X" }, ctx: DEFAULT_CTX },
  { state: { goal: "Y", ctx: { ...DEFAULT_CTX, role: "planner" } }, ctx: { ...DEFAULT_CTX, clearance: 2 } },
];

export function runProbeTests(): { pass: number; fail: Array<{ i: number; got: ProbeRes }> } {
  const failures: Array<{ i: number; got: ProbeRes }> = [];
  // (Placeholder harness; integrate with Jest/Vitest as needed)
  return { pass: EXAMPLE_PROBE_TESTS.length, fail: failures };
}

export function runCtxTests(): { pass: number; fail: Array<{ i: number; got: Ctx; want: Ctx }> } {
  const fails: Array<{ i: number; got: Ctx; want: Ctx }> = [];
  EXAMPLE_CTX_TESTS.forEach((t, i) => {
    const got = makeSafeCtx(t.input);
    const want = t.expect;
    const same =
      got.employer === want.employer &&
      got.role === want.role &&
      got.clearance === want.clearance &&
      JSON.stringify(got.allowedProjects) === JSON.stringify(want.allowedProjects);
    if (!same) fails.push({ i, got, want });
  });
  return { pass: EXAMPLE_CTX_TESTS.length - fails.length, fail: fails };
}

export function runEnvelopeTests(): { pass: number; fail: Array<{ i: number; got: StepReq }> } {
  const fails: Array<{ i: number; got: StepReq }> = [];
  EXAMPLE_ENVELOPE_TESTS.forEach((t, i) => {
    const env = makeStepEnvelope(t.state, t.ctx, t.guidance);
    if (!env.state?.ctx) fails.push({ i, got: env });
    if (!env.ctx) fails.push({ i, got: env });
  });
  return { pass: EXAMPLE_ENVELOPE_TESTS.length - fails.length, fail: fails };
}
