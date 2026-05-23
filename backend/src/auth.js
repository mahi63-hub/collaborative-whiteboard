import jwt from "jsonwebtoken";
import { createSession } from "./session.js";
import { upsertUser } from "./db.js";

export function googleLoginUrl() {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: process.env.GOOGLE_CALLBACK_URL || "",
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent"
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function handleGoogleCallback(req, res) {
  const code = req.query.code;
  if (!code) {
    return res.status(400).json({ error: "Missing OAuth code" });
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: process.env.GOOGLE_CALLBACK_URL || "",
      grant_type: "authorization_code"
    })
  });

  if (!tokenResponse.ok) {
    return res.status(401).json({ error: "OAuth token exchange failed" });
  }

  const tokenData = await tokenResponse.json();
  const profile = jwt.decode(tokenData.id_token);
  if (!profile?.email) {
    return res.status(401).json({ error: "OAuth profile missing email" });
  }

  const user = await upsertUser({
    googleId: profile.sub,
    name: profile.name || profile.email,
    email: profile.email,
    image: profile.picture || ""
  });

  createSession(res, user);
  res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`);
}
