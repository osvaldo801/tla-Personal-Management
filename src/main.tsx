import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { AuthProvider } from "./providers/AuthProvider";
import { OrganizationProvider } from "./providers/OrganizationProvider";
import { initIdCardScanner } from "./id-card-scanner";
import { initProfilePhotoClickHotfix } from "./profile-photo-click-hotfix";
import { initProfilePhotoEnhancements } from "./profile-photo-enhancements";
import { initServerInteractionHotfix } from "./server-interaction-hotfix";
import { initServerProfileUiFixes } from "./server-profile-ui-fixes";
import { initServerTableColumnFixes } from "./server-table-column-fixes";
import { initStaleProfilePhotoCleanup } from "./stale-profile-photo-cleanup";
import "./styles.css";
import "./analytics.css";
import "./admin.css";
import "./ui-additions.css";
import "./layout-overrides.css";
import "./server-profile-ui-fixes.css";
import "./id-card-scanner.css";

const queryClient = new QueryClient();

initProfilePhotoEnhancements();
initProfilePhotoClickHotfix();
initStaleProfilePhotoCleanup();
initServerProfileUiFixes();
initServerTableColumnFixes();
initServerInteractionHotfix();
initIdCardScanner();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OrganizationProvider>
          <App />
        </OrganizationProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
