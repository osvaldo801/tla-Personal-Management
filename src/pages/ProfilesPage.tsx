import { Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { demoMinistries, demoProfiles, demoStatusOptions, type DemoMinistry, type DemoProfile, type DemoStatusOption } from "../data/demoData";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useAuth } from "../providers/AuthProvider";

type ProfileComment = {
  id: string;
  comment: string;
  created_at: string;
  author: string;
};

type ProfileRecord = DemoProfile & {
  ministry_id?: string | null;
  comments?: ProfileComment[];
};

type ProfileFormState = {
  id?: string;
  full_name: string;
  address: string;
  phone: string;
  email: string;
  birth_date: string;
  service_start_date: string;
  service_status: string;
  service_type: DemoProfile["service_type"];
  ministry_id: string;
  active: boolean;
};

const emptyProfileForm: ProfileFormState = {
  full_name: "",
  address: "",
  phone: "",
  email: "",
  birth_date: "",
  service_start_date: "",
  service_status: "Activo",
  service_type: "Ministerial",
  ministry_id: "",
  active: true,
};

export function ProfilesPage({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [ministry, setMinistry] = useState("Todos");
  const [status, setStatus] = useState("Todos");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [editingProfile, setEditingProfile] = useState<ProfileFormState | null>(null);
  const { isAdmin, profile: currentUser } = useAuth();
  const canCreateProfile = isAdmin || currentUser?.role === "ministry_leader";
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["profiles-page-data"],
    queryFn: fetchProfilesPageData,
    initialData: { ministries: demoMinistries, profiles: demoProfiles as ProfileRecord[], statuses: demoStatusOptions },
  });

  const profiles = data.profiles;
  const ministries = data.ministries;
  const statuses = data.statuses;
  const detailProfile = detailId ? profiles.find((profile) => profile.id === detailId) ?? null : null;

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

  const profileMutation = useMutation({
    mutationFn: async (payload: ProfileFormState) => {
      if (!payload.full_name.trim()) throw new Error("El nombre es obligatorio.");
      if (!isSupabaseConfigured) return;

      const record = {
        full_name: payload.full_name.trim(),
        address: payload.address.trim() || null,
        phone: payload.phone.trim() || null,
        email: payload.email.trim() || null,
        birth_date: payload.birth_date || null,
        service_start_date: payload.service_start_date || null,
        service_status: payload.service_status,
        service_type: payload.service_type,
        ministry_id: payload.ministry_id || null,
        active: payload.active,
      };

      const request = payload.id
        ? supabase.from("server_profiles").update(record).eq("id", payload.id)
        : supabase.from("server_profiles").insert(record);
      const { error } = await request;

      if (error) throw error;
    },
    onSuccess: async () => {
      setEditingProfile(null);
      await queryClient.invalidateQueries({ queryKey: ["profiles-page-data"] });
    },
  });

  const deleteProfile = useMutation({
    mutationFn: async (profileId: string) => {
      if (!isSupabaseConfigured) return;
      const { error } = await supabase.from("server_profiles").delete().eq("id", profileId);
      if (error) throw error;
    },
    onSuccess: async () => {
      setDetailId(null);
      await queryClient.invalidateQueries({ queryKey: ["profiles-page-data"] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, service_status }: { id: string; service_status: string }) => {
      if (!isSupabaseConfigured) return;
      const { error } = await supabase.from("server_profiles").update({ service_status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profiles-page-data"] }),
  });

  const addComment = useMutation({
    mutationFn: async (profileId: string) => {
      if (!comment.trim()) return;
      if (!isSupabaseConfigured) {
        setComment("");
        return;
      }
      const { error } = await supabase.from("comments").insert({
        profile_id: profileId,
        comment: comment.trim(),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setComment("");
      await queryClient.invalidateQueries({ queryKey: ["profiles-page-data"] });
    },
  });

  function openEditor(profile?: ProfileRecord) {
    setEditingProfile(profile ? toFormState(profile) : emptyProfileForm);
  }

  function confirmDelete(profile: ProfileRecord) {
    const confirmed = window.confirm(`Borrar el perfil de ${profile.full_name}?`);
    if (confirmed) deleteProfile.mutate(profile.id);
  }

  if (detailProfile) {
    return (
      <div className="page-stack">
        <section className="page-heading compact profile-detail-heading">
          <div>
            <p className="eyebrow">Ficha del servidor</p>
            <h1>{detailProfile.full_name}</h1>
            <p>{detailProfile.ministry} - {detailProfile.service_status}</p>
          </div>
          <div className="detail-actions">
            {isAdmin && (
              <>
                <button className="btn btn-secondary" onClick={() => openEditor(detailProfile)} type="button">
                  Editar
                </button>
                <button className="btn btn-danger" onClick={() => confirmDelete(detailProfile)} type="button">
                  <Trash2 size={16} />
                  Borrar
                </button>
              </>
            )}
            <button className="btn btn-primary" onClick={() => setDetailId(null)} type="button">
              Volver
            </button>
          </div>
        </section>

        <section className="profile-detail-grid">
          <article className="panel profile-info-panel">
            <h2>Información</h2>
            <Info label="Teléfono" value={detailProfile.phone} />
            <Info label="Email" value={detailProfile.email} />
            <Info label="Dirección" value={detailProfile.address} />
            <Info label="Cumpleaños" value={formatDate(detailProfile.birth_date)} />
            <Info label="Inicio de servicio" value={formatDate(detailProfile.service_start_date)} />
            <Info label="Tipo" value={detailProfile.service_type} />
            <Info label="Estado" value={detailProfile.service_status} />
          </article>

          <article className="panel comments-panel">
            <h2>Comentarios</h2>
            <form
              className="comment-form"
              onSubmit={(event) => {
                event.preventDefault();
                addComment.mutate(detailProfile.id);
              }}
            >
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} />
              <button className="btn btn-primary" disabled={addComment.isPending} type="submit">
                Guardar comentario
              </button>
            </form>
            <div className="comment-history">
              {detailProfile.comments?.length ? (
                detailProfile.comments.map((item) => (
                  <div className="comment-item" key={item.id}>
                    <p>{item.comment}</p>
                    <span>{item.author} - {formatDateTime(item.created_at)}</span>
                  </div>
                ))
              ) : (
                <p className="helper-text">Sin comentarios.</p>
              )}
            </div>
          </article>
        </section>

        {editingProfile && (
          <ProfileEditor
            error={profileMutation.error?.message}
            form={editingProfile}
            isSaving={profileMutation.isPending}
            ministries={ministries}
            onCancel={() => setEditingProfile(null)}
            onChange={setEditingProfile}
            onSubmit={(form) => profileMutation.mutate(form)}
            statuses={statuses}
          />
        )}
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">Gestión</p>
          <h1>Servidores</h1>
          <p>Lista operativa de servidores y colaboradores.</p>
        </div>
        {canCreateProfile && (
          <button className="btn btn-primary" onClick={() => openEditor()} type="button">
            <Plus size={18} />
            Nuevo servidor
          </button>
        )}
      </section>

      <section className="panel filter-panel">
        <label className="search-field">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, email o teléfono"
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
            {statuses.map((item) => (
              <option key={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="panel table-panel desktop-profile-table">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Ministerio</th>
                <th>Estado</th>
                <th>Tipo</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Último comentario</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((profile) => (
                <ProfileRow
                  isAdmin={isAdmin}
                  key={profile.id}
                  onDelete={confirmDelete}
                  onEdit={openEditor}
                  onOpen={setDetailId}
                  onStatusChange={(service_status) => updateStatus.mutate({ id: profile.id, service_status })}
                  profile={profile}
                  statuses={statuses}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mobile-profile-list">
        {filteredProfiles.map((profile) => (
          <ProfileCard
            isAdmin={isAdmin}
            key={profile.id}
            onDelete={confirmDelete}
            onEdit={openEditor}
            onOpen={setDetailId}
            onStatusChange={(service_status) => updateStatus.mutate({ id: profile.id, service_status })}
            profile={profile}
            statuses={statuses}
          />
        ))}
      </section>

      {editingProfile && (
        <ProfileEditor
          error={profileMutation.error?.message}
          form={editingProfile}
          isSaving={profileMutation.isPending}
          ministries={ministries}
          onCancel={() => setEditingProfile(null)}
          onChange={setEditingProfile}
          onSubmit={(form) => profileMutation.mutate(form)}
          statuses={statuses}
        />
      )}
    </div>
  );
}

function ProfileRow({
  isAdmin,
  onDelete,
  onEdit,
  onOpen,
  onStatusChange,
  profile,
  statuses,
}: {
  isAdmin: boolean;
  onDelete: (profile: ProfileRecord) => void;
  onEdit: (profile: ProfileRecord) => void;
  onOpen: (id: string) => void;
  onStatusChange: (status: string) => void;
  profile: ProfileRecord;
  statuses: DemoStatusOption[];
}) {
  return (
    <tr>
      <td>
        <button className="link-button" onClick={() => onOpen(profile.id)} type="button">
          {profile.full_name}
        </button>
        <span>{profile.address}</span>
      </td>
      <td>{profile.ministry}</td>
      <td>
        <span className={`status-pill status-${profile.service_status.toLowerCase()}`}>{profile.service_status}</span>
      </td>
      <td>{profile.service_type}</td>
      <td>{profile.phone}</td>
      <td>{profile.email}</td>
      <td className="comment-cell">
        <strong>{profile.last_comment || "Sin comentarios"}</strong>
        {profile.last_comment && (
          <span>{profile.last_comment_author || "Usuario"} - {formatDateTime(profile.last_comment_at)}</span>
        )}
      </td>
      <td>
        <div className="row-actions">
          {isAdmin && (
            <>
              <select value={profile.service_status} onChange={(event) => onStatusChange(event.target.value)}>
                {statuses.map((item) => <option key={item.id}>{item.name}</option>)}
              </select>
              <button className="btn btn-secondary" onClick={() => onEdit(profile)} type="button">Editar</button>
              <button className="btn btn-danger icon-text" onClick={() => onDelete(profile)} type="button">
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function ProfileCard({
  isAdmin,
  onDelete,
  onEdit,
  onOpen,
  onStatusChange,
  profile,
  statuses,
}: {
  isAdmin: boolean;
  onDelete: (profile: ProfileRecord) => void;
  onEdit: (profile: ProfileRecord) => void;
  onOpen: (id: string) => void;
  onStatusChange: (status: string) => void;
  profile: ProfileRecord;
  statuses: DemoStatusOption[];
}) {
  return (
    <article className="profile-card">
      <button className="link-button profile-card-title" onClick={() => onOpen(profile.id)} type="button">
        {profile.full_name}
      </button>
      <span className={`status-pill status-${profile.service_status.toLowerCase()}`}>{profile.service_status}</span>
      <p>{profile.ministry} - {profile.service_type}</p>
      <p>{profile.phone}</p>
      <p>{profile.email}</p>
      <div className="comment-cell">
        <strong>{profile.last_comment || "Sin comentarios"}</strong>
        {profile.last_comment && (
          <span>{profile.last_comment_author || "Usuario"} - {formatDateTime(profile.last_comment_at)}</span>
        )}
      </div>
      <div className="row-actions">
        {isAdmin && (
          <>
            <select value={profile.service_status} onChange={(event) => onStatusChange(event.target.value)}>
              {statuses.map((item) => <option key={item.id}>{item.name}</option>)}
            </select>
            <button className="btn btn-secondary" onClick={() => onEdit(profile)} type="button">Editar</button>
            <button className="btn btn-danger" onClick={() => onDelete(profile)} type="button">Borrar</button>
          </>
        )}
      </div>
    </article>
  );
}

function ProfileEditor({
  error,
  form,
  isSaving,
  ministries,
  onCancel,
  onChange,
  onSubmit,
  statuses,
}: {
  error?: string;
  form: ProfileFormState;
  isSaving: boolean;
  ministries: DemoMinistry[];
  onCancel: () => void;
  onChange: (form: ProfileFormState) => void;
  onSubmit: (form: ProfileFormState) => void;
  statuses: DemoStatusOption[];
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <div className="modal-backdrop">
      <form className="modal-panel profile-editor" onSubmit={submit}>
        <h2>{form.id ? "Editar servidor" : "Nuevo servidor"}</h2>
        <div className="profile-editor-grid">
          <Field label="Nombre completo" value={form.full_name} onChange={(value) => onChange({ ...form, full_name: value })} />
          <Field label="Teléfono" value={form.phone} onChange={(value) => onChange({ ...form, phone: value })} />
          <Field label="Email" type="email" value={form.email} onChange={(value) => onChange({ ...form, email: value })} />
          <Field label="Dirección" value={form.address} onChange={(value) => onChange({ ...form, address: value })} />
          <Field label="Cumpleaños" type="date" value={form.birth_date} onChange={(value) => onChange({ ...form, birth_date: value })} />
          <Field label="Inicio de servicio" type="date" value={form.service_start_date} onChange={(value) => onChange({ ...form, service_start_date: value })} />
          <label className="field">
            <span>Ministerio</span>
            <select value={form.ministry_id} onChange={(event) => onChange({ ...form, ministry_id: event.target.value })}>
              <option value="">Sin ministerio</option>
              {ministries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Estado</span>
            <select value={form.service_status} onChange={(event) => onChange({ ...form, service_status: event.target.value })}>
              {statuses.map((item) => <option key={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Tipo</span>
            <select value={form.service_type} onChange={(event) => onChange({ ...form, service_type: event.target.value as DemoProfile["service_type"] })}>
              <option>Ministerial</option>
              <option>Administrativo</option>
            </select>
          </label>
          <label className="field checkbox-field">
            <input checked={form.active} onChange={(event) => onChange({ ...form, active: event.target.checked })} type="checkbox" />
            <span>Perfil activo</span>
          </label>
        </div>
        {error && <div className="alert error">{error}</div>}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel} type="button">Cancelar</button>
          <button className="btn btn-primary" disabled={isSaving} type="submit">{isSaving ? "Guardando..." : "Guardar"}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, onChange, type = "text", value }: { label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value || "No registrado"}</strong>
    </div>
  );
}

async function fetchProfilesPageData(): Promise<{ ministries: DemoMinistry[]; profiles: ProfileRecord[]; statuses: DemoStatusOption[] }> {
  if (!isSupabaseConfigured) {
    return { ministries: demoMinistries, profiles: demoProfiles as ProfileRecord[], statuses: demoStatusOptions };
  }

  const [
    { data: ministriesData, error: ministriesError },
    { data: profilesData, error: profilesError },
    { data: usersData, error: usersError },
    { data: statusesData, error: statusesError },
  ] = await Promise.all([
    supabase.from("ministries").select("id, name, description, active").order("name"),
    supabase
      .from("server_profiles")
      .select("id, full_name, address, phone, email, birth_date, service_start_date, service_status, service_type, ministry_id, active, ministries(name), comments(id, comment, created_at, user_id)")
      .order("full_name"),
    supabase.from("users").select("id, full_name, email"),
    supabase.from("service_status_options").select("id, name, active").eq("active", true).order("name"),
  ]);

  if (ministriesError || profilesError || usersError || statusesError) {
    return { ministries: demoMinistries, profiles: demoProfiles as ProfileRecord[], statuses: demoStatusOptions };
  }
  const userById = new Map((usersData ?? []).map((user: any) => [user.id, user.full_name || user.email || "Usuario"]));

  return {
    ministries: (ministriesData ?? []) as DemoMinistry[],
    statuses: (statusesData ?? demoStatusOptions) as DemoStatusOption[],
    profiles: (profilesData ?? []).map((profile: any) => {
      const comments = mapComments(profile.comments, userById);
      return {
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
        ministry_id: profile.ministry_id,
        active: profile.active,
        comments,
        last_comment: comments[0]?.comment ?? "",
        last_comment_author: comments[0]?.author ?? "",
        last_comment_at: comments[0]?.created_at ?? "",
      };
    }),
  };
}

function mapComments(
  comments: { id: string; comment: string; created_at: string; user_id: string | null }[] | null | undefined,
  userById: Map<string, string>,
) {
  if (!comments?.length) return [];
  return [...comments]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((item) => ({
      id: item.id,
      comment: item.comment,
      created_at: item.created_at,
      author: item.user_id ? userById.get(item.user_id) ?? "Usuario" : "Sistema",
    }));
}

function toFormState(profile: ProfileRecord): ProfileFormState {
  return {
    id: profile.id,
    full_name: profile.full_name,
    address: profile.address,
    phone: profile.phone,
    email: profile.email,
    birth_date: profile.birth_date,
    service_start_date: profile.service_start_date,
    service_status: profile.service_status,
    service_type: profile.service_type,
    ministry_id: profile.ministry_id ?? "",
    active: profile.active,
  };
}

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
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
