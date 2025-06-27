# Chess With Multiplayer Ver 4

This project is a chess application that supports multiple play modes, implemented in both Java Swing and Next.js. The Java version allows you to host or connect to a friend over the network, play locally on the same machine, or select the upcoming computer opponent mode. The Next.js version provides a modern web interface for playing chess online.

## Java Version Features

- **Three opponent modes**
  - *Computer* – placeholder for future AI opponent.
  - *Local Friend* – hot-seat play on the same computer.
  - *Global Friend* – play with someone over the internet or LAN using a simple networking layer.
- **Full chess rules** including castling, en passant, pawn promotion, check, checkmate and stalemate detection.
- **Board orientation** automatically flips when you are the connecting player so you see the board from the black side.
- **Move highlights** and indicators for the king in check.
- **Piece graphics** loaded from the `images/` directory.

### Java Getting Started

1. Ensure a JDK (Java 8 or later) is installed.
2. Compile the source files:

   ```sh
   javac ChessMain.java
   ```

3. Run the application:

   ```sh
   java ChessMain
   ```

4. Choose your opponent type when prompted. For "Global Friend" one player selects **Host** and provides a port (default 5000) while the other selects **Connect** and enters the host's IP and the same port.

### Java Repository Layout

- `ChessMain.java` – main GUI class and game logic implementation.
- `NetworkManager.java` / `GlobalNetwork.java` – simple networking utilities for multiplayer modes.
- `OpponentChooser.java` – dialog helper to select the opponent type.
- `images/` – PNG assets for chess pieces.
- `git-auto.ps1` / `git-auto.bat` – automated git workflow scripts.

## Next.js Version

The Next.js version provides a modern web interface for playing chess online. It's built with Next.js 14 and includes real-time multiplayer functionality.

### Next.js Getting Started

First, run the development server:

```bash
cd chess-web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Next.js Features

- Modern, responsive UI built with Tailwind CSS
- Real-time multiplayer functionality
- Beautiful animations using Framer Motion
- Full chess rules implementation
- Game state management
- Piece movement validation
- Captured pieces display
- Turn indicators
- Check and checkmate detection

### Next.js Repository Layout

The Next.js version is located in the `chess-web` directory and follows the standard Next.js project structure:

- `src/components/` – React components including the chess game
- `src/lib/` – Chess game logic and utilities
- `src/app/` – Next.js app router pages
- `public/` – Static assets

## Git Automation

This project includes automated git workflow scripts for easy development:

### Quick Push (Recommended)
```bash
# Using the batch file (simplest)
git-auto.bat "Your commit message here"

# Or without a message (auto-generated timestamp)
git-auto.bat
```

### PowerShell Script
```powershell
# Using PowerShell directly
powershell -ExecutionPolicy Bypass -File git-auto.ps1 -CommitMessage "Your message"
```

The automation script will:
- ✅ Check for changes
- ➕ Add all files (excluding .class files)
- 💾 Commit with your message or auto-timestamp
- 🚀 Push to GitHub automatically

## Deployment

The Next.js version can be easily deployed to Vercel:

1. Push your changes to GitHub
2. Connect your repository to Vercel
3. Vercel will automatically build and deploy your application

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
