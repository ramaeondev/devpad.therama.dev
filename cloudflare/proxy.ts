var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
function getCorsHeaders() {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey, x-client-info, x-supabase-api-version, x-client-version, Accept-Profile, Content-Profile");
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}
__name(getCorsHeaders, "getCorsHeaders");

var index_default = {
  async fetch(request, env) {
    const { SUPABASE_URL, SUPABASE_API_KEY } = env;
    
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders()
      });
    }
    
    const url = new URL(request.url);
    const targetUrl = `${SUPABASE_URL}${url.pathname}${url.search}`;
    
    const incomingHeaders = new Headers(request.headers);
    const authHeader = incomingHeaders.get("Authorization");
    
    const headers = new Headers();
    
    // Set Authorization
    if (authHeader && authHeader.startsWith("Bearer ")) {
      headers.set("Authorization", authHeader);
    } else {
      headers.set("Authorization", `Bearer ${SUPABASE_API_KEY}`);
    }
    
    // Set apikey
    headers.set("apikey", SUPABASE_API_KEY);
    
    // Forward Supabase-specific headers
    const headersToForward = [
      "x-client-info",
      "x-supabase-api-version",
      "x-client-version",
      "Accept-Profile",
      "Content-Profile",
      "Accept",
      "Content-Type",
      "Prefer"
    ];
    
    headersToForward.forEach(headerName => {
      const value = incomingHeaders.get(headerName);
      if (value) {
        headers.set(headerName, value);
      }
    });
    
    try {
      const fetchOptions = {
        method: request.method,
        headers: headers
      };
      
      // Only include body for methods that support it
      if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "OPTIONS") {
        fetchOptions.body = request.body;
      }
      
      const response = await fetch(targetUrl, fetchOptions);
      
      const newHeaders = new Headers(response.headers);
      getCorsHeaders().forEach((value, key) => newHeaders.set(key, value));
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    } catch (error) {
      console.error('Proxy error:', error);
      return new Response(JSON.stringify({ 
        error: error.message,
        details: 'Proxy request failed'
      }), {
        status: 500,
        headers: {
          ...Object.fromEntries(getCorsHeaders()),
          "Content-Type": "application/json"
        }
      });
    }
  }
};

export {
  index_default as default
};