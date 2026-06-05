"use client";
import { useEffect, useState } from "react";

const KOFI_URL = "https://ko-fi.com/N4N31DPNUS";

// A discreet "?" in the corner that opens a small, non-technical "what is this"
// card (gallery-placard style) with a Ko-fi support link.
export const InfoPanel = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="About Planeto"
        aria-expanded={open}
        className="fixed bottom-5 left-5 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/40 text-base font-semibold text-white/70 backdrop-blur-sm transition-colors hover:border-white/60 hover:text-white"
      >
        ?
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="About Planeto"
            className="fixed bottom-16 left-5 z-50 w-[min(20rem,calc(100vw-2.5rem))] rounded-xl border border-white/15 bg-black/80 p-5 text-sm leading-relaxed text-white/80 shadow-xl backdrop-blur-md"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 text-white/50 transition-colors hover:text-white"
            >
              ✕
            </button>

            <h2 className="mb-2 text-base font-semibold text-white">Planeto</h2>
            <p className="mb-3">
              A small shared universe - a handful of little planets drift and
              collide under their own gravity around a bright, silent sun.
            </p>
            <p className="mb-3">
              You&rsquo;re one of the eyes watching. <strong>Drag</strong> to
              look around, <strong>scroll</strong> to zoom, and{" "}
              <strong>double-click</strong> (press any key, or tap{" "}
              <strong>Send a symbol</strong> on touch) to send a glowing symbol
              into the dark. Anyone else here right now sees it flare beside
              your eye - and you&rsquo;ll see theirs.
            </p>
            <p className="mb-4 text-white/55">
              No goal, no score - just a quiet place to drift.
            </p>
            <p className="mb-4 text-xs text-white/40">
              No accounts. Anonymous usage + error reporting; nothing personal
              is stored.
            </p>

            <a
              href={KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-[13px] font-semibold text-white/55 no-underline transition-colors hover:border-cyan-300/50 hover:bg-cyan-300/10 hover:text-white"
            >
              <span aria-hidden="true">☕</span>
              Buy me a coffee
            </a>
          </div>
        </>
      )}
    </>
  );
};
