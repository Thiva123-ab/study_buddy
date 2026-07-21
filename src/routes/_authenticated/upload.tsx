import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useServerFn } from "@tanstack/react-start";
import { createDocumentFromText, createDocumentFromFile } from "@/lib/study.functions";
import { Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { GeneratingAnimation } from "@/components/generating-animation";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({ meta: [{ title: "New study set · LectureLens" }] }),
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const fromText = useServerFn(createDocumentFromText);
  const fromFile = useServerFn(createDocumentFromFile);

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitText() {
    if (text.trim().length < 20) return toast.error("Paste at least 20 characters of content.");
    setLoading(true);
    try {
      const r = await fromText({ data: { title: title || "Untitled notes", text } });
      navigate({ to: "/document/$id", params: { id: r.id } });
    } catch (e: any) { toast.error(e.message); setLoading(false); }
  }

  async function submitFile() {
    if (!file) return toast.error("Choose a file first.");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title || file.name);
      const r = await fromFile({ data: fd });
      navigate({ to: "/document/$id", params: { id: r.id } });
    } catch (e: any) { toast.error(e.message); setLoading(false); }
  }

  return (
    <main className="container mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-4xl font-semibold">New study set</h1>
      <p className="mt-1 text-muted-foreground">Upload lecture material or paste notes — we'll do the rest.</p>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 min-h-[400px]">
        {loading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12">
            <GeneratingAnimation type="upload" />
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mb-6">
              <Label htmlFor="title">Title (optional)</Label>
              <Input id="title" placeholder="e.g. Chapter 4 — Cell Biology" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <Tabs defaultValue="file">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file"><Upload className="mr-2 h-4 w-4" /> Upload file</TabsTrigger>
                <TabsTrigger value="text"><FileText className="mr-2 h-4 w-4" /> Paste text</TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="mt-6 space-y-4">
                <label className="block cursor-pointer rounded-xl border-2 border-dashed border-border bg-background/40 p-10 text-center transition hover:border-primary/60 hover:bg-background/60">
                  <input type="file" accept=".pdf,.docx,image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 font-medium">{file ? file.name : "Click to choose a file"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">PDF, DOCX, or image · max 10MB</p>
                </label>
                <Button onClick={submitFile} disabled={!file} className="w-full" size="lg">
                  Create study set
                </Button>
              </TabsContent>

              <TabsContent value="text" className="mt-6 space-y-4">
                <Textarea rows={12} placeholder="Paste your notes here…" value={text} onChange={(e) => setText(e.target.value)} />
                <Button onClick={submitText} className="w-full" size="lg">
                  Create study set
                </Button>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </div>
    </main>
  );
}