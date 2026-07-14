import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Create folder for local uploads
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve uploads folder as static
  app.use("/uploads", express.static(uploadsDir));

  // API router/routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/config", (req, res) => {
    const envKeys = Object.keys(process.env).filter(key => 
      key.startsWith("VITE_") || key.includes("GAS") || key.includes("GDRIVE") || key.includes("GOOGLE") || key.includes("SUPABASE") || key.includes("SPREADSHEET") || key.includes("SCRIPT")
    );
    console.log("Available environment variables matching config criteria:", envKeys);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.json({
      GAS_WEB_APP_URL: process.env.VITE_GAS_WEB_APP_URL || process.env.VITE_GAS_WEB_APP || process.env.VITE_APPS_SCRIPT_,
      GDRIVE_FOLDER_ID: process.env.VITE_GDRIVE_FOLDER_ID || process.env.VITE_GDRIVE_FOLD,
      GOOGLE_SPREADSHEET_ID: process.env.VITE_GOOGLE_SPREADSHEET_ID,
      SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      SUPABASE_KEY: process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KE,
      SUPABASE_BUCKET: process.env.VITE_SUPABASE_BUCKET || process.env.VITE_SUPABASE_BU
    });
  });

  // Google Sheets CORS Bypass Proxy with robust retry logic
  app.get("/api/sheets", async (req, res) => {
    const sheetName = req.query.sheetName as string;
    const customUrl = req.query.customUrl as string;

    let targetUrl = "";
    const spreadsheetId = req.query.spreadsheetId as string || "1UUxU8soJuTeB_kMk0XFqHY8UaPcISnWto9MOp960-mo";

    if (customUrl) {
      targetUrl = customUrl;
    } else if (sheetName) {
      targetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    } else {
      res.status(400).json({ error: "Missing sheetName or customUrl parameter" });
      return;
    }

    const maxAttempts = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 seconds timeout per attempt

      let currentUrl = targetUrl;
      if (attempt > 1 && sheetName && !customUrl) {
        // Fallback to /export endpoint on subsequent retries if needed, though gviz is safer
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
          res.setHeader("Content-Type", "text/csv; charset=utf-8");
          res.send(csvText);
          return;
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
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    console.error("All sheet fetch attempts failed. Last error:", lastError);
    res.status(500).json({ error: lastError?.message || "Internal server error fetching sheets after multiple attempts" });
  });

  // Google Apps Script Proxy to prevent CORS/fetch problems on any browser
  app.post("/api/gas-proxy", express.text({ limit: "15mb", type: "*/*" }), async (req, res) => {
    try {
      const gasUrl = req.query.gasUrl as string;
      if (!gasUrl) {
        res.status(400).json({ error: "Missing gasUrl parameter" });
        return;
      }

      // Proxy request to the actual Google Apps Script Web App
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for file upload

      let response = await fetch(gasUrl, {
        method: "POST",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        body: req.body
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
        res.status(response.status).json({ error: `GAS server returned status ${response.status}` });
        return;
      }

      const responseText = await response.text();
      res.setHeader("Content-Type", "application/json");
      res.send(responseText);
    } catch (err: any) {
      console.error("GAS proxy error:", err);
      res.status(500).json({ error: err.message || "Internal server error proxying to Google Apps Script" });
    }
  });

  // Native Direct Server File Upload (100% Instant & No Configuration Needed)
  app.post("/api/upload-native", express.json({ limit: "15mb" }), async (req, res) => {
    try {
      const { base64, fileName, noTugas, evidenIdx } = req.body;
      if (!base64 || !fileName) {
        res.status(400).json({ error: "Missing base64 or fileName" });
        return;
      }

      // Decompose base64 data url
      let buffer: Buffer;
      const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        buffer = Buffer.from(matches[2], "base64");
      } else {
        const cleanBase64 = base64.includes(",") ? base64.split(",")[1] : base64;
        buffer = Buffer.from(cleanBase64, "base64");
      }

      // Guarantee uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Write file to path
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, buffer);

      // Construct absolute public link so that google spreadsheets or external can view
      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
      const host = req.get("host") || "localhost:3000";
      // Ensure we use https if forwarded proto is https, or if running in cloud environment
      const cleanProtocol = (req.headers["x-forwarded-proto"] || (host.includes(".run.app") ? "https" : protocol));
      const fileUrl = `${cleanProtocol}://${host}/uploads/${fileName}`;

      res.json({
        success: true,
        url: fileUrl,
        fileName: fileName,
        message: "File berhasil disimpan langsung di server portal!"
      });
    } catch (err: any) {
      console.error("Native server upload error:", err);
      res.status(500).json({ error: err.message || "Gagal menyimpan file di server" });
    }
  });

  // Supabase Storage Upload (Lazy checks to avoid crashing on missing credentials at startup)
  app.post("/api/upload-supabase", express.json({ limit: "15mb" }), async (req, res) => {
    try {
      const { base64, fileName, noTugas, evidenIdx } = req.body;
      if (!base64 || !fileName) {
        res.status(400).json({ error: "Missing base64 or fileName" });
        return;
      }

      // Decompose base64 data url
      let buffer: Buffer;
      let contentType = "image/jpeg";
      const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        buffer = Buffer.from(matches[2], "base64");
        contentType = matches[1];
      } else {
        const cleanBase64 = base64.includes(",") ? base64.split(",")[1] : base64;
        buffer = Buffer.from(cleanBase64, "base64");
      }

      // Retrieve credentials
      const supabaseUrl = process.env.SUPABASE_URL || "https://bicyhoavntfuwaesqwwf.supabase.co";
      const supabaseKey = process.env.SUPABASE_KEY;

      if (!supabaseKey) {
        res.status(400).json({
          error: "Koneksi Supabase Gagal: Variabel 'SUPABASE_KEY' belum dikonfigurasi di server backend. Hubungi Admin atau tambahkan di daftar Environment Variables."
        });
        return;
      }

      // Lazy instantiate Supabase client
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Upload to target bucket: EVIDEN
      const { data, error } = await supabase.storage
        .from("EVIDEN")
        .upload(fileName, buffer, {
          contentType: contentType,
          upsert: true
        });

      if (error) {
        console.error("Supabase Storage API upload error:", error);
        let errorMsg = `Kesalahan saat upload ke Supabase: ${error.message}`;
        if (error.message.includes("row-level security policy") || error.message.includes("RLS")) {
          errorMsg = `Kendala RLS (Row-Level Security): Folder atau Bucket 'EVIDEN' di Supabase Anda mewajibkan rincian kebijakan keamanan tambahan untuk dapat menerima unggahan.\n\n` +
            `SOLUSI SINGKAT:\n` +
            `Jalankan kode SQL berikut di menu 'SQL Editor' pada Dashboard Supabase Anda:\n\n` +
            `-- 1. Berikan Akses INSERT\n` +
            `CREATE POLICY "Buka Upload EVIDEN" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'EVIDEN');\n\n` +
            `-- 2. Berikan Akses SELECT (Supaya Foto Bisa Terbuka)\n` +
            `CREATE POLICY "Buka Baca EVIDEN" ON storage.objects FOR SELECT TO public USING (bucket_id = 'EVIDEN');\n\n` +
            `Atau, buka tab 'Storage' -> Klik kanan di Bucket 'EVIDEN' -> 'Bucket Settings' -> Ubah status Bucket menjadi 'Public', lalu klik Save.`;
        }
        res.status(500).json({ error: errorMsg });
        return;
      }

      // Resolve public URL
      const { data: publicUrlData } = supabase.storage
        .from("EVIDEN")
        .getPublicUrl(fileName);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        res.status(500).json({ error: "Gagal mengambil URL publik dari Storage Supabase." });
        return;
      }

      res.json({
        success: true,
        url: publicUrlData.publicUrl,
        fileName: fileName,
        message: "Foto berhasil diamankan di Supabase Storage (Bucket: EVIDEN)!"
      });
    } catch (err: any) {
      console.error("Supabase endpoint master error:", err);
      res.status(500).json({ error: err.message || "Gagal memproses unggahan ke Storage Supabase" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
