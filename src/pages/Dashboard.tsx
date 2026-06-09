import { CalendarDays, PauseCircle, UserCheck, UserRoundX, Users } from "lucide-react";
import { useOrganizationSettings } from "../providers/OrganizationProvider";

const stats = [
  { label: "Total de servidores", value: "0", icon: Users },
  { label: "Activos", value: "0", icon: UserCheck },
  { label: "Pausados", value: "0", icon: PauseCircle },
  { label: "Cancelados", value: "0", icon: UserRoundX },
];

export function Dashboard() {
  const { settings } = useOrganizationSettings();

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Dashboard principal</p>
          <h1>{settings.organization_name}</h1>
          <p>{settings.address}</p>
        </div>
        <img src={settings.logo_url} alt={settings.organization_name} className="dashboard-logo" />
      </section>

      <section className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article className="stat-card" key={stat.label}>
              <Icon size={22} />
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </article>
          );
        })}
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Resumen ministerial</h2>
          </div>
          <div className="empty-state">Los datos apareceran aqui cuando conectes perfiles y ministerios.</div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <h2>Proximos cumpleanos</h2>
            <CalendarDays size={18} />
          </div>
          <div className="empty-state">Sin registros para mostrar.</div>
        </div>
      </section>
    </div>
  );
}
