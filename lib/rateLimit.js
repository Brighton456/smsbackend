const bucket = new Map();

function getIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

export function rateLimit(req, res, options = {}) {
  const { limit = 60, windowMs = 60_000 } = options;
  const ip = getIp(req);
  const now = Date.now();
  const entry = bucket.get(ip) || { count: 0, reset: now + windowMs };

  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + windowMs;
  }

  entry.count += 1;
  bucket.set(ip, entry);

  res.setHeader("X-RateLimit-Limit", limit);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, limit - entry.count));
  res.setHeader("X-RateLimit-Reset", entry.reset);

  if (entry.count > limit) {
    res.status(429).json({ error: "Rate limit exceeded" });
    return false;
  }

  return true;
}
