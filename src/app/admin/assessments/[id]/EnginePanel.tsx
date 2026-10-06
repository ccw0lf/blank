"use client";
import { useState, useTransition } from "react";
import { Loader2, Play } from "lucide-react";
import { simulateAction } from "@/app/actions/admin";

type Result = Awaited<ReturnType<typeof simulateAction>>;

export function EnginePanel({ assessmentId }: { assessmentId: string }) {
  const [students, setStudents] = useState(30);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="sim">Simulate for how many students?</label>
          <input id="sim" type="number" min={2} max={500} value={students} onChange={(e) => setStudents(Number(e.target.value))} className="input w-40" />
        </div>
        <button
          className="btn-secondary"
          disabled={pending}
          onClick={() => start(async () => setResult(await simulateAction(assessmentId, students)))}
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} {pending ? "Running…" : "Run simulation"}
        </button>
      </div>
      {result && "error" in result && <p className="text-sm text-red-700">{result.error}</p>}
      {result && !("error" in result) && (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Box label="Unique question sets" value={`${result.uniqueSets} / ${result.students}`} />
            <Box label="Avg. shared questions (any 2 students)" value={`${result.avgOverlap.toFixed(1)} / ${result.k}`} />
            <Box label="Avg. shared with next student" value={`${result.avgNeighbourOverlap.toFixed(1)} / ${result.k}`} />
            <Box label="Times each question used" value={`${result.minExposure}–${result.maxExposure}`} />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500 uppercase">Sample papers (question numbers from the bank)</p>
            <ul className="space-y-1 font-mono text-xs">
              {result.sampleSets.map((s, i) => (
                <li key={i} className="rounded bg-slate-50 px-2 py-1">
                  Student {i + 1}: {s.join(", ")}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
