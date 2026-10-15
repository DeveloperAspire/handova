import * as p from "@clack/prompts";

// Handova's own loading words, on the theme of handing over. Shown while real work happens, never as a delay.
const WORDS = [
  "Dilly-dallying",
  "Passing the baton",
  "Checking pockets",
  "Swapping seats",
  "Shaking hands",
  "Packing the conversation",
  "Tagging in",
  "Clocking in",
  "Warming the bench",
  "Finding the right desk",
];

const SHOW_AFTER_MS = 150;
const ROTATE_EVERY_MS = 1400;

// Runs the work behind a spinner with rotating words. Quick work finishes before the spinner appears, so fast
// commands don't flash. Without a terminal (pipes, CI) it just runs the work.
export async function busy<T>(work: Promise<T>): Promise<T> {
  if (!process.stdout.isTTY) return work;

  let index = Math.floor(Math.random() * WORDS.length);
  const spin = p.spinner();
  let rotate: ReturnType<typeof setInterval> | undefined;
  const show = setTimeout(() => {
    spin.start(`${WORDS[index]}…`);
    rotate = setInterval(() => {
      index = (index + 1) % WORDS.length;
      spin.message(`${WORDS[index]}…`);
    }, ROTATE_EVERY_MS);
  }, SHOW_AFTER_MS);

  try {
    return await work;
  } finally {
    clearTimeout(show);
    if (rotate) {
      clearInterval(rotate);
      spin.clear();
    }
  }
}
