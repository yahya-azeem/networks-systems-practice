# Networks & Systems Practice

A Svelte practice quiz built from the Review Quiz 3A–3F question bank (TCP/IP,
APUE ch. 11.6 & 16, cloud computing, and Python), plus an additional bank of
prior-student Test 3 questions.

Live site: **https://yahya-azeem.github.io/networks-systems-practice/**

## Features

- 112 multiple-choice questions (58 from the review quizzes + 54 additional)
- Additional questions are marked with an **Additional** badge and included by default
- Instant feedback: correct answer highlighted, wrong pick marked, key shown
- Filter by set (3A–3F, Extra) or practice all questions
- Shuffle question order and answer order
- Back / next navigation and a progress bar
- Results screen with score ring and a review of every missed question
- “Retry missed questions” starts a round with only the ones you got wrong
- Keyboard shortcuts: `1`–`9` to answer, `←` / `→` to navigate
- Light and dark themes (follows the system preference by default)
- Progress and theme persist in `localStorage`

## Question bank

`data/question-bank.txt` is the original review-quiz export. `data/additional-questions.json`
holds the curated prior-student Test 3 bank. `scripts/compile-bank.mjs` merges
both into `src/lib/questions.js`:

```bash
npm run compile
```

The compiler:

- splits the review export into its six quiz sets
- extracts each prompt, options, and keyed answer
- merges questions that appear in more than one review set (11 duplicates were merged)
- drops one review prompt that depends on a diagram missing from the text export
- appends the additional bank, marked `additional: true` and grouped under `Extra`
- assigns topic tags from the `[TCPIP-UNP]`, `[APUE11.6]`, `[Cloud]`, etc. prefixes

### Additional bank notes

The additional bank started as 80 Quizlet cards. 54 were added. The other 26 were
left out deliberately:

- 15 duplicate a question already in the review bank
- 4 duplicate another card inside the additional bank
- 1 is a near-duplicate of another card
- 3 have ambiguous or incorrect keys:
  - the `pthread_create` card also accepts `&PrintHello` (both forms compile)
  - the “IPv4 is becoming obsolete” card is debatable
  - the “poll/select only applies in blocking mode” card marks a true statement as false
- 3 are incomplete: one has a single option, one has no key, and card 80 was not in the export

Answers were checked against *Advanced Programming in the UNIX Environment*
(3rd ed., ch. 11 and 16) where applicable. The Sobell book also covers `ssh` and
`finger`; the remaining basic network-command cards are standard Unix facts.


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
