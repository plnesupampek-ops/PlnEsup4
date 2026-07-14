interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // 1. Route: /api/health
    if (url.pathname === "/api/health") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // 1.5 Route: /api/config
    if (url.pathname === "/api/config") {
      const configData = {
        GAS_WEB_APP_URL: "", // Will be filled from env if available in a real worker env
        GDRIVE_FOLDER_ID: "",
        GOOGLE_SPREADSHEET_ID: "",
        SUPABASE_URL: "",
        SUPABASE_KEY: "",
        SUPABASE_BUCKET: ""
      };
      
      return new Response(JSON.stringify(configData), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // 2. Route: /api/sheets with robust retry logic
    if (url.pathname === "/api/sheets") {
      const sheetName = url.searchParams.get("sheetName");
      const customUrl = url.searchParams.get("customUrl");
      const querySpreadsheetId = url.searchParams.get("spreadsheetId");
      const spreadsheetId = querySpreadsheetId || "1UUxU8soJuTeB_kMk0XFqHY8UaPcISnWto9MOp960-mo";

      let targetUrl = "";
      if (customUrl) {
        targetUrl = customUrl;
      } else if (sheetName) {
        targetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
      } else {
        return new Response(JSON.stringify({ error: "Missing sheetName or customUrl parameter" }), {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          },
        });
      }

      const maxAttempts = 3;
      let lastError: any = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 seconds timeout per attempt

        let currentUrl = targetUrl;
        if (attempt > 1 && sheetName && !customUrl) {
          // Fallback to direct export on retry attempts
          currentUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=${encodeURIComponent(sheetName)}`;
        }

        try {
          const response = await fetch(currentUrl, {
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const csvText = await response.text();
            return new Response(csvText, {
              headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Access-Control-Allow-Origin": "*",
              },
            });
          } else {
            lastError = new Error(`HTTP status ${response.status}`);
            console.warn(`Attempt ${attempt} to ${currentUrl} failed with HTTP ${response.status}. Retrying...`);
          }
        } catch (err: any) {
          clearTimeout(timeoutId);
          lastError = err;
          console.warn(`Attempt ${attempt} to ${currentUrl} failed with error: ${err.message || err}. Retrying...`);
        }

        // Brief backoff before retry
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.error("All sheet fetch attempts failed. Last error:", lastError);
      return new Response(JSON.stringify({ error: lastError?.message || "Internal server error fetching sheets after multiple attempts" }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
      });
    }

    // 2.5 Route: /api/gas-proxy
    if (url.pathname === "/api/gas-proxy") {
      const gasUrl = url.searchParams.get("gasUrl");
      if (!gasUrl) {
        return new Response(JSON.stringify({ error: "Missing gasUrl parameter" }), {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          },
        });
      }

      try {
        const bodyText = await request.text();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for large images

        let response = await fetch(gasUrl, {
          method: "POST",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          },
          body: bodyText
        });

        // Follow redirect manually if 3xx status returned (common with GAS 302 redirects)
        if (response.status >= 300 && response.status < 400) {
          const redirectUrl = response.headers.get("Location");
          if (redirectUrl) {
            response = await fetch(redirectUrl, {
              method: "GET",
              signal: controller.signal,
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
              }
            });
          }
        }
        clearTimeout(timeoutId);

        if (!response.ok) {
          return new Response(JSON.stringify({ error: `GAS server returned status ${response.status}` }), {
            status: response.status,
            headers: { 
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            },
          });
        }

        const resData = await response.text();
        return new Response(resData, {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || "Internal server error proxying to Google Apps Script" }), {
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          },
        });
      }
    }

    // 3. Fallback: serve static assets
    return await env.ASSETS.fetch(request);
  }
};
