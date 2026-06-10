import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = request.headers.get("Authorization");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Faltan secretos de Supabase para enviar invitaciones.");
    }

    if (!authorization) {
      return json({ error: "No autorizado." }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json({ error: "No autorizado." }, 401);
    }

    const { data: adminProfile, error: profileError } = await adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || adminProfile?.role !== "admin") {
      return json({ error: "Solo administradores pueden enviar invitaciones." }, 403);
    }

    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const fullName = String(body.full_name ?? "").trim();
    const token = String(body.token ?? "").trim();
    const appUrl = String(body.app_url ?? "").replace(/\/$/, "");

    if (!email || !fullName || !token || !appUrl) {
      return json({ error: "Datos de invitacion incompletos." }, 400);
    }

    const redirectTo = `${appUrl}/?invite=${encodeURIComponent(token)}`;
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        full_name: fullName,
        invitation_token: token,
      },
    });

    if (inviteError) {
      return json({ error: inviteError.message }, 400);
    }

    return json({ sent: true, redirect_to: redirectTo });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Error enviando invitacion." }, 500);
  }
});

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
