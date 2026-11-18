<script>
  import { onMount } from 'svelte';
  import { questions, sets } from './lib/questions.js';

  const STORAGE_KEY = 'networks-systems-practice:v1';
  const THEME_KEY = 'networks-systems-practice:theme';
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const byId = new Map(questions.map((question) => [question.id, question]));

  function shuffled(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function makeEntry(question) {
    return {
      id: question.id,
      q: question,
      order: shuffled(question.options.map((_, index) => index)),
    };
  }

  function buildDeck(list, withShuffle) {
    const entries = list.map(makeEntry);
    return withShuffle ? shuffled(entries) : entries;
  }

  function poolFor(setId) {
    return setId === 'all' ? questions : questions.filter((question) => question.sets.includes(setId));
  }

  let filter = $state('all');
  let shuffle = $state(false);
  let deck = $state(buildDeck(questions, false));
  let index = $state(0);
  let picks = $state({});
  let finished = $state(false);
  let theme = $state('light');
  let ready = $state(false);

  const current = $derived(deck[index]);
  const selected = $derived(current ? picks[current.id] : undefined);
  const answered = $derived(deck.filter((entry) => picks[entry.id] !== undefined).length);
  const correct = $derived(deck.filter((entry) => picks[entry.id] === entry.q.answer).length);
  const missed = $derived(deck.filter((entry) => picks[entry.id] !== undefined && picks[entry.id] !== entry.q.answer));
  const progress = $derived(deck.length ? Math.round((answered / deck.length) * 100) : 0);
  const score = $derived(deck.length ? Math.round((correct / deck.length) * 100) : 0);
  const selecting = $derived(selected !== undefined);
  const isLast = $derived(index === deck.length - 1);

  function startRound(list) {
    deck = buildDeck(list, shuffle);
    index = 0;
    picks = {};
    finished = false;
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function applyFilter(setId) {
    if (setId === filter) return;
    filter = setId;
    startRound(poolFor(setId));
  }

  function toggleShuffle() {
    shuffle = !shuffle;
    startRound(poolFor(filter));
  }

  function restart() {
    startRound(poolFor(filter));
  }

  function choose(originalIndex) {
    if (!current || picks[current.id] !== undefined) return;
    picks[current.id] = originalIndex;
  }

  function advance() {
    if (!selecting) return;
    if (isLast) {
      finished = true;
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      index += 1;
    }
  }

  function back() {
    if (index > 0) index -= 1;
  }

  function retryMissed() {
    const list = missed.map((entry) => entry.q);
    if (list.length) startRound(list);
  }

  function newRound() {
    startRound(poolFor(filter));
  }

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
  }

  function setLabel(setId) {
    const set = sets.find((item) => item.id === setId);
    return set ? set.name : setId;
  }

  function onKeydown(event) {
    if (finished) return;
    const tag = event.target instanceof HTMLElement ? event.target.tagName : '';
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;

    if (/^[1-9]$/.test(event.key) && current) {
      const position = Number(event.key) - 1;
      if (position < current.order.length) {
        event.preventDefault();
        choose(current.order[position]);
      }
    } else if (event.key === 'ArrowRight') {
      if (selecting) {
        event.preventDefault();
        advance();
      }
    } else if (event.key === 'ArrowLeft') {
      if (index > 0) {
        event.preventDefault();
        back();
      }
    }
  }

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (!saved || !Array.isArray(saved.deck) || saved.deck.length === 0) return;

      const rebuilt = saved.deck
        .map((entry) => {
          const question = byId.get(entry.id);
          if (!question) return null;
          const order =
            Array.isArray(entry.order) && entry.order.length === question.options.length
              ? entry.order
              : shuffled(question.options.map((_, position) => position));
          return { id: question.id, q: question, order };
        })
        .filter(Boolean);

      if (!rebuilt.length) return;

      deck = rebuilt;
      picks = saved.picks && typeof saved.picks === 'object' ? saved.picks : {};
      index = Math.min(Math.max(Number(saved.index) || 0, 0), rebuilt.length - 1);
      finished = Boolean(saved.finished);
      if (poolFor(saved.filter).length) filter = saved.filter;
      shuffle = Boolean(saved.shuffle);
    } catch {
      // Corrupt or unavailable storage: start fresh.
    }
  }

  onMount(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      theme = savedTheme ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } catch {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    restore();
    ready = true;
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  });

  $effect(() => {
    document.documentElement.dataset.theme = theme;
    if (ready) {
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch {
        // Ignore storage failures.
      }
    }
  });

  $effect(() => {
    if (!ready) return;
    const snapshot = {
      filter,
      shuffle,
      index,
      finished,
      picks,
      deck: deck.map((entry) => ({ id: entry.id, order: entry.order })),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore storage failures.
    }
  });
</script>

<header class="hero">
  <div class="wrap hero-inner">
    <div>
      <p class="eyebrow">CS review · Fall 2026</p>
      <h1>Networks &amp; Systems Practice</h1>
      <p class="sub">
        {questions.length} multiple-choice questions · Instant feedback · Retry missed questions · Shuffle practice
      </p>
    </div>
    <button
      class="theme-toggle"
      type="button"
      onclick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {#if theme === 'dark'}
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" /></svg>
      {:else}
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.1A8.5 8.5 0 1 1 9.9 3.5a7 7 0 0 0 10.6 10.6Z" /></svg>
      {/if}
    </button>
  </div>
</header>

<main class="wrap">
  <section class="toolbar card" aria-label="Practice controls">
    <div class="mode">
      <span class="mode-title">{finished ? 'Round complete' : 'Practice mode'}</span>
      <span class="stats">
        {#if finished}
          {correct} of {deck.length} correct
        {:else}
          Question {Math.min(index + 1, deck.length)} of {deck.length} · {answered} answered · {correct} correct
        {/if}
      </span>
      <div class="progress" aria-hidden="true"><div style={`width:${progress}%`}></div></div>
    </div>
    <div class="controls">
      <button
        class="secondary"
        type="button"
        class:on={shuffle}
        aria-pressed={shuffle}
        onclick={toggleShuffle}
        title="Shuffle question order for a new round"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></svg>
        Shuffle {shuffle ? 'on' : 'off'}
      </button>
      <button class="secondary" type="button" onclick={restart}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" /></svg>
        Restart
      </button>
    </div>
  </section>

  <nav class="sets" aria-label="Question sets">
    <button
      type="button"
      class:active={filter === 'all'}
      aria-pressed={filter === 'all'}
      onclick={() => applyFilter('all')}
    >
      All <span>{questions.length}</span>
    </button>
    {#each sets as set}
      <button
        type="button"
        class:active={filter === set.id}
        aria-pressed={filter === set.id}
        title={set.name}
        onclick={() => applyFilter(set.id)}
      >
        {set.id} <span>{set.count}</span>
      </button>
    {/each}
    <span class="filter-name">{filter === 'all' ? 'Every set' : setLabel(filter)}</span>
  </nav>

  {#if finished}
    <section class="results card" aria-live="polite">
      <div class="results-top">
        <div class="ring" style={`--pct:${score * 3.6}deg`}>
          <div class="ring-inner">
            <strong>{score}%</strong>
            <span>{correct} / {deck.length}</span>
          </div>
        </div>
        <div>
          <h2>Practice results</h2>
          <p class="result-line">
            {#if score === 100}
              Perfect round. Every answer matched the key.
            {:else if score >= 80}
              Strong round — {missed.length} question{missed.length === 1 ? '' : 's'} to review.
            {:else}
              Keep going — retry the {missed.length} missed question{missed.length === 1 ? '' : 's'} and run the set again.
            {/if}
          </p>
          <p class="small">Round: {filter === 'all' ? 'all sets' : setLabel(filter)}{shuffle ? ' · shuffled' : ''}</p>
        </div>
      </div>

      {#if missed.length}
        <h3>Missed questions</h3>
        <div class="review">
          {#each missed as entry}
            {@const chosen = picks[entry.id]}
            <article class="review-row">
              <div class="review-meta">
                <span class="tag">{entry.q.topic}</span>
                <span class="tag ghost">{entry.q.sets.join(' · ')}</span>
              </div>
              <p class="review-stem">{entry.q.stem}</p>
              <p class="wrong"><span>Your answer</span> {String.fromCharCode(65 + entry.order.indexOf(chosen))}. {entry.q.options[chosen]}</p>
              <p class="right"><span>Correct answer</span> {String.fromCharCode(65 + entry.order.indexOf(entry.q.answer))}. {entry.q.options[entry.q.answer]}</p>
            </article>
          {/each}
        </div>
      {:else}
        <p class="perfect">No missed questions in this round.</p>
      {/if}

      <div class="actions">
        <button type="button" onclick={retryMissed} disabled={missed.length === 0}>
          Retry missed questions {#if missed.length}<span class="count">{missed.length}</span>{/if}
        </button>
        <button class="secondary" type="button" onclick={newRound}>Start a new round</button>
      </div>
    </section>
  {:else if current}
    {#key current.id}
      <section class="question-card card" aria-labelledby="question-stem">
        <div class="qmeta">
          <div class="tags">
            <span class="tag">{current.q.topic}</span>
            {#each current.q.sets as set}
              <span class="tag ghost" title={setLabel(set)}>{set}</span>
            {/each}
          </div>
          <span class="counter">{index + 1} / {deck.length}</span>
        </div>

        <h2 id="question-stem" class="stem">{current.q.stem}</h2>

        <div class="choices">
          {#each current.order as optionIndex, position}
            {@const picked = selected === optionIndex}
            {@const right = optionIndex === current.q.answer}
            <button
              type="button"
              class="choice"
              class:correct={selecting && right}
              class:incorrect={selecting && picked && !right}
              class:faded={selecting && !right && !picked}
              disabled={selecting}
              onclick={() => choose(optionIndex)}
            >
              <span class="letter">{LETTERS[position]}</span>
              <span class="choice-text">{current.q.options[optionIndex]}</span>
              {#if selecting && right}<span class="mark ok" aria-label="Correct answer">✓</span>{/if}
              {#if selecting && picked && !right}<span class="mark no" aria-label="Your incorrect answer">✕</span>{/if}
            </button>
          {/each}
        </div>

        <div class="feedback-slot" aria-live="polite">
          {#if selecting}
            {#if selected === current.q.answer}
              <div class="feedback good">
                <strong>Correct.</strong> That is the keyed answer.
              </div>
            {:else}
              <div class="feedback bad">
                <strong>Not quite.</strong> The correct answer is
                {String.fromCharCode(65 + current.order.indexOf(current.q.answer))}.
                {current.q.options[current.q.answer]}
              </div>
            {/if}
          {/if}
        </div>

        <div class="actions">
          <button class="secondary" type="button" onclick={back} disabled={index === 0}>Back</button>
          <button type="button" onclick={advance} disabled={!selecting}>
            {isLast ? 'See results' : 'Next question'}
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </div>
      </section>
    {/key}
  {/if}

  <p class="tip">
    Tip: choose an answer for instant feedback. Press <kbd>1</kbd>–<kbd>9</kbd> to answer and
    <kbd>←</kbd>/<kbd>→</kbd> to move between questions. Progress is saved in this browser.
  </p>
  <p class="tip footer-note">
    Compiled from Review Quizzes 3A–3F. Answers reflect the posted key; repeated questions across sets were merged.
  </p>
</main>
