import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.awt.image.BufferedImage;
import java.util.*;
import java.io.*;
import javax.imageio.ImageIO;
import java.net.*;

/**
 * Main Chess application class with board-flipping logic 
 * and multiple opponent modes (Computer, Local Friend, Global Friend).
 */
public class ChessMain extends JPanel {

    // -----------------------------------------------------------------
    // 1) Opponent chooser that returns 0, 1, or 2
    // -----------------------------------------------------------------
    static class OpponentChooser {
        
        /**
         * Returns:
         *    0 -> Play vs Computer
         *    1 -> Local Friend
         *    2 -> Global Friend (network)
         */
        public static int chooseOpponent() {
            String[] options = { "Computer", "Local Friend", "Global Friend" };
            int choice = JOptionPane.showOptionDialog(
                    null,
                    "Choose Your Opponent:",
                    "Opponent Setup",
                    JOptionPane.DEFAULT_OPTION,
                    JOptionPane.PLAIN_MESSAGE,
                    null,
                    options,
                    options[0]
            );
            // If user closes dialog or presses ESC, default to 0 (Computer)
            if (choice < 0) {
                choice = 0;
            }
            return choice;
        }
    }

    // -----------------------------------------------------------------
    // 2) GlobalNetwork class (adapted from old NetworkManager),
    //    matching the method signatures from snippet #1
    // -----------------------------------------------------------------
    static class GlobalNetwork {
        private boolean isHost;      // true if we started the server
        private Socket socket;
        private ServerSocket serverSocket; // keep reference if we are the host
        private BufferedReader in;
        private PrintWriter out;

        public boolean isHost() {
            return isHost;
        }

        public void startServer(int port) throws IOException {
            isHost = true;
            serverSocket = new ServerSocket(port);
            JOptionPane.showMessageDialog(null, 
                    "Hosting a game... Waiting for a friend to connect on port " + port + ".");
            socket = serverSocket.accept();
            serverSocket.close();
            setupStreams();
            JOptionPane.showMessageDialog(null, "Friend connected!");
        }

        public void connectToHost(String host, int port) throws IOException {
            isHost = false;
            JOptionPane.showMessageDialog(null, 
                    "Connecting to " + host + " on port " + port + "...");
            socket = new Socket(host, port);
            setupStreams();
            JOptionPane.showMessageDialog(null, "Connected to friend!");
        }

        private void setupStreams() throws IOException {
            in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            out = new PrintWriter(socket.getOutputStream(), true);
        }

        // receiveMove() signature throws IOException, ClassNotFoundException
        public int[] receiveMove() throws IOException, ClassNotFoundException {
            String line = in.readLine();
            if (line == null) {
                return null;
            }
            String[] parts = line.split(",");
            if (parts.length != 4) {
                return null;
            }
            return new int[]{
                    Integer.parseInt(parts[0]),
                    Integer.parseInt(parts[1]),
                    Integer.parseInt(parts[2]),
                    Integer.parseInt(parts[3])
            };
        }

        public void sendMove(int fromX, int fromY, int toX, int toY) {
            if (out != null) {
                out.println(fromX + "," + fromY + "," + toX + "," + toY);
            }
        }
    }

    // -----------------------------------------------------------------
    // 3) Main entry point
    // -----------------------------------------------------------------
    public static void main(String[] args) {
        // Make these final or effectively final so they can be used in the lambda
        final int opponentChoice = OpponentChooser.chooseOpponent();
        final GlobalNetwork globalNetwork;  // Single declaration, assigned once

        // If user chooses Global Friend, set up server/host or connect
        if (opponentChoice == 2) {
            // We instantiate GlobalNetwork exactly once
            globalNetwork = new GlobalNetwork();

            String[] options = {"Host", "Connect"};
            int mode = JOptionPane.showOptionDialog(
                null,
                "Do you want to host or connect?",
                "Global Friend Mode",
                JOptionPane.DEFAULT_OPTION,
                JOptionPane.INFORMATION_MESSAGE,
                null,
                options,
                options[0]
            );
            try {
                if (mode == 0) { // Host
                    String portStr = JOptionPane.showInputDialog("Enter port to host (e.g. 5000):");
                    int port = (portStr == null || portStr.isEmpty()) ? 5000 : Integer.parseInt(portStr);
                    globalNetwork.startServer(port);
                } else {         // Connect
                    String host = JOptionPane.showInputDialog("Enter host IP address:");
                    String portStr = JOptionPane.showInputDialog("Enter port to connect (e.g. 5000):");
                    int port = (portStr == null || portStr.isEmpty()) ? 5000 : Integer.parseInt(portStr);
                    globalNetwork.connectToHost(host, port);
                }
            } catch (IOException e) {
                JOptionPane.showMessageDialog(
                        null, 
                        "An error occurred: " + e.getMessage(), 
                        "Error", 
                        JOptionPane.ERROR_MESSAGE
                );
                System.exit(0);
            }
        } else {
            // If not playing Global Friend, we set it to null
            globalNetwork = null;
        }

        SwingUtilities.invokeLater(() -> {
            JFrame frame = new JFrame("Chess");
            // If we are in global mode and NOT the host, that means we are black perspective
            boolean isBlackPerspective = (globalNetwork != null && !globalNetwork.isHost());
            // Use the constructor that takes opponentChoice + globalNetwork
            ChessMain panel = new ChessMain(opponentChoice, globalNetwork, isBlackPerspective);
            frame.add(panel);
            frame.pack();
            frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
            frame.setLocationRelativeTo(null);
            frame.setVisible(true);
        });
    }

    // -----------------------------------------------------------------
    // 4) Fields to handle which mode we are in
    // -----------------------------------------------------------------
    static final int TILE_SIZE = 80;
    static final int BOARD_SIZE = TILE_SIZE * 8;

    // Colors
    static final Color LIGHT_SQ_COLOR = new Color(240,217,181);
    static final Color DARK_SQ_COLOR = new Color(181,136,99);
    static final Color HIGHLIGHT_COLOR = new Color(186,202,43,100);
    static final Color CHECK_COLOR = new Color(255,0,0,100);

    // Booleans for modes
    boolean playWithComputer;   
    boolean playWithLocalFriend; 
    boolean playWithGlobalFriend; 

    // The network object if playing global
    GlobalNetwork globalNetwork; 
    // Whose turn in global mode: only interact if isMyTurn
    boolean isMyTurn = true; 

    // Board perspective
    boolean isBlackPerspective;  

    // Images + game state
    Map<String, BufferedImage> images = new HashMap<>();
    ChessGame game = new ChessGame();
    int[] selectedSquare = null;
    java.util.List<int[]> legalMoves = new ArrayList<>();

    // -----------------------------------------------------------------
    // 5) Constructor for ChessMain
    // -----------------------------------------------------------------
    public ChessMain(int opponentChoice, GlobalNetwork globalNetwork, boolean isBlackPerspective) {
        // Convert that integer choice into booleans
        this.playWithComputer    = (opponentChoice == 0);
        this.playWithLocalFriend = (opponentChoice == 1);
        this.playWithGlobalFriend= (opponentChoice == 2);
        this.globalNetwork       = globalNetwork;
        this.isBlackPerspective  = isBlackPerspective;

        loadPieceImages();
        setPreferredSize(new Dimension(BOARD_SIZE, BOARD_SIZE));

        // If we’re playing globally, set turn order based on “host”
        if (playWithGlobalFriend && globalNetwork != null) {
            isMyTurn = globalNetwork.isHost();  
            if (!isMyTurn) {
                // If not my turn, wait for opponent’s move
                startListeningForMoves(globalNetwork);
            }
        }

        addMouseListener(new MouseAdapter() {
            @Override
            public void mousePressed(MouseEvent e) {
                // If global friend mode and not my turn, ignore clicks
                if (playWithGlobalFriend && !isMyTurn) {
                    return;
                }
                // Otherwise, handle the local click => either local friend or single-player
                handleMousePress(e);
            }
        });
    }

    /**
     * Handle the mouse press for either local or single-player modes.
     * (Global mode is the same, except we also send moves.)
     */
    private void handleMousePress(MouseEvent e) {
        // Convert screen coords to board coords
        int row = e.getY() / TILE_SIZE;
        int col = e.getX() / TILE_SIZE;

        // If black perspective is on, invert row/col
        if (isBlackPerspective) {
            row = 7 - row;
            col = 7 - col;
        }

        if (selectedSquare == null) {
            // Select a piece
            Piece piece = game.board[row][col];
            if (piece != null && piece.color.equals(game.toMove)) {
                selectedSquare = new int[]{row, col};
                legalMoves = game.getLegalMovesForPiece(row, col);
            } else {
                selectedSquare = null;
                legalMoves = new ArrayList<>();
            }
        } else {
            // Attempt a move
            boolean found = false;
            for (int[] mv : legalMoves) {
                if (mv[0] == row && mv[1] == col) {
                    found = true;
                    break;
                }
            }
            if (found) {
                int fx = selectedSquare[0], fy = selectedSquare[1];
                game.makeMove(fx, fy, row, col);

                // If global friend mode, send move to opponent
                if (playWithGlobalFriend && globalNetwork != null) {
                    globalNetwork.sendMove(fx, fy, row, col);
                    isMyTurn = false;
                    startListeningForMoves(globalNetwork);
                }

                selectedSquare = null;
                legalMoves = new ArrayList<>();
                checkGameOverState();
            } else {
                // Maybe select another piece or deselect
                Piece piece = game.board[row][col];
                if (piece != null && piece.color.equals(game.toMove)) {
                    selectedSquare = new int[]{row, col};
                    legalMoves = game.getLegalMovesForPiece(row, col);
                } else {
                    selectedSquare = null;
                    legalMoves = new ArrayList<>();
                }
            }
        }
        repaint();
    }

    /**
     * Checks if the game is over (checkmate/stalemate).
     * Also, if playing with the computer, could trigger AI move here.
     */
    private void checkGameOverState() {
        String state = game.isGameOver();
        if (state != null) {
            if (state.equals("checkmate")) {
                System.out.println("Checkmate! " 
                    + (game.toMove.equals("black") ? "White" : "Black") + " wins!");
            } else if (state.equals("stalemate")) {
                System.out.println("Stalemate! Draw.");
            }
        } else {
            // If playing with the computer and it's now the computer's turn, we could implement AI logic
            if (playWithComputer && game.toMove.equals("black")) {
                // TODO: Implement your AI logic here if desired
            }
        }
    }

    /**
     * If we’re the client in global mode, we wait for the host to send moves.
     */
    private void startListeningForMoves(GlobalNetwork globalNetwork) {
        new Thread(() -> {
            try {
                int[] move = globalNetwork.receiveMove();
                if (move == null) {
                    throw new IOException("Connection lost or invalid data.");
                }
                SwingUtilities.invokeLater(() -> {
                    game.makeMove(move[0], move[1], move[2], move[3]);
                    checkGameOverState();
                    isMyTurn = true;
                    repaint();
                });
            } catch (IOException | ClassNotFoundException e) {
                JOptionPane.showMessageDialog(null, 
                        "Connection lost: " + e.getMessage(), 
                        "Error", 
                        JOptionPane.ERROR_MESSAGE);
                System.exit(0);
            }
        }).start();
    }

    // -----------------------------------------------------------------
    // 6) Drawing code
    // -----------------------------------------------------------------
    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);

        // Draw board squares
        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                // For drawing, figure out the "visual" row/col if black perspective
                int drawRow = isBlackPerspective ? 7 - i : i;
                int drawCol = isBlackPerspective ? 7 - j : j;
                Color color = ((i + j) % 2 == 0) ? LIGHT_SQ_COLOR : DARK_SQ_COLOR;
                g.setColor(color);
                g.fillRect(drawCol * TILE_SIZE, drawRow * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }

        // Highlight king in check
        if (game.isInCheck(game.toMove)) {
            int[] kingPos = null;
            outer: for (int i = 0; i < 8; i++) {
                for (int j = 0; j < 8; j++) {
                    Piece p = game.board[i][j];
                    if (p != null && p instanceof King && p.color.equals(game.toMove)) {
                        kingPos = new int[]{ i, j };
                        break outer;
                    }
                }
            }
            if (kingPos != null) {
                int drawRow = isBlackPerspective ? 7 - kingPos[0] : kingPos[0];
                int drawCol = isBlackPerspective ? 7 - kingPos[1] : kingPos[1];
                g.setColor(CHECK_COLOR);
                g.fillRect(drawCol * TILE_SIZE, drawRow * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }

        // Highlight legal moves (if any)
        if (selectedSquare != null && !legalMoves.isEmpty()) {
            g.setColor(HIGHLIGHT_COLOR);
            for (int[] mv : legalMoves) {
                int drawRow = isBlackPerspective ? 7 - mv[0] : mv[0];
                int drawCol = isBlackPerspective ? 7 - mv[1] : mv[1];
                g.fillRect(drawCol * TILE_SIZE, drawRow * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }

        // Draw pieces
        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                Piece piece = game.board[i][j];
                if (piece != null) {
                    String key = piece.color + "_" + piece.getClass().getSimpleName().toLowerCase();
                    BufferedImage img = images.get(key);
                    if (img != null) {
                        int drawRow = isBlackPerspective ? 7 - i : i;
                        int drawCol = isBlackPerspective ? 7 - j : j;
                        g.drawImage(img, drawCol * TILE_SIZE + 5, drawRow * TILE_SIZE + 5, null);
                    }
                }
            }
        }

        // Highlight selected piece
        if (selectedSquare != null) {
            int drawRow = isBlackPerspective ? 7 - selectedSquare[0] : selectedSquare[0];
            int drawCol = isBlackPerspective ? 7 - selectedSquare[1] : selectedSquare[1];
            g.setColor(new Color(0, 255, 0, 100));
            g.fillRect(drawCol * TILE_SIZE, drawRow * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }

    // -----------------------------------------------------------------
    // 7) Load piece images from "images/???.png"
    // -----------------------------------------------------------------
    void loadPieceImages() {
        String[] names = {"pawn","rook","knight","bishop","queen","king"};
        String[] colors = {"white","black"};
        for (String c : colors) {
            for (String n : names) {
                String key = c + "_" + n;
                try {
                    BufferedImage img = ImageIO.read(new File("images/" + key + ".png"));
                    Image scaled = img.getScaledInstance(TILE_SIZE - 10, TILE_SIZE - 10, Image.SCALE_SMOOTH);
                    BufferedImage buffered = new BufferedImage(TILE_SIZE - 10, TILE_SIZE - 10, BufferedImage.TYPE_INT_ARGB);
                    Graphics2D g2 = buffered.createGraphics();
                    g2.drawImage(scaled, 0, 0, null);
                    g2.dispose();
                    images.put(key, buffered);
                } catch (IOException ex) {
                    System.err.println("Failed to load image: " + key);
                }
            }
        }
    }

    // -----------------------------------------------------------------
    // 8) Piece definitions (Pawn, Rook, Knight, etc.)
    // -----------------------------------------------------------------
    abstract static class Piece {
        String color;
        boolean hasMoved = false;
        Piece(String color) { this.color = color; }
        abstract java.util.List<int[]> getMoves(Piece[][] board, int x, int y);
        abstract String symbol();
    }

    static class Pawn extends Piece {
        Pawn(String color) { super(color); }
        @Override
        String symbol() { return color.equals("white") ? "P" : "p"; }
        @Override
        java.util.List<int[]> getMoves(Piece[][] board, int x, int y) {
            java.util.List<int[]> moves = new ArrayList<>();
            int direction = color.equals("white") ? -1 : 1;
            int startRank = color.equals("white") ? 6 : 1;
            int forwardX = x + direction;
            if (forwardX >=0 && forwardX < 8) {
                // forward
                if (board[forwardX][y] == null) {
                    moves.add(new int[]{forwardX, y});
                    // double move
                    if (x == startRank && board[x+2*direction][y] == null) {
                        moves.add(new int[]{x+2*direction,y});
                    }
                }
                // captures
                for (int dy : new int[]{-1,1}) {
                    int ny = y + dy;
                    if (ny>=0 && ny<8 && board[forwardX][ny]!=null 
                            && !board[forwardX][ny].color.equals(color)) {
                        moves.add(new int[]{forwardX, ny});
                    }
                }
            }
            return moves;
        }
    }

    static class Rook extends Piece {
        Rook(String color) { super(color); }
        @Override
        String symbol() { return color.equals("white") ? "R":"r"; }
        @Override
        java.util.List<int[]> getMoves(Piece[][] board, int x, int y) {
            java.util.List<int[]> moves = new ArrayList<>();
            int[][] directions = {{1,0},{-1,0},{0,1},{0,-1}};
            for (int[] d : directions) {
                int dx = d[0], dy = d[1];
                int nx = x+dx, ny = y+dy;
                while(nx>=0 && nx<8 && ny>=0 && ny<8) {
                    if (board[nx][ny]==null) {
                        moves.add(new int[]{nx,ny});
                    } else {
                        if(!board[nx][ny].color.equals(color)) {
                            moves.add(new int[]{nx,ny});
                        }
                        break;
                    }
                    nx+=dx; 
                    ny+=dy;
                }
            }
            return moves;
        }
    }

    static class Knight extends Piece {
        Knight(String color) {super(color);}
        @Override
        String symbol() { return color.equals("white")?"N":"n"; }
        @Override
        java.util.List<int[]> getMoves(Piece[][] board, int x, int y) {
            java.util.List<int[]> moves = new ArrayList<>();
            int[][] offsets = {{2,1},{2,-1},{-2,1},{-2,-1},{1,2},{1,-2},{-1,2},{-1,-2}};
            for (int[] off : offsets) {
                int nx=x+off[0], ny=y+off[1];
                if(nx>=0 && nx<8 && ny>=0 && ny<8) {
                    if(board[nx][ny]==null || !board[nx][ny].color.equals(color))
                        moves.add(new int[]{nx,ny});
                }
            }
            return moves;
        }
    }

    static class Bishop extends Piece {
        Bishop(String color){super(color);}
        @Override
        String symbol(){return color.equals("white")?"B":"b";}
        @Override
        java.util.List<int[]> getMoves(Piece[][] board, int x, int y) {
            java.util.List<int[]> moves = new ArrayList<>();
            int[][] directions = {{1,1},{1,-1},{-1,1},{-1,-1}};
            for (int[] d : directions) {
                int dx=d[0], dy=d[1];
                int nx=x+dx, ny=y+dy;
                while(nx>=0 && nx<8 && ny>=0 && ny<8) {
                    if(board[nx][ny]==null) {
                        moves.add(new int[]{nx,ny});
                    } else {
                        if(!board[nx][ny].color.equals(color)) {
                            moves.add(new int[]{nx,ny});
                        }
                        break;
                    }
                    nx+=dx; 
                    ny+=dy;
                }
            }
            return moves;
        }
    }

    static class Queen extends Piece {
        Queen(String color){super(color);}
        @Override
        String symbol(){return color.equals("white")?"Q":"q";}
        @Override
        java.util.List<int[]> getMoves(Piece[][] board, int x, int y) {
            java.util.List<int[]> moves = new ArrayList<>();
            int[][] directions = {
                {1,0},{-1,0},{0,1},{0,-1},
                {1,1},{1,-1},{-1,1},{-1,-1}
            };
            for (int[] d : directions) {
                int dx=d[0], dy=d[1];
                int nx=x+dx, ny=y+dy;
                while(nx>=0 && nx<8 && ny>=0 && ny<8) {
                    if(board[nx][ny]==null) {
                        moves.add(new int[]{nx,ny});
                    } else {
                        if(!board[nx][ny].color.equals(color)) {
                            moves.add(new int[]{nx,ny});
                        }
                        break;
                    }
                    nx+=dx; 
                    ny+=dy;
                }
            }
            return moves;
        }
    }

    static class King extends Piece {
        King(String color){super(color);}
        @Override
        String symbol(){return color.equals("white")?"K":"k";}
        @Override
        java.util.List<int[]> getMoves(Piece[][] board, int x, int y) {
            java.util.List<int[]> moves = new ArrayList<>();
            int[][] offsets = {
                {1,0},{-1,0},{0,1},{0,-1},
                {1,1},{1,-1},{-1,1},{-1,-1}
            };
            for(int[] off: offsets) {
                int nx=x+off[0], ny=y+off[1];
                if(nx>=0 && nx<8 && ny>=0 && ny<8) {
                    if(board[nx][ny]==null || !board[nx][ny].color.equals(color))
                        moves.add(new int[]{nx,ny});
                }
            }
            return moves;
        }
    }

    // -----------------------------------------------------------------
    // 9) ChessGame class, as in original
    // -----------------------------------------------------------------
    static class ChessGame {
        Piece[][] board;
        String toMove = "white";
        int[] enPassantTarget = null; // (x, y)
        int halfmoveClock = 0;
        int fullmoveNumber = 1;

        ChessGame() {
            board = new Piece[8][8];
            // White setup
            board[7] = new Piece[]{
                new Rook("white"), new Knight("white"), new Bishop("white"), new Queen("white"),
                new King("white"), new Bishop("white"), new Knight("white"), new Rook("white")
            };
            for (int i=0; i<8; i++){
                board[6][i] = new Pawn("white");
            }
            // Black setup
            board[0] = new Piece[]{
                new Rook("black"), new Knight("black"), new Bishop("black"), new Queen("black"),
                new King("black"), new Bishop("black"), new Knight("black"), new Rook("black")
            };
            for (int i=0; i<8; i++){
                board[1][i] = new Pawn("black");
            }
            // Empty in-between
            for (int i=2; i<6; i++){
                for (int j=0; j<8; j++){
                    board[i][j] = null;
                }
            }
        }

        boolean isInCheck(String color) {
            int[] kingPos = null;
            for (int i=0; i<8; i++){
                for (int j=0; j<8; j++){
                    Piece p = board[i][j];
                    if(p!=null && p instanceof King && p.color.equals(color)) {
                        kingPos = new int[]{i,j};
                        break;
                    }
                }
                if(kingPos!=null) break;
            }
            if(kingPos==null) return false;
            String enemyColor = color.equals("black") ? "white" : "black";
            return squareAttackedBy(kingPos[0], kingPos[1], enemyColor);
        }

        boolean squareAttackedBy(int x,int y,String color){
            for(int i=0;i<8;i++){
                for(int j=0;j<8;j++){
                    Piece p=board[i][j];
                    if(p!=null && p.color.equals(color)){
                        for(int[] mv:getLegalMovesForPiece(i,j,true)){
                            if(mv[0]==x && mv[1]==y) return true;
                        }
                    }
                }
            }
            return false;
        }

        java.util.List<int[]> getLegalMovesForPiece(int x,int y){
            return getLegalMovesForPiece(x,y,false);
        }

        java.util.List<int[]> getLegalMovesForPiece(int x,int y,boolean skipCheck){
            Piece piece=board[x][y];
            if(piece==null)return Collections.emptyList();
            java.util.List<int[]> moves=piece.getMoves(board,x,y);

            // Handle en passant possibility
            if(piece instanceof Pawn){
                int direction = piece.color.equals("white") ? -1 : 1;
                for (int dd = -1; dd <= 1; dd += 2) {
                    int nx = x + direction;
                    int ny = y + dd;
                    if (enPassantTarget != null && nx == enPassantTarget[0] && ny == enPassantTarget[1]) {
                        moves.add(new int[]{nx, ny});
                    }
                }
            }

            // Castling
            if(piece instanceof King && !piece.hasMoved){
                if(piece.color.equals("white") && x==7 && y==4){
                    // King side
                    if(board[7][7] instanceof Rook && !board[7][7].hasMoved){
                        if(board[7][5]==null && board[7][6]==null){
                            if(!squareAttackedBy(7,4,"black") && 
                               !squareAttackedBy(7,5,"black") && 
                               !squareAttackedBy(7,6,"black")) {
                                moves.add(new int[]{7,6});
                            }
                        }
                    }
                    // Queen side
                    if(board[7][0] instanceof Rook && !board[7][0].hasMoved){
                        if(board[7][1]==null && board[7][2]==null && board[7][3]==null){
                            if(!squareAttackedBy(7,4,"black") && 
                               !squareAttackedBy(7,3,"black") && 
                               !squareAttackedBy(7,2,"black")) {
                                moves.add(new int[]{7,2});
                            }
                        }
                    }
                }
                if(piece.color.equals("black") && x==-7 && y==4){
                    // King side
                    if(board[0][7] instanceof Rook && !board[0][7].hasMoved){
                        if(board[0][5]==null && board[0][6]==null){
                            if(!squareAttackedBy(-7,4,"white") &&
                               !squareAttackedBy(-7,5,"white") &&
                               !squareAttackedBy(-7,6,"white")){
                                moves.add(new int[]{0,6});
                            }
                        }
                    }
                    // Queen side
                    if(board[0][0] instanceof Rook && !board[0][0].hasMoved){
                        if(board[0][1]==null && board[0][2]==null && board[0][3]==null){
                            if(!squareAttackedBy(0,4,"white") &&
                               !squareAttackedBy(0,3,"white") &&
                               !squareAttackedBy(0,2,"white")){
                                moves.add(new int[]{0,2});
                            }
                        }
                    }
                }
            }

            // If we are not skipping check, filter out moves that leave the king in check
            if(!skipCheck){
                java.util.List<int[]> legalMoves = new ArrayList<>();
                Piece originalPiece = piece;
                for(int[] mv:moves){
                    int mx=mv[0], my=mv[1];
                    Piece captured=board[mx][my];
                    board[x][y]=null;
                    board[mx][my]=originalPiece;
                    boolean originalHasMoved=originalPiece.hasMoved;
                    originalPiece.hasMoved=true;
                    int[] oldEnPassant = enPassantTarget;

                    // Simulate castling
                    if(piece instanceof King) {
                        if(my==y+2) {
                            board[x][5]=board[x][7];
                            board[x][7]=null;
                            if(board[x][5]!=null) board[x][5].hasMoved=true;
                        }
                        if(my==y-2) {
                            board[x][3]=board[x][0];
                            board[x][0]=null;
                            if(board[x][3]!=null) board[x][3].hasMoved=true;
                        }
                    }

                    boolean inCheck=isInCheck(originalPiece.color);

                    // revert
                    board[x][y]=originalPiece;
                    board[mx][my]=captured;
                    originalPiece.hasMoved=originalHasMoved;

                    // revert castling if needed
                    if(piece instanceof King) {
                        if(my==y+2) {
                            board[x][7]=board[x][5];
                            board[x][5]=null;
                            if(board[x][7]!=null) board[x][7].hasMoved=false;
                        }
                        if(my==y-2) {
                            board[x][0]=board[x][3];
                            board[x][3]=null;
                            if(board[x][0]!=null) board[x][0].hasMoved=false;
                        }
                    }

                    // revert en passant capture if needed
                    if(piece instanceof Pawn) {
                        if(oldEnPassant!=null && mx==oldEnPassant[0] && my==oldEnPassant[1] && captured==null) {
                            board[x][my] = new Pawn(piece.color.equals("white")?"black":"white");
                        }
                    }
                    enPassantTarget=oldEnPassant;

                    if(!inCheck) {
                        legalMoves.add(mv);
                    }
                }
                return legalMoves;
            } else {
                // skipCheck == true => just return all moves
                return moves;
            }
        }

        void makeMove(int fromX, int fromY, int toX, int toY) {
            Piece piece=board[fromX][fromY];
            Piece target=board[toX][toY];

            // En passant
            if(piece instanceof Pawn) {
                if(enPassantTarget!=null && toX==enPassantTarget[0] && toY==enPassantTarget[1] && target==null) {
                    board[fromX][toY]=null;
                }
            }

            // Castling
            if(piece instanceof King) {
                if(toY==fromY+2) {
                    board[fromX][5]=board[fromX][7];
                    board[fromX][7]=null;
                    if(board[fromX][5]!=null) board[fromX][5].hasMoved=true;
                }
                if(toY==fromY-2) {
                    board[fromX][3]=board[fromX][0];
                    board[fromX][0]=null;
                    if(board[fromX][3]!=null) board[fromX][3].hasMoved=true;
                }
            }

            board[toX][toY]=piece;
            board[fromX][fromY]=null;
            piece.hasMoved=true;

            // Pawn promotion
            if(piece instanceof Pawn) {
                if((piece.color.equals("white") && toX==0)||(piece.color.equals("black") && toX==7)){
                    board[toX][toY]=new Queen(piece.color);
                }
            }

            // Update enPassantTarget
            enPassantTarget=null;
            if(piece instanceof Pawn && Math.abs(toX - fromX)==2){
                enPassantTarget=new int[]{(fromX+toX)/2, toY};
            }

            // halfmoveClock
            if(piece instanceof Pawn || target!=null) {
                halfmoveClock=0;
            } else {
                halfmoveClock++;
            }

            // Switch side
            if(toMove.equals("white")){
                toMove="black";
            } else {
                toMove="white";
                fullmoveNumber++;
            }
        }

        String isGameOver(){
            String color=toMove;
            java.util.List<int[][]> allMoves=getAllLegalMoves(color);
            if(allMoves.size()==0) {
                if(isInCheck(color)) return "checkmate";
                else return "stalemate";
            }
            return null;
        }

        java.util.List<int[][]> getAllLegalMoves(String color){
            java.util.List<int[][]> moves=new ArrayList<>();
            for(int i=0;i<8;i++){
                for(int j=0;j<8;j++){
                    Piece p=board[i][j];
                    if(p!=null && p.color.equals(color)) {
                        for(int[] mv:getLegalMovesForPiece(i,j)) {
                            moves.add(new int[][]{{i,j},{mv[0],mv[1]}});
                        }
                    }
                }
            }
            return moves;
        }
    }
}
