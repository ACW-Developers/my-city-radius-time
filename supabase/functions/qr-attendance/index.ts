import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { qr_data, action: requestAction, record_id } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Handle checkout confirmation
    if (requestAction === "confirm_checkout" && record_id) {
      const { data: record } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("id", record_id)
        .maybeSingle();

      if (!record || record.status === "checked_out") {
        return new Response(JSON.stringify({ error: "Record not found or already checked out" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date();
      const pauses = Array.isArray(record.pauses) ? [...(record.pauses as any[])] : [];
      if (pauses.length > 0 && !pauses[pauses.length - 1].end) {
        pauses[pauses.length - 1].end = now.toISOString();
      }

      // Calculate worked minutes
      const checkIn = new Date(record.check_in).getTime();
      let pausedMs = 0;
      for (const p of pauses) {
        const start = new Date(p.start).getTime();
        const end = p.end ? new Date(p.end).getTime() : now.getTime();
        pausedMs += end - start;
      }
      const workedMinutes = Math.max(0, (now.getTime() - checkIn - pausedMs) / 60000);

      await supabase
        .from("attendance_records")
        .update({
          check_out: now.toISOString(),
          status: "checked_out",
          pauses,
          total_worked_minutes: workedMinutes,
        })
        .eq("id", record_id);

      await supabase.from("activity_logs").insert({
        user_id: record.user_id,
        action: "check_out",
        details: `Checked out via QR scan. Worked ${workedMinutes.toFixed(1)} minutes`,
      });

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", record.user_id)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          action: "checked_out",
          employee: profile?.full_name || "Employee",
          worked_minutes: workedMinutes,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle QR scan
    if (!qr_data || !qr_data.startsWith("MCR:")) {
      return new Response(JSON.stringify({ error: "Invalid QR code format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parts = qr_data.split(":");
    if (parts.length !== 3) {
      return new Response(JSON.stringify({ error: "Invalid QR code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [, userId, badgeCode] = parts;

    // Verify badge
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, full_name, badge_code, is_active")
      .eq("user_id", userId)
      .eq("badge_code", badgeCode)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "QR code verification failed" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile.is_active) {
      return new Response(JSON.stringify({ error: "Account is inactive" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get today's date in Arizona time (UTC-7)
    const now = new Date();
    const azOffset = -7 * 60;
    const azDate = new Date(now.getTime() + (azOffset + now.getTimezoneOffset()) * 60000);
    const today = azDate.toISOString().split("T")[0];

    // Check existing attendance
    const { data: existingRecord } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();

    if (!existingRecord) {
      // Check in
      const { error } = await supabase.from("attendance_records").insert({
        user_id: userId,
        date: today,
        check_in: now.toISOString(),
        status: "checked_in",
        pauses: [],
      });

      if (error) {
        return new Response(JSON.stringify({ error: "Failed to check in" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("activity_logs").insert({
        user_id: userId,
        action: "check_in",
        details: "Checked in via QR scan (login page)",
      });

      return new Response(
        JSON.stringify({
          action: "checked_in",
          employee: profile.full_name,
          time: now.toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingRecord.status === "checked_in" || existingRecord.status === "paused") {
      return new Response(
        JSON.stringify({
          action: "prompt_checkout",
          employee: profile.full_name,
          record_id: existingRecord.id,
          check_in: existingRecord.check_in,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        action: "already_completed",
        employee: profile.full_name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
