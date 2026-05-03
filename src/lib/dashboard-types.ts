export type DashboardBanner = {
  tone: "success" | "warn" | "error";
  text: string;
};

/** Green header dot when registry loaded fine (no error banner). Success banners are often suppressed. */
export function isDashboardRegistryOk(banner: DashboardBanner | null): boolean {
  return banner?.tone !== "error";
}

export type RegisteredClientRow = {
  id: string;
  name: string;
  firstSeenAt?: string | null;
  lastSeenAt?: string | null;
};
