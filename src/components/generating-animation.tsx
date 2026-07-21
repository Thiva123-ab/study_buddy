import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Search, PenTool, Sparkles, BrainCircuit, Target, CheckCircle, Scan, Lightbulb, Layers, ListOrdered, Scale, LayoutList, Upload } from "lucide-react";

// Need to define FileText locally since we can't import from lucide-react with the exact name if it conflicts, but we can just import FileText
import { FileText } from "lucide-react";
const FileTextIcon = FileText;

const GENERATION_STAGES = {
  summary: [
    { text: "Reading document...", icon: <BookOpen className="h-6 w-6" /> },
    { text: "Identifying key concepts...", icon: <Search className="h-6 w-6" /> },
    { text: "Writing summary...", icon: <PenTool className="h-6 w-6" /> },
    { text: "Adding highlights...", icon: <Sparkles className="h-6 w-6" /> },
  ],
  quiz: [
    { text: "Analyzing content...", icon: <FileTextIcon className="h-6 w-6" /> },
    { text: "Crafting questions...", icon: <BrainCircuit className="h-6 w-6" /> },
    { text: "Setting difficulty...", icon: <Target className="h-6 w-6" /> },
    { text: "Finalizing quiz...", icon: <CheckCircle className="h-6 w-6" /> },
  ],
  flashcards: [
    { text: "Scanning material...", icon: <Scan className="h-6 w-6" /> },
    { text: "Extracting key facts...", icon: <Lightbulb className="h-6 w-6" /> },
    { text: "Creating cards...", icon: <Layers className="h-6 w-6" /> },
    { text: "Ordering by topic...", icon: <ListOrdered className="h-6 w-6" /> },
  ],
  paper: [
    { text: "Reading syllabus...", icon: <BookOpen className="h-6 w-6" /> },
    { text: "Drafting questions...", icon: <PenTool className="h-6 w-6" /> },
    { text: "Balancing marks...", icon: <Scale className="h-6 w-6" /> },
    { text: "Formatting paper...", icon: <LayoutList className="h-6 w-6" /> },
  ],
  upload: [
    { text: "Uploading file...", icon: <Upload className="h-6 w-6" /> },
    { text: "Extracting text...", icon: <FileTextIcon className="h-6 w-6" /> },
    { text: "Analyzing content...", icon: <BrainCircuit className="h-6 w-6" /> },
    { text: "Finalizing study set...", icon: <CheckCircle className="h-6 w-6" /> },
  ]
};

const TIPS = [
  "Did you know? Active recall improves memory retention by up to 150%!",
  "Pro tip: Spaced repetition helps you remember facts longer.",
  "Taking a 5-minute break every 25 minutes keeps your brain sharp.",
  "Teaching a concept to someone else is the fastest way to learn it.",
  "Studying right before sleep can help consolidate memories.",
  "Mixing different topics (interleaving) improves problem-solving skills.",
];

export function GeneratingAnimation({ type }: { type: keyof typeof GENERATION_STAGES }) {
  const [stageIdx, setStageIdx] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);
  const stages = GENERATION_STAGES[type];

  useEffect(() => {
    // advance stage every 4.5 seconds, maxing out at the last stage
    const interval = setInterval(() => {
      setStageIdx(cur => Math.min(cur + 1, stages.length - 1));
    }, 4500);
    return () => clearInterval(interval);
  }, [stages.length]);

  useEffect(() => {
    setTipIdx(Math.floor(Math.random() * TIPS.length));
    const tipInterval = setInterval(() => {
      setTipIdx(Math.floor(Math.random() * TIPS.length));
    }, 8000);
    return () => clearInterval(tipInterval);
  }, []);

  const currentStage = stages[stageIdx];
  const progressPercent = Math.min(((stageIdx + 1) / stages.length) * 100, 95); // leave it at 95% at the end

  return (
    <div className="flex w-full max-w-md flex-col items-center justify-center p-6 text-center mx-auto">
      <motion.div
        key={stageIdx}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: [1, 1.1, 1] }}
        transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
        className="mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-primary/20 text-primary shadow-[0_0_30px_-5px_rgba(var(--primary),0.3)]"
      >
        {currentStage.icon}
      </motion.div>
      
      <AnimatePresence mode="wait">
        <motion.h3 
          key={currentStage.text}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-4 text-lg font-semibold"
        >
          {currentStage.text}
        </motion.h3>
      </AnimatePresence>
      
      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-secondary border border-border">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: "0%" }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </div>
      
      <AnimatePresence mode="wait">
        <motion.div 
          key={tipIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="mt-8 w-full rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground shadow-sm"
        >
          <p className="flex items-start gap-3 text-left">
            <span className="text-xl leading-none">💡</span>
            <span className="leading-snug">{TIPS[tipIdx]}</span>
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
