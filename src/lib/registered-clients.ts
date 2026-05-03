import type { SupabaseClient } from "@supabase/supabase-js";

import type { DashboardBanner, RegisteredClientRow } from "@/lib/dashboard-types";

type RegisteredRpcRow = {
  id: string;
  name: string;
  first_seen_at: string;
  last_seen_at: string;
};

function mapRegisteredRpc(rows: RegisteredRpcRow[]): RegisteredClientRow[] {
  return rows
    .filter((r) => r.name?.trim())
    .map((r) => ({
      id: r.id,
      name: r.name.trim(),
      firstSeenAt: r.first_seen_at,
      lastSeenAt: r.last_seen_at,
    }));
}

/**
 * Loads clients only from registered_clients (RPC + table).
 * Does not query invoices.
 */
export async function fetchRegisteredClients(supabase: SupabaseClient): Promise<{
  clients: RegisteredClientRow[];
  hints: string[];
  source: "registry_rpc" | "registry_table" | "none";
}> {
  const hints: string[] = [];
  let source: "registry_rpc" | "registry_table" | "none" = "none";
  let clients: RegisteredClientRow[] = [];

  const rpcReg = await supabase.rpc("get_registered_clients_for_dashboard");
  if (rpcReg.error) {
    hints.push(`get_registered_clients_for_dashboard: ${rpcReg.error.message}`);
  } else if (Array.isArray(rpcReg.data)) {
    const mapped = mapRegisteredRpc(rpcReg.data as RegisteredRpcRow[]);
    if (mapped.length > 0) {
      clients = mapped;
      source = "registry_rpc";
    }
  }

  if (clients.length === 0) {
    const tbl = await supabase
      .from("registered_clients")
      .select("id, name, first_seen_at, last_seen_at")
      .order("last_seen_at", { ascending: false });

    if (tbl.error) {
      hints.push(`registered_clients: ${tbl.error.message}`);
    } else if (tbl.data?.length) {
      clients = (tbl.data as RegisteredRpcRow[])
        .filter((r) => r.name?.trim())
        .map((r) => ({
          id: r.id,
          name: r.name.trim(),
          firstSeenAt: r.first_seen_at,
          lastSeenAt: r.last_seen_at,
        }));
      source = "registry_table";
    }
  }

  return { clients, hints, source };
}

export function bannerForRegistry(params: {
  clientsLength: number;
  hints: string[];
  usingServiceRole: boolean;
}): DashboardBanner | null {
  const { clientsLength, hints, usingServiceRole } = params;

  if (clientsLength > 0) {
    return null;
  }

  if (hints.length > 0) {
    return {
      tone: "error",
      text: `Could not load registered clients. ${hints.slice(0, 2).join(" · ")}${usingServiceRole ? "" : " Tip: add SUPABASE_SERVICE_ROLE_KEY in .env.local for server reads."}`,
    };
  }

  return null;
}
