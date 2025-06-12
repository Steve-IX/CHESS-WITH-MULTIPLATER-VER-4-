# Chess With Multiplayer Ver 3

This project is a Java Swing based chess application that supports multiple play modes. You can host or connect to a friend over the network, play locally on the same machine, or select the upcoming computer opponent mode.

## Features

- **Three opponent modes**
  - *Computer* – placeholder for future AI opponent.
  - *Local Friend* – hot-seat play on the same computer.
  - *Global Friend* – play with someone over the internet or LAN using a simple networking layer.
- **Full chess rules** including castling, en passant, pawn promotion, check, checkmate and stalemate detection.
- **Board orientation** automatically flips when you are the connecting player so you see the board from the black side.
- **Move highlights** and indicators for the king in check.
- **Piece graphics** loaded from the `images/` directory.

## Getting Started

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

## Repository Layout

- `ChessMain.java` – main GUI class and game logic implementation.
- `NetworkManager.java` / `GlobalNetwork.java` – simple networking utilities for multiplayer modes.
- `OpponentChooser.java` – dialog helper to select the opponent type.
- `images/` – PNG assets for chess pieces.

The code currently contains a TODO for implementing the AI opponent. Contributions or improvements are welcome!
