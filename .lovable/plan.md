
# Bilingual AI Study Assistant — Build Plan

A modern dark-mode study app where students upload lecture material and get AI-generated summaries, flashcards, and quizzes — with one-tap Sinhala translation.

## 1. Backend (Lovable Cloud)

Enable Lovable Cloud for auth, database, file storage, and server functions.

### Auth
- Email/password + Google sign-in (via Lovable broker)
- Managed `_authenticated` route gate; `/auth` page for sign-in/up
- `profiles` table auto-created via trigger on signup (id, display_name, created_at)

### Database tables
- `documents` — id, user_id, title, source_type (pdf/docx/pptx/image/text), storage_path, extracted_text, created_at
- `summaries` — id, document_id, user_id, content_en, content_si (nullable), created_at
- `flashcard_sets` — id, document_id, user_id, title, created_at
- `flashcards` — id, set_id, front_en, back_en, front_si, back_si
- `quizzes` — id, document_id, user_id, title, created_at
- `quiz_questions` — id, quiz_id, question_en, question_si, options_en (jsonb), options_si (jsonb), correct_index
- `quiz_attempts` — id, quiz_id, user_id, score, total, answers (jsonb), completed_at

RLS: all rows scoped to `auth.uid()`. Proper GRANTs to `authenticated` + `service_role`.

### Storage
- Private bucket `study-uploads` — RLS so users access only their own folder `{user_id}/...`

## 2. AI (Lovable AI Gateway)

Server functions using AI SDK + `google/gemini-3-flash-preview`:
- `extractText` — parse PDF (pdf-parse-ish via pure JS), DOCX (mammoth), PPTX (text extraction), images (Gemini vision OCR), or accept pasted text
- `generateSummary` — concise bullet summary (structured output via Zod)
- `generateFlashcards` — 10–20 Q&A cards (structured)
- `generateQuiz` — 5–10 MCQs with 4 options + correct index (structured)
- `translateToSinhala` — translate any generated content; cached per row so it's generated on demand and stored

All AI calls go through `createServerFn` handlers; `LOVABLE_API_KEY` stays server-side.

## 3. Routes (TanStack Start)

Public:
- `/` — landing page (hero, features, CTA)
- `/auth` — sign in / sign up (email/password + Google)

Authenticated (`src/routes/_authenticated/`):
- `/dashboard` — list of uploaded documents, "New study set" CTA
- `/upload` — drop zone (PDF/DOCX/PPTX/image) + paste-text tab; on submit → extract → create document
- `/document/$id` — tabs: Summary | Flashcards | Quiz, with EN/සිංහල language toggle in header
  - Flashcards tab: flip cards, keyboard nav
  - Quiz tab: take quiz, see score, review answers

## 4. UI / Design

Modern dark study mode:
- Background: deep slate/near-black with subtle gradient
- Accent: a single focused color (e.g. warm amber or cool indigo) — picked during build
- Typography: distinctive display font for headings (e.g. Fraunces or Space Grotesk) + Inter for body
- Generous whitespace, soft cards with subtle borders, no visual clutter
- Smooth motion on tab/card transitions (framer-motion)
- Language toggle is a prominent pill switch (EN / සිංහල) — Sinhala renders with appropriate font fallback (Noto Sans Sinhala)
- All colors as semantic tokens in `src/styles.css`

## 5. Implementation order

1. Enable Lovable Cloud + configure Google auth
2. Migrations: tables, RLS, GRANTs, storage bucket + policies, profile trigger
3. Design system: tokens, fonts, base layout shell
4. Auth pages + `_authenticated` gate
5. Landing page
6. Upload flow + text extraction server fns
7. Dashboard + document detail shell
8. AI generation server fns (summary, flashcards, quiz)
9. Sinhala translation (on-demand, cached)
10. Flashcard study UI + quiz-taking UI
11. Polish, empty states, loading skeletons, error handling

## Technical notes

- PDF/DOCX/PPTX parsing runs in server functions; large files capped (e.g. 10MB)
- All AI structured output uses Zod schemas via AI SDK `Output.object`
- Sinhala translations stored once generated to avoid repeated AI calls
- Toast notifications via existing sonner setup
- Loading states with skeletons; error boundaries on every route with loaders

Ready to build on approval.
