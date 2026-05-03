import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared project · Honic",
  robots: { index: false, follow: false },
};

export default function ShareTokenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-dash-canvas text-dash-foreground min-h-screen">
      <header className="border-dash-border border-b bg-dash-card/90 px-4 py-4 sm:px-6">
        <p className="text-dash-muted-foreground text-[10px] font-semibold tracking-widest uppercase">Shared with you</p>
        <p className="text-dash-muted-foreground mt-1 max-w-2xl text-xs leading-relaxed">
          Read-only project update. You can preview and download files below. This page is not the full Honic app — you
          cannot open other projects or settings from here.
        </p>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">{children}</div>
    </div>
  );
}
