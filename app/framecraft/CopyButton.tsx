"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopyButtonProps {
  value: string;
  idleLabel: string;
  copiedLabel: string;
  ariaLabel?: string;
  className?: string;
  onError?: () => void;
}

export function CopyButton({
  value,
  idleLabel,
  copiedLabel,
  ariaLabel,
  className = "",
  onError,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
      onError?.();
    }
  }

  return (
    <button
      className={`${className} ${copied ? "is-copied" : ""}`.trim()}
      onClick={() => void copy()}
      aria-label={copied ? copiedLabel : (ariaLabel || idleLabel)}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
      {copied ? copiedLabel : idleLabel}
    </button>
  );
}
