import { Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { demoStatusOptions, type DemoMinistry, type DemoProfile, type DemoStatusOption } from "../data/demoData";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useAuth } from "../providers/AuthProvider";

type ProfileComment = {
  id: string;
  comment: string;
  created_at: string;
  author: string;
};

type DepartmentRecord = {
  id: string;
  ministry_id: string;
  ministry_name: string;
  name: string;
  active: boolean;
};

type ProfileRecord = DemoProfile & {
  ministry_id?: string | null;
  ministry_ids?: string[];
  department_ids?: string[];
  departments?: string;
  comments?: ProfileComment[];
  baptism_status?: string;
  profession_year?: string;
  membership_since_year?: string;
  membership_classes?: string;
  service_availability?: string;
  skills_talents?: string;
  service_ministries?: string;
  marital_status?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
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
  ministry_ids: string[];
  department_ids: string[];
  active: boolean;
};

type ProfilesPageData = {
  departments: DepartmentRecord[];
  ministries: DemoMinistry[];
  profiles: ProfileRecord[];
  statuses: DemoStatusOption[];
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
  ministry_ids: [],
  department_ids: [],
  active: true,
};

const emptyProfilesPageData: ProfilesPageData = {
  departments: [],
  ministries: [],
  profiles: [],
  statuses: demoStatusOptions,
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
  const { data, isLoading, error } = useQuery({
    queryKey: ["profiles-page-data"],
    queryFn: fetchProfilesPageData,
    initialData: emptyProfilesPageData,
  });

  const profiles = data.profiles;
  const ministries = data.ministries;
  const departments = data.departments;
  const statuses = data.statuses;
  const detailProfile = detailId ? profiles.find((profile) => profile.id === detailId) ?? null : null;

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const filteredProfiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return profiles.filter((profile) => {
      const searchableMinistries = profile.ministry.toLowerCase();
      const searchableDepartments = (profile.departments ?? "").toLowerCase();
      const matchesQuery =
        normalizedQuery.length === 0 ||
        profile.full_name.toLowerCase().includes(normalizedQuery) ||
        profile.email.toLowerCase().includes(normalizedQuery) ||
        profile.phone.includes(normalizedQuery) ||
        searchableMinistries.includes(normalizedQuery) ||
        searchableDepartments.includes(normalizedQuery);
      const matchesMinistry = ministry === "Todos" || profile.ministry.split(", ").includes(ministry);
      const matchesStatus = status === "Todos" || profile.service_status === status;

      return matchesQuery && matchesMinistry && matchesStatus;
    });
  }, [ministry, profiles, query, status]);

  const profileMutation = useMutation({
    mutationFn: async (payload: ProfileFormState) => {
      if (!payload.full_name.trim()) throw new Error("El nombre es obligatorio.");
      if (!isSupabaseConfigured) return;

      const selectedDepartmentIds = payload.department_ids.filter((departmentId) =>
        departments.some((department) => department.id === departmentId && payload.ministry_ids.includes(department.ministry_id)),
      );
      const primaryMinistryId = payload.ministry_ids[0] || payload.ministry_id || null;
      const record = {
        full_name: payload.full_name.trim(),
        address: payload.address.trim() || null,
        phone: payload.phone.trim() || null,
        email: payload.email.trim() || null,
        birth_date: payload.birth_date || null,
        service_start_date: payload.service_start_date || null,
        service_status: payload.service_status,
        service_type: payload.service_type,
        ministry_id: primaryMinistryId,
        active: payload.active,
      };

      let profileId = payload.id;
      if (profileId) {
        const { error } = await supabase.from("server_profiles").update(record).eq("id", profileId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("server_profiles").insert(record).select("id").single();
        if (error) throw error;
        profileId = data.id;
      }

      if (!profileId) throw new Error("No se pudo guardar el servidor.");
      await replaceProfileAssignments(profileId, payload.ministry_ids, selectedDepartmentIds);
    },
    onSuccess: async () => {
      setEditingProfile(null);
      await queryClient.invalidateQueries({ queryKey: ["profiles-page-data"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
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
      await queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
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
            <Info label="Ministerios" value={detailProfile.ministry} />
            <Info label="Departamentos" value={detailProfile.departments ?? ""} />
            <Info label="Estado civil" value={detailProfile.marital_status ?? ""} />
            <Info label="Contacto de emergencia" value={formatEmergencyContact(detailProfile)} />
            <Info label="Bautizado" value={detailProfile.baptism_status ?? ""} />
            <Info label="Año profesión de fe" value={detailProfile.profession_year ?? ""} />
            <Info label="Año en Taber LA" value={detailProfile.membership_since_year ?? ""} />
            <Info label="Clases de membresía" value={formatMultiline(detailProfile.membership_classes)} />
            <Info label="Disponibilidad" value={formatMultiline(detailProfile.service_availability)} />
            <Info label="Habilidades o talentos" value={detailProfile.skills_talents ?? ""} />
            <Info label="Ministerios de servicio" value={formatMultiline(detailProfile.service_ministries)} />
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
            departments={departments}
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
            placeholder="Buscar por nombre, email, teléfono, ministerio o departamento"
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

      {error && <div className="alert error">No se pudieron cargar los servidores.</div>}
      {isLoading && <div className="panel helper-text">Cargando servidores...</div>}

      <section className="panel table-panel desktop-profile-table">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Ministerio</th>
                <th>Departamento</th>
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
              {!isLoading && filteredProfiles.length === 0 && (
                <tr>
                  <td colSpan={9}>No hay servidores para mostrar.</td>
                </tr>
              )}
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
          departments={departments}
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
      <td>{profile.departments || "Sin departamento"}</td>
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
      <p>{profile.departments || "Sin departamento"}</p>
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
  departments,
  error,
  form,
  isSaving,
  ministries,
  onCancel,
  onChange,
  onSubmit,
  statuses,
}: {
  departments: DepartmentRecord[];
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

  const selectedDepartments = departments.filter((department) => form.ministry_ids.includes(department.ministry_id));

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
            <span>Ministerios</span>
            <div className="check-list">
              {ministries.map((item) => (
                <label key={item.id}>
                  <input
                    checked={form.ministry_ids.includes(item.id)}
                    onChange={() => onChange(toggleMinistry(form, item.id, departments))}
                    type="checkbox"
                  />
                  <span>{item.name}</span>
                </label>
              ))}
            </div>
          </label>
          <label className="field">
            <span>Departamentos</span>
            <div className="check-list">
              {selectedDepartments.length === 0 ? (
                <small>Selecciona un ministerio.</small>
              ) : (
                selectedDepartments.map((item) => (
                  <label key={item.id}>
                    <input
                      checked={form.department_ids.includes(item.id)}
                      onChange={() => onChange(toggleDepartment(form, item.id))}
                      type="checkbox"
                    />
                    <span>{item.ministry_name} - {item.name}</span>
                  </label>
                ))
              )}
            </div>
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

async function replaceProfileAssignments(profileId: string, ministryIds: string[], departmentIds: string[]) {
  await supabase.from("server_profile_departments").delete().eq("profile_id", profileId);
  await supabase.from("server_profile_ministries").delete().eq("profile_id", profileId);

  if (ministryIds.length) {
    const { error } = await supabase.from("server_profile_ministries").insert(
      ministryIds.map((ministry_id) => ({ profile_id: profileId, ministry_id })),
    );
    if (error) throw error;
  }

  if (departmentIds.length) {
    const { error } = await supabase.from("server_profile_departments").insert(
      departmentIds.map((department_id) => ({ profile_id: profileId, department_id })),
    );
    if (error) throw error;
  }
}

async function fetchProfilesPageData(): Promise<ProfilesPageData> {
  if (!isSupabaseConfigured) return emptyProfilesPageData;

  const [
    ministriesResult,
    departmentsResult,
    profilesResult,
    profileMinistriesResult,
    profileDepartmentsResult,
    commentsResult,
    usersResult,
    statusesResult,
  ] = await Promise.all([
    supabase.from("ministries").select("id, name, description, active").eq("active", true).order("name"),
    supabase.from("ministry_departments").select("id, ministry_id, name, active").eq("active", true).order("name"),
    supabase
      .from("server_profiles")
      .select("id, full_name, address, phone, email, birth_date, service_start_date, service_status, service_type, ministry_id, active, marital_status, emergency_contact_name, emergency_contact_phone, baptism_status, profession_year, membership_since_year, membership_classes, service_availability, skills_talents, service_ministries")
      .order("full_name"),
    supabase.from("server_profile_ministries").select("profile_id, ministry_id"),
    supabase.from("server_profile_departments").select("profile_id, department_id"),
    supabase.from("comments").select("id, profile_id, comment, created_at, user_id").order("created_at", { ascending: false }),
    supabase.from("users").select("id, full_name, email"),
    supabase.from("service_status_options").select("id, name, active").eq("active", true).order("name"),
  ]);

  if (ministriesResult.error || profilesResult.error) {
    console.error("Profiles data error", { ministriesError: ministriesResult.error, profilesError: profilesResult.error });
    throw ministriesResult.error ?? profilesResult.error;
  }

  const ministries = (ministriesResult.data ?? []) as DemoMinistry[];
  const ministryById = new Map(ministries.map((ministry) => [ministry.id, ministry.name]));
  const departments = (departmentsResult.error ? [] : departmentsResult.data ?? []).map((department: any) => ({
    id: department.id,
    ministry_id: department.ministry_id,
    ministry_name: ministryById.get(department.ministry_id) ?? "Sin ministerio",
    name: department.name,
    active: department.active,
  }));
  const departmentById = new Map(departments.map((department) => [department.id, department]));
  const userById = new Map(
    (usersResult.error ? [] : usersResult.data ?? []).map((user: any) => [user.id, user.full_name || user.email || "Usuario"]),
  );
  const ministriesByProfile = groupByProfile(profileMinistriesResult.error ? [] : profileMinistriesResult.data ?? []);
  const departmentsByProfile = groupByProfile(profileDepartmentsResult.error ? [] : profileDepartmentsResult.data ?? []);
  const commentsByProfile = groupByProfile(commentsResult.error ? [] : commentsResult.data ?? []);

  return {
    departments,
    ministries,
    statuses: (statusesResult.error ? demoStatusOptions : statusesResult.data ?? demoStatusOptions) as DemoStatusOption[],
    profiles: (profilesResult.data ?? []).map((profile: any) => {
      const profileMinistries = ministriesByProfile.get(profile.id) ?? [];
      const profileDepartments = departmentsByProfile.get(profile.id) ?? [];
      const comments = mapComments(commentsByProfile.get(profile.id), userById);
      const ministryIds = profileMinistries.length
        ? profileMinistries.map((item: any) => item.ministry_id)
        : [profile.ministry_id].filter(Boolean);
      const ministryNames = ministryIds.map((ministryId: string) => ministryById.get(ministryId));
      const departmentIds = profileDepartments.map((item: any) => item.department_id).filter(Boolean);
      const departmentNames = departmentIds.map((departmentId: string) => {
        const department = departmentById.get(departmentId);
        return department ? `${department.ministry_name} - ${department.name}` : "";
      });

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
        ministry_id: profile.ministry_id,
        ministry_ids: ministryIds,
        department_ids: departmentIds,
        departments: uniqueNames(departmentNames).join(", "),
        active: profile.active ?? true,
        marital_status: profile.marital_status ?? "",
        emergency_contact_name: profile.emergency_contact_name ?? "",
        emergency_contact_phone: profile.emergency_contact_phone ?? "",
        baptism_status: profile.baptism_status ?? "",
        profession_year: profile.profession_year ?? "",
        membership_since_year: profile.membership_since_year ?? "",
        membership_classes: profile.membership_classes ?? "",
        service_availability: profile.service_availability ?? "",
        skills_talents: profile.skills_talents ?? "",
        service_ministries: profile.service_ministries ?? "",
        comments,
        last_comment: comments[0]?.comment ?? "",
        last_comment_author: comments[0]?.author ?? "",
        last_comment_at: comments[0]?.created_at ?? "",
      };
    }),
  };
}

function groupByProfile(rows: any[] | undefined) {
  const grouped = new Map<string, any[]>();
  (rows ?? []).forEach((row) => {
    const current = grouped.get(row.profile_id) ?? [];
    current.push(row);
    grouped.set(row.profile_id, current);
  });
  return grouped;
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
    ministry_ids: profile.ministry_ids?.length ? profile.ministry_ids : [profile.ministry_id ?? ""].filter(Boolean),
    department_ids: profile.department_ids ?? [],
    active: profile.active,
  };
}

function toggleMinistry(form: ProfileFormState, ministryId: string, departments: DepartmentRecord[]) {
  const nextMinistryIds = form.ministry_ids.includes(ministryId)
    ? form.ministry_ids.filter((id) => id !== ministryId)
    : [...form.ministry_ids, ministryId];
  const nextDepartmentIds = form.department_ids.filter((departmentId) =>
    departments.some((department) => department.id === departmentId && nextMinistryIds.includes(department.ministry_id)),
  );
  return { ...form, ministry_id: nextMinistryIds[0] ?? "", ministry_ids: nextMinistryIds, department_ids: nextDepartmentIds };
}

function toggleDepartment(form: ProfileFormState, departmentId: string) {
  return {
    ...form,
    department_ids: form.department_ids.includes(departmentId)
      ? form.department_ids.filter((item) => item !== departmentId)
      : [...form.department_ids, departmentId],
  };
}

function uniqueNames(values: (string | undefined)[]) {
  return Array.from(new Set(values.filter(Boolean))) as string[];
}

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function formatMultiline(value: string | undefined) {
  return value?.replace(/\n/g, ", ") ?? "";
}

function formatEmergencyContact(profile: ProfileRecord) {
  return [profile.emergency_contact_name, profile.emergency_contact_phone].filter(Boolean).join(" - ");
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
