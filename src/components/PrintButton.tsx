"use client";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-secondary">
      <Printer size={16} /> Print / PDF
    </button>
  );
}
