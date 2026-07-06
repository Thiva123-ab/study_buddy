import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { jsonrepair } from "jsonrepair";

const MODEL = "gemini-2.5-flash";
const MAX_TEXT = 60000;

function truncate(text: string) {
  return text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) + "\n\n...[truncated]" : text;
}

async function generateAiText(options: any): Promise<string> {
  const apiKeys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter(Boolean);
  if (apiKeys.length === 0) throw new Error("Missing GEMINI_API_KEY environment variable");

  // Build the request for Google Gemini REST API directly
  const model = MODEL;

  // Convert AI SDK format to Gemini format
  const contents: any[] = [];
  
  if (options.system) {
    // system instruction handled separately
  }
  
  if (options.responseMimeType === "application/json" && options.prompt) {
    options.prompt += "\n\nCRITICAL: You are outputting JSON. You MUST properly escape any internal double quotes inside your string values (e.g. using \\\") and ensure there are no missing commas between array elements or object properties. Your output will be parsed by JSON.parse() and will crash if the syntax is invalid.";
  }

  if (options.prompt) {
    contents.push({ role: "user", parts: [{ text: options.prompt }] });
  } else if (options.messages) {
    for (const msg of options.messages) {
      const parts: any[] = [];
      if (typeof msg.content === "string") {
        parts.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === "text") {
            parts.push({ text: part.text });
          } else if (part.type === "image") {
            // base64 data URL
            const match = part.image?.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              parts.push({ inline_data: { mime_type: match[1], data: match[2] } });
            }
          }
        }
      }
      contents.push({ role: msg.role === "assistant" ? "model" : "user", parts });
    }
  }

  const body: any = { contents };
  
  if (options.system) {
    body.system_instruction = { parts: [{ text: options.system }] };
  }

  body.generationConfig = {
    temperature: 0.7,
    maxOutputTokens: 8192,
  };
  
  if (options.responseMimeType) {
    body.generationConfig.responseMimeType = options.responseMimeType;
  }
  if (options.responseSchema) {
    body.generationConfig.responseSchema = options.responseSchema;
  }

  let lastError: any = null;

  for (const apiKey of apiKeys) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Gemini API error:", response.status, errText);
        if (response.status === 429) {
          lastError = new Error("You have exceeded the Gemini API rate limit (too many requests). Please wait a minute and try again.");
          continue; // Try the next key!
        }
        throw new Error(`Gemini API error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        console.error("Gemini returned no text:", JSON.stringify(data).slice(0, 500));
        throw new Error("Gemini returned an empty response.");
      }
      return text;
    } catch (error: any) {
      if (error instanceof Error && error.message.includes("rate limit")) {
        lastError = error;
        continue; // Try next key if it's a rate limit error
      }
      
      console.error("AI generation failed", error);
      if (error instanceof Error && error.message.includes("Gemini API error")) {
        throw error; // Throw the real error to the frontend so we can see why it failed
      }
      throw new Error("AI generation failed. Please try again with shorter or clearer study material.");
    }
  }

  // If we exhaust all keys and still have a rate limit error, throw it
  throw lastError;
}

function parseAiJson<T>(raw: string, schema: z.ZodSchema<T>): T {
  try {
    let cleaned = raw
      .replace(/```json\s*/gi, "")
      .replace(/```/g, "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .trim();
      
    try {
      cleaned = jsonrepair(cleaned);
    } catch (repairErr) {
      console.warn("jsonrepair could not repair the JSON, falling back", repairErr);
    }

    const firstBrace = cleaned.indexOf("{");
    const firstBracket = cleaned.indexOf("[");
    let start = -1;
    let end = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      start = firstBrace;
      end = cleaned.lastIndexOf("}");
    } else if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      start = firstBracket;
      end = cleaned.lastIndexOf("]");
    }

    let json = cleaned;
    if (start !== -1 && end !== -1 && end > start) {
      json = cleaned.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1");
    }

    let parsed = JSON.parse(json);
    
    // Auto-wrap if it's an array but schema might expect an object
    if (Array.isArray(parsed)) {
      const res = schema.safeParse(parsed);
      if (!res.success) {
        const asCards = schema.safeParse({ cards: parsed });
        if (asCards.success) return asCards.data as T;
        
        const asQuestions = schema.safeParse({ questions: parsed });
        if (asQuestions.success) return asQuestions.data as T;
      }
    }

    return schema.parse(parsed);
  } catch (error) {
    console.error("AI JSON parse failed", { error, preview: raw.slice(0, 500) });
    const msg = error instanceof z.ZodError ? error.errors.map(e => e.path.join('.') + ': ' + e.message).join(', ') : (error instanceof Error ? error.message : "Unknown error");
    throw new Error(`AI formatting error: ${msg}`);
  }
}

async function extractFromFile(file: File, buf: Uint8Array): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
    return result.value;
  }

  // PDF -> extract text locally with pdfjs-dist
  if (name.endsWith(".pdf")) {
    try {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const loadingTask = pdfjsLib.getDocument({ data: buf });
      const pdfDoc = await loadingTask.promise;
      const pages: string[] = [];
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => item.str)
          .join(" ");
        pages.push(pageText);
      }
      const fullText = pages.join("\n\n");
      if (fullText.trim().length > 10) {
        return fullText;
      }
      throw new Error("PDF appears to be empty or image-based.");
    } catch (e: any) {
      console.error("PDF Parsing Error:", e);
      throw new Error("Failed to parse PDF. It might be corrupted, password-protected, or unsupported.");
    }
  }

  // Images -> convert to base64 and ask AI to describe/extract text
  let mediaType = file.type || "application/octet-stream";
  if (name.endsWith(".png")) mediaType = "image/png";
  else if (name.endsWith(".jpg") || name.endsWith(".jpeg")) mediaType = "image/jpeg";
  else if (name.endsWith(".webp")) mediaType = "image/webp";

  const isImage = mediaType.startsWith("image/");
  if (!isImage) {
    throw new Error("Unsupported file type. Please upload PDF, DOCX, or an image.");
  }

  // For images, use AI with base64 encoding
  const { getGateway } = await import("./ai-gateway.server");
  const gateway = getGateway();
  const base64 = Buffer.from(buf).toString("base64");
  const dataUrl = `data:${mediaType};base64,${base64}`;

  const text = await generateAiText({
    model: gateway(MODEL),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract ALL readable text from this image. Preserve structure (headings, bullets, lists). Return only the extracted text — no commentary.",
          },
          { type: "image", image: dataUrl },
        ],
      },
    ],
  });
  return text;
}

// === Create document from pasted text ===
export const createDocumentFromText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      title: z.string().min(1).max(200),
      text: z.string().min(20).max(MAX_TEXT),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    const { data: doc, error } = await context.supabase
      .from("documents")
      .insert({
        user_id: context.userId,
        title: data.title,
        source_type: "text",
        extracted_text: data.text,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: doc.id };
  });

// === Create document from uploaded file ===
export const createDocumentFromFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Expected FormData");
    const file = data.get("file");
    const title = data.get("title");
    if (!(file instanceof File)) throw new Error("Missing file");
    if (file.size > 10 * 1024 * 1024) throw new Error("File too large (max 10MB)");
    return { file, title: typeof title === "string" && title ? title : file.name };
  })
  .handler(async ({ data, context }) => {
    const bytes = new Uint8Array(await data.file.arrayBuffer());
    const text = await extractFromFile(data.file, bytes);
    if (!text || text.trim().length < 10) {
      throw new Error("Could not extract enough text from this file.");
    }

    // Upload original to storage
    const ext = data.file.name.split(".").pop() || "bin";
    const path = `${context.userId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await context.supabase.storage
      .from("study-uploads")
      .upload(path, bytes, { contentType: data.file.type || undefined });
    if (upErr) console.error("upload err", upErr);

    const { data: doc, error } = await context.supabase
      .from("documents")
      .insert({
        user_id: context.userId,
        title: data.title,
        source_type: data.file.type.startsWith("image/") ? "image" : "file",
        storage_path: upErr ? null : path,
        extracted_text: truncate(text),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: doc.id };
  });

// === Summary ===
export const generateSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ documentId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("summaries").select("*").eq("document_id", data.documentId).maybeSingle();
    if (existing) return existing;

    const { data: doc, error: dErr } = await context.supabase
      .from("documents").select("extracted_text, title").eq("id", data.documentId).single();
    if (dErr || !doc) throw new Error("Document not found");

    const { getGateway } = await import("./ai-gateway.server");
    const text = await generateAiText({
      model: getGateway()(MODEL),
      prompt: `You are an expert study assistant. Produce a COMPLETE, DETAILED study summary covering EVERY topic, section, definition, formula, example, date, name, and fact in the material. Do NOT skip content — be exhaustive.

STRICT FORMAT RULES:
1. ONE SENTENCE PER LINE. Never write paragraphs. Each fact, definition, or idea is its own bullet line starting with "- ".
2. Keep each sentence short, clear, and self-contained.
3. Color tags for importance:
   - Wrap the MOST critical facts (key definitions, exact formulas, must-remember names/dates/numbers, exam-likely facts) in [[red]]...[[/red]]
   - Wrap MEDIUM-importance facts (supporting concepts, secondary terms, useful context) in [[blue]]...[[/blue]]
   - Leave normal explanatory text as plain text (renders white).
4. For ANY code, equation, algorithm, or pseudo-code in the source: include a fenced code block using triple backticks with a language tag, AND add a one-line plain-language explanation BELOW the block.
5. For ANY graph, chart, diagram, table, or visual concept in the source: describe it in words, then add a simple ASCII illustration inside a fenced \`\`\`text block showing axes/structure, AND a one-line "Example:" sentence demonstrating a concrete case.
6. For EVERY abstract concept or formula: add a "- Example: ..." bullet immediately under it with a concrete worked example.
7. After EACH ## section, add a "- 📺 Watch: [topic name](https://www.youtube.com/results?search_query=URL_ENCODED+TOPIC+tutorial)" bullet with a YouTube SEARCH link (use https://www.youtube.com/results?search_query=...) for a relevant tutorial on that section's topic. URL-encode spaces as +.

Markdown structure:
## Overview
- One sentence per line. 3-5 lines summarising the whole material.

## Detailed Notes
Use ## section headings mirroring the document. Under each heading, ONLY bullet lines ("- ..."), one sentence each. Apply color tags. Include code blocks, ASCII diagrams, "- Example: ..." bullets, and a "- 📺 Watch: ..." YouTube search link as required above.

## Key Takeaways
- 6-12 single-sentence bullets of must-know points (most wrapped in [[red]]...[[/red]]).

## Recommended Videos
- 4-6 bullets, each formatted as "- [Descriptive title](https://www.youtube.com/results?search_query=URL_ENCODED+QUERY)" covering the main topics for further learning.

Material titled "${doc.title}":

${doc.extracted_text}`,
    });

    const { data: row, error } = await context.supabase
      .from("summaries").insert({
        user_id: context.userId,
        document_id: data.documentId,
        content_en: text,
      }).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

// === Flashcards ===
const FlashcardsSchema = z.object({
  cards: z.array(z.object({ front: z.string(), back: z.string() })),
});

export const generateFlashcards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ documentId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("flashcards").select("*").eq("document_id", data.documentId).order("position");
    if (existing && existing.length > 0) return existing;

    const { data: doc } = await context.supabase
      .from("documents").select("extracted_text, title").eq("id", data.documentId).single();
    if (!doc) throw new Error("Document not found");

    const { getGateway } = await import("./ai-gateway.server");
    const text = await generateAiText({
      model: getGateway()(MODEL),
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          cards: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                front: { type: "STRING" },
                back: { type: "STRING" }
              },
              required: ["front", "back"]
            }
          }
        },
        required: ["cards"]
      },
      prompt: `Create COMPREHENSIVE study flashcards from this material. Cover EVERY key term, definition, concept, formula, date, name, example, and relationship in the document — do not skip topics. Generate as many cards as needed for full coverage (typically 20-40, more if the material is long).

Return ONLY valid JSON in this exact shape, with no markdown fences and no commentary:
{"cards":[{"front":"question text","back":"answer text"}]}

Each card: concise question on the front, clear and complete answer on the back.

Material: "${doc.title}"

${doc.extracted_text}`,
    });
    const parsed = parseAiJson(text, FlashcardsSchema);

    const rows = parsed.cards.map((c, i) => ({
      user_id: context.userId,
      document_id: data.documentId,
      position: i,
      front_en: c.front,
      back_en: c.back,
    }));
    const { data: inserted, error } = await context.supabase
      .from("flashcards").insert(rows).select("*").order("position");
    if (error) throw new Error(error.message);
    return inserted;
  });

// === Quiz ===
const QuizSchema = z.object({
  questions: z.array(z.object({
    question: z.string(),
    options: z.array(z.string()),
    correctIndex: z.number().int().min(0).max(3),
    explanation: z.string(),
  })),
});

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ documentId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("quiz_questions").select("*").eq("document_id", data.documentId).order("position");
    if (existing && existing.length > 0) return existing;

    const { data: doc } = await context.supabase
      .from("documents").select("extracted_text, title").eq("id", data.documentId).single();
    if (!doc) throw new Error("Document not found");

    const { getGateway } = await import("./ai-gateway.server");
    const text = await generateAiText({
      model: getGateway()(MODEL),
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          questions: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                question: { type: "STRING" },
                options: { type: "ARRAY", items: { type: "STRING" } },
                correctIndex: { type: "INTEGER" },
                explanation: { type: "STRING" }
              },
              required: ["question", "options", "correctIndex", "explanation"]
            }
          }
        },
        required: ["questions"]
      },
      prompt: `Create a COMPREHENSIVE multiple-choice quiz from this material. Cover EVERY major topic, section, definition, fact, formula, and example in the document — do not skip topics. Generate as many questions as needed for full coverage (typically 15-25, more if the material is long).

Return ONLY valid JSON in this exact shape, with no markdown fences and no commentary:
{"questions":[{"question":"question text","options":["A","B","C","D"],"correctIndex":0,"explanation":"brief explanation"}]}

Each question must have exactly 4 plausible options with one correct answer. Include a clear explanation. Vary difficulty and spread questions across all sections.

Material: "${doc.title}"

${doc.extracted_text}`,
    });
    const parsed = parseAiJson(text, QuizSchema);

    const rows = parsed.questions.map((q, i) => ({
      user_id: context.userId,
      document_id: data.documentId,
      position: i,
      question_en: q.question,
      options_en: q.options,
      correct_index: q.correctIndex,
      explanation_en: q.explanation,
    }));
    const { data: inserted, error } = await context.supabase
      .from("quiz_questions").insert(rows).select("*").order("position");
    if (error) throw new Error(error.message);
    return inserted;
  });

// === Translate document content to Sinhala ===
export const translateToSinhala = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ documentId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { getGateway } = await import("./ai-gateway.server");
    const gateway = getGateway();

    // Summary
    const { data: summary } = await context.supabase
      .from("summaries").select("*").eq("document_id", data.documentId).maybeSingle();
    if (summary && !summary.content_si) {
      const text = await generateAiText({
        model: gateway(MODEL),
        prompt: `Translate the following English study summary into clear, natural Sinhala (සිංහල). Preserve markdown formatting. Return only the Sinhala translation.\n\n${summary.content_en}`,
      });
      await context.supabase.from("summaries").update({ content_si: text }).eq("id", summary.id);
    }

    // Flashcards
    const { data: cards } = await context.supabase
      .from("flashcards").select("*").eq("document_id", data.documentId).order("position");
    if (cards && cards.length > 0 && cards.some((c) => !c.front_si)) {
      const Sch = z.object({
        cards: z.array(z.object({ front: z.string(), back: z.string() })),
      });
      const text = await generateAiText({
        model: gateway(MODEL),
        responseMimeType: "application/json",
        prompt: `Translate the text inside these flashcards from English to natural Sinhala. IMPORTANT: DO NOT translate the JSON keys (e.g., keep "cards", "front", "back" in English). Only translate the content strings.

Return ONLY valid JSON in this exact shape, with no markdown fences and no commentary:
{"cards":[{"front":"translated front","back":"translated back"}]}

Return the same number of cards in order.

${JSON.stringify({ cards: cards.map((c) => ({ front: c.front_en, back: c.back_en })) })}`,
      });
      const translated = parseAiJson(text, Sch).cards;
      await Promise.all(cards.map((c, i) => {
        const t = translated[i];
        if (!t) return Promise.resolve();
        return context.supabase.from("flashcards").update({ front_si: t.front, back_si: t.back }).eq("id", c.id);
      }));
    }

    // Quiz
    const { data: qs } = await context.supabase
      .from("quiz_questions").select("*").eq("document_id", data.documentId).order("position");
    if (qs && qs.length > 0 && qs.some((q) => !q.question_si)) {
      const Sch = z.object({
        questions: z.array(z.object({
          question: z.string(),
          options: z.array(z.string()),
          explanation: z.string(),
        })),
      });
      const text = await generateAiText({
        model: gateway(MODEL),
        responseMimeType: "application/json",
        prompt: `Translate these quiz questions from English to natural Sinhala. IMPORTANT: DO NOT translate the JSON keys (e.g., keep "questions", "question", "options", "explanation" in English). Only translate the content strings.

Return ONLY valid JSON in this exact shape, with no markdown fences and no commentary:
{"questions":[{"question":"translated question","options":["A","B","C","D"],"explanation":"translated explanation"}]}

Keep the same option order. Return the same number of questions in order.

${JSON.stringify({ questions: qs.map((q) => ({ question: q.question_en, options: q.options_en, explanation: q.explanation_en })) })}`,
      });
      const translated = parseAiJson(text, Sch).questions;
      await Promise.all(qs.map((q, i) => {
        const t = translated[i];
        if (!t) return Promise.resolve();
        return context.supabase.from("quiz_questions").update({
          question_si: t.question, options_si: t.options, explanation_si: t.explanation,
        }).eq("id", q.id);
      }));
    }

    // Papers
    const { data: papers } = await context.supabase
      .from("papers").select("*").eq("document_id", data.documentId);
    
    if (papers && papers.length > 0) {
      for (const p of papers) {
        if (!p.title_si) {
          const text = await generateAiText({
            model: gateway(MODEL),
            prompt: `Translate the following paper title into natural Sinhala (සිංහල). Return only the translation.\n\n${p.title}`,
          });
          await context.supabase.from("papers").update({ title_si: text }).eq("id", p.id);
        }

        const { data: pqs } = await context.supabase
          .from("paper_questions").select("*").eq("paper_id", p.id).order("position");
        
        if (pqs && pqs.length > 0 && pqs.some((q) => !q.question_si)) {
          const Sch = z.object({
            questions: z.array(z.object({
              question: z.string(),
              options: z.array(z.string()).nullable().optional(),
              modelAnswer: z.string().nullable().optional(),
              blanks: z.array(z.string()).nullable().optional(),
            })),
          });
          
          const text = await generateAiText({
            model: gateway(MODEL),
            responseMimeType: "application/json",
            prompt: `Translate these paper questions from English to natural Sinhala. IMPORTANT: DO NOT translate the JSON keys (e.g., keep "questions", "question", "options", "modelAnswer", "blanks" in English). Only translate the content strings inside. If a value is null or missing, keep it null.
            
Return ONLY valid JSON in this exact shape, with no markdown fences and no commentary:
{"questions":[{"question":"translated question","options":["A","B"],"modelAnswer":"translated answer","blanks":["translated blank"]}]}

Keep the same order. Return the same number of questions in order.

${JSON.stringify({ questions: pqs.map((q) => ({ question: q.question, options: q.options, modelAnswer: q.model_answer, blanks: q.blanks })) })}`,
          });
          
          const translated = parseAiJson(text, Sch).questions;
          await Promise.all(pqs.map((q, i) => {
            const t = translated[i];
            if (!t) return Promise.resolve();
            return context.supabase.from("paper_questions").update({
              question_si: t.question,
              options_si: t.options ?? null,
              model_answer_si: t.modelAnswer ?? null,
              blanks_si: t.blanks ?? null,
            }).eq("id", q.id);
          }));
        }
      }
    }

    return { ok: true };
  });

// === Delete document ===
export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ documentId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("documents").delete().eq("id", data.documentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// === Record quiz attempt ===
export const recordQuizAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      documentId: z.string().uuid(),
      score: z.number().int().min(0),
      total: z.number().int().min(1),
      wrongIds: z.array(z.string()).default([]),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    const accuracy = Math.round((data.score / data.total) * 100);
    const { error } = await context.supabase.from("quiz_attempts").insert({
      user_id: context.userId,
      document_id: data.documentId,
      score: data.score,
      total: data.total,
      accuracy,
      wrong_question_ids: data.wrongIds as unknown as any,
    });
    if (error) throw new Error(error.message);
    return { ok: true, accuracy };
  });

// === Papers (custom practice papers) ===
const PaperGenSchema = z.object({
  questions: z.array(z.object({
    type: z.enum(["mcq", "essay", "fill_blank", "short"]),
    question: z.string(),
    options: z.array(z.string()).optional(),
    correctIndex: z.number().int().optional(),
    modelAnswer: z.string().optional(),
    blanks: z.array(z.string()).optional(),
    marks: z.number().int().min(1).max(20).optional(),
  })),
});

export const generatePaper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      documentId: z.string().uuid(),
      title: z.string().min(1).max(200),
      durationMinutes: z.number().int().min(1).max(360),
      mcqCount: z.number().int().min(0).max(50),
      essayCount: z.number().int().min(0).max(20),
      fillBlankCount: z.number().int().min(0).max(50),
      shortCount: z.number().int().min(0).max(50),
      difficulty: z.enum(["easy", "medium", "hard", "mixed"]).default("mixed"),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    if (data.mcqCount + data.essayCount + data.fillBlankCount + data.shortCount === 0) {
      throw new Error("Add at least one question to the paper.");
    }
    const { data: doc } = await context.supabase
      .from("documents").select("extracted_text, title").eq("id", data.documentId).single();
    if (!doc) throw new Error("Document not found");

    const { getGateway } = await import("./ai-gateway.server");
    const breakdown: string[] = [];
    if (data.mcqCount) breakdown.push(`${data.mcqCount} multiple-choice questions (type: "mcq", with exactly 4 "options" and "correctIndex")`);
    if (data.shortCount) breakdown.push(`${data.shortCount} short-answer questions (type: "short", with a 1-2 sentence "modelAnswer")`);
    if (data.fillBlankCount) breakdown.push(`${data.fillBlankCount} fill-in-the-blank questions (type: "fill_blank", write the question using ___ for each blank, and provide "blanks" as an array of the correct answers in order)`);
    if (data.essayCount) breakdown.push(`${data.essayCount} essay questions (type: "essay", with a detailed "modelAnswer" of 4-8 sentences)`);

    const text = await generateAiText({
      model: getGateway()(MODEL),
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          questions: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                type: { type: "STRING" },
                question: { type: "STRING" },
                options: { type: "ARRAY", items: { type: "STRING" } },
                correctIndex: { type: "INTEGER" },
                modelAnswer: { type: "STRING" },
                blanks: { type: "ARRAY", items: { type: "STRING" } },
                marks: { type: "INTEGER" }
              },
              required: ["type", "question"]
            }
          }
        },
        required: ["questions"]
      },
      prompt: `You are an expert exam-paper writer. Build a high-quality practice exam paper from the material below.

Generate EXACTLY:
${breakdown.join("\n")}

Difficulty: ${data.difficulty}. Cover the most important topics; spread questions across all sections of the material. Assign reasonable "marks" per question (MCQ 1, fill_blank 1-2, short 3-5, essay 8-15).

Return ONLY valid JSON in this exact shape, no markdown fences, no commentary:
{"questions":[{"type":"mcq|essay|fill_blank|short","question":"...","options":["A","B","C","D"],"correctIndex":0,"modelAnswer":"...","blanks":["..."],"marks":1}]}

Order the questions: MCQ first, then fill_blank, then short, then essay.

Material titled "${doc.title}":

${doc.extracted_text}`,
    });
    const parsed = parseAiJson(text, PaperGenSchema);

    const { data: paper, error: pErr } = await context.supabase
      .from("papers").insert({
        user_id: context.userId,
        document_id: data.documentId,
        title: data.title,
        duration_minutes: data.durationMinutes,
      }).select("*").single();
    if (pErr) throw new Error(pErr.message);

    const rows = parsed.questions.map((q, i) => ({
      user_id: context.userId,
      paper_id: paper.id,
      position: i,
      type: q.type,
      question: q.question,
      options: q.options ?? null,
      correct_index: typeof q.correctIndex === "number" ? q.correctIndex : null,
      model_answer: q.modelAnswer ?? null,
      blanks: q.blanks ?? null,
      marks: q.marks ?? 1,
    }));
    const { error: qErr } = await context.supabase.from("paper_questions").insert(rows);
    if (qErr) throw new Error(qErr.message);
    return paper;
  });

export const listPapers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ documentId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("papers").select("*").eq("document_id", data.documentId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows;
  });

export const getPaper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ paperId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { data: paper, error } = await context.supabase
      .from("papers").select("*").eq("id", data.paperId).single();
    if (error || !paper) throw new Error("Paper not found");
    const { data: questions, error: qErr } = await context.supabase
      .from("paper_questions").select("*").eq("paper_id", data.paperId).order("position");
    if (qErr) throw new Error(qErr.message);
    return { paper, questions: questions ?? [] };
  });

export const deletePaper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ paperId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("papers").delete().eq("id", data.paperId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// === Multi-document paper ===
export const generateMultiPaper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      documentIds: z.array(z.string().uuid()).min(1).max(10),
      title: z.string().min(1).max(200),
      durationMinutes: z.number().int().min(1).max(360),
      mcqCount: z.number().int().min(0).max(50),
      essayCount: z.number().int().min(0).max(20),
      fillBlankCount: z.number().int().min(0).max(50),
      shortCount: z.number().int().min(0).max(50),
      difficulty: z.enum(["easy", "medium", "hard", "mixed"]).default("mixed"),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    if (data.mcqCount + data.essayCount + data.fillBlankCount + data.shortCount === 0) {
      throw new Error("Add at least one question to the paper.");
    }
    const { data: docs, error: dErr } = await context.supabase
      .from("documents")
      .select("id, title, extracted_text")
      .in("id", data.documentIds);
    if (dErr) throw new Error(dErr.message);
    if (!docs || docs.length === 0) throw new Error("No documents found");

    const perDocBudget = Math.floor(MAX_TEXT / docs.length);
    const combined = docs
      .map((d) => `=== SOURCE: ${d.title} ===\n${(d.extracted_text ?? "").slice(0, perDocBudget)}`)
      .join("\n\n");

    const { getGateway } = await import("./ai-gateway.server");
    const breakdown: string[] = [];
    if (data.mcqCount) breakdown.push(`${data.mcqCount} multiple-choice questions (type: "mcq", with exactly 4 "options" and "correctIndex")`);
    if (data.shortCount) breakdown.push(`${data.shortCount} short-answer questions (type: "short", with a 1-2 sentence "modelAnswer")`);
    if (data.fillBlankCount) breakdown.push(`${data.fillBlankCount} fill-in-the-blank questions (type: "fill_blank", write the question using ___ for each blank, and provide "blanks" as an array of the correct answers in order)`);
    if (data.essayCount) breakdown.push(`${data.essayCount} essay questions (type: "essay", with a detailed "modelAnswer" of 4-8 sentences)`);

    const text = await generateAiText({
      model: getGateway()(MODEL),
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          questions: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                type: { type: "STRING" },
                question: { type: "STRING" },
                options: { type: "ARRAY", items: { type: "STRING" } },
                correctIndex: { type: "INTEGER" },
                modelAnswer: { type: "STRING" },
                blanks: { type: "ARRAY", items: { type: "STRING" } },
                marks: { type: "INTEGER" }
              },
              required: ["type", "question"]
            }
          }
        },
        required: ["questions"]
      },
      prompt: `You are an expert exam-paper writer. Build a high-quality practice exam paper combining the ${docs.length} source documents below.

Generate EXACTLY:
${breakdown.join("\n")}

Difficulty: ${data.difficulty}. Spread questions across ALL provided sources so each document is represented. Assign reasonable "marks" (MCQ 1, fill_blank 1-2, short 3-5, essay 8-15).

Return ONLY valid JSON in this exact shape, no markdown fences, no commentary:
{"questions":[{"type":"mcq|essay|fill_blank|short","question":"...","options":["A","B","C","D"],"correctIndex":0,"modelAnswer":"...","blanks":["..."],"marks":1}]}

Order: MCQ first, then fill_blank, then short, then essay.

${combined}`,
    });
    const parsed = parseAiJson(text, PaperGenSchema);

    const { data: paper, error: pErr } = await context.supabase
      .from("papers").insert({
        user_id: context.userId,
        document_id: null,
        source_document_ids: data.documentIds,
        title: data.title,
        duration_minutes: data.durationMinutes,
      }).select("*").single();
    if (pErr) throw new Error(pErr.message);

    const rows = parsed.questions.map((q, i) => ({
      user_id: context.userId,
      paper_id: paper.id,
      position: i,
      type: q.type,
      question: q.question,
      options: q.options ?? null,
      correct_index: typeof q.correctIndex === "number" ? q.correctIndex : null,
      model_answer: q.modelAnswer ?? null,
      blanks: q.blanks ?? null,
      marks: q.marks ?? 1,
    }));
    const { error: qErr } = await context.supabase.from("paper_questions").insert(rows);
    if (qErr) throw new Error(qErr.message);
    return paper;
  });

export const listAllPapers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: papers, error } = await context.supabase
      .from("papers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return papers ?? [];
  });

// === Skill stats for dashboard ===
export const getSkillStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [docsR, attemptsR] = await Promise.all([
      context.supabase.from("documents").select("id", { count: "exact", head: true }),
      context.supabase
        .from("quiz_attempts")
        .select("score,total,accuracy,created_at,document_id,documents(title)")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    const attempts = (attemptsR.data ?? []) as Array<{
      score: number; total: number; accuracy: number; created_at: string;
      document_id: string; documents: { title: string } | null;
    }>;
    const totalAttempts = attempts.length;
    const avgAccuracy = totalAttempts
      ? Math.round(attempts.reduce((s, a) => s + Number(a.accuracy), 0) / totalAttempts)
      : 0;
    const best = attempts.reduce<typeof attempts[number] | null>(
      (b, a) => (b === null || Number(a.accuracy) > Number(b.accuracy) ? a : b),
      null,
    );
    // Level: 1 per 5 correct answers across all attempts
    const correctTotal = attempts.reduce((s, a) => s + a.score, 0);
    const level = Math.max(1, Math.floor(correctTotal / 5) + 1);
    const xpInLevel = correctTotal % 5;
    // Streak: consecutive days with at least one attempt, ending today or yesterday
    const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);
    const days = new Set(attempts.map((a) => dayKey(a.created_at)));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (days.has(key)) streak++;
      else if (i > 0) break;
    }
    // Achievements
    const perfect = attempts.filter((a) => Number(a.accuracy) === 100).length;
    const achievements = [
      { id: "first", label: "First quiz", earned: totalAttempts >= 1, icon: "🎯" },
      { id: "five", label: "5 quizzes", earned: totalAttempts >= 5, icon: "🖐️" },
      { id: "perfect", label: "Perfect score", earned: perfect >= 1, icon: "💯" },
      { id: "streak3", label: "3-day streak", earned: streak >= 3, icon: "🔥" },
      { id: "scholar", label: "Scholar Lv. 5", earned: level >= 5, icon: "🎓" },
      { id: "marathon", label: "10 quizzes", earned: totalAttempts >= 10, icon: "🏅" },
    ];
    return {
      totalDocs: docsR.count ?? 0,
      totalAttempts,
      avgAccuracy,
      bestTitle: best?.documents?.title ?? null,
      bestAccuracy: best ? Math.round(Number(best.accuracy)) : 0,
      level,
      xpInLevel,
      xpToNext: 5,
      streak,
      achievements,
      recent: attempts.slice(0, 5).map((a) => ({
        title: a.documents?.title ?? "Untitled",
        accuracy: Math.round(Number(a.accuracy)),
        score: a.score,
        total: a.total,
        at: a.created_at,
      })),
    };
  });

// === Toggle favorite ===
export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ documentId: z.string().uuid(), value: z.boolean() }).parse)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("documents").update({ is_favorite: data.value }).eq("id", data.documentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// === Update tags ===
export const updateTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ documentId: z.string().uuid(), tags: z.array(z.string().max(30)).max(10) }).parse)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("documents").update({ tags: data.tags }).eq("id", data.documentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// === Chat with document ===
export const chatWithDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      documentId: z.string().uuid(),
      message: z.string().min(1).max(2000),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    const { data: doc } = await context.supabase
      .from("documents").select("title, extracted_text").eq("id", data.documentId).single();
    if (!doc) throw new Error("Document not found");

    // Save user message
    await context.supabase.from("chat_messages").insert({
      user_id: context.userId, document_id: data.documentId, role: "user", content: data.message,
    });

    // Recent history (last 10)
    const { data: history } = await context.supabase
      .from("chat_messages")
      .select("role, content")
      .eq("document_id", data.documentId)
      .order("created_at", { ascending: false })
      .limit(10);
    const recent = (history ?? []).reverse();

    const { getGateway } = await import("./ai-gateway.server");
    const reply = await generateAiText({
      model: getGateway()(MODEL),
      system: `You are a helpful study tutor answering questions ONLY about this material titled "${doc.title}". If the answer is not in the material, say so briefly. Be concise, use markdown, and cite the relevant section when possible.\n\nMATERIAL:\n${doc.extracted_text}`,
      messages: recent.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    });

    const { data: saved } = await context.supabase.from("chat_messages").insert({
      user_id: context.userId, document_id: data.documentId, role: "assistant", content: reply,
    }).select("*").single();

    return { reply, id: saved?.id };
  });

// === Get chat history ===
export const getChatHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ documentId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("document_id", data.documentId)
      .order("created_at", { ascending: true });
    return rows ?? [];
  });

// === Weak topics (most-missed questions) ===
export const getWeakTopics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ documentId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { data: attempts } = await context.supabase
      .from("quiz_attempts")
      .select("wrong_question_ids")
      .eq("document_id", data.documentId);
    const counts = new Map<string, number>();
    for (const a of attempts ?? []) {
      const ids = (a.wrong_question_ids as unknown as string[]) ?? [];
      for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    if (counts.size === 0) return [];
    const ids = Array.from(counts.keys());
    const { data: qs } = await context.supabase
      .from("quiz_questions")
      .select("id, question_en, explanation_en, options_en, correct_index")
      .in("id", ids);
    return (qs ?? [])
      .map((q) => ({ ...q, misses: counts.get(q.id) ?? 0 }))
      .sort((a, b) => b.misses - a.misses);
  });