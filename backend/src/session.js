import crypto from "crypto";
import { findUserById } from "./db.js";

const sessions = new Map();

export function createSession(res, user) {
  const sid = crypto.randomBytes(32).toString("hex");
  sessions.set(sid, {
    userId: user.id,
    createdAt: Date.now()
  });
  res.cookie("sid", sid, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 7
  });
  return sid;
}

export async function readSession(req) {
  const sid = req.cookies?.sid;
  if (!sid || !sessions.has(sid)) {
    return null;
  }
  const session = sessions.get(sid);
  const user = await findUserById(session.userId);
  if (!user) {
    sessions.delete(sid);
    return null;
  }
  return user;
}

export async function requireUser(req, res, next) {
  const user = await readSession(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.user = user;
  next();
}

export function getSessionUserIdFromCookie(cookieHeader) {
  if (!cookieHeader) {
    return null;
  }
  const sid = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("sid="))
    ?.split("=")[1];
  if (!sid || !sessions.has(sid)) {
    return null;
  }
  return sessions.get(sid).userId;
}
