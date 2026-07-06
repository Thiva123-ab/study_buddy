import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { generateMultiPaper, listAllPapers, getPaper, deletePaper } from "@/lib/study.functions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Plus, Trash2, AlarmClock, FileText, Check, X, Layers } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/papers")({
  head: () => ({ meta: [{ title: "Multi-doc papers · LectureLens" }] }),
  component: PapersPage,
});

type Doc = { id: string; title: string };

function PapersPage() {
  const list = useServerFn(listAllPapers);
  const del = useServerFn(deletePaper);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [papers, setPapers] = useState<any[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);

  async function refresh() {
    const [{ data }, rows] = await Promise.all([
      supabase.from("documents").select("id,title").order("created_at", { ascending: false }),
      list({}),
    ]);
    setDocs((data ?? []) as Doc[]);
    setPapers(rows as any);
  }
  useEffect(() => { refresh(); }, []);

  async function onDelete(id: string) {
    if (!confirm("Delete this paper?")) return;
    await del({ data: { paperId: id } });
    if (activeId === id) setActiveId(null);
    refresh();
  }

  if (activeId) return (
    <main className="container mx-auto max-w-4xl px-6 py-8">
      <button onClick={() => { setActiveId(null); refresh(); }} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to papers
      </button>
      <PaperRunner paperId={activeId} onExit={() => { setActiveId(null); refresh(); }} />
    </main>
  );

  return (
    <main className="container mx-auto max-w-5xl px-6 py-10">
      <Link to="/dashboard" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard
      </Link>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold flex items-center gap-3">
            <Layers className="h-8 w-8 text-primary" /> Multi-document papers
          </h1>
          <p className="mt-1 text-muted-foreground">Mix questions from any combination of your study sets into one timed exam.</p>
        </div>
        <Button size="lg" onClick={() => setShowBuilder((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" /> {showBuilder ? "Close builder" : "New paper"}
        </Button>
      </div>

      {showBuilder && (
        <MultiPaperBuilder
          docs={docs}
          onCreated={(id) => { setShowBuilder(false); refresh(); setActiveId(id); }}
        />
      )}

      <h2 className="mt-10 mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">All papers</h2>
      {papers === null ? (
        <div className="h-32 animate-pulse rounded-2xl border border-border bg-card/40" />
      ) : papers.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          No papers yet. Build your first one above.
        </p>
      ) : (
        <ul className="space-y-2">
          {papers.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-card/60 p-4">
              <div className="min-w-0">
                <p className="font-medium truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  <AlarmClock className="mr-1 inline h-3 w-3" /> {p.duration_minutes} min ·{" "}
                  {(p.source_document_ids?.length ?? 0) > 0
                    ? `${p.source_document_ids.length} sources`
                    : "1 source"} · {new Date(p.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button size="sm" onClick={() => setActiveId(p.id)}>Start</Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function NumField({ label, value, onChange, max = 30 }: { label: string; value: number; onChange: (n: number) => void; max?: number }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input type="number" min={0} max={max} value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
        className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/60" />
    </label>
  );
}

function MultiPaperBuilder({ docs, onCreated }: { docs: Doc[]; onCreated: (id: string) => void }) {
  const gen = useServerFn(generateMultiPaper);
  const [title, setTitle] = useState("Mixed Practice Paper");
  const [duration, setDuration] = useState(60);
  const [mcq, setMcq] = useState(15);
  const [fillBlank, setFillBlank] = useState(5);
  const [shortQ, setShortQ] = useState(5);
  const [essay, setEssay] = useState(2);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("mixed");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const total = mcq + fillBlank + shortQ + essay;

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function submit() {
    if (selected.size === 0) { toast.error("Pick at least one document."); return; }
    if (total === 0) { toast.error("Add at least one question."); return; }
    setBusy(true);
    try {
      const paper = await gen({ data: {
        documentIds: Array.from(selected), title, durationMinutes: duration,
        mcqCount: mcq, fillBlankCount: fillBlank, shortCount: shortQ, essayCount: essay, difficulty,
      } });
      toast.success("Paper ready!");
      onCreated((paper as any).id);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          1. Select sources <span className="text-primary">({selected.size} chosen)</span>
        </h3>
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents yet — <Link to="/upload" className="text-primary underline">upload one</Link>.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-y-auto pr-1">
            {docs.map((d) => {
              const on = selected.has(d.id);
              return (
                <button key={d.id} type="button" onClick={() => toggle(d.id)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                    on ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                  }`}>
                  <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                    {on && <Check className="h-3 w-3" />}
                  </span>
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{d.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">2. Configure paper</h3>
        <label className="flex flex-col gap-1.5 mb-3">
          <span className="text-xs font-medium text-muted-foreground">Paper title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/60" />
        </label>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <NumField label="Duration (min)" value={duration} onChange={setDuration} max={360} />
          <NumField label="MCQ" value={mcq} onChange={setMcq} max={50} />
          <NumField label="Fill blanks" value={fillBlank} onChange={setFillBlank} max={50} />
          <NumField label="Short answer" value={shortQ} onChange={setShortQ} max={50} />
          <NumField label="Essay" value={essay} onChange={setEssay} max={20} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Difficulty:</span>
          {(["easy", "medium", "hard", "mixed"] as const).map((d) => (
            <button key={d} onClick={() => setDifficulty(d)}
              className={`rounded-full border px-3 py-1 text-xs capitalize transition ${
                difficulty === d ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"
              }`}>{d}</button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">{total} questions · {duration} min · {selected.size} sources</p>
        <Button onClick={submit} disabled={busy || total === 0 || selected.size === 0} size="lg">
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Generate paper
        </Button>
      </div>
    </motion.div>
  );
}

// ===== Paper runner (mirrors the one in document.$id) =====
function PaperRunner({ paperId, onExit }: { paperId: string; onExit: () => void }) {
  const load = useServerFn(getPaper);
  const [data, setData] = useState<{ paper: any; questions: any[] } | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    load({ data: { paperId } }).then((d) => {
      setData(d as any);
      setSeconds((d as any).paper.duration_minutes * 60);
    });
  }, [paperId]);

  useEffect(() => {
    if (!data || submitted) return;
    const t = setInterval(() => setSeconds((s) => {
      if (s <= 1) { setSubmitted(true); toast.info("Time's up — paper auto-submitted."); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [data, submitted]);

  if (!data) return <div className="h-64 animate-pulse rounded-2xl border border-border bg-card/40" />;
  const { paper, questions } = data;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  let earned = 0; let possible = 0;
  for (const q of questions) {
    if (q.type === "mcq") {
      possible += q.marks;
      if (answers[q.id] === q.correct_index) earned += q.marks;
    } else if (q.type === "fill_blank") {
      possible += q.marks;
      const userBlanks: string[] = answers[q.id] ?? [];
      const correct: string[] = q.blanks ?? [];
      if (correct.length && correct.every((c, i) => (userBlanks[i] ?? "").trim().toLowerCase() === String(c).trim().toLowerCase())) {
        earned += q.marks;
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-2 z-10 flex items-center justify-between rounded-2xl border border-border bg-card/90 px-4 py-3 backdrop-blur">
        <div>
          <p className="font-semibold">{paper.title}</p>
          <p className="text-xs text-muted-foreground">{questions.length} questions</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${
            seconds < 60 && !submitted ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
          }`}>
            <AlarmClock className="h-3.5 w-3.5" /> {mm}:{ss}
          </div>
          <Button size="sm" variant="outline" onClick={onExit}>Exit</Button>
        </div>
      </div>

      {submitted && (
        <div className="rounded-2xl border border-primary/40 bg-card p-5 text-center">
          <p className="text-sm text-muted-foreground">Auto-graded score (objective questions)</p>
          <p className="font-display text-4xl font-semibold">
            <span className="text-primary">{earned}</span>
            <span className="text-xl text-muted-foreground">/{possible}</span>
          </p>
        </div>
      )}

      {questions.map((q, i) => (
        <div key={q.id} className="rounded-2xl border border-border bg-card/60 p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <p className="font-medium">{i + 1}. {q.question}</p>
            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              {q.type.replace("_", " ")} · {q.marks}m
            </span>
          </div>

          {q.type === "mcq" && (
            <div className="space-y-2">
              {((q.options as string[]) ?? []).map((opt, oi) => {
                const chosen = answers[q.id] === oi;
                const isCorrect = q.correct_index === oi;
                return (
                  <button key={oi} disabled={submitted}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    className={`flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-left text-sm transition ${
                      submitted
                        ? isCorrect ? "border-primary bg-primary/10" : chosen ? "border-destructive bg-destructive/10" : "border-border"
                        : chosen ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                    }`}>
                    <span>{opt}</span>
                    {submitted && isCorrect && <Check className="h-4 w-4 text-primary" />}
                    {submitted && chosen && !isCorrect && <X className="h-4 w-4 text-destructive" />}
                  </button>
                );
              })}
            </div>
          )}

          {q.type === "fill_blank" && (
            <div className="space-y-2">
              {((q.blanks as string[]) ?? []).map((_, bi) => (
                <input key={bi} disabled={submitted}
                  value={(answers[q.id]?.[bi]) ?? ""}
                  onChange={(e) => setAnswers((a) => {
                    const arr = [...((a[q.id] as string[]) ?? [])];
                    arr[bi] = e.target.value;
                    return { ...a, [q.id]: arr };
                  })}
                  placeholder={`Blank ${bi + 1}`}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/60 disabled:opacity-70" />
              ))}
              {submitted && (
                <p className="text-xs text-muted-foreground"><strong>Answers:</strong> {(q.blanks as string[]).join(" · ")}</p>
              )}
            </div>
          )}

          {(q.type === "essay" || q.type === "short") && (
            <>
              <textarea disabled={submitted}
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                rows={q.type === "essay" ? 8 : 3}
                placeholder="Type your answer…"
                className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary/60 disabled:opacity-70" />
              {submitted && q.model_answer && (
                <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Model answer</p>
                  <p className="text-muted-foreground">{q.model_answer}</p>
                </div>
              )}
            </>
          )}
        </div>
      ))}

      {!submitted && (
        <Button size="lg" className="w-full" onClick={() => setSubmitted(true)}>
          Submit paper
        </Button>
      )}
    </div>
  );
}