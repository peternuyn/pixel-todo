"use client";

import { useState, type ReactNode } from "react";
import MessageContent from "./MessageContent";
import TypewriterText from "./TypewriterText";
import geminiLogo from "@/assets/gemini-logo.png";

// A Gemini answer, styled to sit calmly inside the narrow chat column while still
// reading as clearly "the assistant, not a person": a white card with a soft aqua
// header, a small sparkle mark, the question shown as quiet context, and the answer
// in comfortable prose. Distinct from the butter "you" bubble and plain white "others".
export default function AiAnswerCard({
  question,
  answer,
  time,
  animate,
  onProgress,
  footer,
}: {
  question: string | null;
  answer: string;
  time: string;
  animate: boolean;
  onProgress?: () => void;
  footer?: ReactNode;
}) {
  return (
    <div className="group">
      <div className="border-[2px] border-glow-deep bg-white shadow-pixel-sm">
        {/* Header: sparkle mark · Gemini · AI · time · copy */}
        <div className="flex items-center gap-2 border-b-[2px] border-glow-deep/25 bg-glow/20 px-2.5 py-1.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[3px] bg-white shadow-[1.5px_1.5px_0_0_#173E2B]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={geminiLogo.src} alt="Gemini" className="h-[15px] w-[15px]" />
          </span>
          <span className="font-pixelify text-[15px] font-semibold leading-none text-glow-deep">
            Gemini
          </span>
          <span className="mt-[3px] font-silk text-[8px] uppercase leading-none tracking-widest text-glow-deep/60">
            AI
          </span>
          <span className="ml-auto flex items-center gap-2">
            <CopyButton text={answer} />
            <span className="font-pixelify text-[11px] text-ink/35">{time}</span>
          </span>
        </div>

        {/* Quiet echo of the question that prompted the answer, marked with a prompt caret. */}
        {question && (
          <div className="flex items-start gap-1.5 border-b border-dashed border-glow-deep/25 px-2.5 py-1.5">
            <span className="mt-[1px] font-pixelify text-[12px] font-bold text-glow-deep">❯</span>
            <p className="font-pixelify text-[12px] leading-snug text-ink/50 line-clamp-2">
              {question}
            </p>
          </div>
        )}

        {/* The answer. */}
        <div className="break-words px-2.5 py-2 font-pixelify text-[15px] leading-relaxed text-ink">
          {animate ? (
            <TypewriterText text={answer} animate onProgress={onProgress} />
          ) : (
            <MessageContent content={answer} />
          )}
        </div>
      </div>

      {footer}
    </div>
  );
}

// The "thinking" placeholder shown while we wait for Gemini. Mirrors the answer card's
// header exactly, with three softly pulsing dots for the body, so the wait and the
// answer feel like one continuous card.
export function AiThinking() {
  return (
    <div className="border-[2px] border-glow-deep bg-white shadow-pixel-sm">
      <div className="flex items-center gap-2 border-b-[2px] border-glow-deep/25 bg-glow/20 px-2.5 py-1.5">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[3px] bg-white shadow-[1.5px_1.5px_0_0_#173E2B]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={geminiLogo.src} alt="Gemini" className="h-[15px] w-[15px]" />
        </span>
        <span className="font-pixelify text-[15px] font-semibold leading-none text-glow-deep">
          Gemini
        </span>
        <span className="ml-auto font-pixelify text-[11px] italic text-ink/40">thinking…</span>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-3">
        <Dot delay="0ms" />
        <Dot delay="200ms" />
        <Dot delay="400ms" />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full bg-glow-deep animate-pulse"
      style={{ animationDelay: delay }}
    />
  );
}

// Small, quiet copy control in the card header. Text-only, appears on hover/focus,
// swaps to a check on success — no motion, matching the app's calm interactions.
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy answer"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked (e.g. non-HTTPS) — ignore */
        }
      }}
      className="font-silk text-[8px] uppercase tracking-widest text-glow-deep/70 opacity-0 transition-opacity hover:text-glow-deep focus:opacity-100 group-hover:opacity-100"
    >
      {copied ? "copied ✓" : "copy"}
    </button>
  );
}
