/**
 * Question randomization engine.
 *
 * Goals (in priority order):
 *  1. Each attempt gets `k` distinct questions from the active pool.
 *  2. No two attempts of the same assessment get the exact same *set* of
 *     questions (checked by signature), whenever the pool makes that possible.
 *  3. Exposure is balanced: questions that have been served least are
 *     preferred, so consecutive students (who often sit next to each other)
 *     get largely different questions and the whole pool gets used evenly.
 *  4. If the pool has topics, the set is spread across topics in proportion
 *     to the pool, so every student gets a comparable paper.
 *  5. A student re-attempting gets questions they have not seen before first.
 *  6. Question order is shuffled, and option order is shuffled per question.
 *
 * The pure functions here have no DB access so they can be unit-tested and
 * used for the admin "simulate" preview.
 */
import { createHash, randomInt } from "crypto";

export type PoolQuestion = {
  id: string;
  topic: string | null;
  timesServed: number;
  optionCount: number;
};

export type GeneratedItem = { questionId: string; position: number; optionOrder: number[] };

export type GenerateInput = {
  pool: PoolQuestion[];
  k: number;
  shuffleOptions: boolean;
  /** signatures of sets already issued for this assessment */
  usedSignatures: Set<string>;
  /** question ids this student already saw in earlier attempts */
  seenByUser?: Set<string>;
  /** random source in [0,1) — injectable for tests */
  rand?: () => number;
};

export type GenerateResult = {
  items: GeneratedItem[];
  signature: string;
  /** false when the pool is too small to avoid a repeated set */
  unique: boolean;
};

const cryptoRand = () => randomInt(0, 2 ** 31) / 2 ** 31;

export function shuffle<T>(arr: T[], rand: () => number = cryptoRand): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function signatureOf(ids: string[]) {
  return createHash("sha256").update([...ids].sort().join("|")).digest("hex").slice(0, 32);
}

/** n choose k, capped to avoid overflow — used to show how many unique papers are possible */
export function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) {
    r = (r * (n - k + i)) / i;
    if (r > Number.MAX_SAFE_INTEGER) return Infinity;
  }
  return Math.round(r);
}

/**
 * Split k slots across topics proportionally (largest remainder method).
 * Leftover slots go to the topics with the largest remainder; ties go to the
 * topic whose questions have been used least, so topics are consumed evenly.
 */
export function allocateByTopic(pool: PoolQuestion[], k: number, rand: () => number): Map<string, number> {
  const groups = new Map<string, { size: number; served: number }>();
  for (const q of pool) {
    const g = groups.get(q.topic ?? "") ?? { size: 0, served: 0 };
    g.size++;
    g.served += q.timesServed;
    groups.set(q.topic ?? "", g);
  }

  const total = pool.length;
  const alloc = new Map<string, number>();
  const leftovers: { topic: string; rem: number; avgServed: number; tie: number }[] = [];
  let assigned = 0;
  for (const [topic, { size, served }] of groups) {
    const exact = (size / total) * k;
    const base = Math.min(Math.floor(exact), size);
    alloc.set(topic, base);
    assigned += base;
    leftovers.push({ topic, rem: Math.round((exact - base) * 1e6), avgServed: served / size, tie: rand() });
  }
  leftovers.sort((a, b) => b.rem - a.rem || a.avgServed - b.avgServed || a.tie - b.tie);
  for (let i = 0; assigned < k && i < leftovers.length * (k + 1); i++) {
    const { topic } = leftovers[i % leftovers.length];
    if (alloc.get(topic)! < groups.get(topic)!.size) {
      alloc.set(topic, alloc.get(topic)! + 1);
      assigned++;
    }
  }
  return alloc;
}

/** Lower score = picked first. Unseen-by-user dominates, then exposure, then randomness. */
function priority(q: PoolQuestion, seen: Set<string> | undefined, minServed: number, rand: () => number) {
  const seenPenalty = seen?.has(q.id) ? 1_000_000 : 0;
  // Exposure counts are integers and the jitter is < 1, so a less-used
  // question always beats a more-used one; ties are broken randomly.
  return seenPenalty + (q.timesServed - minServed) + rand();
}

function pickSet(pool: PoolQuestion[], k: number, seen: Set<string> | undefined, rand: () => number) {
  const minServed = Math.min(...pool.map((q) => q.timesServed));
  const alloc = allocateByTopic(pool, k, rand);
  const chosen: PoolQuestion[] = [];
  for (const [topic, count] of alloc) {
    const ranked = pool
      .filter((q) => (q.topic ?? "") === topic)
      .map((q) => ({ q, p: priority(q, seen, minServed, rand) }))
      .sort((a, b) => a.p - b.p);
    chosen.push(...ranked.slice(0, count).map((r) => r.q));
  }
  return chosen;
}

export function generateQuestionSet(input: GenerateInput): GenerateResult {
  const { pool, k, shuffleOptions, usedSignatures, seenByUser } = input;
  const rand = input.rand ?? cryptoRand;
  if (pool.length < k) throw new Error(`Question pool has ${pool.length} active questions but ${k} are required.`);
  if (k <= 0) throw new Error("Questions per attempt must be at least 1.");

  let chosen = pickSet(pool, k, seenByUser, rand);
  let sig = signatureOf(chosen.map((q) => q.id));
  let unique = !usedSignatures.has(sig);

  // Collision: swap one chosen question for an unchosen one (same topic when
  // possible, least exposed first) until the set is new.
  for (let tries = 0; !unique && tries < 50 && pool.length > k; tries++) {
    const chosenIds = new Set(chosen.map((q) => q.id));
    const outIdx = Math.floor(rand() * chosen.length);
    const out = chosen[outIdx];
    const candidates = pool.filter((q) => !chosenIds.has(q.id));
    const sameTopic = candidates.filter((q) => (q.topic ?? "") === (out.topic ?? ""));
    const from = sameTopic.length ? sameTopic : candidates;
    const minServed = Math.min(...from.map((q) => q.timesServed));
    const least = from.filter((q) => q.timesServed <= minServed + 1);
    const incoming = least[Math.floor(rand() * least.length)];
    chosen = chosen.map((q, i) => (i === outIdx ? incoming : q));
    sig = signatureOf(chosen.map((q) => q.id));
    unique = !usedSignatures.has(sig);
  }

  const ordered = shuffle(chosen, rand);
  const items = ordered.map((q, position) => {
    const base = Array.from({ length: q.optionCount }, (_, i) => i);
    return { questionId: q.id, position, optionOrder: shuffleOptions ? shuffle(base, rand) : base };
  });
  return { items, signature: sig, unique };
}

/**
 * Dry-run the engine for `students` sequential attempts (without touching the
 * DB) and report how varied the papers would be. Used by the admin preview.
 */
export function simulate(pool: PoolQuestion[], k: number, students: number) {
  const local = pool.map((q) => ({ ...q }));
  const used = new Set<string>();
  const sets: string[][] = [];
  for (let s = 0; s < students; s++) {
    const r = generateQuestionSet({ pool: local, k, shuffleOptions: false, usedSignatures: used });
    used.add(r.signature);
    const ids = r.items.map((i) => i.questionId);
    sets.push(ids);
    for (const id of ids) local.find((q) => q.id === id)!.timesServed++;
  }
  let overlapSum = 0;
  let maxOverlap = 0;
  let pairs = 0;
  for (let a = 0; a < sets.length; a++)
    for (let b = a + 1; b < sets.length; b++) {
      const sb = new Set(sets[b]);
      const o = sets[a].filter((id) => sb.has(id)).length;
      overlapSum += o;
      maxOverlap = Math.max(maxOverlap, o);
      pairs++;
    }
  let neighbourOverlap = 0;
  for (let a = 1; a < sets.length; a++) {
    const prev = new Set(sets[a - 1]);
    neighbourOverlap += sets[a].filter((id) => prev.has(id)).length;
  }
  const exposure = local.map((q) => q.timesServed - (pool.find((p) => p.id === q.id)?.timesServed ?? 0));
  return {
    students,
    uniqueSets: used.size,
    avgOverlap: pairs ? overlapSum / pairs : 0,
    maxOverlap,
    avgNeighbourOverlap: sets.length > 1 ? neighbourOverlap / (sets.length - 1) : 0,
    minExposure: Math.min(...exposure),
    maxExposure: Math.max(...exposure),
    sampleSets: sets.slice(0, 5),
  };
}
