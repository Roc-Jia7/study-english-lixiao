# Word Star Academy · 单词星球 🚀

A gamified English vocabulary app for kids (ages 4–12). The Ebbinghaus
forgetting curve becomes a pet-raising game: learning words feeds an egg
that hatches into a dragon, and words due for review appear as hungry
monsters to feed.

## Run

```bash
npm install
npm run fetch-audio   # optional: download real human pronunciations (24 mp3s)
npm run dev           # http://localhost:3000
```

Parent gate accepts any 8+ digit phone number (demo).

## How learning works

- **Discovery Packs** — 6 new words per category, one card at a time.
- **Verification quizzes** — every 3rd card is a hear-and-pick or
  see-and-pick quiz; failing one genuinely drops the word's memory stage
  (self-assessment alone is easy for kids to game).
- **Spaced repetition** — 9 checkpoints from 5 minutes to 15 days
  (`lib/spaced-repetition.ts`). Due words surface as monsters; the child
  never sees timers or numbers.
- **Streak & sticker wall** — each learning day lights a planet on the
  14-day Star Path; consecutive days grow a flame streak.
- **Pet evolution** — XP from every answer: 🥚 → 🐣 → 🐲 → 🐉, with
  confetti and a synthesized cheer at the end of every batch.

## Audio

Word pronunciations prefer pre-downloaded human recordings in
`public/audio/words/` (fetched from dictionaryapi.dev / Wiktionary via
`npm run fetch-audio`) and fall back to the browser's Web Speech API.
Sentences and cheers always use Web Speech.

## Stack

Next.js 15 (App Router) · React 19 · Tailwind CSS v4 · Framer Motion ·
Zustand (persisted to localStorage) · canvas-confetti · Lucide icons.
