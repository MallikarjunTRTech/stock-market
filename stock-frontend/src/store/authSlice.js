import { createSlice } from "@reduxjs/toolkit";

function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getRolesFromClaims(claims) {
  if (!claims) return [];

  const keys = [
    "role",
    "roles",
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
  ];

  for (const k of keys) {
    const v = claims[k];
    if (!v) continue;
    return Array.isArray(v) ? v : [v];
  }

  return [];
}

const tokenFromStorage = localStorage.getItem("token");
const claimsFromStorage = tokenFromStorage ? decodeJwt(tokenFromStorage) : null;

const initialState = {
  token: tokenFromStorage || null,
  claims: claimsFromStorage,
  roles: getRolesFromClaims(claimsFromStorage),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginStart(state) {
      state.loading = true;
      state.error = null;
    },

    loginSuccess(state, action) {
      const token = action.payload?.token;
      state.loading = false;
      state.error = null;
      state.token = token;
      localStorage.setItem("token", token);
      state.claims = decodeJwt(token);
      state.roles = getRolesFromClaims(state.claims);
    },

    loginFailure(state, action) {
      state.loading = false;
      state.error = action.payload ?? "Login failed.";
    },

    clearError(state) {
      state.error = null;
    },

    logout(state) {
      state.token = null;
      state.claims = null;
      state.roles = [];
      state.loading = false;
      state.error = null;
      localStorage.removeItem("token");
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, clearError, logout } = authSlice.actions;
export default authSlice.reducer;