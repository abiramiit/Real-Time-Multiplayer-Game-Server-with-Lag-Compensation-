# Real-Time Multiplayer Game Engine

A real-time multiplayer game networking system built with **React, TypeScript, Node.js, WebSockets, and Redis**. The project explores authoritative game-state management, low-latency communication, client-side prediction, server reconciliation, state interpolation, and distributed multiplayer servers.

The goal is to provide a networking foundation for responsive multiplayer gameplay while maintaining consistent server-authoritative state across connected clients.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Networking Techniques](#networking-techniques)
- [Distributed Server Architecture](#distributed-server-architecture)
- [Security and Reliability](#security-and-reliability)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started with Docker](#getting-started-with-docker)
- [Running in Development Mode](#running-in-development-mode)
- [Configuration](#configuration)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Future Improvements](#future-improvements)

## Overview

In multiplayer games, network latency and packet loss can cause delayed movement, inconsistent player positions, and differences between what individual players see.

This project investigates these challenges through a WebSocket-based multiplayer architecture.

The game server acts as the authority for game state, while the client uses prediction and interpolation techniques to improve responsiveness. Redis Pub/Sub provides a communication mechanism for coordinating game-server instances.

The system is designed to explore how multiplayer networking techniques work together in a practical full-stack application.

## Key Features

### Real-Time Communication
- WebSocket-based communication between clients and game servers.
- Continuous exchange of player inputs and game-state updates.
- Support for multiple connected players, subject to server configuration.

### Server-Authoritative Simulation
- The server is responsible for authoritative game-state updates.
- Client inputs are processed by the server rather than being treated as final state.
- Shared game logic helps maintain consistent state calculations.

### Client-Side Prediction
- Predicts local player movement before the server response arrives.
- Helps reduce the perceived delay between player input and movement.
- Supports a more responsive gameplay experience under network latency.

### Server Reconciliation
- Corrects predicted client state using authoritative server updates.
- Reprocesses applicable pending inputs after reconciliation.
- Helps reduce divergence between predicted and authoritative state.

### State Interpolation
- Smooths the presentation of remote player movement.
- Uses received state information to reduce visible movement discontinuities.

### Network Simulation
- Provides a way to investigate networking behavior under simulated latency and packet loss.
- Helps evaluate how prediction, reconciliation, and interpolation respond to degraded network conditions.

### Redis-Based Distributed Communication
- Uses Redis Pub/Sub for communication between server instances.
- Supports a multi-server architecture.
- Enables investigation of player and room coordination across separate backend processes.

### Security and Reliability
- Input validation and server-side checks.
- Rate limiting where configured.
- Session handling and reconnection support.
- Room coordination and recovery behavior, according to the implemented server logic.

### Containerized Deployment
- Docker Compose configuration for the frontend, Redis, and two backend services.
- Nginx configuration for serving the frontend where configured.
- A repeatable deployment setup for local development and integration testing.

## Technology Stack

| Technology | Purpose |
|---|---|
| React | Frontend user interface |
| TypeScript | Type safety and maintainable application code |
| Vite | Frontend development and build tooling |
| HTML Canvas | Game rendering |
| Node.js | Backend runtime |
| WebSocket (`ws`) | Real-time, bidirectional communication |
| Redis | Pub/Sub and distributed server communication |
| Docker | Containerization |
| Docker Compose | Multi-service orchestration |
| Nginx | Frontend serving and deployment, where configured |
| Vitest | Automated testing, where configured |

The exact dependencies and versions are defined by the project's package files.

## System Architecture

The application is organized into shared game logic, a browser client, backend game servers, and Redis.

```text
                  +--------------------------+
                  |      Browser Client      |
                  |                          |
                  | React + TypeScript       |
                  | Canvas Rendering          |
                  | Client Prediction         |
                  | Reconciliation            |
                  | State Interpolation       |
                  +------------+-------------+
                               |
                         WebSocket
                               |
                  +------------v-------------+
                  |      Backend Server      |
                  |                          |
                  | Node.js + TypeScript     |
                  | Authoritative Game State |
                  | Input Processing         |
                  | Room and Session Logic   |
                  +------------+-------------+
                               |
                         Redis Pub/Sub
                               |
                  +------------v-------------+
                  |    Secondary Server      |
                  |                          |
                  | Additional Game Instance|
                  | Cross-Server Messaging   |
                  +--------------------------+

                  Shared Game Logic
                  Physics and Types
                  Used Across Components
```

The diagram illustrates the intended architecture. Actual room routing and cross-server behavior depend on the implemented server logic and runtime configuration.

### Main Components

**Frontend Client**

Responsible for rendering the game, capturing user input, communicating with the server, and applying prediction and interpolation techniques.

**Backend Game Server**

Processes player inputs, maintains authoritative game state, and communicates updates to connected clients.

**Shared Package**

Contains shared game types and logic used by the client and server, helping maintain consistency between their representations of game state.

**Redis**

Provides a messaging layer for communication between backend instances.

**Docker Compose**

Defines the services required to run the application as a multi-container system.

## Networking Techniques

### 1. Client-Side Prediction

When a player provides input, the client can predict the resulting movement without waiting for a server response.

This reduces perceived input delay but can temporarily produce a state that differs from the server's authoritative state.

### 2. Server Reconciliation

When the client receives an authoritative server update, it compares the confirmed state with its predicted state.

If they differ, the client corrects its state and replays relevant unacknowledged inputs when supported by the implementation.

### 3. State Interpolation

Remote player updates arrive at discrete intervals. Interpolation uses received state snapshots to render smoother movement between updates.

### 4. Latency and Packet-Loss Simulation

Network simulation helps investigate the effects of delayed or lost messages.

It can be used to observe movement responsiveness, correction behavior, and remote-player rendering under simulated network conditions.

Simulated network conditions are not the same as measurements from a real-world network.

### 5. Authoritative State Management

The server remains the authority for game state. This design reduces reliance on client-provided state and provides a central point for validating and processing player actions.

## Distributed Server Architecture

The project includes a Redis-based communication layer intended to support multiple game-server instances.

The configured services are:

| Service | Intended role | Default port |
|---|---|---:|
| `frontend` | Browser application | 3000 |
| `backend` | Primary game server | 8080 |
| `backend-secondary` | Secondary game server | 8081 |
| `redis` | Inter-server messaging | 6379 |

These are the expected host ports in the project configuration; verify the actual mappings in `docker-compose.yml`.

Redis Pub/Sub can distribute messages between subscribed server instances. Room ownership and routing must follow the application's implemented coordination logic.

Redis Pub/Sub alone does not guarantee durable message delivery. If a subscriber is disconnected, messages published during that period may not be received by it.

## Security and Reliability

The project explores several aspects of safer multiplayer networking:

- Server-side input validation.
- Rate limiting to help control excessive client requests.
- Session lifecycle management.
- Reconnection handling.
- Room coordination across server instances.
- Handling network disconnections and delayed messages.

These mechanisms complement one another but do not automatically eliminate every abuse or failure scenario. Their effectiveness depends on the actual implementation and configuration.

## Project Structure

The repository is organized as a workspace-based application.

```text
resume-project2/
├── packages/
│   ├── shared/
│   │   └── Shared game types and logic
│   ├── server/
│   │   └── Backend game-server implementation
│   └── client/
│       └── React frontend and game rendering
├── docker-compose.yml
├── package.json
├── README.md
└── Documentation and configuration files
```

The directory descriptions are logical summaries. Refer to the actual repository for the complete file and directory list.

## Prerequisites

For containerized execution:

- Windows, Linux, or macOS.
- Docker Desktop or another supported Docker Engine installation.
- Docker Compose.
- A browser that supports WebSockets.

For local development without Docker:

- Node.js compatible with the project's declared requirements.
- npm or the package manager specified by the repository.
- Redis, if required by the backend configuration.

Check the root `package.json` and individual package manifests for the supported runtime versions and scripts.

## Getting Started with Docker

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd resume-project2
```

Replace `<YOUR_REPOSITORY_URL>` with the actual repository address.

If the repository is already available locally, navigate to its directory instead.

### 2. Verify Docker

Run:

```bash
docker info
docker compose version
```

Confirm that `docker info` displays a working server section. Installing the Docker CLI alone is not sufficient; the Docker daemon must also be running.

### 3. Validate the Compose configuration

```bash
docker compose config
```

Resolve any configuration errors before starting the application.

### 4. Build and start the services

```bash
docker compose up -d --build
```

### 5. Check service status

```bash
docker compose ps
```

All required services should be running or have reached their expected healthy state.

### 6. Inspect logs

```bash
docker compose logs --tail=100 redis backend backend-secondary
```

Use the logs to investigate startup failures, Redis connection problems, and WebSocket server errors.

### 7. Verify Redis

If the Redis service is running:

```bash
docker compose exec redis redis-cli ping
```

Expected response:

```text
PONG
```

### 8. Open the application

If the Compose configuration maps the frontend to host port 3000, open:

`http://localhost:3000`

The game server's expected WebSocket endpoint is:

`ws://localhost:8080/`

The secondary endpoint is expected to be:

`ws://localhost:8081/`

These endpoints are valid only if the corresponding services are configured to listen and publish those ports.

### 9. Stop the application

```bash
docker compose down
```

This stops and removes the Compose-managed containers and network. It does not request removal of persistent volumes.

Do not use `docker compose down -v` unless you explicitly intend to delete the associated volumes.

## Running in Development Mode

Local development commands depend on the scripts defined in the repository.

Start by installing dependencies from the repository root:

```bash
npm install
```

Inspect the available scripts:

```bash
npm run
```

Then inspect the package-specific scripts:

```bash
npm --prefix packages/server run
npm --prefix packages/client run
```

Use the actual scripts listed by these commands to start the backend and frontend.

If Redis is required, make sure it is running and that the backend's Redis URL points to the correct host and port.

When running the backend directly on Windows, `localhost:6379` may be appropriate for a locally running Redis service. When the backend runs inside Docker Compose, it generally needs to connect to Redis using the Compose service hostname, such as `redis`, and the container's Redis port.

Do not use the same Redis hostname in every environment without checking the configuration.

## Configuration

Review the following before running the application:

- Backend WebSocket listening port.
- Frontend WebSocket URL.
- Redis connection URL.
- Frontend host port mapping.
- Primary and secondary backend port mappings.
- Session and room configuration.
- Network simulation settings.
- Environment variables and secrets.

Use the existing environment-variable names defined in the source code and Compose configuration.

Do not commit credentials, session secrets, or other sensitive environment values to version control.

## Testing

Run the test scripts defined in the root and package-level `package.json` files.

List available root scripts:

```bash
npm run
```

Inspect backend and frontend scripts:

```bash
npm --prefix packages/server run
npm --prefix packages/client run
```

Depending on the available test suites, validate:

- Shared game logic.
- Server-side input processing.
- WebSocket connections and disconnections.
- Session handling and reconnection.
- Client prediction and reconciliation.
- State interpolation.
- Redis Pub/Sub communication.
- Multi-server room coordination.
- Security and rate limiting.
- Frontend production build.

### WebSocket Verification

A TCP port check alone does not prove that a WebSocket connection works.

Verify that:

1. The game server starts without errors.
2. The WebSocket handshake succeeds.
3. The client can send a valid message.
4. The server responds with the expected message or state update.
5. The client handles disconnection and reconnection correctly.
6. Multi-server communication works when both server instances are running.

Only report tests as passing when they have actually been executed successfully.

## Troubleshooting

### Docker cannot connect to the daemon

Example error:

```text
The system cannot find the file specified.
```

**Possible cause:** Docker Desktop is not running, or the Docker CLI is using an unavailable engine endpoint.

**Steps:**

1. Open Docker Desktop.
2. Wait until the engine is running.
3. Execute:

```bash
docker info
```

4. Confirm that the server section displays engine information.
5. Retry the Compose commands.

If the error persists, inspect the selected Docker context and Docker Desktop diagnostics.

### Redis connection refused

Example error:

```text
ECONNREFUSED 127.0.0.1:6379
```

**Possible causes:**
- Redis is not running.
- Redis is listening on another address or port.
- The backend is using an incorrect Redis URL.
- The backend is running in a container but is configured to connect to the wrong hostname.

Check service status:

```bash
docker compose ps
```

Inspect Redis logs:

```bash
docker compose logs --tail=100 redis
```

Test Redis:

```bash
docker compose exec redis redis-cli ping
```

Expected response:

```text
PONG
```

### WebSocket connection failed on port 8080

Example browser error:

```text
WebSocket connection to 'ws://localhost:8080/' failed
```

**Possible causes:**
- The backend is not running.
- The server failed during initialization.
- The backend is listening on a different port.
- The host port is not published.
- The client uses the wrong WebSocket URL.
- A proxy or networking configuration prevents the connection.

Check the backend:

```bash
docker compose ps
docker compose logs --tail=100 backend
```

On Windows PowerShell, test TCP connectivity:

```powershell
Test-NetConnection 127.0.0.1 -Port 8080
```

If the backend uses Redis during startup, inspect Redis and backend logs together. Fix the underlying startup or configuration problem before changing the frontend URL.

### Port already in use

If a port is occupied, identify the process before stopping anything.

For example, in PowerShell:

```powershell
netstat -ano | findstr ":3100"
```

Inspect the PID:

```powershell
Get-Process -Id <PID>
```

Replace `<PID>` with the actual process ID. Do not terminate a process until you confirm it belongs to this project and is safe to stop.

### Frontend opens the wrong application

Check which process owns the frontend port and verify the actual URL used by the development server.

A browser showing an old application does not necessarily mean the current frontend code is incorrect. Another project may be using the same port.

Confirm the active server and port before changing the application configuration.

## Future Improvements

Potential areas for further development include:

- More extensive automated multiplayer load testing.
- Additional packet-loss and latency scenarios.
- Improved room matchmaking and lifecycle management.
- More comprehensive reconnection and failure-recovery testing.
- Monitoring of server tick rate and network performance.
- Improved observability for Redis and multi-server coordination.
- Production deployment with secure WebSocket connections.
- More detailed performance reports using reproducible test configurations.

These are potential improvements, not claims that the features are already implemented.

---

## Project Goal

This project explores the engineering challenges involved in building a responsive, server-authoritative multiplayer networking system, with a focus on real-time communication, synchronization, distributed backend coordination, and resilience under imperfect network conditions.
