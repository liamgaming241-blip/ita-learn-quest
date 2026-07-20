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
  const purchase_email = body.purchase_email
    ? String(body.purchase_email).trim().toLowerCase()
    : undefined;

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
    // Check signup email first; if no match and a purchase_email was provided, check it too.
    let hasLicense = false;
    const { data: v1, error: e1 } = await supabase.rpc("email_has_active_license", { _email: email });
    if (e1) return new Response(JSON.stringify({ error: e1.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    hasLicense = !!v1;
    let matchedVia: "signup" | "purchase" | null = hasLicense ? "signup" : null;

    if (!hasLicense && purchase_email) {
      const { data: v2, error: e2 } = await supabase.rpc("email_has_active_license", { _email: purchase_email });
      if (e2) return new Response(JSON.stringify({ error: e2.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      hasLicense = !!v2;
      if (hasLicense) matchedVia = "purchase";
    }

    if (!hasLicense) {
      return new Response(JSON.stringify({
        error: "Nenhuma licença ativa encontrada para este email.",
        hint: "Se sua compra na Kwify foi feita com outro email, informe-o no campo 'Email da compra'. Caso o problema persista, contate o suporte.",
        code: "no_license",
      }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // If matched via a different purchase email, link the signup email as alias to that license.
    if (matchedVia === "purchase" && purchase_email) {
      const { data: lic } = await supabase
        .from("licenses")
        .select("id")
        .or(`email.eq.${purchase_email},canonical_email.eq.${purchase_email}`)
        .limit(1)
        .maybeSingle();
      if (lic?.id) {
        await supabase.from("license_email_aliases").upsert(
          { license_id: lic.id, email },
          { onConflict: "canonical_email" },
        );
      }
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