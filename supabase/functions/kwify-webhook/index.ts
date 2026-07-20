import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function hmacHex(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function findEmail(value: unknown): string | undefined {
  if (typeof value === "string") {
    const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return match?.[0]?.trim().toLowerCase();
  }
  if (!value || typeof value !== "object") return undefined;

  if (Array.isArray(value)) {
    for (const item of value) {
      const email = findEmail(item);
      if (email) return email;
    }
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const preferredKeys = ["email", "customer_email", "buyer_email", "student_email", "member_email", "user_email"];
  for (const key of preferredKeys) {
    const email = findEmail(record[key]);
    if (email) return email;
  }
  for (const item of Object.values(record)) {
    const email = findEmail(item);
    if (email) return email;
  }
  return undefined;
}

function collectEmails(value: unknown, acc: Set<string> = new Set()): Set<string> {
  if (typeof value === "string") {
    const matches = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
    if (matches) for (const m of matches) acc.add(m.trim().toLowerCase());
    return acc;
  }
  if (!value || typeof value !== "object") return acc;
  if (Array.isArray(value)) { for (const v of value) collectEmails(v, acc); return acc; }
  for (const v of Object.values(value as Record<string, unknown>)) collectEmails(v, acc);
  return acc;
}

function normalizeProductCode(value: string | undefined) {
  const text = (value || "Vanguard acess").trim();
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase() || "VANGUARD_ACESS";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const raw = await req.text();
  const secret = Deno.env.get("KWIFY_WEBHOOK_SECRET");

  if (secret) {
    const sigHeader =
      req.headers.get("x-kwify-signature") ||
      req.headers.get("x-signature") ||
      req.headers.get("signature") ||
      "";
    const expected = await hmacHex(secret, raw);
    const provided = sigHeader.replace(/^sha256=/, "").trim().toLowerCase();
    if (!provided || !timingSafeEqual(expected, provided)) {
      return new Response(JSON.stringify({ error: "invalid signature" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let payload: any = {};
  try { payload = JSON.parse(raw); } catch { /* accept form-ish */ }

  const rawEvent: string = (payload.event || payload.type || payload.status || payload.event_name || "").toString().toLowerCase();
  const event = rawEvent.replace(/[\s_-]+/g, ".");
  const data = payload.data || {};
  const customer = payload.customer || payload.buyer || data.customer || data.buyer || {};
  const subscription = payload.subscription || data.subscription || payload.plan || data.plan || {};
  const product = payload.product || data.product || payload.offer || data.offer || {};
  const email = findEmail(payload);
  const allEmails = collectEmails(payload);
  const kwifyCustomerId = firstString(payload.customer_id, data.customer_id, customer.id, customer.customer_id) || null;
  const kwifyOrderId = firstString(payload.order_id, data.order_id, payload.transaction_id, data.transaction_id, payload.sale_id, data.sale_id, payload.checkout_id, data.checkout_id) || null;
  const kwifySubId = firstString(payload.subscription_id, data.subscription_id, subscription.id, subscription.subscription_id) || null;
  const productName = firstString(payload.subscription_name, data.subscription_name, subscription.name, subscription.title, payload.product_name, data.product_name, product.name, product.title);
  const productCode = firstString(payload.product_code, data.product_code, product.code, product.id) || normalizeProductCode(productName);
  const amountCents = Number(payload.amount_cents ?? data.amount_cents ?? payload.amount ?? data.amount ?? 0);
  const currency = payload.currency ?? data.currency ?? "BRL";

  if (!email) {
    return new Response(JSON.stringify({ error: "missing email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Broad matching — Kiwify sends PT/EN and varying formats.
  const isCanceled = /cancel|refund|reembols|chargeback|estorn|expired|failed|revok|access\.remov|member\.remov/.test(event);
  const isApproved = /approv|paid|complet|aprovad|pag[oa]|purchase|compra|order\.complete|pedido\.aprov|access\.grant|access\.add|member\.add|student\.add|active|ativ/.test(event);
  const isRenewed = /renew|renov/.test(event);
  // Default: if we couldn't classify, treat as activating (safer — admin can revoke).
  // Kiwify sometimes posts unlabeled events for members-area actions.
  const isActivating = isApproved || isRenewed || (!isCanceled && !event);

  // Upsert license
  const { data: license } = await supabase
    .from("licenses")
    .upsert({
      email,
      kwify_customer_id: kwifyCustomerId,
      product_code: productCode,
      status: isCanceled ? "inactive" : "active",
      metadata: { product_name: productName || "Vanguard acess", source: "kwify-webhook" },
    }, { onConflict: "email" })
    .select()
    .single();

  if (license) {
    // Register every other email seen in the payload as an alias.
    for (const alt of allEmails) {
      if (alt === email) continue;
      await supabase.from("license_email_aliases").upsert(
        { license_id: license.id, email: alt },
        { onConflict: "canonical_email" },
      );
    }

    if (isActivating) {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await supabase.from("payments").insert({
        license_id: license.id,
        kwify_order_id: kwifyOrderId,
        amount_cents: amountCents,
        currency,
        status: "paid",
        paid_at: new Date().toISOString(),
        payload,
      });

      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("license_id", license.id)
        .maybeSingle();

      if (existingSub) {
        await supabase.from("subscriptions").update({
          status: "active",
          current_period_end: periodEnd.toISOString(),
          renewed_at: new Date().toISOString(),
          kwify_subscription_id: kwifySubId ?? existingSub.kwify_subscription_id,
        }).eq("id", existingSub.id);
      } else {
        await supabase.from("subscriptions").insert({
          license_id: license.id,
          kwify_subscription_id: kwifySubId,
          status: "active",
          current_period_end: periodEnd.toISOString(),
          renewed_at: new Date().toISOString(),
        });
      }
    } else if (isCanceled) {
      await supabase.from("subscriptions")
        .update({ status: "canceled", canceled_at: new Date().toISOString() })
        .eq("license_id", license.id);

      await supabase.from("payments").insert({
        license_id: license.id,
        kwify_order_id: kwifyOrderId,
        amount_cents: amountCents,
        currency,
        status: event.includes("refund") ? "refunded" : "canceled",
        payload,
      });
    } else {
      // Log unknown events
      await supabase.from("payments").insert({
        license_id: license.id,
        kwify_order_id: kwifyOrderId,
        amount_cents: amountCents,
        currency,
        status: "unknown",
        payload,
      });
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});