import { findUserById } from "./db.js";
import { getSessionUserIdFromCookie } from "./session.js";

const rooms = new Map();

function cleanObject(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value;
}

function usersForRoom(boardId) {
  return Array.from(rooms.get(boardId)?.values() || []).map((user) => ({
    id: user.id,
    name: user.name
  }));
}

function broadcastUsers(io, boardId) {
  io.to(boardId).emit("roomUsers", { users: usersForRoom(boardId) });
}

export function setupSocket(io) {
  io.use(async (socket, next) => {
    const userId = getSessionUserIdFromCookie(socket.handshake.headers.cookie);
    if (!userId) {
      socket.user = {
        id: socket.id,
        name: "Guest"
      };
      return next();
    }
    const user = await findUserById(userId);
    socket.user = {
      id: socket.id,
      name: user?.name || "Guest"
    };
    next();
  });

  io.on("connection", (socket) => {
    socket.on("joinRoom", ({ boardId }) => {
      if (!boardId || typeof boardId !== "string") {
        return;
      }
      socket.join(boardId);
      socket.boardId = boardId;
      if (!rooms.has(boardId)) {
        rooms.set(boardId, new Map());
      }
      rooms.get(boardId).set(socket.id, socket.user);
      broadcastUsers(io, boardId);
    });

    socket.on("cursorMove", ({ x, y }) => {
      if (!socket.boardId || typeof x !== "number" || typeof y !== "number") {
        return;
      }
      socket.to(socket.boardId).emit("cursorUpdate", {
        userId: socket.user.id,
        name: socket.user.name,
        x,
        y
      });
    });

    socket.on("draw", (payload) => {
      const data = cleanObject(payload);
      if (!socket.boardId || !data || !Array.isArray(data.points)) {
        return;
      }
      socket.to(socket.boardId).emit("drawUpdate", {
        ...data,
        userId: socket.user.id
      });
    });

    socket.on("addObject", (payload) => {
      const data = cleanObject(payload);
      if (!socket.boardId || !data || data.type !== "rectangle") {
        return;
      }
      socket.to(socket.boardId).emit("objectAdded", {
        ...data,
        userId: socket.user.id
      });
    });

    socket.on("removeObject", ({ objectId }) => {
      if (!socket.boardId || typeof objectId !== "string") {
        return;
      }
      socket.to(socket.boardId).emit("objectRemoved", { objectId });
    });

    socket.on("restoreObject", (payload) => {
      const data = cleanObject(payload);
      if (!socket.boardId || !data || typeof data.id !== "string") {
        return;
      }
      socket.to(socket.boardId).emit("objectRestored", data);
    });

    socket.on("disconnect", () => {
      const boardId = socket.boardId;
      if (!boardId || !rooms.has(boardId)) {
        return;
      }
      rooms.get(boardId).delete(socket.id);
      if (rooms.get(boardId).size === 0) {
        rooms.delete(boardId);
      } else {
        broadcastUsers(io, boardId);
      }
    });
  });
}
