"use client";

import { useState } from "react";
import geminiLogo from "@/assets/gemini-logo.png";

// The chat "/ai <question>" command. Matches "/ai" on its own or followed by a space
// (so "/airplane" is NOT treated as a command). Case-insensitive so "/AI" works too.
const AI_COMMAND = /^\/ai(\s+|$)/i;

/**
 * The message composer. Owns its own draft + "AI mode" state; the parent only supplies
 * the two send actions and gets told about validation errors.
 *
 * AI mode is the nice part: typing "/ai " flips the composer into "talking to Gemini"
 * and HIDES the prefix, so the user sees just their question (e.g. "what is 1+1?" not
 * "/ai what is 1+1?"). Leave it with the ✕ button, Escape, or Backspace on an empty field.
 *
 * onSendMessage / onAskAi return a Promise (the caller's mutateAsync) so we can clear the
 * field only on success — a failed send keeps what you typed. Errors are surfaced by the
 * caller's mutation, so we just swallow the rejection here.
 */
export default function ChatComposer({
  busy,
  loggedIn,
  onSendMessage,
  onAskAi,
  onError,
}: {
  busy: boolean;
  loggedIn: boolean;
  onSendMessage: (content: string) => Promise<unknown>;
  onAskAi: (prompt: string) => Promise<unknown>;
  onError: (message: string | null) => void;
}) {
  const [draft, setDraft] = useState("");
  const [aiMode, setAiMode] = useState(false);

  const exitAiMode = () => {
    setAiMode(false);
    setDraft("");
    onError(null);
  };

  // Intercept typing so the "/ai " command flips into AI mode and disappears — the user
  // is left with just their question in the field, not the raw slash command.
  function onDraftChange(value: string) {
    if (!aiMode) {
      const match = value.match(/^\/ai\s+(.*)$/is);
      if (match) {
        setAiMode(true);
        setDraft(match[1]); // keep whatever they typed after "/ai ", drop the prefix
        onError(null);
        return;
      }
    }
    setDraft(value);
  }

  function onDraftKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!aiMode) return;
    // Escape always leaves; Backspace leaves only once the question is empty (so you
    // "delete" your way back out, like removing a token).
    if (e.key === "Escape" || (e.key === "Backspace" && draft === "")) {
      e.preventDefault();
      exitAiMode();
    }
  }

  // Fire a send, clearing the field only if it succeeds.
  async function send(action: Promise<unknown>) {
    try {
      await action;
      setDraft("");
      onError(null);
    } catch {
      /* the mutation already surfaced the error via onError */
    }
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!loggedIn) {
      onError("You must be logged in to chat");
      return;
    }
    const content = draft.trim();

    // AI mode: the draft is already just the question. Send it and stay in AI mode so
    // follow-up questions feel like a conversation.
    if (aiMode) {
      if (!content) {
        onError("Ask Gemini a question first");
        return;
      }
      void send(onAskAi(content));
      return;
    }

    if (!content) return;

    // Safety net: an inline "/ai …" (pasted, or typed without a trailing space then sent)
    // still works. Bare "/ai" just switches into AI mode.
    if (AI_COMMAND.test(content)) {
      const prompt = content.replace(AI_COMMAND, "").trim();
      if (!prompt) {
        setAiMode(true);
        setDraft("");
        return;
      }
      void send(onAskAi(prompt));
      return;
    }

    void send(onSendMessage(content));
  }

  return (
    <>
      {/* AI mode header: makes it obvious you're talking to Gemini, and how to leave. */}
      {aiMode && (
        <div className="mt-3 mb-1.5 flex items-center gap-2 border-[2px] border-glow-deep bg-glow/15 px-2.5 py-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={geminiLogo.src} alt="" className="h-4 w-4 shrink-0" />
          <span className="font-pixelify text-[13px] text-glow-deep">Asking Gemini</span>
          <button
            type="button"
            onClick={exitAiMode}
            className="ml-auto font-silk text-[9px] uppercase leading-none tracking-widest text-ink/45 hover:text-ink"
            aria-label="Exit AI mode"
          >
            esc ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSend} className={`flex gap-1.5 ${aiMode ? "mt-0" : "mt-3"}`}>
        {/* One input, re-skinned in AI mode: aqua frame + a Gemini mark inside the field,
            so the composer itself reads as "message to Gemini". */}
        <div
          className={`flex flex-1 items-center gap-1.5 border-[3px] bg-white px-2 ${
            aiMode
              ? "border-glow-deep focus-within:bg-[#EAFBF6]"
              : "border-panel-stroke focus-within:bg-[#F4FBF5]"
          }`}
        >
          {aiMode && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={geminiLogo.src} alt="" className="h-[18px] w-[18px] shrink-0" />
          )}
          <input
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={onDraftKeyDown}
            disabled={busy}
            placeholder={aiMode ? "Ask Gemini anything…" : "Message… (or type /ai to ask Gemini)"}
            className="min-w-0 flex-1 bg-transparent py-1.5 font-pixelify text-base text-ink outline-none disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className={`tag disabled:opacity-50 ${aiMode ? "!bg-glow hover:!bg-glow-deep" : ""}`}
        >
          {aiMode ? "Ask" : "Send"}
        </button>
      </form>
    </>
  );
}
