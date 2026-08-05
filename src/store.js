import { mkdir, readFile, writeFile, readdir } from "fs/promises";
import { join, resolve } from "path";
import { randomUUID } from "crypto";

// Every user gets one JSON file named after their username, so all screening
// progress lives under data/users/<username>.json instead of an in-memory session.
const DATA_DIR = resolve(process.env.DATA_DIR || "./data");
const USERS_DIR = join(DATA_DIR, "users");
const INDEX_FILE = join(DATA_DIR, "email-index.json");

async function ensureDirs() {
  await mkdir(USERS_DIR, { recursive: true });
}

async function readJson(path, fallback) {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

async function writeJson(path, value) {
  await writeFile(path, JSON.stringify(value, null, 2), "utf8");
}

export function slugifyUsername(email) {
  const localPart = String(email).split("@")[0].toLowerCase();
  const slug = localPart.replace(/[^a-z0-9._-]/g, "-").replace(/^[-.]+|[-.]+$/g, "");
  return slug || "user";
}

function userFile(username) {
  return join(USERS_DIR, `${username}.json`);
}

// Two different Google accounts can share an email local part, so the email ->
// username mapping is kept explicit and a numeric suffix breaks ties.
async function resolveUsername(email) {
  const index = await readJson(INDEX_FILE, {});
  if (index[email]) return index[email];

  const base = slugifyUsername(email);
  let username = base;
  let counter = 1;
  const taken = new Set(Object.values(index));
  while (taken.has(username)) {
    username = `${base}-${counter++}`;
  }

  index[email] = username;
  await writeJson(INDEX_FILE, index);
  return username;
}

export async function upsertUser({ email, name, picture }) {
  await ensureDirs();
  const username = await resolveUsername(email);
  const existing = await readJson(userFile(username), null);

  const user = {
    username,
    email,
    name: name || existing?.name || username,
    picture: picture || existing?.picture || null,
    createdAt: existing?.createdAt || new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    screenings: existing?.screenings || [],
  };

  await writeJson(userFile(username), user);
  return user;
}

export async function getUser(username) {
  await ensureDirs();
  return readJson(userFile(username), null);
}

export async function addScreening(username, screening) {
  const user = await getUser(username);
  if (!user) throw new Error(`Unknown user: ${username}`);

  const record = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...screening,
  };

  user.screenings.unshift(record);
  await writeJson(userFile(username), user);
  return record;
}

export async function deleteScreening(username, id) {
  const user = await getUser(username);
  if (!user) return false;

  const before = user.screenings.length;
  user.screenings = user.screenings.filter((s) => s.id !== id);
  if (user.screenings.length === before) return false;

  await writeJson(userFile(username), user);
  return true;
}

export function summarize(user) {
  const screenings = user.screenings || [];
  const shortlisted = screenings.filter((s) => s.decision === "SHORTLISTED").length;
  const totalScore = screenings.reduce((sum, s) => sum + (s.score || 0), 0);

  return {
    total: screenings.length,
    shortlisted,
    rejected: screenings.length - shortlisted,
    averageScore: screenings.length ? Math.round(totalScore / screenings.length) : 0,
    lastScreenedAt: screenings[0]?.createdAt || null,
  };
}

export async function listUsernames() {
  await ensureDirs();
  const files = await readdir(USERS_DIR);
  return files.filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
}
