"use client";

import { useEffect, useState } from "react";

type Item = { label: string; icon: string; href: string };

const ITEMS: Item[] = [
  { label: "Home", icon: "🏠", href: "/" },
  { label: "Rooms", icon: "🌿", href: "/rooms" },
  { label: "Profile", icon: "😺", href: "/profile" },
  { label: "Sign out", icon: "🚪", href: "/login" },
];

export default function NavMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="fixed top-5 left-5 z-40 w-11 h-11 bg-panel border-[3px] border-panel-stroke shadow-pixel-sm flex flex-col items-center justify-center gap-[5px] active:translate-y-[2px] active:shadow-none"
      >
        <span className="block w-5 h-[3px] bg-panel-stroke" />
        <span className="block w-5 h-[3px] bg-panel-stroke" />
        <span className="block w-5 h-[3px] bg-panel-stroke" />
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-panel border-r-4 border-panel-stroke shadow-pixel-lg transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b-[3px] border-panel-stroke">
          <span className="font-press text-[11px]">Menu</span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center border-[3px] border-panel-stroke bg-wood-light font-press text-[10px] active:translate-y-[2px]"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col gap-2 p-4">
          {ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-3 border-[3px] border-panel-stroke bg-wood-light font-pixelify text-lg text-ink hover:bg-sun active:translate-y-[2px] active:shadow-none shadow-pixel-sm"
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
      </aside>
    </>
  );
}
