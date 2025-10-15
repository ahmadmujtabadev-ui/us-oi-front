/* eslint-disable @typescript-eslint/no-explicit-any */

// ConnectionsPage.tsx  (trimmed to key changes)
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Pause, Play, RefreshCw, Trash2, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/layouts";
import type { AppDispatch, RootState } from "@/redux/store";
import {
  fetchConnectionsAsync,
  pauseConnectionAsync,
  resumeConnectionAsync,
  syncConnectionAsync,
  removeConnectionAsync,
} from "@/services/connection/asyncThunk";
import AddConnectionModal from "@/components/models/AddconnectionModel";
import { Exchange } from "@/services/credientials/enpoints";
import { ConnectionModel } from "@/redux/slices/leaseSlice";


function timeAgo(iso?: string) {
  if (!iso) return "—";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(-mins, "minute");
}

const EXCHANGE_META: Record<Exchange, { name: string }> = {
  binance: { name: "Binance" },
  bybit: { name: "Bybit" },
  bingx: { name: "BingX"},
};

export default function ConnectionsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const isLoading = useSelector((s: RootState) => s.lease.isLoading); 
  const raw = useSelector((s: RootState) => s.lease.items);

  console.log("itms", raw)
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => { dispatch(fetchConnectionsAsync()); }, [dispatch]);

  const rows: ConnectionModel[] = useMemo(() => {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray((raw as any).items)) return (raw as any).items;
  return [];
}, [raw]);

const list = useMemo(
  () =>
    rows.filter(r =>
      (r?.label + EXCHANGE_META[r.exchange]?.name)
    
    ),
  [rows, q]
);

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Connections</h1>
            <p className="text-sm text-slate-600">Manage your active exchange connections.</p>
          </div>
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
            <Plus className="h-4 w-4" /> Add Integration
          </button>
        </div>

        <div className="mb-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-3 text-left">Exchange</th>
                <th className="px-3 py-3 text-left">Label</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-left">Last Sync</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      {EXCHANGE_META[r.exchange].name}
                    </div>
                  </td>
                  <td className="px-3 py-3">{r.label}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1 ${
                      r.status === "connected"
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : r.status === "verifying"
                        ? "bg-indigo-50 text-indigo-700 ring-indigo-200"
                        : r.status === "paused"
                        ? "bg-slate-50 text-slate-600 ring-slate-200"
                        : "bg-rose-50 text-rose-700 ring-rose-200"
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-3 py-3">{timeAgo(r.lastSyncAt)}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      {r.status === "paused" ? (
                        <button className="rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                          onClick={() => dispatch(resumeConnectionAsync(r.id))} disabled={isLoading}>
                          <Play className="h-4 w-4" />
                        </button>
                      ) : (
                        <button className="rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                          onClick={() => dispatch(pauseConnectionAsync(r.id))} disabled={isLoading}>
                          <Pause className="h-4 w-4" />
                        </button>
                      )}
                      <button className="rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                        onClick={() => dispatch(syncConnectionAsync(r.id))}
                        disabled={isLoading || r.status !== "connected"}>
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button className="rounded-lg px-2 py-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        onClick={() => dispatch(removeConnectionAsync(r.id))}
                        disabled={isLoading}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {r.status === "failed" && r.lastError && (
                      <div className="mt-1 text-xs text-rose-700">Error: {r.lastError}</div>
                    )}
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={5} className="py-16 text-center text-slate-600">No connections yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {open && (
          <AddConnectionModal
            open={open}
            onClose={() => setOpen(false)}
            onCreated={() => dispatch(fetchConnectionsAsync())}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
