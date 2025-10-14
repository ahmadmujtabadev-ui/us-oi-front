// ====================
// ASYNC THUNKS
// ====================

import { createAsyncThunk } from "@reduxjs/toolkit";
import ls from "localstorage-slim";
import { HttpService } from "../index";
import Toast from "@/components/Toast";
import { connectionService } from "./endpoint";


/**
 * Fetch all connections with optional filters
 */
// export const fetchConnectionsAsync = createAsyncThunk(
//   "connections/fetchAll",
//   async (
//     {

//     },
//     { rejectWithValue }
//   ) => {
//     try {
//       const response = await connectionService.listConnections();
//             console.log("response", response)

//       return response.data;
//     } catch (error: any) {
//       return rejectWithValue(
//         error?.response?.data?.message || "Failed to fetch connections"
//       );
//     }
//   }
// );

// in asyncThunk.ts
export const fetchConnectionsAsync = createAsyncThunk(
  "connections/fetchAll",
  async (_: void, { rejectWithValue }) => {
    try {
      const token = `${ls.get("access_token", { decrypt: true })}`;
      HttpService.setToken(token);
      const response = await connectionService.listConnections();

      if (!response?.success && response?.status === 400) {
        return rejectWithValue(response.message);
      }

      // Normalize to paged shape even if API returns []:
      const data = Array.isArray(response.data)
        ? { items: response.data, page: 1, pageSize: response.data.length, total: response.data.length }
        : response.data; // already a paged envelope

      return data; // Paged<CredentialModel>
    } catch (e: any) {
      return rejectWithValue(e?.response?.data?.message || "Failed to fetch drafts");
    }
  }
);



/**
 * Create a new connection
 */
export const createConnectionAsync = createAsyncThunk(
  "connections/create",
  async (
    data: {
      credentialId: string;
      label?: string;
      scope: "read" | "trade";
      account?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await connectionService.createConnection(data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || "Failed to create connection"
      );
    }
  }
);

/**
 * Pause a connection
 */
export const pauseConnectionAsync = createAsyncThunk(
  "connections/pause",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await connectionService.pauseConnection(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || "Failed to pause connection"
      );
    }
  }
);

/**
 * Resume a connection
 */
export const resumeConnectionAsync = createAsyncThunk(
  "connections/resume",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await connectionService.resumeConnection(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || "Failed to resume connection"
      );
    }
  }
);

/**
 * Sync a connection immediately
 */
export const syncConnectionAsync = createAsyncThunk(
  "connections/sync",
  async (id: string, { rejectWithValue }) => {
    console.log("running", id)
    try {
      const response = await connectionService.syncConnection(id);
      console.log("response", response.data)

      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || "Failed to sync connection"
      );
    }
  }
);

/**
 * Remove a connection
 */
export const removeConnectionAsync = createAsyncThunk(
  "connections/remove",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await connectionService.removeConnection(id);
      return { id, ...response.data };
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || "Failed to remove connection"
      );
    }
  }
);

/**
 * Bulk pause connections
 */
export const bulkPauseConnectionsAsync = createAsyncThunk(
  "connections/bulkPause",
  async (ids: string[], { rejectWithValue }) => {
    try {
      const response = await connectionService.bulkPauseConnections(ids);
      return { ids, ...response.data };
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || "Failed to pause connections"
      );
    }
  }
);

/**
 * Bulk resume connections
 */
export const bulkResumeConnectionsAsync = createAsyncThunk(
  "connections/bulkResume",
  async (ids: string[], { rejectWithValue }) => {
    try {
      const response = await connectionService.bulkResumeConnections(ids);
      return { ids, ...response.data };
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || "Failed to resume connections"
      );
    }
  }
);

/**
 * Bulk remove connections
 */
export const bulkRemoveConnectionsAsync = createAsyncThunk(
  "connections/bulkRemove",
  async (ids: string[], { rejectWithValue }) => {
    try {
      const response = await connectionService.bulkRemoveConnections(ids);
      return { ids, ...response.data };
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || "Failed to remove connections"
      );
    }
  }
);