"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { tagApi } from "@/lib/api";
import { playSfx } from "@/lib/sfx";

type Props = {
  onConfirm: (data: CreateRoomData) => void | Promise<void>;
  onClose: () => void;
  serverError?: string | null;
};

export type CreateRoomData = {
  name: string;
  description: string;
  tags: string[];
  capacity: number;
  isPrivate: boolean;
  password: string;
};

// Fallback suggestions shown even before any tags exist in the database.
const DEFAULT_TAGS = ["focus", "silent", "chill", "coding", "math", "science", "language", "art", "study"];

// Limits, kept in sync with the backend (Tag @Size(max=32), 5 tags per room).
const MAX_TAGS = 5;
const MAX_TAG_LENGTH = 32;

export default function CreateRoomModal({ onConfirm, onClose, serverError }: Props) {
  const [form, setForm] = useState<CreateRoomData>({
    name: "",
    description: "",
    tags: [],
    capacity: 10,
    isPrivate: false,
    password: "",
  });
  const [tagInput, setTagInput] = useState("");
  const [capacityInput, setCapacityInput] = useState("10");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateRoomData | "tagInput" | "capacityInput", string>>>({});
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Load tags that already exist in the database so we can suggest them.
  // Cached by TanStack, so reopening the modal doesn't refetch within staleTime.
  const { data: existingTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: () => tagApi.list(),
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Closing the modal (✕, Cancel, or backdrop) is a "cancel" sound.
  const dismiss = () => { playSfx("cancel"); onClose(); };

  function setField<K extends keyof CreateRoomData>(field: K, value: CreateRoomData[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  // ---- tag helpers ----
  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tag) return;
    if (form.tags.includes(tag)) { setTagInput(""); return; }
    if (form.tags.length >= MAX_TAGS) { setErrors((e) => ({ ...e, tagInput: `Max ${MAX_TAGS} tags` })); return; }
    if (tag.length > MAX_TAG_LENGTH) {
      setErrors((e) => ({ ...e, tagInput: `Tags can be up to ${MAX_TAG_LENGTH} characters` }));
      return;
    }
    setField("tags", [...form.tags, tag]);
    setTagInput("");
    setErrors((e) => ({ ...e, tagInput: undefined }));
  }

  function removeTag(tag: string) {
    setField("tags", form.tags.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && tagInput === "" && form.tags.length > 0) {
      removeTag(form.tags[form.tags.length - 1]);
    }
  }

  // ---- capacity helpers ----
  function handleCapacityChange(raw: string) {
    setCapacityInput(raw);
    setErrors((e) => ({ ...e, capacityInput: undefined }));
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 2 && n <= 50) {
      setField("capacity", n);
    }
  }

  function handleCapacityBlur() {
    const n = parseInt(capacityInput, 10);
    if (isNaN(n) || n < 2) {
      setCapacityInput("2");
      setField("capacity", 2);
    } else if (n > 50) {
      setCapacityInput("50");
      setField("capacity", 50);
    }
  }

  // ---- validation ----
  function validate() {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Required";
    if (form.name.length > 64) e.name = "Max 64 characters";
    if (form.isPrivate && !form.password.trim()) e.password = "Required for private rooms";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    playSfx("confirm");
    setSubmitting(true);
    try {
      await onConfirm(form);
    } finally {
      setSubmitting(false);
    }
  }

  // Merge the built-in defaults with tags from the DB (deduped), then drop any
  // the user has already picked. Set keeps the order while removing duplicates.
  const allSuggestions = [...new Set([...DEFAULT_TAGS, ...existingTags.map((t) => t.name)])];
  const unusedSuggestions = allSuggestions.filter((t) => !form.tags.includes(t));

  return (
    <>
      {/* Backdrop */}
      <div onClick={dismiss} className="fixed inset-0 z-50 bg-black/50" />

      {/* Modal — scrollable on small screens */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-room-title"
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm max-h-[90vh] overflow-y-auto panel shadow-pixel-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏡</span>
            <h2 id="create-room-title" className="font-jersey text-2xl leading-none text-ink">
              Create Room
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            data-sfx="off"
            onClick={dismiss}
            className="w-8 h-8 flex items-center justify-center border-[3px] border-panel-stroke bg-wood-light font-press text-[10px] active:translate-y-[2px]"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

          {/* Room name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="room-name" className="font-press text-[8px] uppercase tracking-widest text-ink/70">
              Room Name
            </label>
            <input
              id="room-name"
              type="text"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g. Cozy Meadow"
              className={`w-full bg-panel border-[3px] px-3 py-2 font-pixelify text-sm text-ink outline-none placeholder:text-ink/30 ${
                errors.name ? "border-barn" : "border-panel-stroke focus:border-grass-dark"
              }`}
            />
            {errors.name && <p className="font-press text-[8px] text-barn">{errors.name}</p>}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="room-desc" className="font-press text-[8px] uppercase tracking-widest text-ink/70">
              Description <span className="text-ink/30">(optional)</span>
            </label>
            <input
              id="room-desc"
              type="text"
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="e.g. Deep work — no distractions"
              className="w-full bg-panel border-[3px] border-panel-stroke px-3 py-2 font-pixelify text-sm text-ink outline-none placeholder:text-ink/30 focus:border-grass-dark"
            />
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="font-press text-[8px] uppercase tracking-widest text-ink/70">
              Tags <span className="text-ink/30">(up to {MAX_TAGS})</span>
            </label>

            {/* Tag chips + input in one box */}
            <div
              onClick={() => tagInputRef.current?.focus()}
              className={`flex flex-wrap gap-1.5 min-h-[42px] bg-panel border-[3px] px-2 py-1.5 cursor-text ${
                errors.tagInput ? "border-barn" : "border-panel-stroke focus-within:border-grass-dark"
              }`}
            >
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 font-silk text-[8px] uppercase tracking-wider px-2 py-0.5 bg-sun/60 border-[2px] border-sun-deep text-ink"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                    className="leading-none text-ink/50 hover:text-barn"
                  >
                    ✕
                  </button>
                </span>
              ))}
              {form.tags.length < MAX_TAGS && (
                <div className="flex flex-1 min-w-[80px] items-center gap-1">
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={tagInput}
                    maxLength={MAX_TAG_LENGTH}
                    onChange={(e) => { setTagInput(e.target.value); setErrors((er) => ({ ...er, tagInput: undefined })); }}
                    onKeyDown={handleTagKeyDown}
                    placeholder={form.tags.length === 0 ? "Type your own tag…" : ""}
                    className="flex-1 min-w-[60px] bg-transparent font-pixelify text-sm text-ink outline-none placeholder:text-ink/30"
                  />
                  {/* "+" commits the typed tag, so users don't have to know
                      about the Enter key. Disabled until something is typed. */}
                  <button
                    type="button"
                    aria-label="Add tag"
                    onClick={(e) => { e.stopPropagation(); addTag(tagInput); tagInputRef.current?.focus(); }}
                    disabled={!tagInput.trim()}
                    className="shrink-0 w-6 h-6 flex items-center justify-center border-[2px] border-panel-stroke bg-wood-light font-press text-[10px] text-ink hover:border-grass-dark disabled:opacity-30 active:translate-y-[1px]"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
            {errors.tagInput && <p className="font-press text-[8px] text-barn">{errors.tagInput}</p>}

            {/* Suggested tags */}
            {unusedSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {unusedSuggestions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    className="font-silk text-[8px] uppercase tracking-wider px-2 py-0.5 border-[2px] border-panel-stroke bg-wood-light text-ink/60 hover:border-grass-dark hover:text-ink transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Capacity */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="room-capacity" className="font-press text-[8px] uppercase tracking-widest text-ink/70">
              Capacity <span className="text-ink/30">(2 – 50)</span>
            </label>
            <input
              id="room-capacity"
              type="number"
              min={2}
              max={50}
              value={capacityInput}
              onChange={(e) => handleCapacityChange(e.target.value)}
              onBlur={handleCapacityBlur}
              className={`w-full bg-panel border-[3px] px-3 py-2 font-pixelify text-sm text-ink outline-none ${
                errors.capacityInput ? "border-barn" : "border-panel-stroke focus:border-grass-dark"
              }`}
            />
            {errors.capacityInput && <p className="font-press text-[8px] text-barn">{errors.capacityInput}</p>}
          </div>

          {/* Visibility — Public / Private as two buttons */}
          <div className="flex flex-col gap-1.5">
            <span className="font-press text-[8px] uppercase tracking-widest text-ink/70">Visibility</span>
            <div className="flex border-[3px] border-panel-stroke overflow-hidden">
              <button
                type="button"
                onClick={() => { setField("isPrivate", false); setField("password", ""); }}
                className={`flex-1 py-2 font-press text-[8px] tracking-widest transition-colors ${
                  !form.isPrivate
                    ? "bg-grass text-white"
                    : "bg-wood-light text-ink/40 hover:text-ink/70"
                }`}
              >
                🌿 Public
              </button>
              <button
                type="button"
                onClick={() => setField("isPrivate", true)}
                className={`flex-1 py-2 font-press text-[8px] tracking-widest border-l-[3px] border-panel-stroke transition-colors ${
                  form.isPrivate
                    ? "bg-barn text-white"
                    : "bg-wood-light text-ink/40 hover:text-ink/70"
                }`}
              >
                🔒 Private
              </button>
            </div>
          </div>

          {/* Password — only shown when private */}
          {form.isPrivate && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="room-password" className="font-press text-[8px] uppercase tracking-widest text-ink/70">
                Password
              </label>
              <input
                id="room-password"
                type="password"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                placeholder="••••••••"
                className={`w-full bg-panel border-[3px] px-3 py-2 font-pixelify text-sm text-ink outline-none placeholder:text-ink/30 ${
                  errors.password ? "border-barn" : "border-panel-stroke focus:border-grass-dark"
                }`}
              />
              {errors.password && <p className="font-press text-[8px] text-barn">{errors.password}</p>}
            </div>
          )}

          {/* Server error from the API */}
          {serverError && (
            <p className="font-press text-[8px] text-barn">{serverError}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end mt-1">
            <button type="button" onClick={dismiss} data-sfx="off" className="tag" disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              data-sfx="off"
              className="tag active bg-sun hover:bg-sun-deep disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create Room →"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
