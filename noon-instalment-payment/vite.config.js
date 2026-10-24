import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { sendDownPaymentNotice } from "./server/telegram.js";

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  process.env.TELEGRAM_BOT_TOKEN =
    env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  process.env.TELEGRAM_CHAT_ID =
    env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

  return {
    plugins: [
      react(),
      {
        name: "noon-notify-api",
        configureServer(server) {
          server.middlewares.use("/api/notify", async (req, res) => {
            if (req.method !== "POST") {
              res.statusCode = 405;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
              return;
            }

            try {
              const result = await sendDownPaymentNotice(await readBody(req));
              res.statusCode = result.ok ? 200 : 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
            } catch {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: false, error: "Invalid request" }));
            }
          });
        },
      },
    ],
  };
});
