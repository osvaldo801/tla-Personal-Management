import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { demoMinistries, demoProfiles, demoStatusOptions, type DemoMinistry, type DemoProfile, type DemoStatusOption } from "../data/demoData";
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

type StatusFormState = {
  id?: string;
  name: string;
  active: boolean;
};

const emptyStatusForm: StatusFormState = {
  name: "",
  active: true,
};

export function MinistriesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<MinistryFormState>(emptyMinistryForm);
  const [statusForm, setStatusForm] = useState<StatusFormState>(emptyStatusForm);
  const [message, setMessage] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["ministries-page-data"],
    queryFn: fetchMinistriesPageData,
    initialData: { ministries: demoMinistries, profiles: demoProfiles, statuses: demoStatusOptions },
  });

  const ministries = data.ministries;
  const profiles = data.profiles;
  const statuses = data.statuses;
  const counts = useMemo(
    () =>
      new Map(
        ministries.map((ministry) => [
          ministry.name,
          {
            total: profiles.filter((profile) => profile.ministry === ministry.name).length,
            active: profiles.filter((profile) => profile.ministry === ministry.name && profile.service_status === "Activo").length,
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
    },
  });

  const deleteMinistry = useMutation({
    mutationFn: async (ministry: DemoMinistry) => {
      if (!isSupabaseConfigured) return;
      const { error } = await supabase.from("ministries").delete().eq("id", ministry.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      setMessage("Ministerio borrado correctamente.");
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
  }

  function confirmDelete(ministry: DemoMinistry) {
    const confirmed = window.confirm(`Borrar el ministerio ${ministry.name}?`);
    if (confirmed) deleteMinistry.mutate(ministry);
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
          <p className="eyebrow">Administracion</p>
          <h1>MINISTERIOS</h1>
          <p>Agrega, cambia o borra ministerios.</p>
        </div>
      </section>

      <form className="panel catalog-form" onSubmit={submit}>
        <label className="field">
          <span>Ministerio</span>
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label className="field">
          <span>Descripcion</span>
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
        {deleteMinistry.error && <div className="alert error">No se pudo borrar. Revisa si hay servidores usando este ministerio.</div>}
        {message && <div className="alert success">{message}</div>}
      </form>

      <section className="ministries-grid">
        {ministries.map((ministry) => {
          const count = counts.get(ministry.name) ?? { total: 0, active: 0 };

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

async function fetchMinistriesPageData(): Promise<{ ministries: DemoMinistry[]; profiles: DemoProfile[]; statuses: DemoStatusOption[] }> {
  if (!isSupabaseConfigured) {
    return { ministries: demoMinistries, profiles: demoProfiles, statuses: demoStatusOptions };
  }

  const [
    { data: ministriesData, error: ministriesError },
    { data: profilesData, error: profilesError },
    { data: statusesData, error: statusesError },
  ] =
    await Promise.all([
      supabase.from("ministries").select("id, name, description, active").order("name"),
      supabase.from("server_profiles").select("id, full_name, service_status, service_type, active, ministries(name)").order("full_name"),
      supabase.from("service_status_options").select("id, name, active").order("name"),
    ]);

  if (ministriesError || profilesError || statusesError) {
    return { ministries: demoMinistries, profiles: demoProfiles, statuses: demoStatusOptions };
  }

  return {
    ministries: (ministriesData ?? []) as DemoMinistry[],
    statuses: (statusesData ?? []) as DemoStatusOption[],
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
