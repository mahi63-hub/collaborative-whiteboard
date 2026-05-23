import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
import { router } from "./routes.js";
import { setupSocket } from "./socket.js";
import { initDb } from "./db.js";

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3001;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(cors({
  origin: frontendUrl,
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(router);

app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message || "Server error" });
});

const io = new Server(server, {
  cors: {
    origin: frontendUrl,
    credentials: true
  }
});

setupSocket(io);

initDb()
  .then(() => {
    server.listen(port, () => {
      console.log(`Backend listening on ${port}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
