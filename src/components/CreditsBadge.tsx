"use client";

import { useCredits } from "@/lib/credits";

export default function CreditsBadge() {
  const { credits } = useCredits();
  return (
    <span
      className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
      title="Cada memoria generada usa un crédito"
    >
      {credits} {credits === 1 ? "crédito" : "créditos"}
    </span>
  );
}
