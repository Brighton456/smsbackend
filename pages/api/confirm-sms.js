import { supabase } from "../../lib/supabase";
import { requireAuth } from "../../lib/auth";
import { rateLimit } from "../../lib/rateLimit";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!rateLimit(req, res, { limit: 120, windowMs: 60_000 })) {
    return;
  }

  const authorized = await requireAuth(req, res);
  if (!authorized) {
    return;
  }

  const { id, success } = req.body || {};
  if (!id) {
    res.status(400).json({ error: "Missing message id" });
    return;
  }

  const { data, error } = await supabase
    .from("sms_queue")
    .select("retry_count")
    .eq("id", id)
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  if (success) {
    const { error: updateError } = await supabase
      .from("sms_queue")
      .update({ status: "sent" })
      .eq("id", id);

    if (updateError) {
      res.status(500).json({ error: updateError.message });
      return;
    }

    res.status(200).json({ status: "sent" });
    return;
  }

  const retryCount = (data?.retry_count || 0) + 1;
  const status = retryCount >= 3 ? "failed" : "queued";

  const { error: updateError } = await supabase
    .from("sms_queue")
    .update({ status, retry_count: retryCount })
    .eq("id", id);

  if (updateError) {
    res.status(500).json({ error: updateError.message });
    return;
  }

  res.status(200).json({ status, retry_count: retryCount });
}
