import { Shield, UserPlus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { demoMinistries, type DemoMinistry } from "../data/demoData";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type ManagedUser = {
  id: string;
  full_name: string | null;
  email: string;
  role: "admin" | "ministry_leader";
  ministry_id: string | null;
  created_at: string;
};

type UserFormState = {
  full_name: string;
  email: string;
  role: "admin" | "ministry_leader";
  ministry_id: string;
};

const defaultForm: UserFormState = {
  full_name: "",
  email: "",
  role: "ministry_leader",
  ministry_id: "",
};

export function UsersPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["admin-users-page"],
    queryFn: fetchUsersPageData,
    initialData: {
      users: [
        {
          id: "demo-admin",
          full_name: "Osvaldo Vasquez",
          email: "osvaldo801@gmail.com",
          role: "admin" as const,
          ministry_id: null,
          created_at: new Date().toISOString(),
        },
      ],
      ministries: demoMinistries,
    },
  });

  const ministryById = useMemo(
    () => new Map(data.ministries.map((ministry) => [ministry.id, ministry.name])),
    [data.ministries],
  );

  const saveUser = useMutation({
    mutationFn: async (payload: UserFormState) => {
      if (!payload.email.trim()) throw new Error("El email es obligatorio.");
      if (!payload.full_name.trim()) throw new Error("El nombre es obligatorio.");

      if (!isSupabaseConfigured) return;

      const { error } = await supabase.rpc("admin_upsert_user", {
        target_email: payload.email.trim().toLowerCase(),
        target_full_name: payload.full_name.trim(),
        target_role: payload.role,
        target_ministry_id: payload.ministry_id || null,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      setForm(defaultForm);
      setMessage("Usuario guardado correctamente.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users-page"] });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    saveUser.mutate(form);
  }

  return (
    <div className="page-stack">
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">Administracion</p>
          <h1>Usuarios y Roles</h1>
          <p>Aprueba acceso administrativo y asigna permisos por rol.</p>
        </div>
      </section>

      <form className="panel user-form" onSubmit={handleSubmit}>
        <div className="form-note">El usuario debe iniciar sesion una vez con Google antes de asignarle rol.</div>
        <label className="field">
          <span>Nombre completo</span>
          <input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </label>
        <label className="field">
          <span>Rol</span>
          <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserFormState["role"] })}>
            <option value="admin">Administrador</option>
            <option value="ministry_leader">Lider de Ministerio</option>
          </select>
        </label>
        <label className="field">
          <span>Ministerio</span>
          <select value={form.ministry_id} onChange={(event) => setForm({ ...form, ministry_id: event.target.value })}>
            <option value="">Sin ministerio</option>
            {data.ministries.map((ministry) => (
              <option value={ministry.id} key={ministry.id}>
                {ministry.name}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-primary" disabled={saveUser.isPending} type="submit">
          <UserPlus size={18} />
          {saveUser.isPending ? "Guardando..." : "Guardar usuario"}
        </button>
        {saveUser.error && <div className="alert error">{saveUser.error.message}</div>}
        {message && <div className="alert success">{message}</div>}
      </form>

      <section className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Ministerio</th>
                <th>Acceso</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.full_name || user.email}</strong>
                    <span>{user.email}</span>
                  </td>
                  <td>{user.role === "admin" ? "Administrador" : "Lider de Ministerio"}</td>
                  <td>{user.ministry_id ? ministryById.get(user.ministry_id) || "Asignado" : "Global"}</td>
                  <td>
                    <span className="status-pill status-activo">
                      <Shield size={13} />
                      Activo
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

async function fetchUsersPageData(): Promise<{ users: ManagedUser[]; ministries: DemoMinistry[] }> {
  if (!isSupabaseConfigured) {
    return {
      users: [
        {
          id: "demo-admin",
          full_name: "Osvaldo Vasquez",
          email: "osvaldo801@gmail.com",
          role: "admin",
          ministry_id: null,
          created_at: new Date().toISOString(),
        },
      ],
      ministries: demoMinistries,
    };
  }

  const [{ data: users, error: usersError }, { data: ministries, error: ministriesError }] = await Promise.all([
    supabase.from("users").select("id, full_name, email, role, ministry_id, created_at").order("email"),
    supabase.from("ministries").select("id, name, description, active").order("name"),
  ]);

  if (usersError || ministriesError) throw usersError || ministriesError;

  return {
    users: (users ?? []) as ManagedUser[],
    ministries: (ministries ?? []) as DemoMinistry[],
  };
}
