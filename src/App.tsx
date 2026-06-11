import { Building2, LayoutDashboard, LogOut, Settings, ShieldCheck, Menu, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { MinistriesPage } from "./pages/MinistriesPage";
import { OrganizationSettingsPage } from "./pages/OrganizationSettingsPage";
import { ProfilesPage } from "./pages/ProfilesPage";
import { UsersPage } from "./pages/UsersPage";
import { useAuth } from "./providers/AuthProvider";
import { useOrganizationSettings } from "./providers/OrganizationProvider";

export type Language = "es" | "en";
type View = "dashboard" | "profiles" | "ministries" | "users" | "organization-settings";

const labels = {
  es: {
    admin: "Administrador",
    closeMenu: "Cerrar menu",
    dashboard: "Dashboard",
    loading: "Cargando...",
    ministryLeader: "Lider de Ministerio",
    ministries: "Ministerios",
    openMenu: "Abrir menu",
    organizationSettings: "Configuracion de Organizacion",
    panel: "Panel administrativo",
    pendingAccess: "Acceso pendiente",
    pendingAccessText: "Tu cuenta existe en Google, pero todavia no tiene permisos administrativos en este sistema.",
    profiles: "Servidores",
    signOut: "Cerrar sesion",
    superAdmin: "Super Administrador",
    users: "Usuarios y Roles",
  },
  en: {
    admin: "Administrator",
    closeMenu: "Close menu",
    dashboard: "Dashboard",
    loading: "Loading...",
    ministryLeader: "Ministry Leader",
    ministries: "Ministries",
    openMenu: "Open menu",
    organizationSettings: "Organization Settings",
    panel: "Administrative panel",
    pendingAccess: "Access pending",
    pendingAccessText: "Your Google account exists, but it does not have administrative permissions in this system yet.",
    profiles: "Servers",
    signOut: "Sign out",
    superAdmin: "Super Administrator",
    users: "Users and Roles",
  },
};

const interfaceTranslations: Record<string, { es: string; en: string }> = {
  "Acceso": { es: "Acceso", en: "Access" },
  "Acciones": { es: "Acciones", en: "Actions" },
  "Actualizar": { es: "Actualizar", en: "Update" },
  "Actualizar rol": { es: "Actualizar rol", en: "Update role" },
  "Administracion": { es: "Administracion", en: "Administration" },
  "Administración": { es: "Administración", en: "Administration" },
  "Agregar": { es: "Agregar", en: "Add" },
  "Agrega, cambia o borra ministerios y departamentos.": { es: "Agrega, cambia o borra ministerios y departamentos.", en: "Add, update or delete ministries and departments." },
  "Borrar": { es: "Borrar", en: "Delete" },
  "BUSCAR SERVIDOR": { es: "BUSCAR SERVIDOR", en: "SEARCH SERVER" },
  "Cancelar": { es: "Cancelar", en: "Cancel" },
  "Cancelar edicion": { es: "Cancelar edicion", en: "Cancel editing" },
  "Clasificación": { es: "Clasificación", en: "Classification" },
  "CLASIFICACIÓN": { es: "CLASIFICACIÓN", en: "CLASSIFICATION" },
  "Comentarios": { es: "Comentarios", en: "Comments" },
  "Configuracion de Organizacion": { es: "Configuracion de Organizacion", en: "Organization Settings" },
  "Contacto de emergencia": { es: "Contacto de emergencia", en: "Emergency contact" },
  "Copiar link": { es: "Copiar link", en: "Copy link" },
  "Cumpleaños": { es: "Cumpleaños", en: "Birthday" },
  "DEPARTAMENTOS": { es: "DEPARTAMENTOS", en: "DEPARTMENTS" },
  "Departamento": { es: "Departamento", en: "Department" },
  "DEPARTAMENTO": { es: "DEPARTAMENTO", en: "DEPARTMENT" },
  "Departamentos": { es: "Departamentos", en: "Departments" },
  "Descripcion": { es: "Descripcion", en: "Description" },
  "Descripción": { es: "Descripción", en: "Description" },
  "Dirección": { es: "Dirección", en: "Address" },
  "Editar": { es: "Editar", en: "Edit" },
  "Editar rol": { es: "Editar rol", en: "Edit role" },
  "Editar servidor": { es: "Editar servidor", en: "Edit server" },
  "Email institucional": { es: "Email institucional", en: "Institutional email" },
  "Enviar invitacion": { es: "Enviar invitacion", en: "Send invitation" },
  "Estado": { es: "Estado", en: "Status" },
  "ESTADO": { es: "ESTADO", en: "STATUS" },
  "Estado civil": { es: "Estado civil", en: "Marital status" },
  "ESTATUS": { es: "ESTATUS", en: "STATUS" },
  "Ficha del servidor": { es: "Ficha del servidor", en: "Server profile" },
  "Gestion": { es: "Gestion", en: "Management" },
  "Gestión": { es: "Gestión", en: "Management" },
  "Guardar": { es: "Guardar", en: "Save" },
  "Guardar cambios": { es: "Guardar cambios", en: "Save changes" },
  "Guardar comentario": { es: "Guardar comentario", en: "Save comment" },
  "Guardando...": { es: "Guardando...", en: "Saving..." },
  "Habilidades o talentos": { es: "Habilidades o talentos", en: "Skills or talents" },
  "Informacion": { es: "Informacion", en: "Information" },
  "Información": { es: "Información", en: "Information" },
  "Informacion general": { es: "Informacion general", en: "General information" },
  "Inicio de servicio": { es: "Inicio de servicio", en: "Service start" },
  "Lista operativa de servidores y colaboradores.": { es: "Lista operativa de servidores y colaboradores.", en: "Operational list of servers and collaborators." },
  "Logo institucional": { es: "Logo institucional", en: "Institutional logo" },
  "Ministerio": { es: "Ministerio", en: "Ministry" },
  "MINISTERIO": { es: "MINISTERIO", en: "MINISTRY" },
  "Ministerios": { es: "Ministerios", en: "Ministries" },
  "Ministerios de servicio": { es: "Ministerios de servicio", en: "Service ministries" },
  "Nombre": { es: "Nombre", en: "Name" },
  "NOMBRE": { es: "NOMBRE", en: "NAME" },
  "Nombre completo": { es: "Nombre completo", en: "Full name" },
  "Nombre de iglesia/empresa": { es: "Nombre de iglesia/empresa", en: "Church/company name" },
  "Nuevo servidor": { es: "Nuevo servidor", en: "New server" },
  "No hay servidores para mostrar.": { es: "No hay servidores para mostrar.", en: "No servers to show." },
  "No registrado": { es: "No registrado", en: "Not registered" },
  "Perfil activo": { es: "Perfil activo", en: "Active profile" },
  "Personaliza la informacion institucional usada en todo el sistema.": { es: "Personaliza la informacion institucional usada en todo el sistema.", en: "Customize the institutional information used across the system." },
  "Rol": { es: "Rol", en: "Role" },
  "SERVIDORES": { es: "SERVIDORES", en: "SERVERS" },
  "Sin comentarios": { es: "Sin comentarios", en: "No comments" },
  "Sin comentarios.": { es: "Sin comentarios.", en: "No comments." },
  "Sin departamento": { es: "Sin departamento", en: "No department" },
  "Sin departamentos.": { es: "Sin departamentos.", en: "No departments." },
  "Sin ministerio": { es: "Sin ministerio", en: "No ministry" },
  "Sitio web": { es: "Sitio web", en: "Website" },
  "Solo podran acceder por invitacion. Al crear un usuario se envia un email y el rol por defecto es Lider de Ministerio.": { es: "Solo podran acceder por invitacion. Al crear un usuario se envia un email y el rol por defecto es Lider de Ministerio.", en: "Access is invitation-only. Creating a user sends an email and the default role is Ministry Leader." },
  "Subir o reemplazar logo": { es: "Subir o reemplazar logo", en: "Upload or replace logo" },
  "Telefono": { es: "Telefono", en: "Phone" },
  "Teléfono": { es: "Teléfono", en: "Phone" },
  "TELÉFONO": { es: "TELÉFONO", en: "PHONE" },
  "Tipo": { es: "Tipo", en: "Type" },
  "TIPO": { es: "TIPO", en: "TYPE" },
  "Último comentario": { es: "Último comentario", en: "Last comment" },
  "ÚLTIMO COMENTARIO": { es: "ÚLTIMO COMENTARIO", en: "LAST COMMENT" },
  "Usuario": { es: "Usuario", en: "User" },
  "Usuarios y Roles": { es: "Usuarios y Roles", en: "Users and Roles" },
  "Vista previa del logo institucional": { es: "Vista previa del logo institucional", en: "Institutional logo preview" },
  "Volver": { es: "Volver", en: "Back" },
};

const placeholderTranslations: Record<string, { es: string; en: string }> = {
  "Buscar por nombre, email, teléfono, ministerio o departamento": {
    es: "Buscar por nombre, email, teléfono, ministerio o departamento",
    en: "Search by name, email, phone, ministry or department",
  },
  "Nombre, telefono, email o ministerio": {
    es: "Nombre, telefono, email o ministerio",
    en: "Name, phone, email or ministry",
  },
  "https://...": { es: "https://...", en: "https://..." },
  "opcional": { es: "opcional", en: "optional" },
};

function translateInterface(language: Language) {
  const lookup = new Map<string, string>();
  Object.values(interfaceTranslations).forEach((entry) => {
    lookup.set(entry.es, entry[language]);
    lookup.set(entry.en, entry[language]);
  });

  const placeholderLookup = new Map<string, string>();
  Object.values(placeholderTranslations).forEach((entry) => {
    placeholderLookup.set(entry.es, entry[language]);
    placeholderLookup.set(entry.en, entry[language]);
  });

  const shouldSkip = (element: Element | null) =>
    !element ||
    ["SCRIPT", "STYLE", "OPTION", "INPUT", "TEXTAREA"].includes(element.tagName) ||
    element.closest(".participant-badge, .quick-result-button, .brand-name, .topbar-title, .user-pill");

  const apply = () => {
    const roots = document.querySelectorAll(".sidebar, .main-panel, .login-screen, .access-card");
    roots.forEach((root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const parent = node.parentElement;
        const text = node.textContent ?? "";
        const trimmed = text.trim();
        const next = lookup.get(trimmed);
        if (!shouldSkip(parent) && next && next !== trimmed) {
          node.textContent = text.replace(trimmed, next);
        }
        node = walker.nextNode();
      }
    });

    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[placeholder], textarea[placeholder]").forEach((input) => {
      const current = input.getAttribute("placeholder") ?? "";
      const next = placeholderLookup.get(current);
      if (next) input.setAttribute("placeholder", next);
    });
  };

  apply();
  return apply;
}

export function App() {
  const { session, profile, isAdmin, isSuperAdmin, isLoading, signOut } = useAuth();
  const { settings } = useOrganizationSettings();
  const [view, setView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileQuery, setProfileQuery] = useState("");
  const [language, setLanguage] = useState<Language>("es");
  const t = labels[language];

  useEffect(() => {
    const apply = translateInterface(language);
    const observer = new MutationObserver(() => apply());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language, view]);

  if (isLoading) {
    return <div className="screen-center">{t.loading}</div>;
  }

  if (!session) {
    return <Login language={language} />;
  }

  if (!profile) {
    return (
      <div className="screen-center access-card">
        <img src={settings.logo_url} alt={settings.organization_name} className="access-logo" />
        <h1>{t.pendingAccess}</h1>
        <p>{t.pendingAccessText}</p>
        <button className="btn btn-secondary" onClick={signOut}>
          {t.signOut}
        </button>
      </div>
    );
  }

  const nav = [
    { id: "dashboard" as const, label: t.dashboard, icon: LayoutDashboard, visible: true },
    { id: "profiles" as const, label: t.profiles, icon: Users, visible: true },
    { id: "ministries" as const, label: t.ministries, icon: Building2, visible: isAdmin },
    { id: "users" as const, label: t.users, icon: ShieldCheck, visible: isAdmin },
    { id: "organization-settings" as const, label: t.organizationSettings, icon: Settings, visible: isSuperAdmin },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="brand-block">
          <img src={settings.logo_url} alt={settings.organization_name} className="brand-logo" />
          <div>
            <p className="brand-name">{settings.organization_name}</p>
            <p className="brand-meta">{t.panel}</p>
          </div>
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen(false)} aria-label={t.closeMenu}>
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
          <div className="version-label">Version 0.3.6</div>
          <button className="nav-item" onClick={signOut}>
            <LogOut size={18} />
            <span>{t.signOut}</span>
          </button>
        </div>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          <button className="icon-button desktop-hidden" onClick={() => setSidebarOpen(true)} aria-label={t.openMenu}>
            <Menu size={20} />
          </button>
          <div className="topbar-title">
            <img src={settings.logo_url} alt="" className="topbar-logo" />
            <div>
              <p>{settings.organization_name}</p>
              <span>{settings.phone}</span>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="language-toggle" aria-label="Language">
              <button className={language === "es" ? "active" : ""} onClick={() => setLanguage("es")} type="button">ES</button>
              <span>/</span>
              <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")} type="button">EN</button>
            </div>
            <div className="role-badge">{isSuperAdmin ? t.superAdmin : isAdmin ? t.admin : t.ministryLeader}</div>
          </div>
        </header>

        <main className="content">
          {view === "dashboard" && (
            <Dashboard
              language={language}
              onOpenProfile={(search) => {
                setProfileQuery(search);
                setView("profiles");
              }}
            />
          )}
          {view === "profiles" && <ProfilesPage initialQuery={profileQuery} />}
          {view === "ministries" && isAdmin && <MinistriesPage />}
          {view === "users" && isAdmin && <UsersPage />}
          {view === "organization-settings" && isSuperAdmin && <OrganizationSettingsPage />}
        </main>
      </div>
    </div>
  );
}
