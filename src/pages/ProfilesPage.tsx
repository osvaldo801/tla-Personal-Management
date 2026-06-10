import { Search, SlidersHorizontal } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { demoMinistries, demoProfiles, type DemoMinistry, type DemoProfile } from "../data/demoData";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export function ProfilesPage({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [ministry, setMinistry] = useState("Todos");
  const [status, setStatus] = useState("Todos");
  const [selectedProfile, setSelectedProfile] = useState<DemoProfile | null>(null);
  const [comment, setComment] = useState("");
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["profiles-page-data"],
    queryFn: fetchProfilesPageData,
    initialData: { ministries: demoMinistries, profiles: demoProfiles },
  });

  const profiles = data.profiles;
  const ministries = data.ministries;

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

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

  const updateStatus = useMutation({
    mutationFn: async ({ id, service_status }: { id: string; service_status: DemoProfile["service_status"] }) => {
      if (!isSupabaseConfigured) return;
      const { error } = await supabase.from("server_profiles").update({ service_status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profiles-page-data"] }),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!selectedProfile || !comment.trim()) return;
      if (!isSupabaseConfigured) {
        setComment("");
        return;
      }
      const { error } = await supabase.from("comments").insert({
        profile_id: selectedProfile.id,
        comment: comment.trim(),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setComment("");
      setSelectedProfile(null);
      await queryClient.invalidateQueries({ queryKey: ["profiles-page-data"] });
    },
  });

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
                <th>Ultimo comentario</th>
                <th>Acciones</th>
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
                  <td className="comment-cell">
                    <strong>{profile.last_comment || "Sin comentarios"}</strong>
                    {profile.last_comment && (
                      <span>
                        {profile.last_comment_author || "Usuario"} - {formatDateTime(profile.last_comment_at)}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      <select
                        value={profile.service_status}
                        onChange={(event) =>
                          updateStatus.mutate({
                            id: profile.id,
                            service_status: event.target.value as DemoProfile["service_status"],
                          })
                        }
                      >
                        <option>Activo</option>
                        <option>Pausado</option>
                        <option>Cancelado</option>
                      </select>
                      <button className="btn btn-secondary" onClick={() => setSelectedProfile(profile)} type="button">
                        Comentar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedProfile && (
        <div className="modal-backdrop">
          <form
            className="modal-panel"
            onSubmit={(event) => {
              event.preventDefault();
              addComment.mutate();
            }}
          >
            <h2>{selectedProfile.full_name}</h2>
            <p>
              {selectedProfile.last_comment
                ? `${selectedProfile.last_comment} - ${selectedProfile.last_comment_author || "Usuario"} - ${formatDateTime(selectedProfile.last_comment_at)}`
                : "Sin comentarios previos."}
            </p>
            <label className="field">
              <span>Nuevo comentario</span>
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={4} />
            </label>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelectedProfile(null)} type="button">
                Cancelar
              </button>
              <button className="btn btn-primary" disabled={addComment.isPending} type="submit">
                Guardar comentario
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

async function fetchProfilesPageData(): Promise<{ ministries: DemoMinistry[]; profiles: DemoProfile[] }> {
  if (!isSupabaseConfigured) {
    return { ministries: demoMinistries, profiles: demoProfiles };
  }

  const [
    { data: ministriesData, error: ministriesError },
    { data: profilesData, error: profilesError },
    { data: usersData, error: usersError },
  ] = await Promise.all([
    supabase.from("ministries").select("id, name, description, active").order("name"),
    supabase
      .from("server_profiles")
      .select("id, full_name, address, phone, email, birth_date, service_start_date, service_status, service_type, active, ministries(name), comments(comment, created_at, user_id)")
      .order("full_name"),
    supabase.from("users").select("id, full_name, email"),
  ]);

  if (ministriesError || profilesError || usersError) {
    return { ministries: demoMinistries, profiles: demoProfiles };
  }
  const userById = new Map((usersData ?? []).map((user: any) => [user.id, user.full_name || user.email || "Usuario"]));

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
      ...latestComment(profile.comments, userById),
    })),
  };
}

function latestComment(
  comments: { comment: string; created_at: string; user_id: string | null }[] | null | undefined,
  userById: Map<string, string>,
) {
  if (!comments?.length) return {};
  const latest = [...comments].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  return {
    last_comment: latest?.comment ?? "",
    last_comment_author: latest?.user_id ? userById.get(latest.user_id) ?? "Usuario" : "Sistema",
    last_comment_at: latest?.created_at ?? "",
  };
}

function formatDateTime(value: string | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
