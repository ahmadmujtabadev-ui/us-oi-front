/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useMemo, useState } from "react";
import { X, Plus } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/redux/store";
import { Scope } from "@/redux/slices/leaseSlice";
import { fetchCredentialsAsync } from "@/services/credientials/asyncThunk";
import { Exchange } from "@/services/credientials/enpoints";
import { createConnectionAsync } from "@/services/connection/asyncThunk";
import { CredentialModel } from "@/redux/slices/credientialSlice";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

type Paged<T> = { items: T[] };
type ItemsOrPaged<T> = T[] | Paged<T>;

function asArray<T>(val: ItemsOrPaged<T>): T[] {
  return Array.isArray(val) ? val : (val?.items ?? []);
}

export default function AddConnectionModal({ open, onClose, onCreated }: Props) {
  const dispatch = useDispatch<AppDispatch>();

  const { credentials, isLoading } = useSelector((s: RootState) => {
    const cred = s.credential as { items: ItemsOrPaged<CredentialModel>; isLoading: boolean };
    return {
      credentials: asArray<CredentialModel>(cred.items),
      isLoading: cred.isLoading,
    };
  });
  const [selectedCredId, setSelectedCredId] = useState<string>("");
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<Scope>("read");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  console.log(error)

  useEffect(() => {
    if (open) {
      dispatch(fetchCredentialsAsync());
      setSelectedCredId("");
      setLabel("");
      setScope("read");
      setError(null);
    }
  }, [open, dispatch]);

  const selectedCred = useMemo(
    () => credentials?.find((c) => c.id === selectedCredId),
    [credentials, selectedCredId]
  );

  useEffect(() => {
    if (selectedCred) {
      const exName = (selectedCred.exchange || "").toString().toUpperCase().slice(0, 1) +
        (selectedCred.exchange || "").toString().slice(1);
      setLabel(selectedCred.label || `${exName} Connection`);
    } else {
      setLabel("");
    }
  }, [selectedCred]);

  const exchange: Exchange | undefined = selectedCred?.exchange;

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedCredId) return setError("Please select a credential.");
    if (!exchange) return setError("Selected credential is missing exchange.");
    if (!label.trim()) return setError("Please enter a label.");

    try {
      setSubmitting(true);
      await dispatch(
        createConnectionAsync({
          credentialId: selectedCredId,
          exchange,
          label: label.trim(),
          scope,
        } as any)
      ).unwrap();

      onCreated?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Active credential not found.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Add Integration (Use existing credential)</h3>
          <button className="rounded-md p-1 text-slate-500 hover:bg-slate-100" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="px-4 py-4 space-y-3">
          <label className="text-sm block">
            <span className="text-slate-600">Credential</span>
            <select
              value={selectedCredId}
              onChange={(e) => setSelectedCredId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              disabled={isLoading || submitting}
            >
              <option value="">Select a saved credential…</option>
              {credentials?.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.exchange?.toUpperCase()} · {c.label || c.email || c.username || c.id.slice(-6)}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="text-slate-600">Exchange</span>
              <input
                value={exchange || ""}
                readOnly
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              />
            </label>

            <label className="text-sm">
              <span className="text-slate-600">Scope</span>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as Scope)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                disabled={submitting}
              >
                <option value="read">Read</option>
                <option value="trade">Trade</option>
              </select>
            </label>
          </div>

          <label className="text-sm block">
            <span className="text-slate-600">Label</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="e.g., Main Binance"
              disabled={submitting}
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedCredId}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {submitting ? "Connecting…" : "Connect"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
