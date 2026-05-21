import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Auto checkout open shifts at 6:00 PM America/Phoenix
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Arizona time helpers
    const azNow = new Date(
      new Date().toLocaleString("en-US", {
        timeZone: "America/Phoenix",
      })
    );

    const azDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Phoenix",
    }).format(new Date());

    const currentHour = azNow.getHours();

    // SAFETY CHECK:
    // Prevent accidental early auto-checkout
    if (currentHour < 18) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "Auto checkout is only allowed after 6:00 PM Arizona time",
          currentArizonaHour: currentHour,
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Fetch all active attendance records for today
    const { data: openRecords, error } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("date", azDate)
      .in("status", ["checked_in", "paused"]);

    if (error) {
      throw error;
    }

    let processed = 0;

    for (const rec of openRecords || []) {
      const pauses = Array.isArray(rec.pauses)
        ? [...rec.pauses]
        : [];

      // Close any active pause automatically
      if (
        pauses.length > 0 &&
        pauses[pauses.length - 1] &&
        !pauses[pauses.length - 1].end
      ) {
        pauses[pauses.length - 1].end = azNow.toISOString();
      }

      // Calculate worked time
      const checkInTime = new Date(rec.check_in).getTime();

      let pausedMs = 0;

      for (const pause of pauses) {
        const start = new Date(pause.start).getTime();

        const end = pause.end
          ? new Date(pause.end).getTime()
          : azNow.getTime();

        pausedMs += end - start;
      }

      const workedMinutes = Math.max(
        0,
        (azNow.getTime() - checkInTime - pausedMs) / 60000
      );

      // Update attendance record
      const { error: updateError } = await supabase
        .from("attendance_records")
        .update({
          check_out: azNow.toISOString(),
          status: "checked_out",
          pauses,
          total_worked_minutes: Math.round(workedMinutes),
        })
        .eq("id", rec.id);

      if (updateError) {
        console.error(
          `Failed to update attendance record ${rec.id}`,
          updateError
        );
        continue;
      }

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: rec.user_id,
        action: "auto_checkout",
        details: `Automatically checked out at 6:00 PM Arizona time. Worked ${Math.round(
          workedMinutes
        )} minutes.`,
      });

      processed++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        date: azDate,
        arizonaTime: azNow.toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error("AUTO CHECKOUT ERROR:", err);

    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "Unknown error occurred",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});