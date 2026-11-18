# Networks & Systems Practice

A Svelte practice quiz built from the Review Quiz 3A–3F question bank (TCP/IP,
APUE ch. 11.6 & 16, cloud computing, and Python).

Live site: **https://yahya-azeem.github.io/networks-systems-practice/**

## Features

- 58 multiple-choice questions, deduplicated across the six quiz sets
- Instant feedback: correct answer highlighted, wrong pick marked, key shown
- Filter by set (3A–3F) or practice all questions
- Shuffle question order and answer order
- Back / next navigation and a progress bar
- Results screen with score ring and a review of every missed question
- “Retry missed questions” starts a round with only the ones you got wrong
- Keyboard shortcuts: `1`–`9` to answer, `←` / `→` to navigate
- Light and dark themes (follows the system preference by default)
- Progress and theme persist in `localStorage`

## Question bank

`data/question-bank.txt` is the source export. `scripts/compile-bank.mjs` parses
it into `src/lib/questions.js`:

```bash
npm run compile
```

The compiler:

- splits the export into its six quiz sets
- extracts each prompt, options, and keyed answer
- merges questions that appear in more than one set (11 duplicates were merged)
- drops one prompt that depends on a diagram missing from the text export
- assigns topic tags from the `[TCPIP-UNP]`, `[APUE11.6]`, `[Cloud]`, etc. prefixes

Answers reflect the posted quiz key.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm run preview  # preview the production build
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site
and publishes `dist/` to GitHub Pages. Vite uses a relative `base`, so the build
works under the `/networks-systems-practice/` project path without extra config.
