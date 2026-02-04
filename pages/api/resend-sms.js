import { supabase } from "../../lib/supabase";
import { requireAuth } from "../../lib/auth";
import { rateLimit } from "../../lib/rateLimit";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!rateLimit(req, res, { limit: 60, windowMs: 60_000 })) {
    return;
  }

  const authorized = await requireAuth(req, res);
  if (!authorized) {
    return;
  }

  const { id } = req.body || {};
  if (!id) {
    res.status(400).json({ error: "Missing message id" });
    return;
  }

  const { error } = await supabase
    .from("sms_queue")
    .update({ status: "queued", retry_count: 0 })
    .eq("id", id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({ status: "queued" });
}
