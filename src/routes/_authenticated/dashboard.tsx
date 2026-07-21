import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Trash2, Trophy, Target, Flame, Sparkles, Search, Star, Layers, Zap } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { deleteDocument, getSkillStats, toggleFavorite, getUserCreditsInfo } from "@/lib/study.functions";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · LectureLens" }] }),
  component: Dashboard,
});

type Doc = { id: string; title: string; source_type: string; created_at: string; is_favorite: boolean; tags: string[] };

function Dashboard() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [credits, setCredits] = useState<any>(null);
  const [query, setQuery] = useState("");
  const [favsOnly, setFavsOnly] = useState(false);
  const del = useServerFn(deleteDocument);
  const loadStats = useServerFn(getSkillStats);
  const loadCredits = useServerFn(getUserCreditsInfo);
  const favFn = useServerFn(toggleFavorite);
  const router = useRouter();

  async function load() {
    const { data } = await supabase.from("documents")
      .select("id,title,source_type,created_at,is_favorite,tags")
      .order("is_favorite", { ascending: false })
      .order("created_at", { ascending: false });
    setDocs((data ?? []) as Doc[]);
    try { setStats(await loadStats({})); } catch {}
    try { setCredits(await loadCredits({})); } catch {}
  }
  useEffect(() => { load(); }, []);

  async function onDelete(id: string) {
    if (!confirm("Delete this study set?")) return;
    try { await del({ data: { documentId: id } }); toast.success("Deleted"); load(); router.invalidate(); }
    catch (e: any) { toast.error(e.message); }
  }

  async function onToggleFav(d: Doc, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    setDocs((cur) => cur?.map((x) => x.id === d.id ? { ...x, is_favorite: !x.is_favorite } : x) ?? null);
    try { await favFn({ data: { documentId: d.id, value: !d.is_favorite } }); }
    catch (err: any) { toast.error(err.message); load(); }
  }

  const filtered = (docs ?? []).filter((d) => {
    if (favsOnly && !d.is_favorite) return false;
    if (query.trim() && !d.title.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <main className="container mx-auto px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Your study sets</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">Pick up where you left off, or add new material.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/papers" className="flex-1 sm:flex-none"><Button size="lg" variant="outline" className="w-full sm:w-auto"><Layers className="mr-2 h-4 w-4" /> Multi-doc paper</Button></Link>
          <Link to="/upload" className="flex-1 sm:flex-none"><Button size="lg" className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> New study set</Button></Link>
        </div>
      </div>

      {stats && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5"
        >
          {credits && (
            <StatCard
              icon={<Zap className="h-4 w-4" />}
              label="Daily credits"
              value={`${credits.creditsRemaining}/${credits.creditsTotal}`}
              sub={`${credits.plan} plan · Resets at midnight`}
              progress={(credits.creditsRemaining / credits.creditsTotal) * 100}
              tone="blue"
            />
          )}
          <StatCard
            icon={<Sparkles className="h-4 w-4" />}
            label="Scholar level"
            value={`Lv. ${stats.level}`}
            sub={`${stats.xpInLevel}/${stats.xpToNext} XP to next`}
            progress={(stats.xpInLevel / stats.xpToNext) * 100}
            tone="violet"
          />
          <StatCard
            icon={<Target className="h-4 w-4" />}
            label="Avg accuracy"
            value={`${stats.avgAccuracy}%`}
            sub={`${stats.totalAttempts} quizzes taken`}
            progress={stats.avgAccuracy}
            tone="teal"
          />
          <StatCard
            icon={<Trophy className="h-4 w-4" />}
            label="Best score"
            value={`${stats.bestAccuracy}%`}
            sub={stats.bestTitle ?? "Take a quiz to record one"}
            progress={stats.bestAccuracy}
            tone="amber"
          />
          <StatCard
            icon={<Flame className="h-4 w-4" />}
            label="Daily streak"
            value={`${stats.streak ?? 0}d`}
            sub={stats.streak >= 1 ? "Keep it going! 🔥" : "Take a quiz to start"}
            progress={Math.min(100, (stats.streak ?? 0) * 14)}
            tone="rose"
          />
        </motion.section>
      )}

      {stats?.achievements && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Achievements</h2>
          <div className="flex flex-wrap gap-2">
            {stats.achievements.map((a: any) => (
              <motion.div
                key={a.id}
                whileHover={{ scale: 1.05 }}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  a.earned
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-card/40 text-muted-foreground opacity-60 grayscale"
                }`}
              >
                <span className="text-base">{a.icon}</span> {a.label}
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search study sets…"
            className="h-10 w-full rounded-lg border border-border bg-card/60 pl-9 pr-3 text-sm outline-none transition focus:border-primary/60"
          />
        </div>
        <button
          onClick={() => setFavsOnly((v) => !v)}
          className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm transition ${
            favsOnly ? "border-primary/60 bg-primary/10 text-foreground" : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Star className={`h-4 w-4 ${favsOnly ? "fill-current text-amber-300" : ""}`} /> Favorites
        </button>
      </div>

      {docs === null ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-card/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/30 p-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 font-display text-xl font-semibold">
            {docs.length === 0 ? "No study sets yet" : "No matches"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {docs.length === 0 ? "Upload your first lecture or notes to get started." : "Try a different search or clear filters."}
          </p>
          {docs.length === 0 && <Link to="/upload" className="mt-4"><Button>Create your first set</Button></Link>}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <div key={d.id} className="group relative rounded-2xl border border-border bg-card/60 p-5 transition hover:border-primary/40 hover:bg-card">
              <Link to="/document/$id" params={{ id: d.id }} className="block">
                <div className="flex items-start justify-between">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.source_type}</span>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold leading-tight line-clamp-2">{d.title}</h3>
                <p className="mt-2 text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</p>
              </Link>
              <div className="absolute right-3 top-3 flex items-center gap-1">
                <button
                  onClick={(e) => onToggleFav(d, e)}
                  className={`rounded-md p-1.5 transition ${d.is_favorite ? "text-amber-300" : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-amber-300"}`}
                  aria-label="Favorite"
                >
                  <Star className={`h-4 w-4 ${d.is_favorite ? "fill-current" : ""}`} />
                </button>
                <button onClick={() => onDelete(d.id)} className="hidden rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:block">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function StatCard({ icon, label, value, sub, progress, tone }: {
  icon: React.ReactNode; label: string; value: string; sub: string; progress: number;
  tone: "violet" | "teal" | "amber" | "rose" | "blue";
}) {
  const tones: Record<string, { ring: string; bar: string; glow: string; text: string }> = {
    violet: { ring: "from-violet-400/40 to-fuchsia-400/10", bar: "bg-gradient-to-r from-violet-400 to-fuchsia-400", glow: "shadow-[0_0_40px_-12px_rgba(168,130,255,0.5)]", text: "text-violet-200" },
    teal:   { ring: "from-teal-300/40 to-cyan-300/10",     bar: "bg-gradient-to-r from-teal-300 to-cyan-300",     glow: "shadow-[0_0_40px_-12px_rgba(94,234,212,0.45)]", text: "text-teal-200" },
    amber:  { ring: "from-amber-300/40 to-orange-300/10",  bar: "bg-gradient-to-r from-amber-300 to-orange-300",  glow: "shadow-[0_0_40px_-12px_rgba(251,191,36,0.45)]", text: "text-amber-200" },
    rose:   { ring: "from-rose-300/40 to-pink-300/10",     bar: "bg-gradient-to-r from-rose-300 to-pink-300",     glow: "shadow-[0_0_40px_-12px_rgba(251,113,133,0.45)]", text: "text-rose-200" },
    blue:   { ring: "from-blue-400/40 to-indigo-400/10",   bar: "bg-gradient-to-r from-blue-400 to-indigo-400",   glow: "shadow-[0_0_40px_-12px_rgba(96,165,250,0.5)]",  text: "text-blue-200" },
  };
  const t = tones[tone];
  return (
    <motion.div whileHover={{ y: -3 }} className={`group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card/90 via-card/70 to-card/30 p-5 ${t.glow}`}>
      <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${t.ring} blur-2xl`} />
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <span className={`grid h-6 w-6 place-items-center rounded-md bg-white/5 ${t.text}`}>{icon}</span>
        {label}
      </div>
      <p className="mt-3 font-display text-3xl font-semibold">{value}</p>
      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{sub}</p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(2, Math.min(100, progress))}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${t.bar}`}
        />
      </div>
    </motion.div>
  );
}