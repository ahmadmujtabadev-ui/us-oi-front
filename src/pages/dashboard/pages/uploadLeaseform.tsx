import React, { JSX, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import {
  Plus,
  Search as SearchIcon,
  Filter,
  ChevronDown,
  MoreHorizontal,
  Pause,
  Play,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Eye,
  X,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layouts';
import type { AppDispatch, RootState } from '@/redux/store';
import {
  fetchConnectionsAsync,
  pauseConnectionAsync,
  resumeConnectionAsync,
  syncConnectionAsync,
  removeConnectionAsync,
  bulkPauseConnectionsAsync,
  bulkResumeConnectionsAsync,
  bulkRemoveConnectionsAsync,
} from '@/services/lease/asyncThunk';

// --- Mock logos (replace with real) ---
const EXCHANGE_META: Record<Exchange, { name: string; logo: string }> = {
  binance: { name: 'Binance', logo: '/exchanges/binance.svg' },
  bybit: { name: 'Bybit', logo: '/exchanges/bybit.svg' },
  bingx: { name: 'BingX', logo: '/exchanges/bingx.svg' },
};

// --- Helpers ---
function classNames(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(' ');
}

function relativeMinutesFromNow(iso?: string) {
  if (!iso) return '—';
  const diffMs = new Date(iso).getTime() - Date.now();
  const mins = Math.round(diffMs / 60000);
  return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(mins, 'minute');
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    connected: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    verifying: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    failed: 'bg-rose-50 text-rose-700 ring-rose-200',
    paused: 'bg-slate-50 text-slate-600 ring-slate-200',
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={classNames('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1', map[status])}>
      {status === 'failed' && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-rose-600" />}
      {label}
    </span>
  );
}

// --- Filter components ---
function MultiSelectFilter<T extends string>({
  label,
  options,
  values,
  setValues,
}: {
  label: string;
  options: { value: T; label: string }[];
  values: T[];
  setValues: (next: T[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (v: T) =>
    setValues(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);

  const selectedText = values.length ? `${values.length} selected` : 'All';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
      >
        <Filter className="h-4 w-4" />
        {label}: <span className="font-medium">{selectedText}</span>
        <ChevronDown className="h-4 w-4 opacity-60" />
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <div className="max-h-64 overflow-auto">
            {options.map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-slate-50">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={values.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                />
                <span className="text-slate-700">{opt.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-2 flex justify-end gap-2 px-2 pb-1">
            <button
              className="text-xs text-slate-600 hover:underline"
              onClick={() => setValues([])}
              type="button"
            >
              Clear
            </button>
            <button
              className="text-xs font-medium text-indigo-600 hover:underline"
              onClick={() => setOpen(false)}
              type="button"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main Page ---
export default function ConnectionsPage(): JSX.Element {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  // Redux state
  const connections = useSelector((state: RootState) => state.lease.items);
  console.log("connections", connections)
  const isLoading = useSelector((state: RootState) => state.lease.isLoading);

  // UI state
  const [query, setQuery] = useState('');
  const [filterExchanges, setFilterExchanges] = useState<Exchange[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<Status[]>([]);
  const [filterScopes, setFilterScopes] = useState<Scope[]>([]);
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [errorPanel, setErrorPanel] = useState<ConnectionModel | null>(null);

  useEffect(() => {
    dispatch(
      fetchConnectionsAsync()
    );
  }, []);

  // Client-side filtering (if API doesn't handle all)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return connections?.filter((r) => {
      if (issuesOnly && r.status !== 'failed') return false;
      if (filterExchanges.length && !filterExchanges.includes(r.exchange)) return false;
      if (filterStatuses.length && !filterStatuses.includes(r.status)) return false;
      if (filterScopes.length && !filterScopes.includes(r.scope)) return false;

      if (!q) return true;
      const meta = EXCHANGE_META[r.exchange].name.toLowerCase();
      return (
        r.label.toLowerCase().includes(q) ||
        (r.account ?? '').toLowerCase().includes(q) ||
        r.fingerprint.toLowerCase().includes(q) ||
        meta.includes(q)
      );
    });
  }, [connections, query, filterExchanges, filterScopes, filterStatuses, issuesOnly]);

  const allSelected = filtered?.length > 0 && filtered.every((r) => selected[r.id]);
  const someSelected = filtered?.some((r) => selected[r.id]);
  const selectedIds = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([k]) => k);

  // Handlers using Redux actions
  const addIntegration = () => router.push('/integrations/new');
  const viewRow = (id: string) => router.push(`/connections/${id}`);

  const pauseRows = async (ids: string[]) => {
    if (ids.length === 1) {
      await dispatch(pauseConnectionAsync(ids[0]));
    } else {
      await dispatch(bulkPauseConnectionsAsync(ids));
    }
    setSelected({});
  };

  const resumeRows = async (ids: string[]) => {
    if (ids.length === 1) {
      await dispatch(resumeConnectionAsync(ids[0]));
    } else {
      await dispatch(bulkResumeConnectionsAsync(ids));
    }
    setSelected({});
  };

  const removeRows = async (ids: string[]) => {
    if (ids.length === 1) {
      await dispatch(removeConnectionAsync(ids[0]));
    } else {
      await dispatch(bulkRemoveConnectionsAsync(ids));
    }
    setSelected({});
  };

  const syncNow = async (id: string) => {
    await dispatch(syncConnectionAsync(id));
  };

  const retrySync = async (id: string) => {
    await dispatch(syncConnectionAsync(id));
    setErrorPanel(null);
  };

  return (
    <DashboardLayout>
      <div className="flex-1 overflow-auto">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-6 shadow-xl">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              <div className="text-sm font-medium text-slate-700">Loading connections...</div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="px-4 pt-6 pb-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Connections</h1>
              <p className="mt-1 text-sm text-slate-600">Manage your active exchange connections.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addIntegration}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
              >
                <Plus className="h-4 w-4" />
                Add Integration
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-4 pb-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by label, fingerprint, or exchange…"
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <MultiSelectFilter
                  label="Exchange"
                  options={[
                    { label: 'Binance', value: 'binance' },
                    { label: 'Bybit', value: 'bybit' },
                    { label: 'BingX', value: 'bingx' },
                  ]}
                  values={filterExchanges}
                  setValues={setFilterExchanges}
                />
                <MultiSelectFilter
                  label="Status"
                  options={[
                    { label: 'Connected', value: 'connected' },
                    { label: 'Verifying', value: 'verifying' },
                    { label: 'Failed', value: 'failed' },
                    { label: 'Paused', value: 'paused' },
                  ]}
                  values={filterStatuses}
                  setValues={setFilterStatuses as any}
                />
                <MultiSelectFilter
                  label="Scope"
                  options={[
                    { label: 'Read', value: 'read' },
                    { label: 'Trade', value: 'trade' },
                  ]}
                  values={filterScopes}
                  setValues={setFilterScopes as any}
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={issuesOnly}
                onChange={(e) => setIssuesOnly(e.target.checked)}
              />
              Show issues only
            </label>
          </div>
        </div>

        {/* Bulk actions */}
        {someSelected && (
          <div className="sticky top-0 z-10 border-y border-slate-200 bg-white/95 px-4 py-2 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                {selectedIds.length} selected
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => pauseRows(selectedIds)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Pause className="h-4 w-4" /> Pause
                </button>
                <button
                  onClick={() => resumeRows(selectedIds)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="h-4 w-4" /> Resume
                </button>
                <button
                  onClick={() => removeRows(selectedIds)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="px-4 pb-10 sm:px-6 lg:px-8">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white lg:block">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={allSelected}
                      onChange={(e) => {
                        const on = e.target.checked;
                        const next: Record<string, boolean> = { ...selected };
                        filtered?.forEach((r) => (next[r.id] = on));
                        setSelected(next);
                      }}
                    />
                  </th>
                  <th className="px-3 py-3 text-left">Exchange</th>
                  <th className="px-3 py-3 text-left">Label / Account</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3 text-left">Last Sync</th>
                  <th className="px-3 py-3 text-left">Scope</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered?.map((r) => (
                  <React.Fragment key={r.id}>
                    <tr className="hover:bg-slate-50">
                      <td className="w-10 px-4 py-3 align-top">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300"
                          checked={!!selected[r.id]}
                          onChange={(e) =>
                            setSelected((prev) => ({ ...prev, [r.id]: e.target.checked }))
                          }
                        />
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex items-center gap-3">
                          <div className="h-6 w-6 overflow-hidden rounded">
                            <Image
                              src={EXCHANGE_META[r.exchange].logo}
                              alt={EXCHANGE_META[r.exchange].name}
                              width={24}
                              height={24}
                            />
                          </div>
                          <div className="text-slate-800">{EXCHANGE_META[r.exchange].name}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="text-slate-900">{r.label}</div>
                        <div className="text-xs text-slate-500">{r.account ?? '—'}</div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="px-3 py-3 align-top">{relativeMinutesFromNow(r.lastSyncAt)}</td>
                      <td className="px-3 py-3 align-top capitalize">{r.scope}</td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100"
                            title="View"
                            onClick={() => viewRow(r.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {r.status === 'paused' ? (
                            <button
                              className="rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                              title="Resume"
                              onClick={() => resumeRows([r.id])}
                              disabled={isLoading}
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              className="rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                              title="Pause"
                              onClick={() => pauseRows([r.id])}
                              disabled={isLoading}
                            >
                              <Pause className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            className="rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                            title="Sync now"
                            onClick={() => syncNow(r.id)}
                            disabled={isLoading}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-lg px-2 py-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                            title="Remove"
                            onClick={() => removeRows([r.id])}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100"
                            title="More"
                            onClick={() =>
                              setExpanded((prev) => ({ ...prev, [r.id]: !prev[r.id] }))
                            }
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Row details */}
                    {expanded[r.id] && (
                      <tr className="bg-slate-50/60">
                        <td />
                        <td colSpan={6} className="px-3 py-3">
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <div className="text-xs text-slate-500">Credential fingerprint</div>
                              <div className="text-sm font-medium text-slate-800">{r.fingerprint}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Created</div>
                              <div className="text-sm font-medium text-slate-800">
                                {new Date(r.createdAt).toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Last error</div>
                              <div className="text-sm text-slate-700">{r.lastError ?? '—'}</div>
                            </div>
                            <div className="flex items-end justify-end">
                              <button
                                onClick={() =>
                                  r.status === 'failed'
                                    ? setErrorPanel(r)
                                    : router.push(`/logs?conn=${r.id}`)
                                }
                                className={classNames(
                                  'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm',
                                  r.status === 'failed'
                                    ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                                )}
                              >
                                <AlertTriangle className="h-4 w-4" />
                                {r.status === 'failed' ? 'View error' : 'View logs'}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {/* Empty state (desktop) */}
            {filtered?.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <div className="h-16 w-16 rounded-2xl bg-indigo-50" />
                <div className="text-base font-semibold text-slate-800">No connections yet</div>
                <div className="text-sm text-slate-600">
                  Connect your first exchange to get started.
                </div>
                <button
                  onClick={addIntegration}
                  className="mt-2 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  <Plus className="h-4 w-4" />
                  Add Integration
                </button>
              </div>
            )}
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {filtered?.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-16">
                <div className="h-16 w-16 rounded-2xl bg-indigo-50" />
                <div className="text-base font-semibold text-slate-800">No connections yet</div>
                <div className="text-sm text-slate-600 text-center px-8">
                  Connect your first exchange to get started.
                </div>
                <button
                  onClick={addIntegration}
                  className="mt-2 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  <Plus className="h-4 w-4" />
                  Add Integration
                </button>
              </div>
            ) : (
              filtered?.map((r) => (
                <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 overflow-hidden rounded">
                        <Image
                          src={EXCHANGE_META[r.exchange].logo}
                          alt={EXCHANGE_META[r.exchange].name}
                          width={32}
                          height={32}
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {EXCHANGE_META[r.exchange].name}
                        </div>
                        <div className="text-xs text-slate-500">{r.label}</div>
                      </div>
                    </div>
                    <StatusPill status={r.status} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>
                      <div className="text-slate-500">Account</div>
                      <div className="font-medium text-slate-800">{r.account ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Last Sync</div>
                      <div className="font-medium text-slate-800">{relativeMinutesFromNow(r.lastSyncAt)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Scope</div>
                      <div className="capitalize font-medium text-slate-800">{r.scope}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Fingerprint</div>
                      <div className="font-medium text-slate-800 break-all">{r.fingerprint}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <button
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                      onClick={() => setExpanded((prev) => ({ ...prev, [r.id]: !prev[r.id] }))}
                    >
                      Details
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
                        onClick={() => viewRow(r.id)}
                      >
                        View
                      </button>
                      {r.status === 'paused' ? (
                        <button
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
                          onClick={() => resumeRows([r.id])}
                          disabled={isLoading}
                        >
                          Resume
                        </button>
                      ) : (
                        <button
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
                          onClick={() => pauseRows([r.id])}
                          disabled={isLoading}
                        >
                          Pause
                        </button>
                      )}
                      <button
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
                        onClick={() => syncNow(r.id)}
                        disabled={isLoading}
                      >
                        Sync
                      </button>
                      <button
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 disabled:opacity-50"
                        onClick={() => removeRows([r.id])}
                        disabled={isLoading}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {expanded[r.id] && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                      <div className="grid gap-3 text-xs sm:grid-cols-2">
                        <div>
                          <div className="text-slate-500">Created</div>
                          <div className="font-medium text-slate-800">{new Date(r.createdAt).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">Last error</div>
                          <div className="font-medium text-slate-800">{r.lastError ?? '—'}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => (r.status === 'failed' ? setErrorPanel(r) : router.push(`/logs?conn=${r.id}`))}
                          className={classNames(
                            'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs',
                            r.status === 'failed'
                              ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          )}
                        >
                          <AlertTriangle className="h-4 w-4" />
                          {r.status === 'failed' ? 'View error' : 'View logs'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Error Panel (Modal) */}
        {errorPanel && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setErrorPanel(null)} />
            <div className="relative z-10 w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Sync error</h3>
                </div>
                <button
                  className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                  onClick={() => setErrorPanel(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-4 py-4">
                <div className="space-y-2">
                  <div className="text-xs text-slate-500">Connection</div>
                  <div className="text-sm font-medium text-slate-800">
                    {EXCHANGE_META[errorPanel.exchange].name} · {errorPanel.label}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-xs text-slate-500">Last error message</div>
                  <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                    {errorPanel.lastError ?? '—'}
                  </pre>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setErrorPanel(null)}
                  >
                    Close
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                    onClick={() => retrySync(errorPanel.id)}
                    disabled={isLoading}
                  >
                    <RefreshCw className="h-4 w-4" /> Retry sync
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
