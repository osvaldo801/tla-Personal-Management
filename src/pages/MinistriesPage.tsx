import { useQuery } from "@tanstack/react-query";
import { demoMinistries, demoProfiles, type DemoMinistry, type DemoProfile } from "../data/demoData";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export function MinistriesPage() {
  const { data } = useQuery({
    queryKey: ["ministries-page-data"],
    queryFn: fetchMinistriesPageData,
    initialData: { ministries: demoMinistries, profiles: demoProfiles },
  });

  const ministries = data.ministries;
  const profiles = data.profiles;

  return (
    <div className="page-stack">
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">Administracion</p>
          <h1>Ministerios</h1>
          <p>Resumen de equipos y participacion actual.</p>
        </div>
      </section>

      <section className="ministries-grid">
        {ministries.map((ministry) => {
          const count = profiles.filter((profile) => profile.ministry === ministry.name).length;
          const activeCount = profiles.filter(
            (profile) => profile.ministry === ministry.name && profile.service_status === "Activo",
          ).length;

          return (
            <article className="panel ministry-card" key={ministry.id}>
              <div>
                <h2>{ministry.name}</h2>
                <p>{ministry.description}</p>
              </div>
              <div className="ministry-metrics">
                <span>{count} perfiles</span>
                <strong>{activeCount} activos</strong>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

async function fetchMinistriesPageData(): Promise<{ ministries: DemoMinistry[]; profiles: DemoProfile[] }> {
  if (!isSupabaseConfigured) {
    return { ministries: demoMinistries, profiles: demoProfiles };
  }

  const [{ data: ministriesData, error: ministriesError }, { data: profilesData, error: profilesError }] =
    await Promise.all([
      supabase.from("ministries").select("id, name, description, active").order("name"),
      supabase.from("server_profiles").select("id, full_name, service_status, service_type, active, ministries(name)").order("full_name"),
    ]);

  if (ministriesError || profilesError) {
    return { ministries: demoMinistries, profiles: demoProfiles };
  }

  return {
    ministries: (ministriesData ?? []) as DemoMinistry[],
    profiles: (profilesData ?? []).map((profile: any) => ({
      id: profile.id,
      full_name: profile.full_name,
      address: "",
      phone: "",
      email: "",
      birth_date: "",
      service_start_date: "",
      service_status: profile.service_status,
      service_type: profile.service_type,
      ministry: profile.ministries?.name ?? "Sin ministerio",
      active: profile.active,
    })),
  };
}
