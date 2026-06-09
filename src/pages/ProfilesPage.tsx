import { Search, SlidersHorizontal } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { demoMinistries, demoProfiles, type DemoMinistry, type DemoProfile } from "../data/demoData";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export function ProfilesPage() {
  const [query, setQuery] = useState("");
  const [ministry, setMinistry] = useState("Todos");
  const [status, setStatus] = useState("Todos");
  const { data } = useQuery({
    queryKey: ["profiles-page-data"],
    queryFn: fetchProfilesPageData,
    initialData: { ministries: demoMinistries, profiles: demoProfiles },
  });

  const profiles = data.profiles;
  const ministries = data.ministries;

  const filteredProfiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return profiles.filter((profile) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        profile.full_name.toLowerCase().includes(normalizedQuery) ||
        profile.email.toLowerCase().includes(normalizedQuery) ||
        profile.phone.includes(normalizedQuery);
      const matchesMinistry = ministry === "Todos" || profile.ministry === ministry;
      const matchesStatus = status === "Todos" || profile.service_status === status;

      return matchesQuery && matchesMinistry && matchesStatus;
    });
  }, [ministry, profiles, query, status]);

  return (
    <div className="page-stack">
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">Gestion</p>
          <h1>Perfiles</h1>
          <p>Lista operativa de servidores y colaboradores.</p>
        </div>
      </section>

      <section className="panel filter-panel">
        <label className="search-field">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, email o telefono"
          />
        </label>

        <label className="select-field">
          <SlidersHorizontal size={18} />
          <select value={ministry} onChange={(event) => setMinistry(event.target.value)}>
            <option>Todos</option>
            {ministries.map((item) => (
              <option key={item.id}>{item.name}</option>
            ))}
          </select>
        </label>

        <label className="select-field">
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option>Todos</option>
            <option>Activo</option>
            <option>Pausado</option>
            <option>Cancelado</option>
          </select>
        </label>
      </section>

      <section className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Ministerio</th>
                <th>Estado</th>
                <th>Tipo</th>
                <th>Telefono</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((profile) => (
                <tr key={profile.id}>
                  <td>
                    <strong>{profile.full_name}</strong>
                    <span>{profile.address}</span>
                  </td>
                  <td>{profile.ministry}</td>
                  <td>
                    <span className={`status-pill status-${profile.service_status.toLowerCase()}`}>
                      {profile.service_status}
                    </span>
                  </td>
                  <td>{profile.service_type}</td>
                  <td>{profile.phone}</td>
                  <td>{profile.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

async function fetchProfilesPageData(): Promise<{ ministries: DemoMinistry[]; profiles: DemoProfile[] }> {
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
