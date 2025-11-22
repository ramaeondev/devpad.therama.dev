import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SUPABASE_PROJECT_REF = "<your-project-ref>"; // Replace with your project ref
const SUPABASE_API_BASE = `https://${SUPABASE_PROJECT_REF}.supabase.co/rest/v1`;

serve(async (req) => {
  const url = new URL(req.url);

  // Only allow authenticated requests
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Remove leading slash and build REST endpoint
  const apiPath = url.pathname.replace(/^\//, ""); // Should be /^\// for Deno, but in JS/TS use /^\//
  if (!apiPath) {
    return new Response("Missing endpoint", { status: 400 });
  }

  // Optionally, restrict allowed endpoints
  // const allowed = ["notes", "folders", "users"];
  // if (!allowed.includes(apiPath.split("/")[0])) {
  //   return new Response("Forbidden", { status: 403 });
  // }

  const supabaseUrl = `${SUPABASE_API_BASE}/${apiPath}`;
  const response = await fetch(supabaseUrl, {
    method: req.method,
    headers: {
      "Authorization": authHeader,
      "apikey": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      "Content-Type": "application/json",
    },
    body: req.method !== "GET" ? await req.text() : undefined,
  });
  return response;
});