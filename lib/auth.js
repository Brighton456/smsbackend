import { jwtVerify } from "jose";

const encoder = new TextEncoder();

export async function requireAuth(req, res) {
  const apiKey = process.env.API_KEY;
  const authHeader = req.headers.authorization || "";
  const providedKey = req.headers["x-api-key"] || "";

  if (apiKey && providedKey === apiKey) {
    return true;
  }

  if (apiKey && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    if (token === apiKey) {
      return true;
    }
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (jwtSecret && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    try {
      await jwtVerify(token, encoder.encode(jwtSecret));
      return true;
    } catch (error) {
      console.warn("JWT verification failed", error);
    }
  }

  res.status(401).json({ error: "Unauthorized" });
  return false;
}
