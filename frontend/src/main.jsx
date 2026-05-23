import React from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import "./styles.css";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function api(path, options = {}) {
  return fetch(`${apiUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
}

async function ensureSession() {
  const session = await api("/api/auth/session");
  if (session.ok) {
    return true;
  }
  const login = await api("/api/auth/test-login", {
    method: "POST",
    body: JSON.stringify({ email: "testuser@example.com", name: "Test User" })
  });
  return login.ok;
}

function App() {
  const path = window.location.pathname;
  if (path.startsWith("/board/")) {
    return <Board boardId={decodeURIComponent(path.split("/board/")[1])} />;
  }
  return <Dashboard />;
}

function Dashboard() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    api("/api/auth/session")
      .then(async (res) => {
        if (!res.ok) {
          return null;
        }
        return res.json();
      })
      .then((data) => setUser(data?.user || null))
      .finally(() => setLoading(false));
  }, []);

  async function testLogin() {
    setError("");
    const res = await api("/api/auth/test-login", {
      method: "POST",
      body: JSON.stringify({ email: "testuser@example.com", name: "Test User" })
    });
    if (!res.ok) {
      setError("Login failed");
      return;
    }
    const data = await res.json();
    setUser(data.user);
  }

  async function createBoard() {
    setError("");
    const res = await api("/api/boards", { method: "POST" });
    if (!res.ok) {
      setError("Create a session before creating a board");
      return;
    }
    const data = await res.json();
    window.location.href = `/board/${data.boardId}`;
  }

  return (
    <main className="page">
      <section className="dashboard">
        <div>
          <p className="eyebrow">Realtime workspace</p>
          <h1>Collaborative Whiteboard</h1>
          <p className="lead">Draw, share cursors, create shapes, and save canvas state with a simple Socket.IO and Canvas API stack.</p>
        </div>
        <div className="actions">
          {loading ? <span>Loading session...</span> : null}
          {user ? <span className="user-pill">{user.name}</span> : null}
          {!user ? <button onClick={testLogin}>Use Test Login</button> : null}
          {!user ? <a className="button secondary" href={`${apiUrl}/api/auth/google`}>Google Login</a> : null}
          <button onClick={createBoard}>New Board</button>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </section>
    </main>
  );
}

function Board({ boardId }) {
  const canvasRef = React.useRef(null);
  const socketRef = React.useRef(null);
  const objectsRef = React.useRef([]);
  const activeRef = React.useRef(null);
  const undoRef = React.useRef([]);
  const redoRef = React.useRef([]);
  const [objects, setObjects] = React.useState([]);
  const [tool, setTool] = React.useState("pen");
  const [color, setColor] = React.useState("#2563eb");
  const [brushSize, setBrushSize] = React.useState(5);
  const [users, setUsers] = React.useState([]);
  const [cursors, setCursors] = React.useState({});
  const [status, setStatus] = React.useState("Connecting");

  function sync(nextObjects) {
    objectsRef.current = nextObjects;
    setObjects(nextObjects);
    drawAll(nextObjects);
  }

  function addLocalObject(object) {
    undoRef.current = [...undoRef.current, object];
    redoRef.current = [];
    sync([...objectsRef.current, object]);
  }

  function upsertObject(object) {
    const exists = objectsRef.current.some((item) => item.id === object.id);
    if (exists) {
      sync(objectsRef.current.map((item) => item.id === object.id ? object : item));
    } else {
      sync([...objectsRef.current, object]);
    }
  }

  function drawAll(list = objectsRef.current) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const item of list) {
      if (item.type === "path") {
        drawPath(ctx, item);
      }
      if (item.type === "rectangle") {
        ctx.fillStyle = item.fill;
        ctx.strokeStyle = item.stroke || item.fill;
        ctx.lineWidth = item.brushSize || 2;
        ctx.globalAlpha = 0.18;
        ctx.fillRect(item.x, item.y, item.width, item.height);
        ctx.globalAlpha = 1;
        ctx.strokeRect(item.x, item.y, item.width, item.height);
      }
    }
  }

  function drawPath(ctx, item) {
    if (!item.points || item.points.length < 2) {
      return;
    }
    ctx.strokeStyle = item.color;
    ctx.lineWidth = item.brushSize;
    ctx.beginPath();
    ctx.moveTo(item.points[0].x, item.points[0].y);
    for (const point of item.points.slice(1)) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }

  function getPoint(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.round(event.clientX - rect.left),
      y: Math.round(event.clientY - rect.top)
    };
  }

  function pointerDown(event) {
    const point = getPoint(event);
    if (tool === "pen") {
      activeRef.current = {
        id: makeId(),
        type: "path",
        points: [point],
        color,
        brushSize
      };
    } else {
      activeRef.current = {
        id: makeId(),
        type: "rectangle",
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
        fill: color,
        stroke: color,
        brushSize
      };
    }
  }

  function pointerMove(event) {
    const point = getPoint(event);
    socketRef.current?.emit("cursorMove", point);
    const active = activeRef.current;
    if (!active) {
      return;
    }
    if (active.type === "path") {
      active.points = [...active.points, point];
      socketRef.current?.emit("draw", active);
    } else {
      active.width = point.x - active.x;
      active.height = point.y - active.y;
      socketRef.current?.emit("addObject", active);
    }
    drawAll([...objectsRef.current, active]);
  }

  function pointerUp() {
    const active = activeRef.current;
    if (!active) {
      return;
    }
    activeRef.current = null;
    if (active.type === "path" && active.points.length < 2) {
      return;
    }
    addLocalObject(active);
    if (active.type === "path") {
      socketRef.current?.emit("draw", active);
    } else {
      socketRef.current?.emit("addObject", active);
    }
  }

  function undo() {
    const last = [...undoRef.current].pop();
    if (!last) {
      return;
    }
    undoRef.current = undoRef.current.slice(0, -1);
    redoRef.current = [...redoRef.current, last];
    sync(objectsRef.current.filter((item) => item.id !== last.id));
    socketRef.current?.emit("removeObject", { objectId: last.id });
  }

  function redo() {
    const restored = [...redoRef.current].pop();
    if (!restored) {
      return;
    }
    redoRef.current = redoRef.current.slice(0, -1);
    undoRef.current = [...undoRef.current, restored];
    sync([...objectsRef.current, restored]);
    socketRef.current?.emit("restoreObject", restored);
  }

  async function save() {
    setStatus("Saving");
    const ready = await ensureSession();
    if (!ready) {
      setStatus("Login needed");
      return;
    }
    const res = await api(`/api/boards/${boardId}`, {
      method: "POST",
      body: JSON.stringify({ objects: objectsRef.current })
    });
    setStatus(res.ok ? "Saved" : "Save failed");
  }

  React.useEffect(() => {
    window.getCanvasAsJSON = () => objectsRef.current;
    return () => {
      delete window.getCanvasAsJSON;
    };
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      const parent = canvas.parentElement;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      drawAll();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  React.useEffect(() => {
    ensureSession()
      .then((ready) => {
        if (!ready) {
          setStatus("Login needed");
          return null;
        }
        return api(`/api/boards/${boardId}`);
      })
      .then(async (res) => {
        if (!res) {
          return { objects: [] };
        }
        if (!res.ok) {
          return { objects: [] };
        }
        return res.json();
      })
      .then((data) => {
        sync(data.objects || []);
        setStatus("Loaded");
      });
  }, [boardId]);

  React.useEffect(() => {
    const socket = io(socketUrl, {
      withCredentials: true
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      setStatus("Connected");
      socket.emit("joinRoom", { boardId });
    });
    socket.on("disconnect", () => setStatus("Disconnected"));
    socket.on("roomUsers", ({ users }) => setUsers(users || []));
    socket.on("cursorUpdate", (cursor) => {
      setCursors((current) => ({
        ...current,
        [cursor.userId]: cursor
      }));
    });
    socket.on("drawUpdate", (object) => upsertObject(object));
    socket.on("objectAdded", (object) => upsertObject(object));
    socket.on("objectRemoved", ({ objectId }) => sync(objectsRef.current.filter((item) => item.id !== objectId)));
    socket.on("objectRestored", (object) => sync([...objectsRef.current, object]));
    return () => socket.disconnect();
  }, [boardId]);

  return (
    <main className="board-page">
      <aside className="sidebar">
        <a className="back" href="/dashboard">Back</a>
        <h1>Whiteboard</h1>
        <p className="board-id">{boardId}</p>
        <div className="tools">
          <button className={tool === "pen" ? "active" : ""} onClick={() => setTool("pen")}>Pen</button>
          <button data-testid="tool-rectangle" className={tool === "rectangle" ? "active" : ""} onClick={() => setTool("rectangle")}>Rectangle</button>
          <label>
            Color
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          </label>
          <label>
            Size
            <input type="range" min="1" max="24" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} />
          </label>
          <div className="tool-row">
            <button data-testid="undo-button" onClick={undo}>Undo</button>
            <button data-testid="redo-button" onClick={redo}>Redo</button>
          </div>
          <button onClick={save}>Save</button>
        </div>
        <section>
          <h2>Users</h2>
          <ul data-testid="user-list" className="user-list">
            {users.map((user) => <li key={user.id}>{user.name}</li>)}
          </ul>
        </section>
        <p className="status">{status} | {objects.length} objects</p>
      </aside>
      <section className="canvas-wrap">
        <canvas
          ref={canvasRef}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerLeave={pointerUp}
        />
        {Object.values(cursors).map((cursor) => (
          <div
            data-testid="remote-cursor"
            className="remote-cursor"
            key={cursor.userId}
            style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
          >
            <span>{cursor.name || "User"}</span>
          </div>
        ))}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
