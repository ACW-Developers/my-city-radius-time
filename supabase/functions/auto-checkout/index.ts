import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Per-role auto-checkout cutoff (24h, Arizona time).
const ROLE_CUTOFF: Record<string, number> = {
  caregiver: 16.5, // 4:30 PM AZ
  driver: 18,      // 6:00 PM AZ (Transport & Caregiver)
};
const DEFAULT_CUTOFF = 18;

const cutoffForRoles = (roles: string[]): number => {
  if (!roles.length) return DEFAULT_CUTOFF;
  return Math.min(...roles.map((r) => ROLE_CUTOFF[r] ?? DEFAULT_CUTOFF));
};

// Returns the current time in Arizona as a fractional hour (0..24).
const azFractionalHour = (now: Date): number => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h + m / 60;
};

// Auto checkout any open shift whose user's role cutoff has been reached.
// Designed to be invoked frequently (every 15 min) by pg_cron.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const azDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Phoenix" }).format(new Date());
  const nowAzHour = azFractionalHour(new Date());

  const { data: openRecords, error } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("date", azDate)
    .in("status", ["checked_in", "paused"]);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = new Date();
  let processed = 0;
  const skipped: string[] = [];

  for (const rec of openRecords || []) {
    // Resolve roles for this user
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", rec.user_id);
    const roles = (roleRows || []).map((r: any) => r.role as string);
    const cutoff = cutoffForRoles(roles);

    if (nowAzHour < cutoff) {
      skipped.push(rec.user_id);
      continue;
    }

    const pauses = Array.isArray(rec.pauses) ? [...(rec.pauses as any[])] : [];
    if (pauses.length > 0 && !pauses[pauses.length - 1].end) {
      pauses[pauses.length - 1].end = now.toISOString();
    }
    const checkIn = new Date(rec.check_in).getTime();
    let pausedMs = 0;
    for (const p of pauses) {
      const start = new Date(p.start).getTime();
      const end = p.end ? new Date(p.end).getTime() : now.getTime();
      pausedMs += end - start;
    }
    const workedMinutes = Math.max(0, (now.getTime() - checkIn - pausedMs) / 60000);

    const cutoffH = Math.floor(cutoff);
    const cutoffM = Math.round((cutoff - cutoffH) * 60);
    const period = cutoffH >= 12 ? "PM" : "AM";
    const display12 = ((cutoffH + 11) % 12) + 1;
    const cutoffLabel = `${display12}:${String(cutoffM).padStart(2, "0")} ${period}`;

    await supabase.from("attendance_records").update({
      check_out: now.toISOString(),
      status: "checked_out",
      pauses,
      total_worked_minutes: workedMinutes,
    }).eq("id", rec.id);

    await supabase.from("activity_logs").insert({
      user_id: rec.user_id,
      action: "auto_checkout",
      details: `Auto checked out at ${cutoffLabel} Arizona time. Worked ${workedMinutes.toFixed(1)} minutes`,
    });

    processed += 1;
  }

  return new Response(JSON.stringify({ processed, skipped: skipped.length, date: azDate, az_hour: nowAzHour }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
