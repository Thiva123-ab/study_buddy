import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { BookOpen, Languages, Brain, ArrowRight, Sparkles, Upload, Zap, MessageSquare, Flame, Trophy, Search, Timer, Download, FileText, ClipboardList, AlarmClock, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LectureLens — Bilingual AI study assistant" },
      { name: "description", content: "Turn lecture slides and notes into summaries, flashcards, and quizzes — in English and Sinhala." },
      { property: "og:title", content: "LectureLens — Bilingual AI study assistant" },
      { property: "og:description", content: "Turn lecture slides and notes into summaries, flashcards, and quizzes — in English and Sinhala." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const features = [
    {
      icon: BookOpen,
      title: "Clear summaries",
      desc: "Distill any lecture into key concepts you can actually remember.",
      accent: false,
    },
    {
      icon: Brain,
      title: "Flashcards & quizzes",
      desc: "Auto-generated study sets to test what you know, perfectly paced.",
      accent: false,
    },
    {
      icon: Languages,
      title: "Sinhala translation",
      desc: "One tap to read everything in native සිංහල script.",
      accent: true,
    },
  ];

  const powerFeatures = [
    { icon: Layers, title: "Multi-document papers", desc: "Combine any number of study sets into one mixed exam paper." },
    { icon: FileText, title: "Custom exam papers", desc: "Build timed papers — pick MCQ, fill-in-the-blank, short answer & essay counts." },
    { icon: AlarmClock, title: "Timed paper mode", desc: "Set your own duration. Auto-submits and grades when time runs out." },
    { icon: ClipboardList, title: "Mixed question types", desc: "Practice MCQ, fill blanks, short answers and essays with model answers." },
    { icon: MessageSquare, title: "Chat with your PDF", desc: "Ask questions and get cited answers from your document." },
    { icon: Flame, title: "Daily streaks", desc: "Build a study habit with streaks that track every active day." },
    { icon: Trophy, title: "Achievements", desc: "Unlock badges for perfect scores, scholar levels, and milestones." },
    { icon: Timer, title: "Pomodoro timer", desc: "Built-in 25/5 focus timer keeps deep work on rails." },
    { icon: Search, title: "Search, tags & favorites", desc: "Find any set instantly. Star favorites. Organize with tags." },
    { icon: Download, title: "Export & share", desc: "Download summaries as Markdown or share study sets." },
  ];

  const steps = [
    { icon: Upload, title: "Upload", desc: "Drop slides, notes, or photos." },
    { icon: Sparkles, title: "Generate", desc: "AI distills the essentials." },
    { icon: Zap, title: "Master", desc: "Study with flashcards & quizzes." },
  ];

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center overflow-x-hidden bg-background text-foreground selection:bg-primary/20">
      {/* Ambient background glows */}
      <motion.div
        animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none fixed left-[-20%] top-[-10%] h-[40%] w-[60%] rounded-full bg-primary/20 blur-[120px]"
      />
      <motion.div
        animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none fixed bottom-[-10%] right-[-20%] h-[40%] w-[50%] rounded-full bg-sky-400/15 blur-[100px]"
      />
      {/* Cursor spotlight */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mouse.x}px ${mouse.y}px, rgba(168,130,255,0.18), transparent 40%)`,
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex w-full items-center justify-between gap-3 px-4 py-5 sm:px-8 sm:py-7 md:px-16"
      >
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <motion.div
            whileHover={{ rotate: 12, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-[0_0_20px_rgba(59,130,246,0.45)]"
          >
            <svg className="h-5 w-5 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
            </svg>
          </motion.div>
          <span className="truncate text-base font-semibold tracking-tight sm:text-lg">LectureLens</span>
        </Link>
        <div className="flex shrink-0 items-center gap-3 sm:gap-5">
          <ThemeToggle />
          <Link to="/auth" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Sign in
          </Link>
          <Link
            to="/auth"
            className="hidden rounded-full bg-card px-4 py-1.5 text-sm font-medium text-foreground ring-1 ring-inset ring-border transition-all hover:scale-105 hover:bg-secondary sm:inline-flex"
          >
            Get started
          </Link>
        </div>
      </motion.nav>

      {/* Hero */}
      <main className="relative z-10 flex w-full flex-col items-center px-4 pb-16 pt-8 text-center sm:px-6 md:px-12">
        <div className="flex w-full max-w-3xl flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur"
        >
          <motion.span
            animate={{ opacity: [1, 0.4, 1], scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="h-1 w-1 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.8)]"
          />
          English <span className="text-muted-foreground/50">•</span>
          <span className="font-si">සිංහල</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-balance text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl md:text-7xl"
        >
          Study{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(90deg,#a78bfa,#22d3ee,#f0abfc,#a78bfa)",
              backgroundSize: "300% 100%",
              animation: "ll-gradient 6s linear infinite",
            }}
          >
            smarter
          </span>,
          <br />
          in{" "}
          <span
            className="font-light italic text-primary"
            style={{ fontFamily: "'Newsreader', 'Fraunces', serif" }}
          >
            your
          </span>{" "}
          language.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base"
        >
          Upload lecture slides, notes, or photos. Get clear summaries, flashcards, and quizzes — instantly translated to Sinhala.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.55 }}
        >
          <Link to="/auth" className="group relative mt-10 inline-flex">
            <span className="absolute -inset-1 rounded-2xl bg-primary/40 opacity-40 blur-lg transition duration-700 group-hover:opacity-100 group-hover:blur-xl" />
            <span className="relative inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 font-semibold text-primary-foreground transition-all hover:brightness-110 hover:shadow-[0_10px_40px_-10px_rgba(59,130,246,0.8)] active:scale-95">
              Start studying
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
            </span>
          </Link>
        </motion.div>
        </div>

        {/* How it works */}
        <div className="mt-24 grid w-full max-w-6xl grid-cols-1 gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left backdrop-blur transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-4 w-4" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Step {i + 1}</p>
                <p className="text-sm font-semibold">{s.title}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Features */}
        <div className="mt-12 grid w-full max-w-6xl gap-4 md:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.55, delay: i * 0.12 }}
              whileHover={{ y: -4 }}
              className="group relative overflow-hidden rounded-3xl p-[1px] transition-all duration-500"
            >
              <div
                className={
                  "absolute inset-0 bg-gradient-to-b transition-opacity duration-500 " +
                  (f.accent ? "from-primary/50 to-transparent" : "from-border to-transparent group-hover:from-primary/30")
                }
              />
              <div
                className={
                  "relative h-full rounded-[23px] bg-card p-6 text-left transition-shadow duration-500 group-hover:shadow-[0_10px_40px_-10px_rgba(59,130,246,0.35)] " +
                  (f.accent ? "shadow-[0_0_30px_rgba(59,130,246,0.08)]" : "")
                }
              >
                <div
                  className={
                    "mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 " +
                    (f.accent ? "bg-primary/15" : "bg-secondary")
                  }
                >
                  <f.icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold tracking-tight">{f.title}</h3>
                  {f.accent && (
                    <span className="font-si rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                      සිංහල
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-20 w-full max-w-7xl"
        >
          <div className="mb-8 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">More superpowers</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Everything you need to actually learn</h2>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {powerFeatures.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                whileHover={{ y: -3 }}
                className="group flex items-start gap-3 rounded-2xl border border-border bg-card/60 p-4 text-left backdrop-blur transition-colors hover:border-primary/40 hover:bg-accent/30"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <f.icon className="h-4 w-4" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative mt-20 w-full max-w-6xl overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-12 text-center md:p-16"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.18),transparent_70%)]" />
          <h3 className="relative text-2xl font-semibold tracking-tight md:text-3xl">
            Ready to ace your next exam?
          </h3>
          <p className="relative mt-2 text-sm text-muted-foreground">
            Free to start. No credit card required.
          </p>
          <Link
            to="/auth"
            className="relative mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:scale-105 hover:brightness-110"
          >
            Get started free
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        </motion.div>
      </main>

      <footer className="relative z-10 flex w-full flex-col items-center gap-2 px-6 py-12 md:px-16">
        <div className="mb-8 h-px w-full bg-border" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Built for students • Powered by Lovable AI
        </p>
      </footer>
    </div>
  );
}
