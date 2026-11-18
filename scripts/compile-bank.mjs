#!/usr/bin/env node
/**
 * Turns the exported Canvas quiz text (data/question-bank.txt) into
 * src/lib/questions.js.
 *
 * The export is a flat text file. Every quiz starts with "Review Quiz <set> - ...",
 * every question starts with "Results for question N.", options are marked with
 * ", Not Selected", and the key follows "Correct answer:".
 *
 * Run with: npm run compile
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'data', 'question-bank.txt');
const outPath = path.join(root, 'src', 'lib', 'questions.js');

const SET_NAMES = {
  '3A': 'TCP/IP commands & socket programming',
  '3B': 'APUE ch. 11.6 — IPC',
  '3C': 'APUE ch. 16 — sockets',
  '3D': 'Cloud computing',
  '3E': 'Python (Sobell ch. 12)',
  '3F': 'TCP/IP & network commands',
};

const lines = fs.readFileSync(sourcePath, 'utf8').split(/\r?\n/);
const isOptionMarker = /^,\s*Not Selected$/i;
const isCorrectMarker = /^correct answer:?$/i;
const isIncorrectMarker = /^incorrect answer:?$/i;
const isQuestionStart = /^Results for question (\d+)\.$/;
const normalize = (text) => text.replace(/\s+/g, ' ').trim();

/** Split the export into one block per quiz. */
function readSections() {
  const sections = [];
  let section = null;
  for (const line of lines) {
    if (line.startsWith('Review Quiz ')) {
      section = { title: line.trim(), lines: [] };
      sections.push(section);
    } else if (section) {
      section.lines.push(line);
    }
  }
  return sections;
}

/** Parse one quiz block into question objects. */
function parseSection(section) {
  const titleMatch = section.title.match(/^Review Quiz (\w+)\s*-\s*(.*)$/);
  const set = titleMatch ? titleMatch[1] : section.title;
  const starts = [];
  section.lines.forEach((line, i) => {
    if (isQuestionStart.test(line.trim())) starts.push(i);
  });

  const questions = [];

  starts.forEach((start, position) => {
    const end = position + 1 < starts.length ? starts[position + 1] : section.lines.length;
    const block = section.lines.slice(start, end);
    const mc = block.findIndex((line) => line.trim() === 'Multiple Choice');
    if (mc === -1) throw new Error(`${set} question ${position + 1}: no "Multiple Choice" marker`);

    const body = block.slice(mc + 1);

    // The stem ends where the first option (or answer key marker) begins.
    let optionsStart = body.length;
    body.forEach((line, i) => {
      if (isOptionMarker.test(line.trim())) {
        let j = i - 1;
        while (j >= 0 && !body[j].trim()) j -= 1;
        if (j >= 0) optionsStart = Math.min(optionsStart, j);
      }
      if (isCorrectMarker.test(line.trim()) || isIncorrectMarker.test(line.trim())) {
        optionsStart = Math.min(optionsStart, i);
      }
    });

    const stemLines = body.slice(0, optionsStart);
    while (stemLines.length && !stemLines[0].trim()) stemLines.shift();
    while (stemLines.length && !stemLines[stemLines.length - 1].trim()) stemLines.pop();
    const stem = stemLines.join('\n').replace(/[ \t]+$/gm, '').trim();

    const options = [];
    const seen = new Set();
    let pending = null;
    let expectCorrect = false;
    let correctText = null;

    const flush = () => {
      if (pending === null) return;
      const text = normalize(pending);
      pending = null;
      if (!text || seen.has(text)) return;
      seen.add(text);
      options.push(text);
    };

    for (let i = optionsStart; i < body.length; i += 1) {
      const trimmed = body[i].trim();
      if (!trimmed) {
        flush();
      } else if (isOptionMarker.test(trimmed)) {
        flush();
      } else if (isCorrectMarker.test(trimmed)) {
        flush();
        expectCorrect = true;
      } else if (isIncorrectMarker.test(trimmed)) {
        flush();
      } else if (expectCorrect) {
        flush();
        correctText = normalize(trimmed);
        expectCorrect = false;
      } else {
        flush();
        pending = trimmed;
      }
    }
    flush();

    if (!correctText) throw new Error(`${set} question ${position + 1}: no correct answer found`);
    if (!options.includes(correctText)) options.push(correctText);
    if (options.length < 3) throw new Error(`${set} question ${position + 1}: fewer than 3 options`);

    const topicMatch = stem.match(/^\[([^\]]+)\]\s*/);
    const topic = topicMatch ? topicMatch[1] : 'General';
    const cleanStem = stem.replace(/^\[[^\]]+\]\s*/, '').trim();

    questions.push({
      set,
      topic,
      stem: cleanStem,
      options,
      answer: options.indexOf(correctText),
    });
  });

  return { set, questions };
}

const parsed = readSections().map(parseSection);

// Merge questions that appear in more than one quiz (same prompt + options).
const byStem = new Map();
const merged = [];
for (const { set, questions } of parsed) {
  for (const question of questions) {
    const key = normalize(question.stem).toLowerCase();
    const existing = byStem.get(key);
    if (existing) {
      if (!existing.sets.includes(set)) existing.sets.push(set);
    } else {
      const item = { ...question, sets: [set] };
      byStem.set(key, item);
      merged.push(item);
    }
  }
}

// This prompt relies on a diagram that the text export does not include, so it
// cannot be answered honestly. Everything else in the bank is self-contained.
let skipped = 0;
let counter = 0;
const questions = merged.filter((question) => {
  if (/the following diagram illustrates/i.test(question.stem)) {
    skipped += 1;
    return false;
  }
  counter += 1;
  question.id = `q${counter}`;
  return true;
});

for (const question of questions) {
  if (question.sets.length > 1) {
    question.sets.sort((a, b) => a.localeCompare(b));
  }
}

const sets = [...new Set(questions.flatMap((question) => question.sets))].sort().map((id) => ({
  id,
  name: SET_NAMES[id] ?? id,
  count: questions.filter((question) => question.sets.includes(id)).length,
}));

const topics = [...new Set(questions.map((question) => question.topic))].sort();

const output = `// Generated by scripts/compile-bank.mjs — do not edit by hand.
// Source: data/question-bank.txt (${questions.length} unique questions)

export const sets = ${JSON.stringify(sets, null, 2)};

export const topics = ${JSON.stringify(topics, null, 2)};

export const questions = ${JSON.stringify(questions, null, 2)};
`;

fs.writeFileSync(outPath, output);
console.log(`Wrote ${questions.length} questions to ${path.relative(root, outPath)}`);
console.log(`Sets: ${sets.map((set) => `${set.id} (${set.count})`).join(', ')}`);
console.log(`Skipped ${skipped} question(s) that depend on a missing diagram.`);
