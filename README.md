# 📚 LectureLens

> **Bilingual AI study assistant** — Turn lecture slides and notes into summaries, flashcards, quizzes, and exam papers in English and Sinhala.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://reactjs.org/)
[![TanStack Start](https://img.shields.io/badge/TanStack_Start-1.x-FF4154)](https://tanstack.com/start)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)

---

## ✨ Features

### 📄 Document Ingestion
- **Upload files** — PDF, DOCX, or images (max 10 MB)
- **Paste text** — Directly paste lecture notes or any text content
- Automatic text extraction and indexing on upload

---

### 🧠 AI-Powered Study Tools

Each study set gets its own AI-generated content via tabbed views:

| Tab | What it does |
|-----|-------------|
| **Summary** | Distils the document into clear, memorable key concepts |
| **Flashcards** | Auto-generated question/answer cards for active recall |
| **Quiz** | Interactive MCQ quiz with immediate feedback and scoring |
| **Papers** | Custom exam papers (see below) |
| **Chat** | Conversational Q&A grounded in the document |

---

### 🌐 Bilingual Support (EN / සිංහල)
- One-tap toggle to switch **all content** between English and Sinhala
- AI-powered translation to native **සිංහල script**
- Language preference persists per document session

---

### 📝 Exam Paper Builder
- **Custom exam papers** — choose counts for MCQ, fill-in-the-blank, short answer, and essay questions
- **Timed paper mode** — set your own duration; paper auto-submits and grades when time expires
- **Mixed question types** — practice all formats with model answers provided after submission
- **Per-document papers** — generate papers directly from any single study set

---

### 📂 Multi-Document Papers
- **Combine multiple study sets** into a single mixed exam paper
- Select any number of documents as source material
- Run the combined paper with the same timed mode and grading features

---

### 💬 Chat with Your Document
- Ask questions in natural language and get **cited answers** from your own material
- Full **chat history** is preserved per document
- Powered by an AI model grounded exclusively in your uploaded content

---

### 🏆 Gamification & Progress Tracking

| Metric | Description |
|--------|-------------|
| **Scholar Level** | XP-based levelling system — gain XP by completing quizzes |
| **Average Accuracy** | Running accuracy across all quiz attempts |
| **Best Score** | Highest quiz score with the document title |
| **Daily Streak** | Consecutive active days; auto-resets if you miss a day 🔥 |
| **Achievements** | Unlockable badges for milestones (perfect scores, scholar ranks, etc.) |

---

### ⏱️ Pomodoro Timer
- Built-in **25 / 5 Pomodoro** focus timer on every study set page
- Play / Pause controls with visual countdown
- Keeps deep-work sessions on rails without leaving the app

---

### 🗂️ Organisation & Discovery
- **Search** study sets by title in real-time
- **Favorites** — star any set and filter the dashboard to favourites only
- **Tags** — tag-based organisation shown on each card
- **Source type** badge (PDF / text / image) on every card

---

### 📤 Export & Share
- Download summaries as **Markdown** files
- Share individual study sets

---

### 🌙 Light / Dark Mode
- System-aware theme with a manual toggle
- Smooth transitions across the entire UI

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | TanStack Start (React 19 + Vite 7) |
| Routing | TanStack Router (file-based) |
| Styling | Tailwind CSS v4 + Radix UI primitives |
| Animations | Framer Motion |
| Backend / DB | Supabase (Postgres + Auth + Storage) |
| AI | Vercel AI SDK + OpenAI-compatible provider |
| File parsing | Mammoth (DOCX), server-side PDF extraction |
| State | React local state + TanStack Query |
| Notifications | Sonner |
| Language | TypeScript 5 |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** >= 18 or **Bun** (recommended — a `bun.lock` is provided)
- A Supabase project
- An AI API key (OpenAI-compatible endpoint)

### 1 · Clone & install

```bash
git clone <repo-url>
cd LectureLence

# with npm
npm install

# or with bun (faster)
bun install
```

### 2 · Environment variables

Create a `.env` file in the project root:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server only) |
| `AI_API_KEY` | API key for your AI provider |
| `AI_BASE_URL` | Base URL for the OpenAI-compatible AI endpoint |

### 3 · Run locally

```bash
npm run dev
# or
bun dev
```

Open http://localhost:3000

### 4 · Build for production

```bash
npm run build
npm run preview
```

---

## 📁 Project Structure

```
src/
├── routes/
│   ├── __root.tsx              # App shell (nav, theme, auth guard)
│   ├── index.tsx               # Public landing page
│   ├── auth.tsx                # Sign in / Sign up page
│   └── _authenticated/
│       ├── route.tsx           # Auth guard layout
│       ├── dashboard.tsx       # Study set list + stats
│       ├── upload.tsx          # New study set (file or text)
│       ├── document.$id.tsx    # Study set detail (tabs)
│       └── papers.tsx          # Multi-document paper builder
├── components/
│   ├── theme-toggle.tsx        # Dark/light mode switch
│   └── ui/                     # Radix-based UI primitives
├── lib/
│   └── study.functions.ts      # Server functions (AI, DB, file parsing)
├── integrations/
│   └── supabase/               # Supabase client + type helpers
└── styles.css                  # Global Tailwind theme tokens
```

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server with HMR |
| `npm run build` | Production build |
| `npm run build:dev` | Development build (for debugging) |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Format all files with Prettier |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push and open a Pull Request

Please run `npm run lint` and `npm run format` before submitting.

---

## 📄 License

MIT — see LICENSE for details.
