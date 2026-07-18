import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const display_name = body.display_name ? String(body.display_name) : undefined;
  const skip_license = body.skip_license === true;

  if (!email || !password || password.length < 6) {
    return new Response(JSON.stringify({ error: "email e senha (mín. 6) obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Allow admin callers to bypass license validation (used for admin-created users).
  let bypass = false;
  if (skip_license) {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (token) {
      const { data: userData } = await supabase.auth.getUser(token);
      if (userData?.user) {
        const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
        bypass = !!isAdmin;
      }
    }
  }

  if (!bypass) {
    const { data: hasLicense, error: licErr } = await supabase.rpc("email_has_active_license", { _email: email });
    if (licErr) {
      return new Response(JSON.stringify({ error: licErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!hasLicense) {
      return new Response(JSON.stringify({ error: "Nenhuma licença ativa encontrada para este email. Adquira o Vanguard Premium na Kwify para continuar." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: display_name ? { display_name } : {},
  });
  if (createErr) {
    return new Response(JSON.stringify({ error: createErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ ok: true, user_id: created.user?.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});