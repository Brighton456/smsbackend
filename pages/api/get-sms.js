import { supabase } from "../../lib/supabase";
import { requireAuth } from "../../lib/auth";
import { rateLimit } from "../../lib/rateLimit";

export default async function handler(req, res) {
  if (req.method !== "GET") {
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

  const { data, error } = await supabase
    .from("sms_queue")
    .select("id, phone, message, created_at")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({ messages: data || [] });
}
