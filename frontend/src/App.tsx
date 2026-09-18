import React from "react";

import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

import { CallProvider } from "./contexts/CallContext";
import { AppShell } from "./components/layout/AppShell";

import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import { CallPage } from "./pages/Call";
import { HistoryPage } from "./pages/History";
import { CallDetailPage } from "./pages/CallDetail";
import { SettingsPage } from "./pages/Settings";

/* -------------------------------------------------------------------------- */
/* AUTHENTICATED APPLICATION                                                  */
/* -------------------------------------------------------------------------- */

function AuthenticatedApplication() {
  return (
    <CallProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </CallProvider>
  );
}

/* -------------------------------------------------------------------------- */
/* APP                                                                        */
/* -------------------------------------------------------------------------- */

export function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ================================================================== */}
        {/* PUBLIC                                                             */}
        {/* ================================================================== */}

        <Route
          path="/login"
          element={<Login />}
        />

        {/* ================================================================== */}
        {/* AUTHENTICATED                                                      */}
        {/* ================================================================== */}

        <Route element={<ProtectedRoute />}>
          <Route element={<AuthenticatedApplication />}>

            <Route
              path="/"
              element={<CallPage />}
            />

            <Route
              path="/call"
              element={<CallPage />}
            />

            <Route
              path="/history"
              element={<HistoryPage />}
            />

            <Route
              path="/history/:callId"
              element={<CallDetailPage />}
            />

            <Route
              path="/settings"
              element={<SettingsPage />}
            />

          </Route>
        </Route>

        {/* ================================================================== */}
        {/* FALLBACK                                                           */}
        {/* ================================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;