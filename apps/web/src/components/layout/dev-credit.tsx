import Link from "next/link";

/**
 * Site-wide developer credit.
 * Rendered once in the root layout so it appears on every route
 * (auth pages, dashboard pages, public pages) without being repeated
 * per-page. Fixed to the corner, small and unobtrusive by default,
 * fully legible on hover/focus.
 */
export function DevCredit() {
  return (
    <div className="fixed bottom-3 left-3 z-50 print:hidden">
      <Link
        href="https://abdaullah-marketing-7p1v.vercel.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[11px] text-slate-400 backdrop-blur-sm transition-all duration-200 hover:border-fluxio-electric-blue/40 hover:bg-black/60 hover:text-white hover:shadow-lg hover:shadow-cyan-500/10"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-[#00d4ff] to-[#7b2ff7] transition-transform duration-200 group-hover:scale-125" />
        <span>
          تم التطوير بواسطة{" "}
          <span className="font-semibold text-slate-300 group-hover:text-white">
            Abdullah Diaa
          </span>
        </span>
      </Link>
    </div>
  );
}
