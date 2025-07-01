# ♟️ Real-Time Multiplayer Chess

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Live_Demo-black?style=for-the-badge&logo=vercel)](https://chess-with-multiplater-ver-4.vercel.app/)
[![Render Deployment](https://img.shields.io/badge/Render-Live_Demo-46E3B7?style=for-the-badge&logo=render)](https://chess-server-qrmt.onrender.com)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Repo-blue?style=for-the-badge&logo=github)](https://github.com/Steve-IX/CHESS-WITH-MULTIPLATER-VER-4-)

A feature-rich, real-time multiplayer chess application built with a modern technology stack. Challenge your friends to a classic game of chess through a sleek, responsive web interface, complete with in-game chat, a music player, and customizable themes.

---

### ▶️ Live Demo

-   **Vercel (Frontend):** [https://chess-with-multiplater-ver-4.vercel.app/](https://chess-with-multiplater-ver-4.vercel.app/)
-   **Render (Backend Server):** [https://chess-server-qrmt.onrender.com](https://chess-server-qrmt.onrender.com)

*(Note: The Render free instance may spin down with inactivity, causing a 30-50 second delay on the first connection.)*

---

## ✨ Features

-   **Real-Time Multiplayer:** Play against friends or others online in real-time.
-   **Game Rooms:** Easily create a new game room and share the unique ID with your opponent to join.
-   **Full Chess Logic:** Adheres to all standard chess rules, including pawn promotion, en passant, castling, check, and checkmate detection.
-   **Interactive UI:** A smooth, intuitive, and responsive board with drag-and-drop piece movement.
-   **In-Game Chat:** Communicate with your opponent directly within the game interface.
-   **Game Controls:** Offer or accept draws, resign when the game is lost, or offer a rematch to play again.
-   **Spectator Mode:** Join existing games as a spectator to watch the action unfold.
-   **Theming:** Customize your game's appearance with a selection of beautiful themes.
-   **Music Player:** Enjoy a curated playlist of background music while you play.

## 🛠️ Built With

The project leverages a modern, full-stack TypeScript environment:

-   **Framework:** [Next.js](https://nextjs.org/) (React)
-   **Real-Time Engine:** [Socket.IO](https://socket.io/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **Deployment:**
    -   [Vercel](https://vercel.com/) for the frontend application.
    -   [Render](https://render.com/) for the backend WebSocket server.

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

Make sure you have Node.js and npm installed on your machine.
*   [Node.js](https://nodejs.org/en/download/) (v18.x or later recommended)
*   npm (comes with Node.js)

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/Steve-IX/CHESS-WITH-MULTIPLATER-VER-4-.git
    ```
2.  **Navigate to the web directory:**
    ```sh
    cd CHESS-WITH-MULTIPLATER-VER-4-/chess-web
    ```
3.  **Install NPM packages:**
    ```sh
    npm install
    ```
4.  **Run the development server:**
    ```sh
    npm run dev
    ```
5.  Open [http://localhost:3000](http://localhost:3000) in your browser to see the application. The frontend and the Socket.IO server will run on the same development server.

## ☁️ Deployment

This application is deployed using a dual-platform approach to separate the web client from the stateful WebSocket server.

-   **Vercel:** Hosts the static Next.js frontend. It's configured to point its "Root Directory" to `chess-web` in the project settings.
-   **Render:** Runs the Next.js application as a "Web Service," serving as the dedicated Socket.IO backend. The deployment is managed by the `render.yaml` file in the root of the repository.

### Environment Variables

For the deployed Vercel frontend to connect to the Render backend, the following environment variable must be set in the Vercel project settings:

-   `NEXT_PUBLIC_SOCKET_URL`: The URL of the Render web service (e.g., `https://chess-server-qrmt.onrender.com`).

## 📜 Project Development Journey

This project's path from development to a stable, dual-platform deployment involved several key challenges and learning opportunities:

1.  **Initial Deployment:** The first goal was to deploy the Next.js application to a single platform. Render was chosen, and a `render.yaml` was configured.
2.  **Render Build Failures:** Early builds on Render failed due to missing production dependencies (`devDependencies` vs. `dependencies`) and an inability to resolve TypeScript path aliases (`@/components/...`). This was fixed by restructuring `package.json` and adding `"baseUrl": "."` to `tsconfig.json`.
3.  **Vercel & UI Rollback:** The project was then deployed to Vercel. After some UI changes, a request was made to roll back to a specific, "better" UI version. This required a deep dive into the Git history to find the correct commit hash (`4c34591`), as Vercel's direct rollback features were not viable.
4.  **Deployment Desynchronization:** Restoring the old UI on Vercel was successful, but force-pushing this older code to `main` broke the Render deployment, as all the previous Render-specific fixes were lost.
5.  **Re-applying Fixes & Alias Chaos:** The Render fixes were manually merged into the "good UI" codebase. This, however, created new build failures on Vercel, which has a stricter build environment, particularly around path aliases.
6.  **The Root Cause:** After many attempts to configure aliases, the core issue was identified: conflicting `package.json` and `package-lock.json` files in both the root and the `chess-web` subdirectory were confusing Vercel's dependency installation.
7.  **Resolution:** The solution was to remove the conflicting package files from the root directory and configure the "Root Directory" setting in Vercel to point to `chess-web`. This created a clean build environment.
8.  **Final Sync:** With the codebase cleaned up and Vercel correctly configured, a final push brought both Vercel and Render into sync, running the desired UI with a stable backend connection.

---

## ☕ Java Version (Legacy)

This repository also contains the original Java Swing-based version of the chess application.

### Java Features

-   **Opponent Modes:** Play against a local friend (hot-seat) or a global friend over the network.
-   **Networking:** Simple host/connect functionality using Java's native networking libraries.
-   **Full Chess Rules:** Complete implementation of all standard chess moves and rules.

### Running the Java Version

1.  Ensure you have a JDK (Java 8 or later) installed.
2.  Compile the source files:
    ```sh
    javac ChessMain.java
    ```
3.  Run the application:
    ```sh
    java ChessMain
    ```
