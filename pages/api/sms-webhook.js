import { supabase } from "../../lib/supabase";
import { formatSms } from "../../lib/ai";
import { requireAuth } from "../../lib/auth";
import { rateLimit } from "../../lib/rateLimit";

const COPY_NUMBERS = ["0720363215", "0768741104"];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!rateLimit(req, res, { limit: 30, windowMs: 60_000 })) {
    return;
  }

  const authorized = await requireAuth(req, res);
  if (!authorized) {
    return;
  }

  const payload = req.body || {};
  const phone = payload.phone || payload.msisdn;

  if (!phone) {
    res.status(400).json({ error: "Missing phone number" });
    return;
  }

  try {
    const message = await formatSms(payload);

    const rows = [
      { phone, message, status: "queued" },
      ...COPY_NUMBERS.map((copy) => ({ phone: copy, message, status: "queued" }))
    ];

    const { error } = await supabase.from("sms_queue").insert(rows);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ queued: rows.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to queue SMS" });
  }
}
