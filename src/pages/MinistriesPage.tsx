import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { demoStatusOptions, type DemoMinistry, type DemoProfile, type DemoStatusOption } from "../data/demoData";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type MinistryFormState = {
  id?: string;
  name: string;
  description: string;
  active: boolean;
};

const emptyMinistryForm: MinistryFormState = {
  name: "",
  description: "",
  active: true,
};

type DepartmentRecord = {
  id: string;
  ministry_id: string;
  ministry_name: string;
  name: string;
  description: string;
  active: boolean;
};

type DepartmentFormState = {
  id?: string;
  ministry_id: string;
  name: string;
  description: string;
  active: boolean;
};

const emptyDepartmentForm: DepartmentFormState = {
  ministry_id: "",
  name: "",
  description: "",
  active: true,
};

type StatusFormState = {
  id?: string;
  name: string;
  active: boolean;
};

const emptyStatusForm: StatusFormState = {
  name: "",
  active: true,
};

type MinistriesPageData = {
  departments: DepartmentRecord[];
  ministries: DemoMinistry[];
  profiles: DemoProfile[];
  statuses: DemoStatusOption[];
};

const emptyMinistriesPageData: MinistriesPageData = {
  departments: [],
  ministries: [],
  profiles: [],
  statuses: demoStatusOptions,
};

export function MinistriesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<MinistryFormState>(emptyMinistryForm);
  const [departmentForm, setDepartmentForm] = useState<DepartmentFormState>(emptyDepartmentForm);
  const [statusForm, setStatusForm] = useState<StatusFormState>(emptyStatusForm);
  const [message, setMessage] = useState<string | null>(null);
  const { data, error, isLoading } = useQuery({
    queryKey: ["ministries-page-data"],
    queryFn: fetchMinistriesPageData,
    initialData: emptyMinistriesPageData,
  });

  const ministries = data.ministries;
  const departments = data.departments;
  const profiles = data.profiles;
  const statuses = data.statuses;
  const departmentsByMinistry = useMemo(() => groupDepartmentsByMinistry(departments), [departments]);
  const counts = useMemo(
    () =>
      new Map(
        ministries.map((ministry) => [
          ministry.name,
          {
            total: profiles.filter((profile) => profile.ministry.split(", ").includes(ministry.name)).length,
            active: profiles.filter((profile) => profile.ministry.split(", ").includes(ministry.name) && profile.service_status === "Activo").length,
          },
        ]),
      ),
    [ministries, profiles],
  );

  const saveMinistry = useMutation({
    mutationFn: async (payload: MinistryFormState) => {
      if (!payload.name.trim()) throw new Error("El nombre del ministerio es obligatorio.");
      if (!isSupabaseConfigured) return;

      const record = {
        name: payload.name.trim(),
        description: payload.description.trim() || null,
        active: payload.active,
      };
      const request = payload.id
        ? supabase.from("ministries").update(record).eq("id", payload.id)
        : supabase.from("ministries").insert(record);
      const { error } = await request;
      if (error) throw error;
    },
    onSuccess: async () => {
      setForm(emptyMinistryForm);
      setMessage("Ministerio guardado correctamente.");
      await queryClient.invalidateQueries({ queryKey: ["ministries-page-data"] });
      await queryClient.invalidateQueries({ queryKey: ["profiles-page-data"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
  });

  const deleteMinistry = useMutation({
    mutationFn: async (ministry: DemoMinistry) => {
      if (!isSupabaseConfigured) return;
      const isUsed = profiles.some((profile) => profile.ministry.split(", ").includes(ministry.name));
      if (isUsed) throw new Error("No se puede borrar un ministerio con servidores asignados.");

      await supabase.from("user_invitations").delete().eq("ministry_id", ministry.id);
      await supabase.from("ministry_departments").delete().eq("ministry_id", ministry.id);
      const { error } = await supabase.from("ministries").delete().eq("id", ministry.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      setMessage("Ministerio borrado correctamente.");
      await queryClient.invalidateQueries({ queryKey: ["ministries-page-data"] });
      await queryClient.invalidateQueries({ queryKey: ["profiles-page-data"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
  });

  const saveDepartment = useMutation({
    mutationFn: async (payload: DepartmentFormState) => {
      if (!payload.ministry_id) throw new Error("Selecciona un ministerio.");
      if (!payload.name.trim()) throw new Error("El departamento es obligatorio.");
      if (!isSupabaseConfigured) return;
      const record = {
        ministry_id: payload.ministry_id,
        name: payload.name.trim(),
        description: payload.description.trim() || null,
        active: payload.active,
      };
      const request = payload.id
        ? supabase.from("ministry_departments").update(record).eq("id", payload.id)
        : supabase.from("ministry_departments").insert(record);
      const { error } = await request;
      if (error) throw error;
    },
    onSuccess: async () => {
      setDepartmentForm(emptyDepartmentForm);
      setMessage("Departamento guardado correctamente.");
      await queryClient.invalidateQueries({ queryKey: ["ministries-page-data"] });
      await queryClient.invalidateQueries({ queryKey: ["profiles-page-data"] });
    },
  });

  const deleteDepartment = useMutation({
    mutationFn: async (department: DepartmentRecord) => {
      if (!isSupabaseConfigured) return;
      const { error } = await supabase.from("ministry_departments").delete().eq("id", department.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      setMessage("Departamento borrado correctamente.");
      await queryClient.invalidateQueries({ queryKey: ["ministries-page-data"] });
    },
  });

  const saveStatus = useMutation({
    mutationFn: async (payload: StatusFormState) => {
      if (!payload.name.trim()) throw new Error("El estatus es obligatorio.");
      if (!isSupabaseConfigured) return;
      const record = { name: payload.name.trim(), active: payload.active };
      const request = payload.id
        ? supabase.from("service_status_options").update(record).eq("id", payload.id)
        : supabase.from("service_status_options").insert(record);
      const { error } = await request;
      if (error) throw error;
    },
    onSuccess: async () => {
      setStatusForm(emptyStatusForm);
      setMessage("Estatus guardado correctamente.");
      await queryClient.invalidateQueries({ queryKey: ["ministries-page-data"] });
      await queryClient.invalidateQueries({ queryKey: ["profiles-page-data"] });
    },
  });

  const deleteStatus = useMutation({
    mutationFn: async (status: DemoStatusOption) => {
      if (!isSupabaseConfigured) return;
      const { error } = await supabase.from("service_status_options").delete().eq("id", status.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      setMessage("Estatus borrado correctamente.");
      await queryClient.invalidateQueries({ queryKey: ["ministries-page-data"] });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    saveMinistry.mutate(form);
  }

  function submitDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    saveDepartment.mutate(departmentForm);
  }

  function submitStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    saveStatus.mutate(statusForm);
  }

  function editMinistry(ministry: DemoMinistry) {
    setForm({
      id: ministry.id,
      name: ministry.name,
      description: ministry.description || "",
      active: ministry.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function confirmDelete(ministry: DemoMinistry) {
    const confirmed = window.confirm(`Borrar el ministerio ${ministry.name}?`);
    if (confirmed) deleteMinistry.mutate(ministry);
  }

  function editDepartment(department: DepartmentRecord) {
    setDepartmentForm({
      id: department.id,
      ministry_id: department.ministry_id,
      name: department.name,
      description: department.description || "",
      active: department.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function confirmDeleteDepartment(department: DepartmentRecord) {
    const confirmed = window.confirm(`Borrar el departamento ${department.name}?`);
    if (confirmed) deleteDepartment.mutate(department);
  }

  function editStatus(status: DemoStatusOption) {
    setStatusForm({
      id: status.id,
      name: status.name,
      active: status.active,
    });
  }

  function confirmDeleteStatus(status: DemoStatusOption) {
    const confirmed = window.confirm(`Borrar el estatus ${status.name}?`);
    if (confirmed) deleteStatus.mutate(status);
  }

  return (
    <div className="page-stack">
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">Administración</p>
          <h1>MINISTERIOS</h1>
          <p>Agrega, cambia o borra ministerios y departamentos.</p>
        </div>
      </section>

      {error && <div className="alert error">No se pudieron cargar los ministerios.</div>}
      {isLoading && <div className="panel helper-text">Cargando ministerios...</div>}

      <form className={`panel catalog-form ${form.id ? "editing-form" : ""}`} onSubmit={submit}>
        {form.id && <strong className="edit-banner">Editando ministerio: {form.name}</strong>}
        <label className="field">
          <span>Ministerio</span>
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label className="field">
          <span>Descripción</span>
          <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </label>
        <label className="field checkbox-field">
          <input checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} type="checkbox" />
          <span>Activo</span>
        </label>
        <button className="btn btn-primary" disabled={saveMinistry.isPending} type="submit">
          <Plus size={18} />
          {form.id ? "Actualizar" : "Agregar"}
        </button>
        {form.id && (
          <button className="btn btn-secondary" onClick={() => setForm(emptyMinistryForm)} type="button">
            Cancelar
          </button>
        )}
        {saveMinistry.error && <div className="alert error">{saveMinistry.error.message}</div>}
        {deleteMinistry.error && <div className="alert error">{deleteMinistry.error.message || "No se pudo borrar. Revisa si hay servidores usando este ministerio."}</div>}
        {message && <div className="alert success">{message}</div>}
      </form>

      <section className="panel">
        <div className="panel-header">
          <h2>DEPARTAMENTOS</h2>
        </div>
        <form className={`catalog-form ${departmentForm.id ? "editing-form" : ""}`} onSubmit={submitDepartment}>
          {departmentForm.id && <strong className="edit-banner">Editando departamento: {departmentForm.name}</strong>}
          <label className="field">
            <span>Ministerio</span>
            <select value={departmentForm.ministry_id} onChange={(event) => setDepartmentForm({ ...departmentForm, ministry_id: event.target.value })}>
              <option value="">Seleccionar</option>
              {ministries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Departamento</span>
            <input value={departmentForm.name} onChange={(event) => setDepartmentForm({ ...departmentForm, name: event.target.value })} />
          </label>
          <label className="field">
            <span>Descripción</span>
            <input value={departmentForm.description} onChange={(event) => setDepartmentForm({ ...departmentForm, description: event.target.value })} />
          </label>
          <label className="field checkbox-field">
            <input checked={departmentForm.active} onChange={(event) => setDepartmentForm({ ...departmentForm, active: event.target.checked })} type="checkbox" />
            <span>Activo</span>
          </label>
          <button className="btn btn-primary" disabled={saveDepartment.isPending} type="submit">
            <Plus size={18} />
            {departmentForm.id ? "Actualizar" : "Agregar"}
          </button>
          {departmentForm.id && (
            <button className="btn btn-secondary" onClick={() => setDepartmentForm(emptyDepartmentForm)} type="button">
              Cancelar
            </button>
          )}
          {saveDepartment.error && <div className="alert error">{saveDepartment.error.message}</div>}
          {deleteDepartment.error && <div className="alert error">No se pudo borrar. Revisa si hay servidores usando este departamento.</div>}
        </form>
      </section>

      <section className="ministries-grid">
        {ministries.map((ministry) => {
          const count = counts.get(ministry.name) ?? { total: 0, active: 0 };
          const ministryDepartments = departmentsByMinistry.get(ministry.id) ?? [];

          return (
            <article className="panel ministry-card" key={ministry.id}>
              <div>
                <h2>{ministry.name.toUpperCase()}</h2>
                <p>{ministry.description}</p>
              </div>
              <div className="ministry-metrics">
                <span>{count.total} servidores</span>
                <strong>{count.active} activos</strong>
              </div>
              <div className="department-list">
                {ministryDepartments.length === 0 ? (
                  <span>Sin departamentos.</span>
                ) : (
                  ministryDepartments.map((department) => (
                    <div key={department.id}>
                      <strong>{department.name}</strong>
                      <span>{department.active ? "Activo" : "Inactivo"}</span>
                      <button className="link-button" onClick={() => editDepartment(department)} type="button">Editar</button>
                      <button className="link-button danger-link" onClick={() => confirmDeleteDepartment(department)} type="button">Borrar</button>
                    </div>
                  ))
                )}
              </div>
              <div className="row-actions">
                <button className="btn btn-secondary" onClick={() => editMinistry(ministry)} type="button">
                  Editar
                </button>
                <button className="btn btn-danger" onClick={() => confirmDelete(ministry)} type="button">
                  <Trash2 size={15} />
                  Borrar
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>ESTATUS</h2>
        </div>
        <form className="catalog-form" onSubmit={submitStatus}>
          <label className="field">
            <span>Estatus</span>
            <input value={statusForm.name} onChange={(event) => setStatusForm({ ...statusForm, name: event.target.value })} />
          </label>
          <label className="field checkbox-field">
            <input checked={statusForm.active} onChange={(event) => setStatusForm({ ...statusForm, active: event.target.checked })} type="checkbox" />
            <span>Activo</span>
          </label>
          <button className="btn btn-primary" disabled={saveStatus.isPending} type="submit">
            <Plus size={18} />
            {statusForm.id ? "Actualizar" : "Agregar"}
          </button>
          {statusForm.id && (
            <button className="btn btn-secondary" onClick={() => setStatusForm(emptyStatusForm)} type="button">
              Cancelar
            </button>
          )}
          {saveStatus.error && <div className="alert error">{saveStatus.error.message}</div>}
          {deleteStatus.error && <div className="alert error">No se pudo borrar. Revisa si hay servidores usando este estatus.</div>}
        </form>
        <div className="catalog-list">
          {statuses.map((status) => (
            <div className="catalog-row" key={status.id}>
              <strong>{status.name}</strong>
              <span>{status.active ? "Activo" : "Inactivo"}</span>
              <button className="btn btn-secondary" onClick={() => editStatus(status)} type="button">
                Editar
              </button>
              <button className="btn btn-danger" onClick={() => confirmDeleteStatus(status)} type="button">
                <Trash2 size={15} />
                Borrar
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

async function fetchMinistriesPageData(): Promise<MinistriesPageData> {
  if (!isSupabaseConfigured) return emptyMinistriesPageData;

  const [ministriesResult, departmentsResult, profilesResult, profileMinistriesResult, statusesResult] = await Promise.all([
    supabase.from("ministries").select("id, name, description, active").eq("active", true).order("name"),
    supabase.from("ministry_departments").select("id, ministry_id, name, description, active").eq("active", true).order("name"),
    supabase.from("server_profiles").select("id, full_name, service_status, service_type, active, ministry_id").order("full_name"),
    supabase.from("server_profile_ministries").select("profile_id, ministry_id"),
    supabase.from("service_status_options").select("id, name, active").order("name"),
  ]);

  if (ministriesResult.error) {
    console.error("Ministries data error", ministriesResult.error);
    throw ministriesResult.error;
  }

  const ministries = (ministriesResult.data ?? []) as DemoMinistry[];
  const ministryById = new Map(ministries.map((ministry) => [ministry.id, ministry.name]));
  const ministriesByProfile = groupByProfile(profileMinistriesResult.error ? [] : profileMinistriesResult.data ?? []);

  return {
    departments: (departmentsResult.error ? [] : departmentsResult.data ?? []).map((department: any) => ({
      id: department.id,
      ministry_id: department.ministry_id,
      ministry_name: ministryById.get(department.ministry_id) ?? "Sin ministerio",
      name: department.name,
      description: department.description ?? "",
      active: department.active,
    })),
    ministries,
    statuses: (statusesResult.error ? demoStatusOptions : statusesResult.data ?? demoStatusOptions) as DemoStatusOption[],
    profiles: (profilesResult.error ? [] : profilesResult.data ?? []).map((profile: any) => {
      const profileMinistries = ministriesByProfile.get(profile.id) ?? [];
      const ministryIds = profileMinistries.length
        ? profileMinistries.map((item: any) => item.ministry_id)
        : [profile.ministry_id].filter(Boolean);
      const ministryNames = ministryIds.map((ministryId: string) => ministryById.get(ministryId));

      return {
        id: profile.id,
        full_name: profile.full_name,
        address: "",
        phone: "",
        email: "",
        birth_date: "",
        service_start_date: "",
        service_status: profile.service_status ?? "Activo",
        service_type: profile.service_type ?? "Ministerial",
        ministry: uniqueNames(ministryNames).join(", ") || "Sin ministerio",
        active: profile.active ?? true,
      };
    }),
  };
}

function groupDepartmentsByMinistry(departments: DepartmentRecord[]) {
  const grouped = new Map<string, DepartmentRecord[]>();
  departments.forEach((department) => {
    const current = grouped.get(department.ministry_id) ?? [];
    current.push(department);
    grouped.set(department.ministry_id, current);
  });
  return grouped;
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
