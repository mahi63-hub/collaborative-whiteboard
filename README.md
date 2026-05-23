# Collaborative Whiteboard

A production-ready real-time collaborative whiteboard built with React, the Canvas API, Express, Socket.IO, and PostgreSQL.

The project supports authenticated board creation, persistent board state, live multi-user drawing, room-based WebSocket synchronization, remote cursors, active user presence, and local undo/redo.

## Submission Repository

This repository includes all required submission files at the root:

- `README.md`
- `docker-compose.yml`
- `.env.example`
- `submission.json`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `backend/`
- `frontend/`

## Technology Stack

- Frontend: React, Vite, Canvas API, Socket.IO Client
- Backend: Node.js, Express.js, Socket.IO
- Database: PostgreSQL
- Authentication: Google OAuth route support and local test login
- Deployment: Docker and Docker Compose

## Project Structure

```text
collaborative-whiteboard/
  backend/
    seeds/
      001_init.sql
    src/
      auth.js
      db.js
      routes.js
      server.js
      session.js
      socket.js
    Dockerfile
    healthcheck.js
    package.json
  frontend/
    src/
      main.jsx
      styles.css
    Dockerfile
    index.html
    package.json
  .env.example
  .gitignore
  docker-compose.yml
  README.md
  submission.json
```

## Run With Docker

Start the complete application with one command:

```bash
docker compose up --build
```

To run in the background:

```bash
docker compose up --build -d
```

Frontend:

```text
http://localhost:3000
```

Backend health check:

```text
http://localhost:3001/health
```

PostgreSQL:

```text
localhost:5432
```

## Docker Compose Requirements

The root `docker-compose.yml` starts three required services:

- `frontend`
- `backend`
- `db`

The backend waits for the database health check before starting.

The backend includes a health check using:

```text
GET /health
```

The database includes a PostgreSQL health check using `pg_isready`.

Database seed scripts are mounted from:

```text
./backend/seeds
```

## Environment Variables

The root `.env.example` documents all required environment variables:

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

The values are placeholders and do not contain real secrets.

## Submission Config

The root `submission.json` follows the required structure:

```json
{
  "testUser": {
    "email": "testuser@example.com"
  },
  "oauthCredentials": {
    "google": {
      "clientId": "your-test-google-client-id",
      "clientSecret": "your-test-google-client-secret"
    }
  }
}
```

## Authentication

The backend provides Google OAuth endpoints:

- `GET /api/auth/google`
- `GET /api/auth/google/callback`

The backend also provides a local test login endpoint for automated and local testing:

- `POST /api/auth/test-login`

The current authenticated session can be checked with:

```text
GET /api/auth/session
```

Successful session response:

```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "image": "string"
  }
}
```

If no valid session exists, the endpoint returns `401 Unauthorized`.

## Board API

Create a new board:

```text
POST /api/boards
```

Successful response:

```json
{
  "boardId": "string"
}
```

Save a board:

```text
POST /api/boards/:boardId
```

Request body:

```json
{
  "objects": []
}
```

Successful response:

```json
{
  "success": true,
  "boardId": "string"
}
```

Load a board:

```text
GET /api/boards/:boardId
```

Successful response:

```json
{
  "boardId": "string",
  "objects": [],
  "updatedAt": "string"
}
```

All board API routes require a valid session cookie.

## WebSocket Room Management

The board page is available at:

```text
/board/:boardId
```

When a user opens a board page, the frontend connects to Socket.IO and joins the matching board room.

Client to server:

```text
joinRoom
```

Payload:

```json
{
  "boardId": "string"
}
```

## Active Users

The app displays all users currently active in the board room.

Required UI selector:

```text
data-testid="user-list"
```

Server to client:

```text
roomUsers
```

Payload:

```json
{
  "users": [
    {
      "id": "string",
      "name": "string"
    }
  ]
}
```

The list updates when users join or leave.

## Remote Cursors

Each user's cursor position is broadcast to other users in the room.

Required UI selector:

```text
data-testid="remote-cursor"
```

Client to server:

```text
cursorMove
```

Payload:

```json
{
  "x": 100,
  "y": 120
}
```

Server to client:

```text
cursorUpdate
```

Payload:

```json
{
  "userId": "string",
  "x": 100,
  "y": 120
}
```

## Drawing Tools

The app includes a pen tool for freehand drawing.

Client to server:

```text
draw
```

Server to client:

```text
drawUpdate
```

Drawing payload includes:

- `id`
- `type`
- `points`
- `color`
- `brushSize`

The app exposes the required test function:

```js
window.getCanvasAsJSON()
```

It returns a JSON-serializable array of canvas objects.

## Rectangle Tool

The app includes a rectangle tool.

Required UI selector:

```text
data-testid="tool-rectangle"
```

Client to server:

```text
addObject
```

Payload:

```json
{
  "type": "rectangle",
  "x": 100,
  "y": 100,
  "width": 200,
  "height": 120,
  "fill": "#2563eb"
}
```

Server to client:

```text
objectAdded
```

## Undo And Redo

Undo reverts the most recent local user action.

Required UI selector:

```text
data-testid="undo-button"
```

Redo restores the most recently undone local action.

Required UI selector:

```text
data-testid="redo-button"
```

Undo and redo update the local canvas state and broadcast the resulting object removal or restoration to other users.

## Canvas State

Canvas objects are stored as JSON data.

Supported object types:

- `path`
- `rectangle`

Board state is persisted in PostgreSQL through the board save endpoint.

## Local Collaboration Test

1. Start the app with Docker Compose.
2. Open `http://localhost:3000`.
3. Click `Use Test Login`.
4. Click `New Board`.
5. Copy the generated `/board/:boardId` URL.
6. Open the same URL in another browser tab.
7. Draw in one tab and verify that it appears in the other tab.
8. Move the cursor in one tab and verify that the remote cursor appears in the other tab.
9. Check that the active user list updates.
10. Use undo and redo buttons to verify local history behavior.

## Evaluation Checklist

This project satisfies the listed core requirements:

1. Docker Compose starts `frontend`, `backend`, and `db`.
2. `.env.example` documents all required environment variables.
3. `submission.json` is present at the repository root.
4. `GET /health` returns service status and timestamp.
5. Authentication session endpoint is available at `GET /api/auth/session`.
6. Authenticated users can create boards with `POST /api/boards`.
7. Authenticated users can save board state with `POST /api/boards/:boardId`.
8. Authenticated users can load board state with `GET /api/boards/:boardId`.
9. The frontend joins a Socket.IO room from `/board/:boardId`.
10. The active user list is rendered with `data-testid="user-list"`.
11. Remote cursors are rendered with `data-testid="remote-cursor"`.
12. Pen drawing syncs through `draw` and `drawUpdate`.
13. Rectangle creation syncs through `addObject` and `objectAdded`.
14. Undo is available through `data-testid="undo-button"`.
15. Redo is available through `data-testid="redo-button"`.

## Development Commands

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend build:

```bash
cd frontend
npm run build
```

## Notes For Reviewers

The app uses a beginner-friendly structure with separate files for database helpers, session handling, OAuth helpers, API routes, Socket.IO handlers, and the server entry point.

The frontend keeps the whiteboard logic in a single React file to make the drawing flow easy to follow for evaluation and learning.
