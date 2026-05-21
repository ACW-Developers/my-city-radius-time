import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Role-based cutoffs (Arizona time)
const ROLE_CUTOFF: Record<string, number> = {
  caregiver: 16.5, // 4:30 PM
  driver: 18,      // 6:00 PM
};

const DEFAULT_CUTOFF = 18;

// Get earliest cutoff if multiple roles exist
const cutoffForRoles = (roles: string[]): number => {
  if (!roles.length) return DEFAULT_CUTOFF;
  return Math.min(...roles.map((r) => ROLE_CUTOFF[r] ?? DEFAULT_CUTOFF));
};

// Arizona time fractional hour (0–24)
const azFractionalHour = (date: Date): number => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);

  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");

  return h + m / 60;
};

// Arizona date (YYYY-MM-DD)
const azDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Phoenix",
  }).format(date);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date();
  const nowAzHour = azFractionalHour(now);
  const today = azDate(now);

  let processed = 0;
  const skipped: string[] = [];

  try {
    // Fetch active shifts
    const { data: openRecords, error } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("date", today)
      .in("status", ["checked_in", "paused"]);

    if (error) throw error;

    for (const rec of openRecords || []) {
      // Prevent double checkout
      if (rec.status === "checked_out") continue;

      // Get roles
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", rec.user_id);

      const roles = (roleRows || []).map((r: any) => r.role);
      const cutoff = cutoffForRoles(roles);

      // Not yet time to auto-checkout
      if (nowAzHour < cutoff) {
        skipped.push(rec.user_id);
        continue;
      }

      // Handle pauses safely
      const pauses = Array.isArray(rec.pauses) ? [...rec.pauses] : [];

      if (pauses.length > 0 && !pauses[pauses.length - 1].end) {
        pauses[pauses.length - 1].end = now.toISOString();
      }

      // Calculate worked time
      const checkInTime = new Date(rec.check_in).getTime();

      let pausedMs = 0;
      for (const p of pauses) {
        const start = new Date(p.start).getTime();
        const end = p.end ? new Date(p.end).getTime() : now.getTime();
        pausedMs += Math.max(0, end - start);
      }

      const workedMinutes = Math.max(
        0,
        (now.getTime() - checkInTime - pausedMs) / 60000,
      );

      // Idempotent update (only if still active)
      const { error: updateError } = await supabase
        .from("attendance_records")
        .update({
          check_out: now.toISOString(),
          status: "checked_out",
          pauses,
          total_worked_minutes: Math.round(workedMinutes),
        })
        .eq("id", rec.id)
        .in("status", ["checked_in", "paused"]);

      if (updateError) {
        console.error("Update error:", updateError);
        continue;
      }

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: rec.user_id,
        action: "auto_checkout",
        details: `Auto checkout at cutoff (${cutoff} AZ). Worked ${workedMinutes.toFixed(
          1,
        )} mins`,
      });

      processed++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        skipped: skipped.length,
        date: today,
        az_hour: nowAzHour,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});