import type { Metadata, Viewport } from "next";

import { ShareStickyNav } from "@/components/share/share-sticky-nav";

export const metadata: Metadata = {
  title: "Shared project · Honic",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f5f9" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function ShareTokenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-dash-canvas dash-grid-bg text-dash-foreground relative min-h-screen">
      <header className="border-dash-border bg-dash-header supports-[backdrop-filter]:bg-dash-card/75 sticky top-0 z-30 border-b px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="text-dash-accent text-[11px] font-bold tracking-[0.2em] uppercase sm:text-xs">Shared with you</p>
            <p className="text-dash-foreground mt-0.5 text-sm font-semibold sm:text-base">Project update</p>
          </div>
          <p className="text-dash-muted-foreground hidden max-w-xl text-xs leading-relaxed sm:block sm:text-[13px]">
            Read-only link: preview and download files below. This is not the full Honic app — other projects and
            settings are not available.
          </p>
          <details className="text-dash-muted-foreground text-xs leading-relaxed sm:hidden">
            <summary className="text-dash-accent hover:text-dash-accent-dim cursor-pointer list-none font-semibold underline-offset-2 [&::-webkit-details-marker]:hidden">
              About this page
            </summary>
            <p className="border-dash-border mt-2 border-t pt-2">
              Read-only project update. Preview and download files below. This page is not the full Honic app — you
              cannot open other projects or settings from here.
            </p>
          </details>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8 lg:pt-10">{children}</div>

      <ShareStickyNav />
    </div>
  );
}
