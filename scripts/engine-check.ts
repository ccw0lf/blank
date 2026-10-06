// Quick sanity check for the randomization engine: `npx tsx scripts/engine-check.ts`
import { simulate, combinations, PoolQuestion } from "../src/lib/engine";

const topics = ["Access Control", "Change Mgmt", "Backup & DR", "IT Governance"];
const pool: PoolQuestion[] = Array.from({ length: 40 }, (_, i) => ({
  id: `q${i + 1}`,
  topic: topics[i % topics.length],
  timesServed: 0,
  optionCount: 4,
}));

for (const students of [4, 30, 100]) {
  const r = simulate(pool, 10, students);
  console.log(`${students} students:`, {
    uniqueSets: r.uniqueSets,
    avgOverlap: r.avgOverlap.toFixed(2),
    maxOverlap: r.maxOverlap,
    avgNeighbourOverlap: r.avgNeighbourOverlap.toFixed(2),
    exposure: `${r.minExposure}-${r.maxExposure}`,
  });
}
console.log("Possible unique papers (40 choose 10):", combinations(40, 10).toLocaleString());
