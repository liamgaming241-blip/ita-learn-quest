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
  const customer = payload.customer || payload.buyer || payload.data?.customer || {};
  const email: string | undefined = (payload.email || customer.email || payload.data?.email || payload.Customer?.email || "").toString().trim().toLowerCase() || undefined;
  const kwifyCustomerId = payload.customer_id || customer.id || null;
  const kwifyOrderId = payload.order_id || payload.transaction_id || payload.data?.order_id || null;
  const kwifySubId = payload.subscription_id || payload.data?.subscription_id || null;
  const productCode = payload.product_code || payload.product?.code || "VANGUARD_PREMIUM";
  const amountCents = Number(payload.amount_cents ?? payload.amount ?? 0);
  const currency = payload.currency ?? "BRL";

  if (!email) {
    return new Response(JSON.stringify({ error: "missing email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const isApproved = /approved|paid|completed|purchase\.complete|order\.complete/.test(event);
  const isRenewed = /renew/.test(event);
  const isCanceled = /cancel|refund|chargeback|expired|failed/.test(event);
  const isActivating = isApproved || isRenewed;

  // Upsert license
  const { data: license } = await supabase
    .from("licenses")
    .upsert({
      email,
      kwify_customer_id: kwifyCustomerId,
      product_code: productCode,
      status: CANCELED.includes(event) ? "inactive" : "active",
    }, { onConflict: "email" })
    .select()
    .single();

  if (license) {
    if (APPROVED.includes(event) || RENEWED.includes(event)) {
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
    } else if (CANCELED.includes(event)) {
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