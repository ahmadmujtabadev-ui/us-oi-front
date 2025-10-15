/* eslint-disable @typescript-eslint/no-explicit-any */

import Toast from "@/components/Toast";
import { bulkPauseConnectionsAsync, bulkRemoveConnectionsAsync, bulkResumeConnectionsAsync, createConnectionAsync, fetchConnectionsAsync, pauseConnectionAsync, removeConnectionAsync, resumeConnectionAsync, syncConnectionAsync } from "@/services/connection/asyncThunk";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";
const asArray = (v: any): ConnectionModel[] => (Array.isArray(v) ? v : v?.items ?? []);


export type Exchange = "binance" | "bybit" | "bingx";
export type Status = "connected" | "verifying" | "failed" | "paused";
export type Scope = "read" | "trade";

export interface ConnectionModel {
  id: string;
  exchange: Exchange;
  label: string;
  account?: string;
  status: Status;
  lastSyncAt?: string;
  scope: Scope;
  fingerprint: string;
  createdAt: string;
  lastError?: string;
}

export interface ConnectionState {
  isLoading: boolean;
  error: string;
  items: ConnectionModel[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  lastCreated?: ConnectionModel;
}

const initialState: ConnectionState = {
  isLoading: false,
  error: "",
  items: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
  },
  lastCreated: undefined,
};

export const connectionSlice = createSlice({
  name: "connections",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = "";
    },
    resetConnections: (state) => {
      state.items = [];
      state.pagination = initialState.pagination;
    },
  },
  extraReducers: (builder) => {
    // LIST
    builder
      .addCase(fetchConnectionsAsync.pending, (state) => {
        state.isLoading = true;
        state.error = "";
      })
      .addCase(
        fetchConnectionsAsync.fulfilled,
        (state, action: PayloadAction<ConnectionModel[] | { items: ConnectionModel[] }>) => {
          state.isLoading = false;
          const payload = action.payload as any;
          state.items = Array.isArray(payload) ? payload : payload?.items ?? []; // <-- always array
          // optional: if you keep pagination in this slice, also copy page/limit/total from payload
        }
      )
      .addCase(fetchConnectionsAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? "Failed to load connections";
      });

    builder
      .addCase(createConnectionAsync.pending, (state) => {
        state.isLoading = true;
        state.error = "";
      })
      .addCase(createConnectionAsync.fulfilled, (state, action: PayloadAction<ConnectionModel | any>) => {
        state.isLoading = false;
        state.lastCreated = action.payload;

        // Ensure we’re working with an array
        const existing = Array.isArray(state.items)
          ? state.items
          : (state.items as any)?.items ?? [];

        state.items = [action.payload, ...existing];  // safe prepend
        state.pagination.total = (state.pagination.total ?? 0) + 1;
      })

      .addCase(createConnectionAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? "Active credential not found";
        Toast.fire({ icon: "error", title: state.error });
      });

    // PAUSE
    builder
      .addCase(pauseConnectionAsync.pending, (state) => {
        state.isLoading = true;
        state.error = "";
      })
      .addCase(
        pauseConnectionAsync.fulfilled,
        (state, action: PayloadAction<{ id: string; status: Status }>) => {
          state.isLoading = false;
          const arr = asArray(state.items);
          const i = arr.findIndex((it) => it.id === action.payload.id);
          if (i >= 0) arr[i].status = action.payload.status;
          state.items = arr; // keep it as array
          Toast.fire({ icon: "success", title: "Connection paused" });
        }
      )
      .addCase(pauseConnectionAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? "Failed to pause connection";
      });


    builder
      .addCase(resumeConnectionAsync.pending, (state) => {
        state.isLoading = true;
        state.error = "";
      })
      .addCase(
        resumeConnectionAsync.fulfilled,
        (state, action: PayloadAction<{ id: string; status: Status }>) => {
          const arr = asArray(state.items);
          const i = arr.findIndex((it) => it.id === action.payload.id);
          if (i >= 0) arr[i].status = action.payload.status;
          state.items = arr;
          state.isLoading = false;
        }
      )
      .addCase(resumeConnectionAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? "Failed to resume connection";
        Toast.fire({ icon: "error", title: state.error });
      });

    builder
      .addCase(syncConnectionAsync.pending, (state) => {
        state.isLoading = true;
        state.error = "";
      })
      .addCase(
        syncConnectionAsync.fulfilled,
        (
          state,
          action: PayloadAction<{ id: string; lastSyncAt: string; status: Status }>
        ) => {
          state.isLoading = false;
          const index = state.items.findIndex((item) => item.id === action.payload.id);
          if (index !== -1) {
            state.items[index].lastSyncAt = action.payload.lastSyncAt;
            state.items[index].status = action.payload.status;
          }
          Toast.fire({ icon: "success", title: "Connection synced" });
        }
      )
      .addCase(syncConnectionAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? "Failed to sync connection";
        Toast.fire({ icon: "error", title: state.error });
      });

    builder
      .addCase(removeConnectionAsync.pending, (state) => {
        state.isLoading = true;
        state.error = "";
      })
      .addCase(
        removeConnectionAsync.fulfilled,
        (state, action: PayloadAction<{ id: string }>) => {
          state.isLoading = false;
          state.items = state.items.filter((item) => item.id !== action.payload.id);
          state.pagination.total -= 1;
          Toast.fire({ icon: "success", title: "Connection removed" });
        }
      )
      .addCase(removeConnectionAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? "Failed to remove connection";
        Toast.fire({ icon: "error", title: state.error });
      });

    builder
      .addCase(bulkPauseConnectionsAsync.pending, (state) => {
        state.isLoading = true;
        state.error = "";
      })
      .addCase(
        bulkPauseConnectionsAsync.fulfilled,
        (state, action: PayloadAction<{ ids: string[] }>) => {
          state.isLoading = false;
          action.payload.ids.forEach((id) => {
            const index = state.items.findIndex((item) => item.id === id);
            if (index !== -1) {
              state.items[index].status = "paused";
            }
          });
          Toast.fire({
            icon: "success",
            title: `${action.payload.ids.length} connections paused`,
          });
        }
      )
      .addCase(bulkPauseConnectionsAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? "Failed to pause connections";
        Toast.fire({ icon: "error", title: state.error });
      });

    builder
      .addCase(bulkResumeConnectionsAsync.pending, (state) => {
        state.isLoading = true;
        state.error = "";
      })
      .addCase(
        bulkResumeConnectionsAsync.fulfilled,
        (state, action: PayloadAction<{ ids: string[] }>) => {
          state.isLoading = false;
          action.payload.ids.forEach((id) => {
            const index = state.items.findIndex((item) => item.id === id);
            if (index !== -1) {
              state.items[index].status = "connected";
            }
          });
          Toast.fire({
            icon: "success",
            title: `${action.payload.ids.length} connections resumed`,
          });
        }
      )
      .addCase(bulkResumeConnectionsAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? "Failed to resume connections";
        Toast.fire({ icon: "error", title: state.error });
      });

    builder
      .addCase(bulkRemoveConnectionsAsync.pending, (state) => {
        state.isLoading = true;
        state.error = "";
      })
      .addCase(
        bulkRemoveConnectionsAsync.fulfilled,
        (state, action: PayloadAction<{ ids: string[] }>) => {
          state.isLoading = false;
          state.items = state.items.filter(
            (item) => !action.payload.ids.includes(item.id)
          );
          state.pagination.total -= action.payload.ids.length;
          Toast.fire({
            icon: "success",
            title: `${action.payload.ids.length} connections removed`,
          });
        }
      )
      .addCase(bulkRemoveConnectionsAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? "Failed to remove connections";
        Toast.fire({ icon: "error", title: state.error });
      });
  },
});


export default connectionSlice.reducer;

export const selectCredentials = (s: RootState) => s.lease;
