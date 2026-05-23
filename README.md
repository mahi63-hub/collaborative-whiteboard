# Collaborative Whiteboard

A real-time collaborative whiteboard built with React, the Canvas API, Express, Socket.IO, and PostgreSQL.

## Features

- Google OAuth login endpoint
- Test login endpoint for local evaluation
- Create, save, and load whiteboards
- Socket.IO rooms for board collaboration
- Live active user list
- Live remote cursors
- Pen drawing tool
- Rectangle drawing tool
- Color and brush size controls
- Local undo and redo
- Canvas JSON test hook through `window.getCanvasAsJSON()`
- Docker Compose setup for frontend, backend, and database

## Project Structure

```text
collaborative-whiteboard/
  backend/
    seeds/
    src/
    Dockerfile
    healthcheck.js
    package.json
  frontend/
    src/
    Dockerfile
    index.html
    package.json
  .env.example
  docker-compose.yml
  submission.json
```

## Run With Docker

Copy the example environment file if you want to customize values.

```bash
cp .env.example .env
```

Start all services.

```bash
docker-compose up --build
```

Open the app at:

```text
http://localhost:3000
```

The backend health check is available at:

```text
http://localhost:3001/health
```

## Local Development

Start PostgreSQL through Docker or use your own database, then install packages in each app.

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

The root `.env.example` includes every value used by Docker Compose and the apps:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `DATABASE_URL`
- `PORT`
- `FRONTEND_URL`
- `VITE_API_URL`
- `VITE_SOCKET_URL`
- `JWT_SECRET`
- `SESSION_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `TEST_USER_EMAIL`

## Authentication

The backend exposes:

- `GET /api/auth/google`
- `GET /api/auth/google/callback`
- `GET /api/auth/session`
- `POST /api/auth/logout`
- `POST /api/auth/test-login`

Use `POST /api/auth/test-login` during local development or automated checks when real Google credentials are not available.

## Board API

Create a board:

```text
POST /api/boards
```

Save a board:

```text
POST /api/boards/:boardId
```

Load a board:

```text
GET /api/boards/:boardId
```

All board API routes require a valid session cookie.

## Socket Events

Client to server:

- `joinRoom`
- `cursorMove`
- `draw`
- `addObject`
- `removeObject`
- `restoreObject`

Server to client:

- `roomUsers`
- `cursorUpdate`
- `drawUpdate`
- `objectAdded`
- `objectRemoved`
- `objectRestored`

## Evaluation Notes

The board page is available at:

```text
/board/:boardId
```

The active user list has:

```text
data-testid="user-list"
```

The rectangle tool has:

```text
data-testid="tool-rectangle"
```

Undo and redo buttons have:

```text
data-testid="undo-button"
data-testid="redo-button"
```

Remote cursors have:

```text
data-testid="remote-cursor"
```

The canvas state can be read with:

```js
window.getCanvasAsJSON()
```
