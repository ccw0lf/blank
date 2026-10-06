"use client";
import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";

export function CopyLink({ url, compact }: { url: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link:", url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  if (compact)
    return (
      <button type="button" onClick={copy} className="btn-secondary btn-sm">
        {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />} {copied ? "Copied" : "Copy link"}
      </button>
    );
  return (
    <div className="flex w-full max-w-xl items-center gap-2">
      <div className="relative flex-1">
        <Link2 size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
        <input readOnly value={url} className="input pl-9 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
      </div>
      <button type="button" onClick={copy} className="btn-primary">
        {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
