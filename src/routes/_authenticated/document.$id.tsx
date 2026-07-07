import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { generateSummary, generateFlashcards, generateQuiz, translateToSinhala, recordQuizAttempt, chatWithDocument, getChatHistory, generatePaper, listPapers, getPaper, deletePaper } from "@/lib/study.functions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Languages, ArrowLeft, RotateCcw, Check, X, Download, Timer, Play, Pause, Send, MessageSquare, FileText, Trash2, Plus, AlarmClock } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/document/$id")({
  head: () => ({ meta: [{ title: "Study set · LectureLens" }] }),
  component: DocumentPage,
});

type Lang = "en" | "si";

async function downloadPDF(elementId: string, filename: string) {
  toast.loading("Generating PDF...", { id: "pdf-toast" });
  try {
    const jspdfModule = await import("jspdf");
    const jsPDF = jspdfModule.jsPDF || jspdfModule.default;
    
    const { toJpeg } = await import("html-to-image");
    
    const element = document.getElementById(elementId);
    if (!element) throw new Error(`Element #${elementId} not found`);
    
    const hiddenElements = element.querySelectorAll('.print\\:hidden');
    hiddenElements.forEach((el) => { (el as HTMLElement).style.display = 'none'; });

    // Force light mode for clear PDF colors
    const htmlEl = document.documentElement;
    const isDark = htmlEl.classList.contains('dark');
    if (isDark) htmlEl.classList.remove('dark');

    // Small delay to ensure styles are applied
    await new Promise(r => setTimeout(r, 50));

    const imgData = await toJpeg(element, { 
      backgroundColor: "#ffffff",
      quality: 0.8,
      pixelRatio: 2, // Retina resolution is plenty and keeps file size low
    });
    
    // Restore dark mode and UI elements
    if (isDark) htmlEl.classList.add('dark');
    hiddenElements.forEach((el) => { (el as HTMLElement).style.display = ''; });

    const pdf = new jsPDF("p", "mm", "a4");
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;
    
    let heightLeft = imgHeight;
    let position = 0;

    // Add multi-page support
    pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    pdf.save(filename);
    toast.success("Downloaded PDF", { id: "pdf-toast" });
  } catch (error: any) {
    console.error("PDF generation error:", error);
    toast.error(`Failed: ${error?.message || String(error)}`, { id: "pdf-toast", duration: 8000 });
  }
}

function DocumentPage() {
  const { id } = useParams({ from: "/_authenticated/document/$id" });
  const [doc, setDoc] = useState<{ title: string } | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [translating, setTranslating] = useState(false);
  const translate = useServerFn(translateToSinhala);

  useEffect(() => {
    supabase.from("documents").select("title").eq("id", id).single().then(({ data }) => setDoc(data));
  }, [id]);

  async function toggleLang() {
    if (lang === "en") {
      setTranslating(true);
      try { await translate({ data: { documentId: id } }); setLang("si"); }
      catch (e: any) { toast.error(e.message); }
      finally { setTranslating(false); }
    } else setLang("en");
  }

  return (
    <main className="container mx-auto max-w-4xl px-6 py-8">
      <Link to="/dashboard" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground print:hidden">
        <ArrowLeft className="mr-1 h-4 w-4" /> {lang === 'si' ? 'සියලුම කට්ටල' : 'All sets'}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className={`font-display text-3xl font-semibold md:text-4xl ${lang === "si" ? "font-si" : ""}`}>
          {doc?.title ?? "Loading…"}
        </h1>
        <div className="flex items-center gap-2 print:hidden">
          <PomodoroButton />
          <button onClick={toggleLang} disabled={translating} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:border-primary/40 disabled:opacity-60">
            {translating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
            <span className={lang === "en" ? "text-primary" : "text-muted-foreground"}>EN</span>
            <span className="text-border">/</span>
            <span className={`font-si ${lang === "si" ? "text-primary" : "text-muted-foreground"}`}>සිංහල</span>
          </button>
        </div>
      </div>

      <Tabs defaultValue="summary" className="mt-8">
        <TabsList className="print:hidden">
          <TabsTrigger value="summary">{lang === 'si' ? 'සාරාංශය' : 'Summary'}</TabsTrigger>
          <TabsTrigger value="flashcards">{lang === 'si' ? 'ෆ්ලෑෂ් කාඩ්' : 'Flashcards'}</TabsTrigger>
          <TabsTrigger value="quiz">{lang === 'si' ? 'ප්‍රශ්නාවලිය' : 'Quiz'}</TabsTrigger>
          <TabsTrigger value="paper"><FileText className="mr-1 h-3 w-3" />{lang === 'si' ? 'ප්‍රශ්න පත්‍ර' : 'Papers'}</TabsTrigger>
          <TabsTrigger value="chat"><MessageSquare className="mr-1 h-3 w-3" />{lang === 'si' ? 'කතාබස්' : 'Chat'}</TabsTrigger>
        </TabsList>
        <TabsContent value="summary" className="mt-6"><SummaryView documentId={id} lang={lang} /></TabsContent>
        <TabsContent value="flashcards" className="mt-6"><FlashcardsView documentId={id} lang={lang} /></TabsContent>
        <TabsContent value="quiz" className="mt-6"><QuizView documentId={id} lang={lang} /></TabsContent>
        <TabsContent value="paper" className="mt-6"><PaperView documentId={id} lang={lang} /></TabsContent>
        <TabsContent value="chat" className="mt-6"><ChatView documentId={id} lang={lang} /></TabsContent>
      </Tabs>
    </main>
  );
}

function PendingBox({ label, onGenerate, loading, lang }: { label: string; onGenerate: () => void; loading: boolean; lang?: Lang }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
      <p className="text-muted-foreground">{label}</p>
      <Button onClick={onGenerate} disabled={loading} className="mt-4">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {lang === 'si' ? 'දැන් සාදන්න' : 'Generate now'}
      </Button>
    </div>
  );
}

function renderMarkdown(md: string) {
  // Extract fenced code blocks first to protect them from other replacements
  const blocks: string[] = [];
  let src = md.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_m, lang, code) => {
    const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const label = lang ? `<div class='mb-1 text-[10px] uppercase tracking-widest text-muted-foreground'>${lang}</div>` : "";
    blocks.push(
      `<pre class='my-3 overflow-x-auto rounded-xl border border-border bg-[hsl(220_15%_8%)] p-4 text-xs leading-relaxed text-[hsl(140_60%_75%)]'>${label}<code>${escaped}</code></pre>`,
    );
    return `\u0000BLOCK${blocks.length - 1}\u0000`;
  });

  src = src.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  let html = src
    .replace(/\[\[red\]\]([\s\S]*?)\[\[\/red\]\]/g, "<span class='rounded bg-[hsl(0_85%_62%/0.12)] px-1 font-semibold text-[hsl(0_85%_62%)]'>$1</span>")
    .replace(/\[\[blue\]\]([\s\S]*?)\[\[\/blue\]\]/g, "<span class='rounded bg-[hsl(212_90%_60%/0.12)] px-1 font-medium text-[hsl(212_90%_60%)]'>$1</span>")
    .replace(/`([^`]+)`/g, "<code class='rounded bg-muted px-1.5 py-0.5 text-[0.85em] font-mono'>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "<a href='$2' target='_blank' rel='noopener noreferrer' class='inline-flex items-center gap-1 rounded-md bg-[hsl(0_85%_60%/0.10)] px-2 py-0.5 font-medium text-[hsl(0_85%_65%)] underline-offset-2 hover:bg-[hsl(0_85%_60%/0.18)] hover:underline'>▶ $1</a>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.*)$/gm, "<h3 class='font-display text-lg font-semibold mt-5 mb-2'>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2 class='font-display text-xl font-semibold mt-8 mb-3 pb-2 border-b border-border/60'>$1</h2>")
    .replace(/^-\s+Example:\s*(.*)$/gim, "<li class='example'><span class='mr-1 text-[10px] font-semibold uppercase tracking-wider text-primary'>Example</span>$1</li>")
    .replace(/^- (.*)$/gm, "<li>$1</li>")
    .replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/g, (m) => `<ul class='my-3 space-y-2 pl-4'>${m}</ul>`)
    .replace(/\n{2,}/g, "<br/>");

  html = html.replace(/\u0000BLOCK(\d+)\u0000/g, (_m, i) => blocks[Number(i)]);
  // Style list items
  html = html.replace(/<li>/g, "<li class='relative pl-4 leading-relaxed before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-primary/60'>");
  html = html.replace(/<li class='example'>/g, "<li class='relative rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 leading-relaxed'>");
  return { __html: html };
}

function Skeleton() {
  return <div className="h-64 animate-pulse rounded-2xl border border-border bg-card/40" />;
}

function SummaryView({ documentId, lang }: { documentId: string; lang: Lang }) {
  const gen = useServerFn(generateSummary);
  const [row, setRow] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("summaries").select("*").eq("document_id", documentId).maybeSingle()
      .then(({ data }) => { setRow(data); setLoaded(true); });
  }, [documentId, lang]);

  async function generate() {
    setLoading(true);
    try { const r = await gen({ data: { documentId } }); setRow(r); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  if (!loaded) return <Skeleton />;
  if (!row) return <PendingBox label={lang === 'si' ? 'මෙම කරුණු වල සාරාංශයක් සාදන්න.' : 'Generate a summary of this material.'} onGenerate={generate} loading={loading} lang={lang} />;

  const content = lang === "si" ? row.content_si : row.content_en;
  if (lang === "si" && !content) return <p className="text-muted-foreground">Translating…</p>;

  function exportMarkdown() {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `summary-${documentId.slice(0, 8)}.md`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success("Downloaded Markdown");
  }

  async function exportPDF() {
    await downloadPDF("summary-content-export", `summary-${documentId.slice(0, 8)}.pdf`);
  }

  return (
    <article id="summary-content-export" className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card/80 to-card/40 p-6 md:p-8 leading-relaxed text-foreground shadow-sm ${lang === "si" ? "font-si" : ""}`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(0_85%_62%/0.12)] px-2.5 py-1 font-medium text-[hsl(0_85%_62%)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(0_85%_62%)]" /> {lang === 'si' ? 'අත්‍යවශ්‍ය' : 'Critical'}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(212_90%_60%/0.12)] px-2.5 py-1 font-medium text-[hsl(212_90%_60%)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(212_90%_60%)]" /> {lang === 'si' ? 'වැදගත්' : 'Important'}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" /> {lang === 'si' ? 'සාමාන්‍ය' : 'Normal'}
        </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="print:hidden">
              <Download className="mr-1.5 h-3.5 w-3.5" /> {lang === 'si' ? 'අපනයනය' : 'Export'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportMarkdown} className="cursor-pointer">
              {lang === 'si' ? 'Markdown ලෙස බාගන්න' : 'Download as Markdown'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportPDF} className="cursor-pointer">
              {lang === 'si' ? 'PDF ලෙස බාගන්න' : 'Download as PDF'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="prose-summary" dangerouslySetInnerHTML={renderMarkdown(content)} />
    </article>
  );
}

function FlashcardsView({ documentId, lang }: { documentId: string; lang: Lang }) {
  const gen = useServerFn(generateFlashcards);
  const [cards, setCards] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    supabase.from("flashcards").select("*").eq("document_id", documentId).order("position")
      .then(({ data }) => setCards(data ?? []));
  }, [documentId, lang]);

  async function generate() {
    setLoading(true);
    try { const r = await gen({ data: { documentId } }); setCards(r); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  if (cards === null) return <Skeleton />;
  if (cards.length === 0) return <PendingBox label={lang === 'si' ? 'මෙම කරුණු වලින් ෆ්ලෑෂ් කාඩ් සාදන්න.' : 'Generate flashcards from this material.'} onGenerate={generate} loading={loading} lang={lang} />;

  const c = cards[idx];
  const front = lang === "si" ? c.front_si : c.front_en;
  const back = lang === "si" ? c.back_si : c.back_en;
  if (lang === "si" && !front) return <p className="text-muted-foreground">Translating…</p>;

  return (
    <div>
      <p className="mb-4 text-center text-sm text-muted-foreground">{lang === 'si' ? `කාඩ්පත ${idx + 1} / ${cards.length}` : `Card ${idx + 1} of ${cards.length}`}</p>
      <div className="relative mx-auto h-72 max-w-2xl cursor-pointer [perspective:1200px]" onClick={() => setFlipped((f) => !f)}>
        <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.5 }} className="relative h-full w-full [transform-style:preserve-3d]">
          <div className={`absolute inset-0 grid place-items-center rounded-2xl border border-border bg-card p-8 text-center [backface-visibility:hidden] ${lang === "si" ? "font-si" : ""}`}>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{lang === 'si' ? 'ප්‍රශ්නය' : 'Question'}</p>
              <p className="mt-3 text-2xl font-medium">{front}</p>
            </div>
          </div>
          <div className={`absolute inset-0 grid place-items-center rounded-2xl border border-primary/40 bg-accent p-8 text-center [transform:rotateY(180deg)] [backface-visibility:hidden] ${lang === "si" ? "font-si" : ""}`}>
            <div>
              <p className="text-xs uppercase tracking-wider text-primary">{lang === 'si' ? 'පිළිතුර' : 'Answer'}</p>
              <p className="mt-3 text-xl">{back}</p>
            </div>
          </div>
        </motion.div>
      </div>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Button variant="outline" onClick={() => { setFlipped(false); setIdx((i) => Math.max(0, i - 1)); }} disabled={idx === 0}>{lang === 'si' ? 'පෙර' : 'Prev'}</Button>
        <Button variant="ghost" onClick={() => setFlipped((f) => !f)}><RotateCcw className="mr-2 h-4 w-4" /> {lang === 'si' ? 'හරවන්න' : 'Flip'}</Button>
        <Button onClick={() => { setFlipped(false); setIdx((i) => Math.min(cards.length - 1, i + 1)); }} disabled={idx === cards.length - 1}>{lang === 'si' ? 'ඊළඟ' : 'Next'}</Button>
      </div>
    </div>
  );
}

function QuizView({ documentId, lang }: { documentId: string; lang: Lang }) {
  const gen = useServerFn(generateQuiz);
  const record = useServerFn(recordQuizAttempt);
  const [qs, setQs] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    supabase.from("quiz_questions").select("*").eq("document_id", documentId).order("position")
      .then(({ data }) => setQs(data ?? []));
  }, [documentId, lang]);

  async function generate() {
    setLoading(true);
    try { const r = await gen({ data: { documentId } }); setQs(r); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  if (qs === null) return <Skeleton />;
  if (qs.length === 0) return <PendingBox label={lang === 'si' ? 'පුහුණු ප්‍රශ්නාවලියක් සාදන්න.' : 'Generate a practice quiz.'} onGenerate={generate} loading={loading} lang={lang} />;
  if (lang === "si" && qs.some((q) => !q.question_si)) return <p className="text-muted-foreground">Translating…</p>;

  const score = qs.filter((q) => answers[q.id] === q.correct_index).length;

  async function submit() {
    setSubmitted(true);
    const wrongIds = qs!.filter((q) => answers[q.id] !== q.correct_index).map((q) => q.id);
    try { await record({ data: { documentId, score, total: qs!.length, wrongIds } }); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className={`space-y-6 ${lang === "si" ? "font-si" : ""}`}>
      {submitted && (
        <div className="rounded-2xl border border-primary/40 bg-card p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">{lang === 'si' ? 'ඔබේ ලකුණු' : 'Your score'}</p>
          <p className="font-display text-5xl font-semibold text-foreground">
            <span className="text-primary">{score}</span>
            <span className="text-2xl text-muted-foreground">/{qs.length}</span>
          </p>
          <Button variant="outline" className="mt-4" onClick={() => { setAnswers({}); setSubmitted(false); }}>{lang === 'si' ? 'නැවත උත්සාහ කරන්න' : 'Try again'}</Button>
        </div>
      )}
      {qs.map((q, i) => {
        const opts = ((lang === "si" ? q.options_si : q.options_en) as string[]) ?? [];
        const question = lang === "si" ? q.question_si : q.question_en;
        const chosen = answers[q.id];
        return (
          <div key={q.id} className="rounded-2xl border border-border bg-card/60 p-6">
            <p className="font-medium">{i + 1}. {question}</p>
            <div className="mt-4 space-y-2">
              {opts.map((opt, oi) => {
                const isChosen = chosen === oi;
                const isCorrect = q.correct_index === oi;
                const showState = submitted;
                return (
                  <button key={oi} disabled={submitted}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition ${
                      showState
                        ? isCorrect ? "border-primary bg-primary/10" : isChosen ? "border-destructive bg-destructive/10" : "border-border"
                        : isChosen ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                    }`}>
                    <span>{opt}</span>
                    {showState && isCorrect && <Check className="h-4 w-4 text-primary" />}
                    {showState && isChosen && !isCorrect && <X className="h-4 w-4 text-destructive" />}
                  </button>
                );
              })}
            </div>
            {submitted && (
              <p className="mt-3 text-sm text-muted-foreground">
                <strong>{lang === 'si' ? 'ඇයි:' : 'Why:'}</strong> {lang === "si" ? q.explanation_si : q.explanation_en}
              </p>
            )}
          </div>
        );
      })}
      {!submitted && (
        <Button onClick={submit} size="lg" className="w-full" disabled={Object.keys(answers).length < qs.length}>
          {lang === 'si' ? 'පිළිතුරු ඉදිරිපත් කරන්න' : 'Submit answers'}
        </Button>
      )}
    </div>
  );
}

// ===== Pomodoro Timer =====
function PomodoroButton() {
  const [open, setOpen] = useState(false);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setRunning(false);
          const next = mode === "focus" ? "break" : "focus";
          setMode(next);
          toast.success(mode === "focus" ? "Focus done — take a 5 min break!" : "Break over — back to focus!");
          return next === "focus" ? 25 * 60 : 5 * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running, mode]);

  function reset() { setRunning(false); setSeconds(mode === "focus" ? 25 * 60 : 5 * 60); }
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
          running ? "border-primary/60 bg-primary/15 text-foreground" : "border-border bg-card hover:border-primary/40"
        }`}
      >
        <Timer className={`h-4 w-4 ${running ? "text-primary" : ""}`} />
        <span className="tabular-nums">{running || open ? `${mm}:${ss}` : "Focus"}</span>
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="fixed right-6 top-20 z-50 w-64 rounded-2xl border border-border bg-card p-5 shadow-xl"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-muted-foreground">{mode === "focus" ? "Focus" : "Break"}</span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <p className="my-3 text-center font-display text-5xl font-semibold tabular-nums text-primary">{mm}:{ss}</p>
          <div className="flex items-center justify-center gap-2">
            <Button size="sm" onClick={() => setRunning((r) => !r)}>
              {running ? <><Pause className="mr-1 h-3 w-3" /> Pause</> : <><Play className="mr-1 h-3 w-3" /> Start</>}
            </Button>
            <Button size="sm" variant="outline" onClick={reset}><RotateCcw className="mr-1 h-3 w-3" /> Reset</Button>
          </div>
        </motion.div>
      )}
    </>
  );
}

// ===== Chat with document =====
function ChatView({ documentId, lang }: { documentId: string; lang: Lang }) {
  const load = useServerFn(getChatHistory);
  const send = useServerFn(chatWithDocument);
  const [msgs, setMsgs] = useState<Array<{ id?: string; role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    load({ data: { documentId } }).then((rows) => setMsgs(rows as any));
  }, [documentId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function onSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput(""); setBusy(true);
    setMsgs((m) => [...m, { role: "user", content: text }]);
    try {
      const r = await send({ data: { documentId, message: text } });
      setMsgs((m) => [...m, { role: "assistant", content: r.reply }]);
    } catch (err: any) {
      toast.error(err.message);
      setMsgs((m) => m.slice(0, -1));
    } finally { setBusy(false); }
  }

  return (
    <div className="flex h-[65vh] flex-col rounded-2xl border border-border bg-card/40">
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {msgs.length === 0 && !busy && (
          <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
            <div>
              <MessageSquare className="mx-auto mb-2 h-8 w-8 text-primary/60" />
              <p>{lang === 'si' ? 'මෙම කරුණු ගැන අසන්න.' : 'Ask anything about this material.'}</p>
              <p className="mt-1 text-xs">{lang === 'si' ? 'උදා: "2 කොටස සරලව පැහැදිලි කරන්න"' : 'e.g. "Explain section 2 in simpler terms" or "Give me 3 sample exam questions".'}</p>
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-foreground"
            }`}>
              <div dangerouslySetInnerHTML={renderMarkdown(m.content)} />
            </div>
          </motion.div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="inline h-3 w-3 animate-spin" /> {lang === 'si' ? 'සිතමින්…' : 'Thinking…'}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={onSend} className="flex items-center gap-2 border-t border-border p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={lang === 'si' ? 'මෙම ලේඛනය ගැන අසන්න…' : 'Ask about this document…'}
          disabled={busy}
          className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/60 disabled:opacity-60"
        />
        <Button type="submit" disabled={busy || !input.trim()} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
// ===== Custom Papers =====
function PaperView({ documentId, lang }: { documentId: string; lang: Lang }) {
  const list = useServerFn(listPapers);
  const del = useServerFn(deletePaper);
  const [papers, setPapers] = useState<any[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);

  async function refresh() {
    const rows = await list({ data: { documentId } });
    setPapers(rows as any);
  }
  useEffect(() => { refresh(); }, [documentId]);

  async function onDelete(id: string) {
    if (!confirm("Delete this paper?")) return;
    await del({ data: { paperId: id } });
    if (activeId === id) setActiveId(null);
    refresh();
  }

  if (activeId) return <PaperRunner paperId={activeId} lang={lang} onExit={() => { setActiveId(null); refresh(); }} />;

  return (
    <div className={`space-y-4 ${lang === "si" ? "font-si" : ""}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Practice papers</h2>
          <p className="text-sm text-muted-foreground">Build a timed exam — pick question types and counts.</p>
        </div>
        <Button onClick={() => setShowBuilder((v) => !v)}>
          <Plus className="mr-1 h-4 w-4" /> {showBuilder ? "Close" : "New paper"}
        </Button>
      </div>

      {showBuilder && <PaperBuilder documentId={documentId} onCreated={(id) => { setShowBuilder(false); refresh(); setActiveId(id); }} />}

      {papers === null ? <Skeleton /> : papers.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          No papers yet. Build your first one above.
        </p>
      ) : (
        <ul className="space-y-2">
          {papers.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-card/60 p-4">
              <div>
                <p className="font-medium">{lang === "si" && p.title_si ? p.title_si : p.title}</p>
                <p className="text-xs text-muted-foreground">
                  <AlarmClock className="mr-1 inline h-3 w-3" /> {p.duration_minutes} min · {new Date(p.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setActiveId(p.id)}>Start</Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NumField({ label, value, onChange, max = 30 }: { label: string; value: number; onChange: (n: number) => void; max?: number }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="number" min={0} max={max} value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
        className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/60"
      />
    </label>
  );
}

function PaperBuilder({ documentId, onCreated }: { documentId: string; onCreated: (id: string) => void }) {
  const gen = useServerFn(generatePaper);
  const [title, setTitle] = useState("Practice Paper");
  const [duration, setDuration] = useState(30);
  const [mcq, setMcq] = useState(10);
  const [fillBlank, setFillBlank] = useState(5);
  const [shortQ, setShortQ] = useState(3);
  const [essay, setEssay] = useState(1);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("mixed");
  const [busy, setBusy] = useState(false);
  const total = mcq + fillBlank + shortQ + essay;

  async function submit() {
    if (total === 0) { toast.error("Add at least one question."); return; }
    setBusy(true);
    try {
      const paper = await gen({ data: {
        documentId, title, durationMinutes: duration,
        mcqCount: mcq, fillBlankCount: fillBlank, shortCount: shortQ, essayCount: essay, difficulty,
      } });
      toast.success("Paper ready!");
      onCreated((paper as any).id);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-4">
      <label className="flex flex-col gap-1.5">
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
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Difficulty:</span>
        {(["easy", "medium", "hard", "mixed"] as const).map((d) => (
          <button key={d} onClick={() => setDifficulty(d)}
            className={`rounded-full border px-3 py-1 text-xs capitalize transition ${
              difficulty === d ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"
            }`}>{d}</button>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border pt-3">
        <p className="text-sm text-muted-foreground">{total} questions · {duration} min</p>
        <Button onClick={submit} disabled={busy || total === 0}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Generate paper
        </Button>
      </div>
    </div>
  );
}

function PaperRunner({ paperId, lang, onExit }: { paperId: string; lang: Lang; onExit: () => void }) {
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

  if (!data) return <Skeleton />;
  const { paper, questions } = data;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  // Scoring (objective only)
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
    <div id="paper-content-export" className={`space-y-4 ${lang === "si" ? "font-si" : ""}`}>
      <div className="sticky top-2 z-10 flex items-center justify-between rounded-2xl border border-border bg-card/90 px-4 py-3 backdrop-blur">
        <div>
          <p className="font-semibold">{lang === "si" && paper.title_si ? paper.title_si : paper.title}</p>
          <p className="text-xs text-muted-foreground">{questions.length} questions</p>
        </div>
        <div className="flex items-center gap-3 print:hidden">
          <Button size="sm" variant="outline" onClick={() => downloadPDF("paper-content-export", `paper-${paperId.slice(0, 8)}.pdf`)} title="{lang === 'si' ? 'PDF ලෙස බාගන්න' : 'Download as PDF'}">
            <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
          </Button>
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
          <p className="mt-1 text-xs text-muted-foreground">Essay & short answers shown with model answers below.</p>
        </div>
      )}

      {questions.map((q, i) => (
        <div key={q.id} className="rounded-2xl border border-border bg-card/60 p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <p className="font-medium">{i + 1}. {lang === "si" && q.question_si ? q.question_si : q.question}</p>
            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              {q.type.replace("_", " ")} · {q.marks}m
            </span>
          </div>

          {q.type === "mcq" && (
            <div className="space-y-2">
              {(((lang === "si" && q.options_si ? q.options_si : q.options) as string[]) ?? []).map((opt, oi) => {
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
              {(((lang === "si" && q.blanks_si ? q.blanks_si : q.blanks) as string[]) ?? []).map((_, bi) => (
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
                <p className="text-xs text-muted-foreground"><strong>Answers:</strong> {((lang === "si" && q.blanks_si ? q.blanks_si : q.blanks) as string[]).join(" · ")}</p>
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
                  <p className="text-muted-foreground">{lang === "si" && q.model_answer_si ? q.model_answer_si : q.model_answer}</p>
                </div>
              )}
            </>
          )}
        </div>
      ))}

        {!submitted && (
        <Button size="lg" className="w-full print:hidden" onClick={() => setSubmitted(true)}>
          Submit paper
        </Button>
      )}
    </div>
  );
}
