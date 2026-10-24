import { sendDownPaymentNotice } from "../server/telegram.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : req.body || {};
    const result = await sendDownPaymentNotice(body);
    res.status(result.ok ? 200 : 500).json(result);
  } catch {
    res.status(400).json({ ok: false, error: "Invalid request" });
  }
}
