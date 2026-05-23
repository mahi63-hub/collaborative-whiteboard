import express from "express";
import { createBoard, loadBoard, saveBoard, upsertUser } from "./db.js";
import { googleLoginUrl, handleGoogleCallback } from "./auth.js";
import { createSession, readSession, requireUser } from "./session.js";

export const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

router.get("/api/auth/google", (req, res) => {
  res.redirect(googleLoginUrl());
});

router.get("/api/auth/google/callback", handleGoogleCallback);

router.post("/api/auth/test-login", async (req, res) => {
  const email = req.body?.email || process.env.TEST_USER_EMAIL || "testuser@example.com";
  const user = await upsertUser({
    googleId: null,
    name: req.body?.name || "Test User",
    email,
    image: req.body?.image || "https://example.com/test-user.png"
  });
  createSession(res, user);
  res.json({ user });
});

router.get("/api/auth/session", async (req, res) => {
  const user = await readSession(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({ user });
});

router.post("/api/auth/logout", (req, res) => {
  res.clearCookie("sid");
  res.json({ success: true });
});

router.post("/api/boards", requireUser, async (req, res) => {
  const boardId = await createBoard(req.user.id);
  res.status(201).json({ boardId });
});

router.post("/api/boards/:boardId", requireUser, async (req, res) => {
  const objects = Array.isArray(req.body?.objects) ? req.body.objects : [];
  const saved = await saveBoard(req.params.boardId, req.user.id, objects);
  if (!saved) {
    return res.status(404).json({ error: "Board not found" });
  }
  res.json({ success: true, boardId: req.params.boardId });
});

router.get("/api/boards/:boardId", requireUser, async (req, res) => {
  const board = await loadBoard(req.params.boardId, req.user.id);
  if (!board) {
    return res.status(404).json({ error: "Board not found" });
  }
  res.json({
    boardId: board.id,
    objects: board.objects || [],
    updatedAt: board.updated_at.toISOString()
  });
});
