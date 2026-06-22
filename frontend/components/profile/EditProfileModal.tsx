"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { petAvatarSrc } from "@/lib/pets";
import { playSfx } from "@/lib/sfx";
import type { PetResponse } from "@/lib/api";

const MAX_BIO_LENGTH = 280;

type Props = {
  initialDisplayName: string;
  initialBio: string;
  initialPetId: string | null;
  pets: PetResponse[];
  onConfirm: (data: { displayName: string; bio: string; petId: string | null }) => void | Promise<void>;
  onClose: () => void;
  serverError?: string | null;
};

export default function EditProfileModal({
  initialDisplayName,
  initialBio,
  initialPetId,
  pets,
  onConfirm,
  onClose,
  serverError,
}: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(initialPetId);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Closing the modal (✕, Cancel, or backdrop) is a "cancel" sound.
  const dismiss = () => { playSfx("cancel"); onClose(); };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) {
      setError("Display name is required");
      return;
    }
    if (name.length > 64) {
      setError("Display name must be 64 characters or fewer");
      return;
    }
    playSfx("confirm");
    setSubmitting(true);
    try {
      // A blank bio is fine — the backend resets it to the default.
      await onConfirm({ displayName: name, bio: bio.trim(), petId: selectedPetId });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={dismiss} className="fixed inset-0 z-50 bg-black/50" />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm panel shadow-pixel-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xl">✏️</span>
            <h2 id="edit-profile-title" className="font-jersey text-2xl leading-none text-ink">
              Edit Profile
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
          {/* Display name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="display-name" className="font-press text-[8px] uppercase tracking-widest text-ink/70">
              Display Name
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              maxLength={64}
              onChange={(e) => { setDisplayName(e.target.value); setError(null); }}
              placeholder="e.g. Mochi"
              className={`w-full bg-panel border-[3px] px-3 py-2 font-pixelify text-sm text-ink outline-none placeholder:text-ink/30 ${
                error ? "border-barn" : "border-panel-stroke focus:border-grass-dark"
              }`}
            />
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bio" className="font-press text-[8px] uppercase tracking-widest text-ink/70">
              Bio <span className="text-ink/30">(optional)</span>
            </label>
            <textarea
              id="bio"
              value={bio}
              maxLength={MAX_BIO_LENGTH}
              rows={3}
              onChange={(e) => { setBio(e.target.value); setError(null); }}
              placeholder="A cozy farm studier 🌾"
              className="w-full resize-none bg-panel border-[3px] border-panel-stroke px-3 py-2 font-pixelify text-sm text-ink outline-none placeholder:text-ink/30 focus:border-grass-dark"
            />
            <p className="font-pixelify text-[11px] text-ink/40 text-right">
              {bio.length}/{MAX_BIO_LENGTH}
            </p>
          </div>

          {/* Avatar pet picker */}
          <div className="flex flex-col gap-1.5">
            <span className="font-press text-[8px] uppercase tracking-widest text-ink/70">
              Avatar Pet
            </span>
            <div className="grid grid-cols-4 gap-2">
              {pets.map((pet) => {
                const selected = pet.petId === selectedPetId;
                return (
                  <button
                    key={pet.petId}
                    type="button"
                    title={pet.description ?? pet.petName}
                    onClick={() => { setSelectedPetId(pet.petId); setError(null); }}
                    className={`flex flex-col items-center gap-1 border-[3px] p-1.5 transition-colors ${
                      selected
                        ? "border-grass-dark bg-sun/40"
                        : "border-panel-stroke bg-wood-light hover:border-grass-dark"
                    }`}
                  >
                    <span className="relative w-12 h-12 overflow-hidden">
                      <Image
                        src={petAvatarSrc(pet.spriteKey)}
                        alt={pet.petName}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </span>
                    <span className="font-silk text-[8px] uppercase tracking-wider text-ink leading-none">
                      {pet.petName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Errors */}
          {(error || serverError) && (
            <p className="font-press text-[8px] text-barn">{error ?? serverError}</p>
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
              {submitting ? "Saving…" : "Save →"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
