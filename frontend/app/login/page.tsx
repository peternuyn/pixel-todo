"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Water from "@/assets/gifs/water-background.gif";
import Logo from "@/assets/logo.svg";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({ username: "", displayName: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Partial<typeof form & { general: string }>>({});
  const [loading, setLoading] = useState(false);

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const e: typeof errors = {};
    if (!form.username.trim()) e.username = "Required";
    if (form.username.length > 32) e.username = "Max 32 characters";
    if (!form.password) e.password = "Required";
    if (mode === "register") {
      if (!form.displayName.trim()) e.displayName = "Required";
      if (form.password.length < 6) e.password = "Min 6 characters";
      if (form.password !== form.confirm) e.confirm = "Passwords don't match";
    }
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    // TODO: replace with real API call
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    router.push("/rooms");
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-12 z-[1] relative"
      style={{ 
        backgroundImage: `url(${Water.src})`,
        backgroundRepeat: 'repeat',
        backgroundSize: '64px 64px',  
      }}
    >
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        {/* Logo */}
        <Link href="/" className="flex flex-col items-center gap-2">
          <Image src={Logo.src} alt="Meowdow Study Farm" width={80} height={75} unoptimized />
          <h1 className="font-jersey text-3xl text-ink [text-shadow:2px_2px_0_#FFE89A]">
            Meowdow Study Farm
          </h1>
        </Link>

        {/* Card */}
        <div className="panel w-full">
          {/* Mode tabs */}
          <div className="flex mb-5 border-b-[3px] border-panel-stroke">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setErrors({}); }}
                className={`flex-1 py-2 font-press text-[9px] tracking-widest capitalize transition-colors ${
                  mode === m
                    ? "bg-sun border-b-[3px] border-ink -mb-[3px] text-ink"
                    : "text-ink/40 hover:text-ink/70"
                }`}
              >
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {/* Username */}
            <Field
              label="Username"
              id="username"
              type="text"
              value={form.username}
              onChange={(v) => set("username", v)}
              error={errors.username}
              placeholder="e.g. mochi"
              autoComplete="username"
            />

            {/* Display name — register only */}
            {mode === "register" && (
              <Field
                label="Display Name"
                id="displayName"
                type="text"
                value={form.displayName}
                onChange={(v) => set("displayName", v)}
                error={errors.displayName}
                placeholder="e.g. Mochi 🐱"
                autoComplete="name"
              />
            )}

            {/* Password */}
            <Field
              label="Password"
              id="password"
              type="password"
              value={form.password}
              onChange={(v) => set("password", v)}
              error={errors.password}
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />

            {/* Confirm — register only */}
            {mode === "register" && (
              <Field
                label="Confirm Password"
                id="confirm"
                type="password"
                value={form.confirm}
                onChange={(v) => set("confirm", v)}
                error={errors.confirm}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            )}

            {errors.general && (
              <p className="font-press text-[8px] text-barn text-center">{errors.general}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="tag w-full justify-center py-3 mt-1 hover:bg-sun disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Loading…"
                : mode === "login"
                ? "Sign In →"
                : "Create Account →"}
            </button>
          </form>

          {/* Switch mode hint */}
          <p className="font-pixelify text-xs text-ink/50 text-center mt-4">
            {mode === "login" ? (
              <>No account?{" "}
                <button type="button" onClick={() => setMode("register")} className="text-grass-dark underline">
                  Register
                </button>
              </>
            ) : (
              <>Already have one?{" "}
                <button type="button" onClick={() => setMode("login")} className="text-grass-dark underline">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        <Link href="/" className="font-press text-[8px] text-ink/40 hover:text-ink/70">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}

function Field({
  label, id, type, value, onChange, error, placeholder, autoComplete,
}: {
  label: string; id: string; type: string; value: string;
  onChange: (v: string) => void; error?: string; placeholder?: string; autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-press text-[8px] uppercase tracking-widest text-ink/70">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full bg-panel border-[3px] px-3 py-2 font-pixelify text-sm text-ink outline-none placeholder:text-ink/30 ${
          error ? "border-barn" : "border-panel-stroke focus:border-grass-dark"
        }`}
      />
      {error && (
        <p className="font-press text-[8px] text-barn">{error}</p>
      )}
    </div>
  );
}
