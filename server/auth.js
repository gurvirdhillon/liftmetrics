import { createRemoteJWKSet, jwtVerify } from "jose";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured.`);
  return value;
}

const issuer = (process.env.AUTH0_ISSUER_BASE_URL || `https://${required("AUTH0_DOMAIN")}`).replace(/\/$/, "");
const audience = required("AUTH0_AUDIENCE");
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

export async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: `${issuer}/`,
    audience,
    algorithms: ["RS256"]
  });
  if (typeof payload.sub !== "string" || !payload.sub) throw new Error("Token has no subject.");
  return payload;
}

export async function requireAuth(req, res, next) {
  const match = /^Bearer\s+(.+)$/i.exec(req.get("authorization") || "");
  if (!match) return res.status(401).json({ error: "A bearer access token is required." });
  try {
    const payload = await verifyAccessToken(match[1]);
    req.auth = { userId: payload.sub, claims: payload };
    next();
  } catch {
    res.status(401).json({ error: "Your session is invalid or has expired." });
  }
}
