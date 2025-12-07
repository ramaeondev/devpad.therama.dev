var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
function getCorsHeaders() {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD");
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, apikey, x-client-info, x-supabase-api-version, x-client-version, Accept-Profile, Content-Profile, Prefer, prefer, Accept, Accept-Encoding, Accept-Language, Range, x-upsert, cache-control, x-requested-with, DNT, Origin"
  );
  headers.set("Access-Control-Expose-Headers", "Content-Range, Content-Length, ETag, Content-Type");
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}
__name(getCorsHeaders, "getCorsHeaders");

// Helper function to decode JWT payload without validation
function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (e) {
    return null;
  }
}
__name(decodeJWT, "decodeJWT");

var index_default = {
  async fetch(request, env) {
    const { SUPABASE_URL, SUPABASE_API_KEY } = env;
    
    // Handle preflight OPTIONS requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders()
      });
    }
    
    const url = new URL(request.url);
    // Normalize path to avoid double /rest/v1 when SUPABASE_URL already has it
    const supabaseBase = SUPABASE_URL.replace(/\/$/, "");
    const incomingPath = url.pathname.startsWith('/rest/v1')
      ? url.pathname.replace('/rest/v1', '') || '/'
      : url.pathname;
    const targetUrl = `${supabaseBase}${incomingPath}${url.search}`;
    
    const incomingHeaders = new Headers(request.headers);
    const authHeader = incomingHeaders.get("Authorization");
    const incomingApikey = incomingHeaders.get("apikey");
    
    const headers = new Headers();
    
    // ALWAYS set the real apikey from environment
    headers.set("apikey", SUPABASE_API_KEY);
    
    // Handle Authorization header
    /** @type {any} */
    let tokenInfo = { type: 'none', token: null, userId: null, role: null };
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = decodeJWT(token);
      
      if (payload) {
        // Check if it's a user token (has authenticated audience)
        if (payload.aud === 'authenticated' && payload.sub) {
          // Real user JWT token - KEEP IT
          headers.set("Authorization", authHeader);
          tokenInfo = { 
            type: 'user_jwt', 
            token: null,
            userId: payload.sub ?? null,
            role: payload.role ?? null
          };
        } else if (payload.role === 'anon') {
          // Real anon key from Supabase - use our server's anon key
          headers.set("Authorization", `Bearer ${SUPABASE_API_KEY}`);
          tokenInfo = { 
            type: 'anon_key',
            token: null,
            userId: null,
            role: payload.role ?? null
          };
        } else {
          // Unknown token type - use server anon key
          headers.set("Authorization", `Bearer ${SUPABASE_API_KEY}`);
          tokenInfo = { 
            type: 'unknown',
            token: null,
            userId: null,
            role: payload?.role ?? null
          };
        }
      } else {
        // Can't decode - might be dummy key - use server anon key
        headers.set("Authorization", `Bearer ${SUPABASE_API_KEY}`);
        tokenInfo = { 
          type: 'invalid',
          token: null,
          userId: null,
          role: null
        };
      }
    } else {
      // No auth header - use server anon key
      headers.set("Authorization", `Bearer ${SUPABASE_API_KEY}`);
      tokenInfo = { type: 'none', token: null, userId: null, role: null };
    }
    
    // Log for debugging (visible in Cloudflare logs)
    console.log('Request:', {
      method: request.method,
      path: url.pathname,
      tokenType: tokenInfo.type,
      userId: tokenInfo.userId,
      hasApikey: !!incomingApikey
    });
    
    // Forward all important Supabase headers
    const headersToForward = [
      "Accept",
      "Accept-Encoding",
      "Accept-Language",
      "Accept-Profile",
      "Content-Profile",
      "Content-Type",
      "Prefer",
      "Range",
      "x-client-info",
      "x-supabase-api-version",
      "x-client-version",
      "x-upsert",
      "cache-control",
      "x-requested-with"
    ];
    
    headersToForward.forEach(headerName => {
      const value = incomingHeaders.get(headerName);
      if (value) {
        headers.set(headerName, value);
      }
    });
    
    try {
      /** @type {any} */
      let fetchOptions = {
        method: request.method,
        headers: headers
      };
      
      // Include body for methods that support it
      if (request.method === "POST" || 
          request.method === "PUT" || 
          request.method === "PATCH" || 
          request.method === "DELETE") {
        
        // For storage uploads, use the original body stream (binary data)
        if (url.pathname.includes('/storage/')) {
          fetchOptions.body = request.body;
        } else {
          // For REST API requests, read as text
          const bodyText = await request.text();
          if (bodyText) {
            fetchOptions.body = bodyText;
          }
        }
      }
      
      const response = await fetch(targetUrl, fetchOptions);
      
      console.log('Response:', {
        status: response.status,
        statusText: response.statusText
      });
      
      // Add CORS headers to response
      const newHeaders = new Headers(response.headers);
      getCorsHeaders().forEach((value, key) => newHeaders.set(key, value));
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    } catch (error) {
      console.error('Proxy error:', error);
      const errorMessage = (error && typeof error === 'object' && 'message' in error) 
        ? String(error.message) 
        : String(error);
      return new Response(JSON.stringify({ 
        error: errorMessage || 'unknown',
        details: 'Proxy request failed',
        url: targetUrl,
        method: request.method
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