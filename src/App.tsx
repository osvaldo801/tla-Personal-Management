import { Building2, LayoutDashboard, LogOut, Settings, ShieldCheck, Menu, Users, X } from "lucide-react";
import { useState } from "react";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { MinistriesPage } from "./pages/MinistriesPage";
import { OrganizationSettingsPage } from "./pages/OrganizationSettingsPage";
import { ProfilesPage } from "./pages/ProfilesPage";
import { UsersPage } from "./pages/UsersPage";
import { useAuth } from "./providers/AuthProvider";
import { useOrganizationSettings } from "./providers/OrganizationProvider";

type View = "dashboard" | "profiles" | "ministries" | "users" | "organization-settings";

export function App() {
  const { session, profile, isAdmin, isLoading, signOut } = useAuth();
  const { settings } = useOrganizationSettings();
  const [view, setView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileQuery, setProfileQuery] = useState("");

  if (isLoading) {
    return <div className="screen-center">Cargando...</div>;
  }

  if (!session) {
    return <Login />;
  }

  if (!profile) {
    return (
      <div className="screen-center access-card">
        <img src={settings.logo_url} alt={settings.organization_name} className="access-logo" />
        <h1>Acceso pendiente</h1>
        <p>Tu cuenta existe en Google, pero todavia no tiene permisos administrativos en este sistema.</p>
        <button className="btn btn-secondary" onClick={signOut}>
          Cerrar sesion
        </button>
      </div>
    );
  }

  const nav = [
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard, visible: true },
    { id: "profiles" as const, label: "Perfiles", icon: Users, visible: true },
    { id: "ministries" as const, label: "Ministerios", icon: Building2, visible: isAdmin },
    { id: "users" as const, label: "Usuarios y Roles", icon: ShieldCheck, visible: isAdmin },
    { id: "organization-settings" as const, label: "Configuracion de Organizacion", icon: Settings, visible: isAdmin },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="brand-block">
          <img src={settings.logo_url} alt={settings.organization_name} className="brand-logo" />
          <div>
            <p className="brand-name">{settings.organization_name}</p>
            <p className="brand-meta">Panel administrativo</p>
          </div>
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menu">
            <X size={20} />
          </button>
        </div>

        <nav className="nav-list">
          {nav
            .filter((item) => item.visible)
            .map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className={`nav-item ${view === item.id ? "active" : ""}`}
                  key={item.id}
                  onClick={() => {
                    setView(item.id);
                    setSidebarOpen(false);
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-pill">
            <Users size={16} />
            <span>{profile.full_name || profile.email}</span>
          </div>
          <div className="version-label">Version 0.2.0</div>
          <button className="nav-item" onClick={signOut}>
            <LogOut size={18} />
            <span>Cerrar sesion</span>
          </button>
        </div>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          <button className="icon-button desktop-hidden" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          <div className="topbar-title">
            <img src={settings.logo_url} alt="" className="topbar-logo" />
            <div>
              <p>{settings.organization_name}</p>
              <span>{settings.phone}</span>
            </div>
          </div>
          <div className="role-badge">{isAdmin ? "Administrador" : "Lider de Ministerio"}</div>
        </header>

        <main className="content">
          {view === "dashboard" && (
            <Dashboard
              onOpenProfile={(search) => {
                setProfileQuery(search);
                setView("profiles");
              }}
            />
          )}
          {view === "profiles" && <ProfilesPage initialQuery={profileQuery} />}
          {view === "ministries" && isAdmin && <MinistriesPage />}
          {view === "users" && isAdmin && <UsersPage />}
          {view === "organization-settings" && isAdmin && <OrganizationSettingsPage />}
        </main>
      </div>
    </div>
  );
}
