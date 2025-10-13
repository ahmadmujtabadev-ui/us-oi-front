import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Plus, UploadCloud, Search as SearchIcon, Filter, ChevronDown, Copy, Eye, RotateCw,
  Shield, Trash2, X, Check, ChevronRight, AlertTriangle, MoreHorizontal
} from 'lucide-react';
import { useRouter } from 'next/router';
import { DashboardLayout } from '@/components/layouts';

// --- Types ---
type Exchange = 'binance' | 'bybit' | 'bingx';
type Status = 'active' | 'revoked';

interface Credential {
  id: string;
  exchange: Exchange;
  label: string;
  apiKeyLast4: string;          // last-4 only
  fingerprint: string;          // e.g., "73:af:1b"
  ownerEmail?: string;
  ownerUsername?: string;
  status: Status;
  createdAt: string;            // ISO
  lastUsedAt?: string;          // ISO
  notes?: string;
  connections?: { id: string; name: string; status: 'connected' | 'paused' }[];
  audit?: { at: string; event: string }[];
}

// --- Logos (replace with real paths) ---
const EXCHANGE_META: Record<Exchange, { name: string; logo: string }> = {
  binance: { name: 'Binance', logo: '/exchanges/binance.svg' },
  bybit:   { name: 'Bybit',   logo: '/exchanges/bybit.svg' },
  bingx:   { name: 'BingX',   logo: '/exchanges/bingx.svg' },
};

// --- Utilities ---
const cn = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');
const daysBetween = (iso?: string) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : Infinity;

const relativeTime = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso).getTime();
  const diff = d - Date.now();
  const mins = Math.round(diff / 60000);
  const hours = Math.round(diff / 3600000);
  const days = Math.round(diff / 86400000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (Math.abs(mins) < 60) return rtf.format(mins, 'minute');
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
  return rtf.format(days, 'day');
};

// --- Mock Data ---
const MOCK: Credential[] = [
  {
    id: 'cred_1',
    exchange: 'binance',
    label: 'Main Binance',
    apiKeyLast4: '9F2A',
    fingerprint: '73:af:1b',
    ownerEmail: 'john@example.com',
    ownerUsername: 'johnny',
    status: 'active',
    createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
    lastUsedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    notes: 'Primary trading key',
    connections: [{ id: 'c1', name: 'Desk A', status: 'connected' }],
    audit: [
      { at: new Date(Date.now() - 39 * 24 * 3600 * 1000).toISOString(), event: 'Created' },
      { at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), event: 'Used for sync' },
    ],
  },
  {
    id: 'cred_2',
    exchange: 'bybit',
    label: 'Read Only',
    apiKeyLast4: '1C3D',
    fingerprint: '9c:44:ee',
    status: 'active',
    createdAt: new Date(Date.now() - 150 * 24 * 3600 * 1000).toISOString(),
    lastUsedAt: new Date(Date.now() - 120 * 24 * 3600 * 1000).toISOString(),
    connections: [],
    audit: [{ at: new Date(Date.now() - 150 * 24 * 3600 * 1000).toISOString(), event: 'Created' }],
  },
  {
    id: 'cred_3',
    exchange: 'bingx',
    label: 'Old Key',
    apiKeyLast4: '00AB',
    fingerprint: 'ad:3b:10',
    status: 'revoked',
    createdAt: new Date(Date.now() - 300 * 24 * 3600 * 1000).toISOString(),
    lastUsedAt: new Date(Date.now() - 200 * 24 * 3600 * 1000).toISOString(),
    notes: 'Deprecated',
    audit: [
      { at: new Date(Date.now() - 300 * 24 * 3600 * 1000).toISOString(), event: 'Created' },
      { at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(), event: 'Revoked' },
    ],
  },
];

// --- Tiny Components ---
function Badge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'emerald' | 'rose' }) {
  const map = {
    slate: 'bg-slate-50 text-slate-700 ring-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  } as const;
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1', map[tone])}>{children}</span>;
}

function MultiSelect<T extends string>({
  label, options, values, setValues,
}: {
  label: string;
  options: { value: T; label: string }[];
  values: T[];
  setValues: (v: T[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (v: T) => setValues(values.includes(v) ? values.filter(x => x !== v) : [...values, v]);
  const selectedText = values.length ? `${values.length} selected` : 'All';
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
        <Filter className="h-4 w-4" />
        {label}: <span className="font-medium">{selectedText}</span>
        <ChevronDown className="h-4 w-4 opacity-60" />
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <div className="max-h-64 overflow-auto">
            {options.map(opt => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-slate-50">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={values.includes(opt.value)} onChange={() => toggle(opt.value)} />
                <span className="text-slate-700">{opt.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-2 flex justify-end gap-2 px-2 pb-1">
            <button className="text-xs text-slate-600 hover:underline" onClick={() => setValues([])} type="button">Clear</button>
            <button className="text-xs font-medium text-indigo-600 hover:underline" onClick={() => setOpen(false)} type="button">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Re-auth modal for "Reveal once" ---
function ReAuthModal({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  const [pwd, setPwd] = useState('');
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5 text-slate-700" />
          <h3 className="text-sm font-semibold text-slate-800">Re-authentication required</h3>
        </div>
        <p className="text-sm text-slate-600">Enter your password to reveal the key once (visible for 30 seconds).</p>
        <input
          type="password"
          className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          placeholder="Your password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">Cancel</button>
          <button
            onClick={() => { if (pwd.trim()) onConfirm(); }}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Bottom sheet (mobile actions) ---
function BottomSheet({
  open, onClose, children, title,
}: { open: boolean; onClose: () => void; children: React.ReactNode; title: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[70%] rounded-t-2xl border-t border-slate-200 bg-white p-4 shadow-2xl">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-800">{title}</div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100"><X className="h-5 w-5 text-slate-600" /></button>
        </div>
        <div className="overflow-auto">{children}</div>
      </div>
    </div>
  );
}

// --- Main Page ---
export default function Credentials(): JSX.Element {
  const router = useRouter();

  const [rows, setRows] = useState<Credential[]>([]);
  useEffect(() => setRows(MOCK), []);

  // Toolbar state
  const [q, setQ] = useState('');
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [age, setAge] = useState<'any' | 'gt30' | 'gt90'>('any');
  const [sortBy, setSortBy] = useState<'created' | 'lastUsed'>('created');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Selection + UI
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);

  // Reveal once (store expiry timestamps)
  const [reauthOpen, setReauthOpen] = useState(false);
  const revealTarget = useRef<string | null>(null);
  const [revealedUntil, setRevealedUntil] = useState<Record<string, number>>({});
  useEffect(() => {
    const id = setInterval(() => {
      setRevealedUntil(prev => {
        const now = Date.now();
        const next = { ...prev };
        Object.keys(next).forEach(k => { if (next[k] < now) delete next[k]; });
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Derived filtered/sorted data
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = rows.filter(r => {
      if (exchanges.length && !exchanges.includes(r.exchange)) return false;
      if (statuses.length && !statuses.includes(r.status)) return false;
      if (age === 'gt30' && daysBetween(r.lastUsedAt) <= 30) return false;
      if (age === 'gt90' && daysBetween(r.lastUsedAt) <= 90) return false;
      if (!query) return true;
      const exName = EXCHANGE_META[r.exchange].name.toLowerCase();
      return (
        r.label.toLowerCase().includes(query) ||
        (r.ownerEmail ?? '').toLowerCase().includes(query) ||
        (r.ownerUsername ?? '').toLowerCase().includes(query) ||
        r.apiKeyLast4.toLowerCase().includes(query) ||
        exName.includes(query)
      );
    });
    list.sort((a, b) => {
      const av = sortBy === 'created' ? a.createdAt : (a.lastUsedAt || '');
      const bv = sortBy === 'created' ? b.createdAt : (b.lastUsedAt || '');
      const cmp = new Date(av).getTime() - new Date(bv).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [rows, q, exchanges, statuses, age, sortBy, sortDir]);

  const unusedOver90 = useMemo(() => filtered.filter(r => daysBetween(r.lastUsedAt) > 90 && r.status === 'active').length, [filtered]);

  // Actions (stub -> connect to API)
  const addCredential = () => router.push('/credentials/new');
  const importCsv = () => alert('Import CSV not wired');
  const copyLast4 = async (last4: string) => { try { await navigator.clipboard.writeText(last4); } catch { /* noop */ } };
  const openRevealOnce = (id: string) => { revealTarget.current = id; setReauthOpen(true); };
  const confirmReveal = () => {
    if (revealTarget.current) {
      setRevealedUntil(prev => ({ ...prev, [revealTarget.current as string]: Date.now() + 30_000 }));
    }
    revealTarget.current = null;
    setReauthOpen(false);
  };
  const rotate = (id: string) => alert(`Rotate ${id}`);
  const revoke = (id: string | string[]) => {
    const ids = Array.isArray(id) ? id : [id];
    setRows(prev => prev.map(r => (ids.includes(r.id) ? { ...r, status: 'revoked' } : r)));
  };
  const remove = (id: string) => setRows(prev => prev.filter(r => r.id !== id));

  // Mobile bottom sheet
  const [sheetFor, setSheetFor] = useState<Credential | null>(null);

  // Table header selection helpers
  const allSelected = filtered.length > 0 && filtered.every(r => !!selected[r.id]);
  const someSelected = filtered.some(r => !!selected[r.id]);

  return (
    <DashboardLayout>
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Credential Vault</h1>
            <p className="mt-1 text-sm text-slate-600">Securely manage your API keys and secrets.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addCredential}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" /> New Credential
            </button>
            <button
              onClick={importCsv}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <UploadCloud className="h-4 w-4" /> Import CSV
            </button>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mb-3 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Shield className="mt-0.5 h-5 w-5 text-slate-600" />
          <div className="text-sm text-slate-700">
            Secrets are encrypted. We only show key fingerprints after creation.
          </div>
        </div>
      </div>

      {/* Safety banner */}
      {unusedOver90 >= 3 && (
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="mb-3 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
            <div className="flex-1 text-sm text-amber-800">
              You have {unusedOver90} unused credentials (&gt; 90 days). Consider revoking them.
            </div>
            <button
              onClick={() => revoke(filtered.filter(r => daysBetween(r.lastUsedAt) > 90 && r.status === 'active').map(r => r.id))}
              className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              Revoke inactive
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="px-4 pb-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by last-4, label, email, username…"
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <MultiSelect
                label="Exchange"
                options={[
                  { label: 'Binance', value: 'binance' },
                  { label: 'Bybit', value: 'bybit' },
                  { label: 'BingX', value: 'bingx' },
                ]}
                values={exchanges}
                setValues={setExchanges}
              />
              <MultiSelect
                label="Status"
                options={[
                  { label: 'Active', value: 'active' },
                  { label: 'Revoked', value: 'revoked' },
                ]}
                values={statuses}
                setValues={setStatuses}
              />
              {/* Age filter */}
              <div className="relative">
                <button
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setAge(prev => prev === 'any' ? 'gt30' : prev === 'gt30' ? 'gt90' : 'any')}
                  type="button"
                  title="Toggle age filter"
                >
                  Age: <span className="font-medium">
                    {age === 'any' ? 'Any' : age === 'gt30' ? '> 30d' : '> 90d'}
                  </span>
                  <ChevronRight className="h-4 w-4 opacity-60" />
                </button>
              </div>
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="created">Sort: Created</option>
              <option value="lastUsed">Sort: Last Used</option>
            </select>
            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-0 z-10 border-y border-slate-200 bg-white/95 px-4 py-2 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">{selectedIds.length} selected</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => selectedIds.forEach(id => rotate(id))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
              >
                <RotateCw className="h-4 w-4" /> Rotate
              </button>
              <button
                onClick={() => revoke(selectedIds)}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100 inline-flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" /> Revoke
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="px-4 pb-10 sm:px-6 lg:px-8">
        <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white lg:block">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={filtered.length > 0 && filtered.every(r => selected[r.id])}
                    onChange={(e) => {
                      const on = e.target.checked;
                      const next: Record<string, boolean> = { ...selected };
                      filtered.forEach(r => (next[r.id] = on));
                      setSelected(next);
                    }}
                  />
                </th>
                <th className="px-3 py-3 text-left">Exchange</th>
                <th className="px-3 py-3 text-left">Label</th>
                <th className="px-3 py-3 text-left">Key</th>
                <th className="px-3 py-3 text-left">Owner</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-left">Created</th>
                <th className="px-3 py-3 text-left">Last Used</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(r => {
                const revealActive = revealedUntil[r.id] && revealedUntil[r.id] > Date.now();
                return (
                  <React.Fragment key={r.id}>
                    <tr className="hover:bg-slate-50">
                      <td className="w-10 px-4 py-3 align-top">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300"
                          checked={!!selected[r.id]}
                          onChange={(e) => setSelected(prev => ({ ...prev, [r.id]: e.target.checked }))}
                        />
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex items-center gap-3">
                          <div className="h-6 w-6 overflow-hidden rounded">
                            <Image src={EXCHANGE_META[r.exchange].logo} width={24} height={24} alt="" />
                          </div>
                          <span className="text-slate-800">{EXCHANGE_META[r.exchange].name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">{r.label}</td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-800">
                            {revealActive ? `FULL-KEY-…-${r.apiKeyLast4}` : `••••-••••-••••-${r.apiKeyLast4}`}
                          </span>
                          <button
                            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
                            title="Copy last-4"
                            onClick={() => copyLast4(r.apiKeyLast4)}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          {!revealActive ? (
                            <button
                              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
                              title="Reveal once"
                              onClick={() => openRevealOnce(r.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          ) : (
                            <Badge tone="emerald">Visible {Math.ceil((revealedUntil[r.id] - Date.now()) / 1000)}s</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        {(r.ownerEmail || r.ownerUsername) ? (
                          <div className="space-y-0.5">
                            {r.ownerEmail && <div className="text-slate-800">{r.ownerEmail}</div>}
                            {r.ownerUsername && <div className="text-xs text-slate-500">@{r.ownerUsername}</div>}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-3 align-top">
                        {r.status === 'active' ? <Badge tone="emerald">Active</Badge> : <Badge tone="rose">Revoked</Badge>}
                      </td>
                      <td className="px-3 py-3 align-top">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="px-3 py-3 align-top">{relativeTime(r.lastUsedAt)}</td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex items-center justify-end gap-1">
                          <button className="rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100" title="Rotate" onClick={() => rotate(r.id)}>
                            <RotateCw className="h-4 w-4" />
                          </button>
                          {r.status === 'active' ? (
                            <button className="rounded-lg px-2 py-1.5 text-rose-600 hover:bg-rose-50" title="Revoke" onClick={() => revoke(r.id)}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 px-2 py-1.5">—</span>
                          )}
                          <button
                            className="rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100"
                            title="More"
                            onClick={() => setExpanded(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Row drawer */}
                    {expanded[r.id] && (
                      <tr className="bg-slate-50/60">
                        <td />
                        <td colSpan={8} className="px-3 py-3">
                          <div className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
                            <div>
                              <div className="text-xs text-slate-500">Fingerprint</div>
                              <div className="font-mono text-sm font-medium text-slate-800">{r.fingerprint}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Notes</div>
                              <div className="text-sm text-slate-800">{r.notes ?? '—'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Connected connections</div>
                              <div className="text-sm text-slate-800">
                                {r.connections?.length
                                  ? r.connections.map(c => (
                                      <div key={c.id} className="flex items-center gap-2">
                                        <span className={cn('h-2 w-2 rounded-full', c.status === 'connected' ? 'bg-emerald-600' : 'bg-slate-400')} />
                                        {c.name}
                                      </div>
                                    ))
                                  : '—'}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Audit trail</div>
                              <div className="text-xs text-slate-700 space-y-1">
                                {r.audit?.length
                                  ? r.audit.map((a, i) => (
                                      <div key={i} className="flex items-center gap-2">
                                        <Check className="h-3.5 w-3.5 text-slate-500" />
                                        <span>{new Date(a.at).toLocaleString()} — {a.event}</span>
                                      </div>
                                    ))
                                  : '—'}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Empty state */}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-16 w-16 rounded-2xl bg-indigo-50" />
                      <div className="text-base font-semibold text-slate-800">No credentials yet</div>
                      <div className="text-sm text-slate-600">Add your first credential to get started.</div>
                      <button
                        onClick={addCredential}
                        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                      >
                        <Plus className="h-4 w-4" /> Add Credential
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 lg:hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-16">
              <div className="h-16 w-16 rounded-2xl bg-indigo-50" />
              <div className="text-base font-semibold text-slate-800">No credentials yet</div>
              <div className="text-sm text-slate-600">Add your first credential to get started.</div>
              <button
                onClick={addCredential}
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                <Plus className="h-4 w-4" /> Add Credential
              </button>
            </div>
          ) : (
            filtered.map(r => {
              const revealActive = revealedUntil[r.id] && revealedUntil[r.id] > Date.now();
              return (
                <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 overflow-hidden rounded">
                        <Image src={EXCHANGE_META[r.exchange].logo} width={32} height={32} alt="" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{r.label}</div>
                        <div className="text-xs text-slate-500">{EXCHANGE_META[r.exchange].name}</div>
                      </div>
                    </div>
                    {r.status === 'active' ? <Badge tone="emerald">Active</Badge> : <Badge tone="rose">Revoked</Badge>}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-slate-500">Key</div>
                      <div className="font-mono text-slate-800">
                        {revealActive ? `FULL-KEY-…-${r.apiKeyLast4}` : `••••-••••-••••-${r.apiKeyLast4}`}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Last Used</div>
                      <div className="text-slate-800">{relativeTime(r.lastUsedAt)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Owner</div>
                      <div className="text-slate-800">{r.ownerEmail || r.ownerUsername || '—'}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Fingerprint</div>
                      <div className="font-mono text-slate-800">{r.fingerprint}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <button
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                      onClick={() => setExpanded(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                    >
                      Details
                    </button>
                    <button
                      className="rounded-lg p-1.5 hover:bg-slate-100"
                      onClick={() => setSheetFor(r)}
                      aria-label="More"
                    >
                      <MoreHorizontal className="h-5 w-5 text-slate-600" />
                    </button>
                  </div>

                  {expanded[r.id] && (
                    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs">
                      <div className="mb-1 text-slate-500">Notes</div>
                      <div className="text-slate-700">{r.notes ?? '—'}</div>
                      <div className="mt-2 text-slate-500">Audit</div>
                      <div className="text-slate-700">
                        {r.audit?.map((a, i) => <div key={i}>{new Date(a.at).toLocaleString()} — {a.event}</div>) ?? '—'}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Mobile bottom sheet actions */}
      <BottomSheet open={!!sheetFor} onClose={() => setSheetFor(null)} title="Credential Actions">
        {sheetFor && (
          <div className="space-y-2">
            <button
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              onClick={() => copyLast4(sheetFor.apiKeyLast4)}
            >
              Copy last-4 <Copy className="h-4 w-4" />
            </button>
            <button
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              onClick={() => { openRevealOnce(sheetFor.id); setSheetFor(null); }}
            >
              Reveal once <Eye className="h-4 w-4" />
            </button>
            <button
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              onClick={() => rotate(sheetFor.id)}
            >
              Rotate <RotateCw className="h-4 w-4" />
            </button>
            {sheetFor.status === 'active' ? (
              <button
                className="flex w-full items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                onClick={() => { revoke(sheetFor.id); setSheetFor(null); }}
              >
                Revoke <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        )}
      </BottomSheet>

      {/* Re-auth modal */}
      <ReAuthModal open={reauthOpen} onClose={() => setReauthOpen(false)} onConfirm={confirmReveal} />
    </div>
    </DashboardLayout>
  );
}
