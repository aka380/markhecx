"use client";
import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles, Send, Plus, X } from "lucide-react";
import { hecxService } from "@/lib/mark/hecx/service";
import {
  hecxModules,
  HecxModule,
  HecxResult,
  SessionMessage,
  Commitment,
  errorMessage,
} from "@/lib/mark/hecx/contracts";
import { useApp, SignInGate } from "./provider";
import {
  Card,
  Brand,
  Badge,
  Button,
  Textarea,
  Choice,
  Input,
  PageTitle,
  Action,
} from "./ui";
import { HecxInsights } from "./hecx/insights";
import { Skeleton } from "@/components/ui/skeleton";
const quickLabels: Record<string, string> = {
  "Profile Analysis": "Analyze My Profile",
  "Skill Analysis": "Analyze My Skills",
  "Project Analysis": "Analyze My Projects",
  "Achievement Analysis": "Analyze My Achievements",
  "Creator Identity": "Define My Creator Identity",
  "Portfolio Improvements": "Improve My Portfolio",
  "Career Insights": "Career Insights",
  "Match Analyzer": "Match Analyzer",
  "Workload Analyzer": "Workload Analyzer",
};
export function HecxPage() {
  const { state, ready } = useApp();
  const params = useSearchParams();
  return (
    <>
      <PageTitle
        eyebrow="HECX"
        title="Your intelligence layer for MarkHECX."
        description="Understand your data. Review the reasoning. Decide what changes."
      >
        <Badge tone="purple">HECX · Secure backend analysis</Badge>
      </PageTitle>
      {state.signedIn && state.accountType === "Brand" && (
        <Card className="panel section-copy">
          <Badge tone="purple">HECX / Campaign intelligence</Badge>
          <h2>Match requirements with evidence.</h2>
          <p>
            Open a campaign to analyze its brief and compare creator skills,
            projects, identity, and portfolio. Every match exposes its factors
            and missing data.
          </p>
          <Action href="/brand" secondary>
            Open campaign workspace
          </Action>
        </Card>
      )}
      {!ready ? (
        <Skeleton className="h-64 w-full" />
      ) : !state.signedIn ? (
        <SignInGate
          title="Your data, your intelligence workspace."
          description="Sign in to analyze your profile, projects, and portfolio. No private context is used while signed out."
        />
      ) : (
        <HecxWorkspace
          key={JSON.stringify([
            params.get("module"),
            params.get("project"),
            params.get("creator"),
            params.get("q"),
          ])}
        />
      )}
    </>
  );
}
function HecxWorkspace() {
  const { state } = useApp();
  const params = useSearchParams();
  const initial = params.get("module") || "AI Chat";
  const [mode, setMode] = useState<HecxModule>(
      hecxModules.includes(initial as HecxModule)
        ? (initial as HecxModule)
        : "AI Chat",
    ),
    [input, setInput] = useState(""),
    [goal, setGoal] = useState(""),
    [messages, setMessages] = useState<SessionMessage[]>([]),
    [result, setResult] = useState<HecxResult | null>(null),
    [recent, setRecent] = useState<{ id: number; result: HecxResult }[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [projectId, setProjectId] = useState(params.get("project") || ""),
    [campaignName, setCampaignName] = useState(""),
    [requirements, setRequirements] = useState(""),
    [hours, setHours] = useState(""),
    [commitments, setCommitments] = useState<Commitment[]>([]);
  const request = useRef<AbortController | null>(null),
    generation = useRef(0),
    inFlight = useRef(false),
    last = useRef<{ mode: HecxModule; text: string } | null>(null),
    sequence = useRef(0);
  useEffect(
    () => () => {
      request.current?.abort();
      generation.current++;
    },
    [],
  );
  function reset() {
    request.current?.abort();
    generation.current++;
    inFlight.current = false;
    setBusy(false);
    setMessages([]);
    setResult(null);
    setRecent([]);
    setError("");
    setInput("");
    setGoal("");
    setCampaignName("");
    setRequirements("");
    setHours("");
    setCommitments([]);
  }
  function switchMode(next: HecxModule) {
    request.current?.abort();
    generation.current++;
    inFlight.current = false;
    setBusy(false);
    setError("");
    setMode(next);
    setResult(null);
  }
  async function analyze(next = mode, text = input) {
    if (inFlight.current) return;
    inFlight.current = true;
    const controller = new AbortController();
    request.current = controller;
    const token = ++generation.current;
    last.current = { mode: next, text };
    setBusy(true);
    setError("");
    setMode(next);
    if (text.trim())
      setMessages((m) =>
        [
          ...m,
          { role: "user", text: text.trim(), module: next } as SessionMessage,
        ].slice(-12),
      );
    setInput("");
    try {
      const answer = await hecxService.analyze(
        state,
        {
          module: next,
          message: text,
          projectId:
            next === "Project Analysis" &&
            state.projects.some((p) => p.id === projectId)
              ? projectId
              : undefined,
          creatorId: params.get("creator") || undefined,
          query: params.get("q") || undefined,
          goal,
          history: messages,
          campaign:
            next === "Match Analyzer" && campaignName.trim()
              ? {
                  name: campaignName.trim(),
                  requiredSkills: requirements
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }
              : undefined,
          workload:
            next === "Workload Analyzer" && hours !== ""
              ? { availableHours: Number(hours), commitments }
              : undefined,
        },
        controller.signal,
      );
      if (token !== generation.current) return;
      setResult(answer);
      setMessages((m) =>
        [
          ...m,
          {
            role: "assistant",
            text: answer.summary,
            module: answer.module,
          } as SessionMessage,
        ].slice(-12),
      );
      setRecent((r) =>
        [{ id: ++sequence.current, result: answer }, ...r].slice(0, 6),
      );
    } catch (e) {
      if (token === generation.current && !controller.signal.aborted)
        setError(errorMessage(e));
    } finally {
      if (token === generation.current) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  }
  const projectOptions = [
    "All my projects",
    ...state.projects.map((p, i) => `${p.title || "Untitled"} · ${i + 1}`),
  ];
  const selectedProject = state.projects.findIndex((p) => p.id === projectId);
  return (
    <div className="hecx-page phase4-workspace">
      <aside className="hecx-sidebar">
        <div className="hecx-wordmark">
          <Brand small />
          <div>
            <h2>HECX</h2>
            <span>Your MarkHECX context</span>
          </div>
        </div>
        <Button className="btn-secondary new-chat" onClick={reset}>
          <Plus size={16} />
          New session
        </Button>
        <div className="hecx-modes">
          {hecxModules.map((m) => (
            <button
              key={m}
              aria-pressed={mode === m}
              className={mode === m ? "selected" : ""}
              onClick={() => switchMode(m)}
            >
              <Sparkles size={16} />
              {m}
            </button>
          ))}
        </div>
        <div className="hecx-sidebar-note">
          <strong>Current data</strong>
          <p>
            {state.profile.skills.length} skills · {state.projects.length}{" "}
            project records · {state.profile.achievements.length} achievements.
          </p>
          <p>
            Analysis uses the server-selected AI provider. Relevant supplied
            context may be sent to Gemini. Results identify the provider and
            require your review.
          </p>
        </div>
        {!!recent.length && (
          <div className="hecx-recent">
            <span className="eyebrow">RECENT ANALYSES</span>
            {recent.map((entry) => (
              <button
                key={entry.id}
                disabled={busy}
                onClick={() => {
                  setMode(entry.result.module);
                  setResult(entry.result);
                }}
              >
                {entry.result.module}
                <small>{entry.result.summary}</small>
              </button>
            ))}
          </div>
        )}
      </aside>
      <Card className="hecx-workspace">
        <div className="hecx-toolbar">
          <span>
            <Sparkles size={17} />
            {mode}
          </span>
          <Badge tone="purple">Local provider</Badge>
          <div className="mobile-mode">
            <Button variant="ghost" onClick={reset}>
              New session
            </Button>
            <Choice
              label="HECX module"
              value={mode}
              onChange={(v) => switchMode(v as HecxModule)}
              options={[...hecxModules]}
            />
          </div>
        </div>
        <div className="hecx-analysis-scroll">
          <details className="hecx-context-controls">
            <summary>Context and goals</summary>
            <label className="field">
              What would you like to improve?{" "}
              <span className="optional">Optional · session only</span>
              <Input
                value={goal}
                maxLength={1000}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Your goal, in your own words"
              />
            </label>
            <p className="small-note">
              Only your own relevant records and a selected public creator are
              used. Goals are your statements, not verified facts.
            </p>
          </details>
          {mode === "Project Analysis" && (
            <label className="field">
              Project selection
              <Choice
                label="Project to analyze"
                value={
                  selectedProject >= 0
                    ? projectOptions[selectedProject + 1]
                    : projectOptions[0]
                }
                options={projectOptions}
                onChange={(value) =>
                  setProjectId(
                    state.projects[projectOptions.indexOf(value) - 1]?.id || "",
                  )
                }
              />
            </label>
          )}
          {mode === "Match Analyzer" && (
            <details className="hecx-context-controls" open>
              <summary>
                Campaign context{" "}
                <span className="small-note">Optional · supplied by you</span>
              </summary>
              <p className="small-note">
                No campaign backend exists. You can describe requirements here,
                or use Explain Match on a creator card.
              </p>
              <label className="field">
                Campaign name
                <Input
                  value={campaignName}
                  maxLength={120}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </label>
              <label className="field">
                Required skills, comma separated
                <Input
                  value={requirements}
                  maxLength={500}
                  onChange={(e) => setRequirements(e.target.value)}
                />
              </label>
            </details>
          )}
          {mode === "Workload Analyzer" && (
            <details className="hecx-context-controls" open>
              <summary>Your planning window</summary>
              <p className="small-note">
                Use the same time window for available hours and every
                commitment. These estimates stay in this session.
              </p>
              <label className="field">
                Available hours
                <Input
                  type="number"
                  min="0"
                  max="1000"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </label>
              {commitments.map((c, i) => (
                <div className="commitment-row" key={i}>
                  <label className="field">
                    Commitment
                    <Input
                      value={c.title}
                      maxLength={100}
                      onChange={(e) =>
                        setCommitments((items) =>
                          items.map((x, n) =>
                            n === i ? { ...x, title: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    Deadline
                    <Input
                      type="date"
                      value={c.deadline}
                      onChange={(e) =>
                        setCommitments((items) =>
                          items.map((x, n) =>
                            n === i ? { ...x, deadline: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    Estimated hours
                    <Input
                      type="number"
                      min="0"
                      value={c.hours}
                      onChange={(e) =>
                        setCommitments((items) =>
                          items.map((x, n) =>
                            n === i
                              ? { ...x, hours: Number(e.target.value) }
                              : x,
                          ),
                        )
                      }
                    />
                  </label>
                  <Button
                    variant="ghost"
                    aria-label={`Remove commitment ${i + 1}`}
                    onClick={() =>
                      setCommitments((items) => items.filter((_, n) => n !== i))
                    }
                  >
                    <X size={15} />
                  </Button>
                </div>
              ))}
              <Button
                className="btn-secondary"
                disabled={commitments.length >= 8}
                onClick={() =>
                  setCommitments((items) => [
                    ...items,
                    { title: "", deadline: "", hours: 0 },
                  ])
                }
              >
                Add commitment
              </Button>
            </details>
          )}
          {!result && !busy && (
            <div className="hecx-overview">
              <h1>
                {mode === "AI Chat"
                  ? "How can I help you improve your MarkHECX presence?"
                  : mode}
              </h1>
              <p>
                Analysis uses the information you supplied. Recommendations and
                suggested changes remain separate from current data.
              </p>
              {mode === "AI Chat" ? (
                <div className="prompt-grid">
                  {Object.entries(quickLabels).map(([m, label]) => (
                    <button
                      key={m}
                      onClick={() => analyze(m as HecxModule, "")}
                    >
                      <Sparkles size={17} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <Button
                  className="ai-action"
                  variant="outline"
                  onClick={() => analyze(mode, "")}
                >
                  <Sparkles size={16} />
                  Analyze available context
                </Button>
              )}
            </div>
          )}
          {!!messages.length && (
            <details className="hecx-conversation" open={mode === "AI Chat"}>
              <summary>
                Session conversation · {messages.length} recent messages
              </summary>
              <div role="log" aria-live="polite">
                {messages.map((m, i) => (
                  <div key={i} className={`message ${m.role}`}>
                    <div>
                      <span className="message-author">
                        {m.role === "user" ? "You" : "HECX"}
                      </span>
                      <p>{m.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
          {busy && (
            <div className="hecx-processing" role="status">
              <Sparkles size={20} />
              <span>HECX is analyzing your available context…</span>
              <Skeleton className="h-16 w-full" />
            </div>
          )}
          {result && !busy && (
            <HecxInsights
              key={
                recent.find((r) => r.result === result)?.id || result.summary
              }
              result={result}
            />
          )}
          {error && (
            <Card className="panel">
              <p role="alert" className="error-text">
                {error}
              </p>
              <Button
                className="btn-secondary"
                onClick={() =>
                  last.current && analyze(last.current.mode, last.current.text)
                }
              >
                Try again
              </Button>
            </Card>
          )}
        </div>
        <div className="composer-wrap">
          <form
            className="chat-composer"
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) analyze();
            }}
          >
            <Textarea
              aria-label="Message HECX"
              placeholder="How strong is my profile? Improve my bio. What should I improve first?"
              value={input}
              maxLength={2000}
              rows={2}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  if (input.trim()) analyze();
                }
              }}
            />
            <Button
              className="btn-primary"
              size="icon"
              type="submit"
              aria-label="Send to HECX"
              disabled={busy || !input.trim()}
            >
              <Send size={17} />
            </Button>
          </form>
          <div className="row">
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => analyze(mode, "")}
            >
              Analyze again
            </Button>
            {busy && (
              <Button
                variant="ghost"
                onClick={() => {
                  request.current?.abort();
                  generation.current++;
                  inFlight.current = false;
                  setBusy(false);
                }}
              >
                Cancel analysis
              </Button>
            )}
            <span className="composer-note">
              Evidence-based suggestions · Review before applying
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
