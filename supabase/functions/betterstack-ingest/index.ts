/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const ingestUrl = Deno.env.get("BETTERSTACK_LOGS_INGEST_URL");
    const ingestKey = Deno.env.get("BETTERSTACK_LOGS_INGEST_KEY");

    if (!ingestUrl || !ingestKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured: missing BETTERSTACK_LOGS_INGEST_URL or BETTERSTACK_LOGS_INGEST_KEY" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const payload = {
      service: body.service || Deno.env.get("BETTERSTACK_SERVICE_NAME") || "devpad",
      level: body.level || "info",
      message: body.message || "",
      meta: body.meta || {},
      timestamp: new Date().toISOString(),
    };

    // Forward to BetterStack ingest endpoint
    const res = await fetch(ingestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ingestKey}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    return new Response(text, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: res.status,
    });
  } catch (unknownError) {
    console.error("BetterStack ingest error:", unknownError);
    const message = unknownError instanceof Error ? unknownError.message : String(unknownError);
    return new Response(JSON.stringify({ error: message || "Failed to forward log" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
