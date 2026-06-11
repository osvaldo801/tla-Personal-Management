import type { CSSProperties } from "react";
import { Cake, Clock, Search, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Language } from "../App";
import { demoMinistries, demoProfiles, type DemoMinistry, type DemoProfile } from "../data/demoData";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useOrganizationSettings } from "../providers/OrganizationProvider";

type DashboardData = { ministries: DemoMinistry[]; profiles: DemoProfile[] };

const emptyDashboardData: DashboardData = { ministries: [], profiles: [] };

const copy = {
  es: {
    active: "Activos",
    averageYears: "Antiguedad promedio (anos)",
    birthdays: "Cumpleanos",
    currentMonth: "Este mes",
    dashboard: "Dashboard principal",
    ministryDataEmpty: "Sin datos ministeriales.",
    ministryServers: "SERVIDORES POR MINISTERIO",
    newThisMonth: "Nuevos este mes",
    nextMonth: "Mes siguiente",
    noBirthdays: "Sin cumpleanos registrados.",
    noServers: "No hay servidores para mostrar.",
    paused: "Pausados",
    searchPlaceholder: "Nombre, telefono, email o ministerio",
    searchServer: "BUSCAR SERVIDOR",
    serviceType: "TIPO DE SERVICIO",
    totalServers: "Total servidores",
  },
  en: {
    active: "Active",
    averageYears: "Average seniority (years)",
    birthdays: "Birthdays",
    currentMonth: "This month",
    dashboard: "Main dashboard",
    ministryDataEmpty: "No ministry data.",
    ministryServers: "SERVERS BY MINISTRY",
    newThisMonth: "New this month",
    nextMonth: "Next month",
    noBirthdays: "No birthdays registered.",
    noServers: "No servers to show.",
    paused: "Paused",
    searchPlaceholder: "Name, phone, email or ministry",
    searchServer: "SEARCH SERVER",
    serviceType: "SERVICE TYPE",
    totalServers: "Total servers",
  },
};

export function Dashboard({ language = "es", onOpenProfile }: { language?: Language; onOpenProfile?: (search: string) => void }) {
  const { settings } = useOrganizationSettings();
  const [profileSearch, setProfileSearch] = useState("");
  const t = copy[language];
  const { data } = useQuery({
    queryKey: ["dashboard-data"],
    queryFn: fetchDashboardData,
    initialData: getInitialDashboardData(),
  });

  const profiles = data.profiles;
  const ministries = data.ministries;
  const totalProfiles = profiles.length;
  const totalForPercentages = totalProfiles || 1;
  const active = profiles.filter((profile) => profile.service_status === "Activo").length;
  const paused = profiles.filter((profile) => profile.service_status === "Pausado").length;
  const ministerial = profiles.filter((profile) => profile.service_type === "Ministerial").length;
  const administrative = profiles.filter((profile) => profile.service_type === "Administrativo").length;
  const newThisMonth = profiles.filter((profile) => isCurrentMonth(profile.service_start_date)).length;
  const averageYears = getAverageServiceYears(profiles);

  const ministryCounts = ministries
    .map((ministry) => ({
      name: ministry.name,
      count: profiles.filter((profile) => profile.ministry.split(", ").includes(ministry.name)).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const maxMinistry = Math.max(...ministryCounts.map((item) => item.count), 1);
  const activePercent = Math.round((active / totalForPercentages) * 100);
  const quickResults = useMemo(() => {
    const normalized = profileSearch.trim().toLowerCase();
    if (!normalized) return profiles.slice(0, 5);
    return profiles
      .filter((profile) =>
        [profile.full_name, profile.email, profile.phone, profile.ministry].some((value) =>
          value.toLowerCase().includes(normalized),
        ),
      )
      .slice(0, 6);
  }, [profileSearch, profiles]);
  const birthdayGroups = getBirthdayGroups(profiles);

  return (
    <div className="analytics-shell">
      <section className="analytics-main">
        <div className="dashboard-title-strip">
          <img src={settings.logo_url} alt={settings.organization_name} />
          <div>
            <p className="eyebrow">{t.dashboard}</p>
            <h1>{settings.organization_name}</h1>
            <span>{settings.address}</span>
          </div>
        </div>

        <section className="dashboard-kpi-row">
          <article className="analytics-card kpi-card">
            <Users size={28} />
            <span>{t.totalServers}</span>
            <strong>{totalProfiles}</strong>
          </article>

          <article className="analytics-card kpi-card">
            <UserPlus size={28} />
            <span>{t.newThisMonth}</span>
            <strong>{newThisMonth}</strong>
          </article>

          <article className="analytics-card kpi-card">
            <Clock size={28} />
            <span>{t.averageYears}</span>
            <strong>{averageYears}</strong>
          </article>
        </section>

        <section className="dashboard-quick-row">
          <article className="analytics-card quick-search-card">
            <h2>{t.searchServer}</h2>
            <label className="search-field">
              <Search size={18} />
              <input
                value={profileSearch}
                onChange={(event) => setProfileSearch(event.target.value)}
                placeholder={t.searchPlaceholder}
              />
            </label>
            <div className="quick-results">
              {quickResults.map((profile) => (
                <button className="quick-result-button" key={profile.id} onClick={() => onOpenProfile?.(profile.full_name)} type="button">
                  <strong>{profile.full_name}</strong>
                  <span>{profile.ministry} - {profile.phone}</span>
                </button>
              ))}
              {quickResults.length === 0 && <p className="helper-text">{t.noServers}</p>}
            </div>
          </article>

          <article className="analytics-card birthdays-card">
            <h2>{t.birthdays}</h2>
            <BirthdayList emptyText={t.noBirthdays} title={t.currentMonth} profiles={birthdayGroups.current} />
            <BirthdayList emptyText={t.noBirthdays} title={t.nextMonth} profiles={birthdayGroups.next} />
          </article>
        </section>

        <div className="analytics-grid">
          <article className="analytics-card ministry-map">
            <h2>{t.ministryServers}</h2>
            <div className="expense-list">
              {ministryCounts.map((item) => (
                <div className="expense-row" key={item.name}>
                  <span>{item.name}</span>
                  <div>
                    <i style={{ width: `${(item.count / maxMinistry) * 100}%` }} />
                  </div>
                  <strong>{item.count}</strong>
                </div>
              ))}
              {ministryCounts.length === 0 && <p className="helper-text">{t.ministryDataEmpty}</p>}
            </div>
          </article>

          <article className="analytics-card designation-card">
            <h2>{t.serviceType}</h2>
            <div className="bar-list">
              <MetricBar label="Ministerial" value={ministerial} total={totalForPercentages} />
              <MetricBar label={language === "en" ? "Administrative" : "Administrativo"} value={administrative} total={totalForPercentages} />
            </div>
          </article>

          <article className="analytics-card people-card">
            <div className="donut-wrap">
              <div className="donut" style={{ "--value": `${activePercent}%` } as CSSProperties}>
                <span>{activePercent}%</span>
              </div>
            </div>
            <div className="people-numbers">
              <span>{t.active}</span>
              <strong className="green-number">{active}</strong>
              <span>{t.paused}</span>
              <strong className="blue-number">{paused}</strong>
            </div>
            <div className="total-number">
              <span>{t.totalServers}</span>
              <strong>{totalProfiles}</strong>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

function BirthdayList({ emptyText, title, profiles }: { emptyText: string; title: string; profiles: DemoProfile[] }) {
  return (
    <div className="birthday-list">
      <h3>
        <Cake size={16} />
        {title}
      </h3>
      {profiles.length === 0 ? (
        <p>{emptyText}</p>
      ) : (
        profiles.map((profile) => (
          <div key={profile.id}>
            <strong>{profile.full_name}</strong>
            <span>{formatBirthday(profile.birth_date)}</span>
          </div>
        ))
      )}
    </div>
  );
}

function getInitialDashboardData(): DashboardData {
  if (isSupabaseConfigured) return emptyDashboardData;
  return { ministries: demoMinistries, profiles: demoProfiles };
}

function getBirthdayGroups(profiles: DemoProfile[]) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;

  return {
    current: sortBirthdays(profiles.filter((profile) => getMonth(profile.birth_date) === currentMonth)),
    next: sortBirthdays(profiles.filter((profile) => getMonth(profile.birth_date) === nextMonth)),
  };
}

function sortBirthdays(profiles: DemoProfile[]) {
  return [...profiles].sort((a, b) => getDay(a.birth_date) - getDay(b.birth_date));
}

function getMonth(date: string) {
  return Number(date.slice(5, 7));
}

function getDay(date: string) {
  return Number(date.slice(8, 10));
}

function isCurrentMonth(date: string) {
  if (!date) return false;
  const parsed = new Date(`${date}T00:00:00`);
  const now = new Date();
  return parsed.getMonth() === now.getMonth() && parsed.getFullYear() === now.getFullYear();
}

function getAverageServiceYears(profiles: DemoProfile[]) {
  const profilesWithStartDate = profiles.filter((profile) => profile.service_start_date);
  if (!profilesWithStartDate.length) return "0";
  const totalYears = profilesWithStartDate.reduce((sum, profile) => sum + yearsSince(profile.service_start_date), 0);
  return (totalYears / profilesWithStartDate.length).toFixed(1);
}

function yearsSince(date: string) {
  const start = new Date(`${date}T00:00:00`);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  const hasNotReachedAnniversary =
    now.getMonth() < start.getMonth() ||
    (now.getMonth() === start.getMonth() && now.getDate() < start.getDate());
  if (hasNotReachedAnniversary) years -= 1;
  return Math.max(years, 0);
}

function formatBirthday(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return new Intl.DateTimeFormat("es-US", { month: "long", day: "numeric" }).format(parsed);
}

async function fetchDashboardData(): Promise<DashboardData> {
  if (!isSupabaseConfigured) {
    return { ministries: demoMinistries, profiles: demoProfiles };
  }

  const [
    { data: ministriesData, error: ministriesError },
    { data: profilesData, error: profilesError },
    { data: profileMinistriesData, error: profileMinistriesError },
  ] = await Promise.all([
    supabase.from("ministries").select("id, name, description, active").eq("active", true).order("name"),
    supabase
      .from("server_profiles")
      .select("id, full_name, address, phone, email, birth_date, service_start_date, service_status, service_type, ministry_id, active")
      .order("full_name"),
    supabase.from("server_profile_ministries").select("profile_id, ministry_id"),
  ]);

  if (ministriesError || profilesError) {
    console.error("Dashboard data error", { ministriesError, profilesError });
    return emptyDashboardData;
  }

  if (profileMinistriesError) {
    console.error("Dashboard ministry assignment error", profileMinistriesError);
  }

  const ministries = (ministriesData ?? []) as DemoMinistry[];
  const ministryById = new Map(ministries.map((ministry) => [ministry.id, ministry.name]));
  const ministriesByProfile = groupByProfile(profileMinistriesError ? [] : profileMinistriesData ?? []);

  return {
    ministries,
    profiles: (profilesData ?? []).map((profile: any) => {
      const assignedMinistries = ministriesByProfile.get(profile.id) ?? [];
      const ministryNames = assignedMinistries.length
        ? assignedMinistries.map((item: any) => ministryById.get(item.ministry_id))
        : [profile.ministry_id ? ministryById.get(profile.ministry_id) : undefined];

      return {
        id: profile.id,
        full_name: profile.full_name,
        address: profile.address ?? "",
        phone: profile.phone ?? "",
        email: profile.email ?? "",
        birth_date: profile.birth_date ?? "",
        service_start_date: profile.service_start_date ?? "",
        service_status: profile.service_status ?? "Activo",
        service_type: profile.service_type ?? "Ministerial",
        ministry: uniqueNames(ministryNames).join(", ") || "Sin ministerio",
        active: profile.active ?? true,
      };
    }),
  };
}

function groupByProfile(rows: any[]) {
  const grouped = new Map<string, any[]>();
  rows.forEach((row) => {
    const current = grouped.get(row.profile_id) ?? [];
    current.push(row);
    grouped.set(row.profile_id, current);
  });
  return grouped;
}

function uniqueNames(values: (string | undefined)[]) {
  return Array.from(new Set(values.filter(Boolean))) as string[];
}

function MetricBar({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <div className="metric-bar">
      <span>{label}</span>
      <div>
        <i style={{ width: `${Math.max((value / total) * 100, 5)}%` }} />
      </div>
      <strong>{value}</strong>
    </div>
  );
}
