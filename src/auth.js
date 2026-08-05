import "dotenv/config";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { upsertUser, getUser } from "./store.js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret";
const TOKEN_TTL = process.env.JWT_TTL || "7d";

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export function isGoogleAuthConfigured() {
  return Boolean(GOOGLE_CLIENT_ID);
}

// Exchanges a Google Identity Services ID token for our own session token that
// carries the username the screening history is filed under.
export async function loginWithGoogle(credential) {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID is not configured on the server");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload?.email) throw new Error("Google account has no email address");
  if (!payload.email_verified) throw new Error("Google email is not verified");

  const user = await upsertUser({
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  });

  const token = jwt.sign(
    { username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );

  return { token, user };
}

function readToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, value] = header.split(" ");
  return scheme === "Bearer" && value ? value : null;
}

async function authenticate(req) {
  const token = readToken(req);
  if (!token) return null;

  const claims = jwt.verify(token, JWT_SECRET);
  const user = await getUser(claims.username);
  return user;
}

export async function requireAuth(req, res, next) {
  try {
    const user = await authenticate(req);
    if (!user) return res.status(401).json({ error: "Sign in with Google to continue" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Session expired, please sign in again" });
  }
}

// Screening still works for signed-out visitors, results are only filed under a
// username when we know who is asking.
export async function optionalAuth(req, _res, next) {
  try {
    req.user = await authenticate(req);
  } catch {
    req.user = null;
  }
  next();
}
