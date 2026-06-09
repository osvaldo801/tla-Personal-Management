import type { CSSProperties } from "react";
import { Activity, CircleDollarSign, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { demoMinistries, demoProfiles, type DemoMinistry, type DemoProfile } from "../data/demoData";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useOrganizationSettings } from "../providers/OrganizationProvider";

export function Dashboard() {
  const { settings } = useOrganizationSettings();
  const { data } = useQuery({
    queryKey: ["dashboard-data"],
    queryFn: fetchDashboardData,
    initialData: { ministries: demoMinistries, profiles: demoProfiles },
  });

  const profiles = data.profiles;
  const ministries = data.ministries;
  const total = profiles.length || 1;
  const active = profiles.filter((profile) => profile.service_status === "Activo").length;
  const paused = profiles.filter((profile) => profile.service_status === "Pausado").length;
  const cancelled = profiles.filter((profile) => profile.service_status === "Cancelado").length;
  const ministerial = profiles.filter((profile) => profile.service_type === "Ministerial").length;
  const administrative = profiles.filter((profile) => profile.service_type === "Administrativo").length;

  const ministryCounts = ministries.map((ministry) => ({
    name: ministry.name,
    count: profiles.filter((profile) => profile.ministry === ministry.name).length,
  }));

  const maxMinistry = Math.max(...ministryCounts.map((item) => item.count), 1);
  const activePercent = Math.round((active / total) * 100);
  const ministerialPercent = Math.round((ministerial / total) * 100);

  return (
    <div className="analytics-shell">
      <section className="analytics-main">
        <div className="dashboard-title-strip">
          <img src={settings.logo_url} alt={settings.organization_name} />
          <div>
            <p className="eyebrow">Dashboard principal</p>
            <h1>{settings.organization_name}</h1>
            <span>{settings.address}</span>
          </div>
        </div>

        <div className="analytics-grid">
          <article className="analytics-card ministry-map">
            <h2>Servidores por Ministerio</h2>
            <div className="treemap">
              {ministryCounts.map((item, index) => (
                <div className={`tree-cell tree-${index + 1}`} key={item.name}>
                  <strong>{item.name}</strong>
                  <span>{item.count}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="analytics-card designation-card">
            <h2>Tipo de Servicio</h2>
            <div className="bar-list">
              <MetricBar label="Ministerial" value={ministerial} total={total} />
              <MetricBar label="Administrativo" value={administrative} total={total} />
            </div>
          </article>

          <article className="analytics-card people-card">
            <div className="donut-wrap">
              <div className="donut" style={{ "--value": `${activePercent}%` } as CSSProperties}>
                <span>{activePercent}%</span>
              </div>
            </div>
            <div className="people-numbers">
              <span>Activos</span>
              <strong className="green-number">{active}</strong>
              <span>Pausados</span>
              <strong className="blue-number">{paused}</strong>
            </div>
            <div className="total-number">
              <span>Total Servidores</span>
              <strong>{total}</strong>
            </div>
          </article>

          <article className="analytics-card dark-card wide-card">
            <h2>Estado de Servicio</h2>
            <div className="dark-bars">
              <MetricBar label="Activo" value={active} total={total} />
              <MetricBar label="Pausado" value={paused} total={total} />
              <MetricBar label="Cancelado" value={cancelled} total={total} />
            </div>
          </article>

          <article className="analytics-card expense-card">
            <h2>Carga por Ministerio</h2>
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
            </div>
          </article>

          <article className="analytics-card gauge-card">
            <h2>Participacion Ministerial</h2>
            <div className="gauge">
              <div className="gauge-arc" style={{ "--value": `${ministerialPercent}%` } as CSSProperties} />
              <strong>{ministerialPercent}%</strong>
              <span>Ministerial</span>
            </div>
            <div className="legend-row">
              <span><i className="legend-good" /> Bueno</span>
              <span><i className="legend-ok" /> Ok</span>
              <span><i className="legend-bad" /> Atencion</span>
            </div>
          </article>

          <article className="analytics-card kpi-card">
            <CircleDollarSign size={28} />
            <span>Nuevos este mes</span>
            <strong>2</strong>
          </article>

          <article className="analytics-card kpi-card">
            <Clock size={28} />
            <span>Antiguedad promedio</span>
            <strong>2.7</strong>
          </article>

          <article className="analytics-card kpi-card">
            <Activity size={28} />
            <span>Indice activo</span>
            <strong>{activePercent}%</strong>
          </article>
        </div>
      </section>

      <aside className="analytics-filters">
        <FilterBox title="Status" items={["Activo", "Pausado", "Cancelado"]} />
        <FilterBox title="Ministerio" items={ministries.map((item) => item.name)} />
        <FilterBox title="Tipo" items={["Ministerial", "Administrativo"]} />
        <FilterBox title="Ano" items={["2024", "2023", "2022", "2021"]} />
      </aside>
    </div>
  );
}

async function fetchDashboardData(): Promise<{ ministries: DemoMinistry[]; profiles: DemoProfile[] }> {
  if (!isSupabaseConfigured) {
    return { ministries: demoMinistries, profiles: demoProfiles };
  }

  const [{ data: ministriesData, error: ministriesError }, { data: profilesData, error: profilesError }] =
    await Promise.all([
      supabase.from("ministries").select("id, name, description, active").order("name"),
      supabase.from("server_profiles").select("id, full_name, address, phone, email, birth_date, service_start_date, service_status, service_type, active, ministries(name)").order("full_name"),
    ]);

  if (ministriesError || profilesError) {
    return { ministries: demoMinistries, profiles: demoProfiles };
  }

  return {
    ministries: (ministriesData ?? []) as DemoMinistry[],
    profiles: (profilesData ?? []).map((profile: any) => ({
      id: profile.id,
      full_name: profile.full_name,
      address: profile.address ?? "",
      phone: profile.phone ?? "",
      email: profile.email ?? "",
      birth_date: profile.birth_date ?? "",
      service_start_date: profile.service_start_date ?? "",
      service_status: profile.service_status,
      service_type: profile.service_type,
      ministry: profile.ministries?.name ?? "Sin ministerio",
      active: profile.active,
    })),
  };
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

function FilterBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="filter-box">
      <h3>{title}</h3>
      {items.map((item) => (
        <button key={item}>{item}</button>
      ))}
    </div>
  );
}
