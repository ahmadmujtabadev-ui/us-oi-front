import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import Toast from "@/components/Toast";
import {
  fetchCredentialsAsync,
  revokeCredentialAsync,
  rotateCredentialAsync,
  saveLeasesAsync
} from "@/services/loi/asyncThunk"; // ✅ fixepd path
import type { RootState } from "@/redux/store";

export interface CredentialModel {
  id: string;
  exchange?: "binance" | "bybit" | "bingx";
  label?: string;
  apiKeyMasked?: string;
  apiKeyFingerprint?: string;
  status?: "active" | "revoked";
  createdAt?: string;
  lastUsedAt?: string;
  ownerEmail?: string;
  ownerUsername?: string;
  notes?: string;
  // Add any other fields specific to your lease/credential model
}

export interface CredentialState {
  isLoading: boolean;
  error: string;
  items: CredentialModel[];
  lastSaved?: CredentialModel;
}

export interface CredentialState {
  isLoading: boolean;
  error: string;
  items: CredentialModel[];
  lastSaved?: CredentialModel;
}

const initialState: CredentialState = {
  isLoading: false,
  error: "",
  items: [],
  lastSaved: undefined,
};

export const credentialSlice = createSlice({
  name: "credentials",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // SAVE
    builder
      .addCase(saveLeasesAsync.pending, (state) => {
        state.isLoading = true;
        state.error = "";
      })
      .addCase(saveLeasesAsync.fulfilled, (state, action: PayloadAction<CredentialModel>) => {
        state.isLoading = false;
        state.lastSaved = action.payload;
        state.items.unshift(action.payload);
        Toast.fire({ icon: "success", title: "Credential saved" });
      })
      .addCase(saveLeasesAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? "Failed to save credential";
        Toast.fire({ icon: "error", title: state.error });
      });

    // LIST
    builder
      .addCase(fetchCredentialsAsync.pending, (state) => {
        state.isLoading = true;
        state.error = "";
      })
      .addCase(fetchCredentialsAsync.fulfilled, (state, action: PayloadAction<CredentialModel[]>) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchCredentialsAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? "Failed to load credentials";
      });

    builder
      .addCase(rotateCredentialAsync.fulfilled, (state, action: PayloadAction<{ id: string; rotatedAt?: string }>) => {
        const id = action.payload.id;
        const arr = state.items?.items ?? [];
        const i = arr.findIndex(x => x.id === id);
        if (i >= 0) {
          // If your backend returns additional fields, merge them:
          arr[i] = { ...arr[i], ...action.payload };
        }
        Toast.fire({ icon: "success", title: "Credential rotated" });
      })
      .addCase(rotateCredentialAsync.rejected, (_state, action) => {
        Toast.fire({ icon: "error", title: (action.payload as string) ?? "Rotate failed" });
      });
    builder
      .addCase(revokeCredentialAsync.fulfilled, (state, action: PayloadAction<{ id: string; status: "revoked" }>) => {
        const id = action.payload.id;
        const arr = state.items?.items ?? [];
        const i = arr.findIndex(x => x.id === id);
        if (i >= 0) {
          arr[i].status = "revoked" as CredentialModel["status"];
        }
        Toast.fire({ icon: "success", title: "Credential revoked" });
      })
      .addCase(revokeCredentialAsync.rejected, (_state, action) => {
        Toast.fire({ icon: "error", title: (action.payload as string) ?? "Revoke failed" });
      });
    // DELETE

  },
});

export default credentialSlice.reducer;
export const selectCredentials = (s: RootState) => s.credential as CredentialState;
