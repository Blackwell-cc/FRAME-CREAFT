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

function copyWithTemporarySelection(value: string) {
  const activeElement = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    textarea.remove();
    activeElement?.focus({ preventScroll: true });
  }
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
    let didCopy = false;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(value);
      didCopy = true;
    } catch {
      try {
        didCopy = copyWithTemporarySelection(value);
      } catch {
        didCopy = false;
      }
    }

    if (didCopy) {
      setCopied(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1500);
    } else {
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
