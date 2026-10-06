"use client";
import { useState } from "react";

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
        {copied ? "Copied!" : "Copy link"}
      </button>
    );
  return (
    <div className="flex w-full max-w-xl items-center gap-2">
      <input readOnly value={url} className="input font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
      <button type="button" onClick={copy} className="btn-primary whitespace-nowrap">
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
