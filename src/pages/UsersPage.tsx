import { Shield, Trash2, UserPlus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { demoMinistries, type DemoMinistry } from "../data/demoData";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useAuth } from "../providers/AuthProvider";

type ManagedUser = {
  id: string;
  full_name: string | null;
  email: string;
  role: "admin" | "ministry_leader";
  ministry_id: string | null;
  created_at: string;
  access_status: "active" | "pending";
  invitation_token?: string;
};

type UserFormState = {
  full_name: string;
  email: string;
  role: "admin" | "ministry_leader";
  ministry_id: string;
};

type InvitationResult = {
  email?: string;
  full_name?: string;
  token?: string;
  email_sent?: boolean;
  email_error?: string;
} | null | undefined;

const defaultForm: UserFormState = {
  full_name: "",
  email: "",
  role: "ministry_leader",
  ministry_id: "",
};

const publicAppUrl = "https://tla-personal-management.vercel.app";

export function UsersPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { authUser } = useAuth();
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
          access_status: "active" as const,
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
    mutationFn: async (payload: UserFormState): Promise<InvitationResult> => {
      if (!payload.email.trim()) throw new Error("El email es obligatorio.");
      if (!payload.full_name.trim()) throw new Error("El nombre es obligatorio.");

      if (!isSupabaseConfigured) return;

      const { data, error } = await supabase.rpc("admin_create_user_invitation", {
        target_email: payload.email.trim().toLowerCase(),
        target_full_name: payload.full_name.trim(),
        target_role: payload.role,
        target_ministry_id: payload.ministry_id || null,
      });

      if (error) throw error;

      const invitation = data as { email?: string; full_name?: string; token?: string } | null;
      if (!invitation?.token) return invitation;

      const { error: emailError } = await supabase.functions.invoke("send-user-invitation", {
        body: {
          email: invitation.email ?? payload.email.trim().toLowerCase(),
          full_name: invitation.full_name ?? payload.full_name.trim(),
          token: invitation.token,
          app_url: publicAppUrl,
        },
      });

      return {
        ...invitation,
        email_sent: !emailError,
        email_error: emailError?.message,
      };
    },
    onSuccess: async (invitation) => {
      setForm(defaultForm);
      setEditingUserId(null);
      const link = invitation?.token ? buildInviteLink(invitation.token) : "";
      if (link && invitation?.email_sent) {
        setMessage(`Invitacion enviada por email. Link: ${link}`);
      } else if (link) {
        setMessage(`Invitacion creada, pero no se pudo enviar email automaticamente. Copia este link: ${link}`);
      } else {
        setMessage("Invitacion guardada correctamente.");
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-users-page"] });
    },
  });

  const deleteUserAccess = useMutation({
    mutationFn: async (user: ManagedUser) => {
      if (user.id === authUser?.id) throw new Error("No puedes borrar tu propio acceso administrador.");
      if (!isSupabaseConfigured) return;
      if (user.access_status === "pending") {
        const { error } = await supabase
          .from("user_invitations")
          .update({ revoked_at: new Date().toISOString() })
          .eq("email", user.email);
        if (error) throw error;
        return;
      }

      const [{ error: invitationError }, { error: userError }] = await Promise.all([
        supabase
          .from("user_invitations")
          .update({ revoked_at: new Date().toISOString() })
          .eq("email", user.email),
        supabase.from("users").delete().eq("id", user.id),
      ]);
      if (invitationError || userError) throw invitationError || userError;
    },
    onSuccess: async () => {
      setMessage("Acceso o invitacion borrada correctamente.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users-page"] });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    saveUser.mutate(form);
  }

  function editUser(user: ManagedUser) {
    setEditingUserId(user.id);
    setMessage(null);
    setForm({
      full_name: user.full_name || "",
      email: user.email,
      role: user.role,
      ministry_id: user.ministry_id || "",
    });
  }

  function cancelEdit() {
    setEditingUserId(null);
    setForm(defaultForm);
  }

  function confirmDelete(user: ManagedUser) {
    const confirmed = window.confirm(`Borrar el rol/acceso de ${user.email}?`);
    if (confirmed) deleteUserAccess.mutate(user);
  }

  async function copyInviteLink(user: ManagedUser) {
    if (!user.invitation_token) return;
    const link = buildInviteLink(user.invitation_token);
    await navigator.clipboard.writeText(link);
    setMessage(`Link copiado: ${link}`);
  }

  return (
    <div className="page-stack">
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">Administracion</p>
          <h1>Usuarios y Roles</h1>
          <p>Solo podran acceder por invitacion. Al crear un usuario se envia un email y el rol por defecto es Lider de Ministerio.</p>
        </div>
      </section>

      <form className="panel user-form" onSubmit={handleSubmit}>
        <div className="form-note">
          Registra el email exacto de Google. El sistema enviara un email con el link de invitacion y validara la entrada por ese correo.
        </div>
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
          {saveUser.isPending ? "Guardando..." : editingUserId ? "Actualizar rol" : "Enviar invitacion"}
        </button>
        {editingUserId && (
          <button className="btn btn-secondary" onClick={cancelEdit} type="button">
            Cancelar edicion
          </button>
        )}
        {saveUser.error && <div className="alert error">{saveUser.error.message}</div>}
        {deleteUserAccess.error && <div className="alert error">{deleteUserAccess.error.message}</div>}
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
                <th>Acciones</th>
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
                    <span className={`status-pill ${user.access_status === "active" ? "status-activo" : "status-pausado"}`}>
                      <Shield size={13} />
                      {user.access_status === "active" ? "Activo" : "Pendiente"}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      {user.invitation_token && (
                        <button className="btn btn-secondary" onClick={() => copyInviteLink(user)} type="button">
                          Copiar link
                        </button>
                      )}
                      <button className="btn btn-secondary" onClick={() => editUser(user)} type="button">
                        Editar rol
                      </button>
                      <button className="btn btn-danger" onClick={() => confirmDelete(user)} type="button">
                        <Trash2 size={15} />
                        Borrar
                      </button>
                    </div>
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
          access_status: "active",
        },
      ],
      ministries: demoMinistries,
    };
  }

  const [
    { data: users, error: usersError },
    { data: ministries, error: ministriesError },
    { data: invitations, error: invitationsError },
  ] = await Promise.all([
    supabase.from("users").select("id, full_name, email, role, ministry_id, created_at").order("email"),
    supabase.from("ministries").select("id, name, description, active").order("name"),
    supabase
      .from("user_invitations")
      .select("id, full_name, email, role, ministry_id, token, accepted_by, created_at")
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
  ]);

  if (usersError || ministriesError || invitationsError) throw usersError || ministriesError || invitationsError;

  const invitationByEmail = new Map((invitations ?? []).map((invitation: any) => [invitation.email, invitation]));
  const activeUsers = (users ?? []).map((user: any) => {
    const invitation = invitationByEmail.get(user.email);
    return {
      ...user,
      access_status: "active" as const,
      invitation_token: invitation?.token,
    };
  });
  const activeEmailSet = new Set(activeUsers.map((user) => user.email));
  const pendingUsers = (invitations ?? [])
    .filter((invitation: any) => !invitation.accepted_by && !activeEmailSet.has(invitation.email))
    .map((invitation: any) => ({
      id: invitation.id,
      full_name: invitation.full_name,
      email: invitation.email,
      role: invitation.role,
      ministry_id: invitation.ministry_id,
      created_at: invitation.created_at,
      access_status: "pending" as const,
      invitation_token: invitation.token,
    }));

  return {
    users: [...pendingUsers, ...activeUsers] as ManagedUser[],
    ministries: (ministries ?? []) as DemoMinistry[],
  };
}

function buildInviteLink(token: string) {
  return `${publicAppUrl}/?invite=${token}`;
}
