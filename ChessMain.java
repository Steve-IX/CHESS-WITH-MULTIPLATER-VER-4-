import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.awt.image.BufferedImage;
import java.util.*;
import java.io.*;
import javax.imageio.ImageIO;
import java.net.*;
import java.awt.geom.*;

/**
 * Modern Chess application with beautiful UI, smooth animations, and professional design
 */
public class ChessMain extends JPanel {

    // -----------------------------------------------------------------
    // 1) Enhanced Constants and Design Elements
    // -----------------------------------------------------------------
    static final int TILE_SIZE = 90;
    static final int BOARD_SIZE = TILE_SIZE * 8;
    static final int SIDEBAR_WIDTH = 280;
    static final int WINDOW_HEIGHT = BOARD_SIZE + 40;
    static final int ANIMATION_DURATION = 400; // milliseconds
    
    // Modern Color Palette
    static final Color LIGHT_SQ_COLOR = new Color(240, 217, 181);
    static final Color DARK_SQ_COLOR = new Color(181, 136, 99);
    static final Color HIGHLIGHT_COLOR = new Color(255, 255, 102, 180);
    static final Color LEGAL_MOVE_COLOR = new Color(50, 205, 50, 120);
    static final Color CHECK_COLOR = new Color(220, 20, 60, 150);
    static final Color SELECTED_COLOR = new Color(70, 130, 180, 150);
    static final Color HOVER_COLOR = new Color(135, 206, 235, 80);
    
    // UI Colors
    static final Color SIDEBAR_BG = new Color(45, 52, 62);
    static final Color CARD_BG = new Color(60, 70, 85);
    static final Color TEXT_PRIMARY = new Color(220, 220, 220);
    static final Color TEXT_SECONDARY = new Color(160, 170, 180);
    static final Color ACCENT_COLOR = new Color(76, 175, 80);
    static final Color BORDER_COLOR = new Color(70, 80, 95);

    // Animation and interaction
    private Point hoverSquare = null;
    private javax.swing.Timer animationTimer;
    private PieceAnimation currentAnimation = null;
    private long lastMoveTime = 0;

    // -----------------------------------------------------------------
    // 2) Animation System
    // -----------------------------------------------------------------
    private static class PieceAnimation {
        Point fromSquare, toSquare;
        Point startPixel, endPixel, currentPixel;
        Piece piece;
        long startTime;
        boolean isComplete = false;
        
        PieceAnimation(Point from, Point to, Piece piece, boolean isBlackPerspective) {
            this.fromSquare = from;
            this.toSquare = to;
            this.piece = piece;
            this.startTime = System.currentTimeMillis();
            
            // Calculate screen positions
            this.startPixel = squareToPixel(from, isBlackPerspective);
            this.endPixel = squareToPixel(to, isBlackPerspective);
            this.currentPixel = new Point(startPixel);
        }
        
        void update() {
            long elapsed = System.currentTimeMillis() - startTime;
            float progress = Math.min(1.0f, elapsed / (float) ANIMATION_DURATION);
            
            // Smooth easing function
            progress = easeInOutCubic(progress);
            
            currentPixel.x = (int) (startPixel.x + (endPixel.x - startPixel.x) * progress);
            currentPixel.y = (int) (startPixel.y + (endPixel.y - startPixel.y) * progress);
            
            if (progress >= 1.0f) {
                isComplete = true;
            }
        }
        
        private float easeInOutCubic(float t) {
            return t < 0.5f ? 4 * t * t * t : 1 - (float) Math.pow(-2 * t + 2, 3) / 2;
        }
    }
    
    private static Point squareToPixel(Point square, boolean isBlackPerspective) {
        int drawRow = isBlackPerspective ? 7 - square.x : square.x;
        int drawCol = isBlackPerspective ? 7 - square.y : square.y;
        return new Point(drawCol * TILE_SIZE + 5, drawRow * TILE_SIZE + 5);
    }

    // -----------------------------------------------------------------
    // 3) Enhanced UI Components
    // -----------------------------------------------------------------
    private JPanel sidePanel;
    private JLabel statusLabel;
    private JLabel turnLabel;
    private JLabel modeLabel;
    private JTextArea moveHistoryArea;
    private JLabel timerLabel;
    private java.util.List<String> moveHistory = new ArrayList<>();

    // -----------------------------------------------------------------
    // 4) Opponent chooser (unchanged)
    // -----------------------------------------------------------------
    static class OpponentChooser {
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
            if (choice < 0) {
                choice = 0;
            }
            return choice;
        }
    }

    // -----------------------------------------------------------------
    // 5) GlobalNetwork class (unchanged)
    // -----------------------------------------------------------------
    static class GlobalNetwork {
        private boolean isHost;
        private Socket socket;
        private ServerSocket serverSocket;
        private DataInputStream in;
        private DataOutputStream out;

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
            in = new DataInputStream(socket.getInputStream());
            out = new DataOutputStream(socket.getOutputStream());
        }

        public int[] receiveMove() throws IOException {
            int fromX = in.readInt();
            int fromY = in.readInt();
            int toX = in.readInt();
            int toY = in.readInt();
            return new int[]{fromX, fromY, toX, toY};
        }

        public void sendMove(int fromX, int fromY, int toX, int toY) throws IOException {
            if (out != null) {
                out.writeInt(fromX);
                out.writeInt(fromY);
                out.writeInt(toX);
                out.writeInt(toY);
                out.flush();
            }
        }
    }

    // -----------------------------------------------------------------
    // 6) Main entry point (enhanced)
    // -----------------------------------------------------------------
    public static void main(String[] args) {
        final int opponentChoice = OpponentChooser.chooseOpponent();
        final int difficultyChoice;
        final GlobalNetwork globalNetwork;

        if (opponentChoice == 0) {
            String[] diffs = {"Easy", "Medium", "Hard"};
            int diff = JOptionPane.showOptionDialog(
                    null,
                    "Select AI Difficulty:",
                    "Computer Difficulty",
                    JOptionPane.DEFAULT_OPTION,
                    JOptionPane.PLAIN_MESSAGE,
                    null,
                    diffs,
                    diffs[0]
            );
            difficultyChoice = diff < 0 ? 0 : diff;
        } else {
            difficultyChoice = 0;
        }

        if (opponentChoice == 2) {
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
                if (mode == 0) {
                    String portStr = JOptionPane.showInputDialog("Enter port to host (e.g. 5000):");
                    int port = (portStr == null || portStr.isEmpty()) ? 5000 : Integer.parseInt(portStr);
                    globalNetwork.startServer(port);
                } else {
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
            globalNetwork = null;
        }

        SwingUtilities.invokeLater(() -> createAndShowGUI(opponentChoice, difficultyChoice, globalNetwork));
    }
    
    private static void createAndShowGUI(int opponentChoice, int difficultyChoice, GlobalNetwork globalNetwork) {
        JFrame frame = new JFrame("Chess - Multiplayer Edition");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setResizable(false);
        
        boolean isBlackPerspective = (globalNetwork != null && !globalNetwork.isHost());
        ChessMain chessPanel = new ChessMain(opponentChoice, difficultyChoice, globalNetwork, isBlackPerspective);
        
        // Create main layout
        JPanel mainPanel = new JPanel(new BorderLayout());
        mainPanel.setBackground(SIDEBAR_BG);
        
        // Add chess board
        chessPanel.setPreferredSize(new Dimension(BOARD_SIZE, BOARD_SIZE));
        mainPanel.add(chessPanel, BorderLayout.CENTER);
        
        // Add sidebar
        mainPanel.add(chessPanel.createSidePanel(), BorderLayout.EAST);
        
        frame.add(mainPanel);
        frame.pack();
        frame.setLocationRelativeTo(null);
        frame.setVisible(true);
        
        // Start animation timer
        chessPanel.startAnimationTimer();
    }

    // -----------------------------------------------------------------
    // 7) Enhanced Fields
    // -----------------------------------------------------------------
    boolean playWithComputer;   
    boolean playWithLocalFriend;
    boolean playWithGlobalFriend;
    int aiDifficulty = 0;
    GlobalNetwork globalNetwork; 
    boolean isMyTurn = true; 
    boolean isBlackPerspective;  

    Map<String, BufferedImage> images = new HashMap<>();
    ChessGame game = new ChessGame();
    int[] selectedSquare = null;
    java.util.List<int[]> legalMoves = new ArrayList<>();

    // -----------------------------------------------------------------
    // 8) Enhanced Constructor
    // -----------------------------------------------------------------
    public ChessMain(int opponentChoice, int difficulty, GlobalNetwork globalNetwork, boolean isBlackPerspective) {
        this.playWithComputer    = (opponentChoice == 0);
        this.playWithLocalFriend = (opponentChoice == 1);
        this.playWithGlobalFriend= (opponentChoice == 2);
        this.globalNetwork       = globalNetwork;
        this.isBlackPerspective  = isBlackPerspective;
        this.aiDifficulty        = difficulty;

        setupUI();
        loadPieceImages();

        if (playWithGlobalFriend && globalNetwork != null) {
            isMyTurn = globalNetwork.isHost();  
            if (!isMyTurn) {
                startListeningForMoves(globalNetwork);
            }
        }

        addMouseListener(new EnhancedMouseHandler());
        addMouseMotionListener(new MouseMotionHandler());
        
        updateSidePanel();
    }
    
    private void setupUI() {
        setBackground(Color.WHITE);
        setDoubleBuffered(true);
        setFocusable(true);
    }
    
    private void startAnimationTimer() {
        animationTimer = new javax.swing.Timer(16, e -> {
            if (currentAnimation != null) {
                currentAnimation.update();
                if (currentAnimation.isComplete) {
                    currentAnimation = null;
                }
                repaint();
            }
        });
        animationTimer.start();
    }

    // -----------------------------------------------------------------
    // 9) Enhanced Side Panel
    // -----------------------------------------------------------------
    private JPanel createSidePanel() {
        sidePanel = new JPanel();
        sidePanel.setLayout(new BoxLayout(sidePanel, BoxLayout.Y_AXIS));
        sidePanel.setBackground(SIDEBAR_BG);
        sidePanel.setPreferredSize(new Dimension(SIDEBAR_WIDTH, BOARD_SIZE));
        sidePanel.setBorder(BorderFactory.createEmptyBorder(20, 20, 20, 20));

        // Game title
        JLabel titleLabel = createStyledLabel("CHESS MASTER", 24, TEXT_PRIMARY, true);
        titleLabel.setAlignmentX(Component.CENTER_ALIGNMENT);
        sidePanel.add(titleLabel);
        sidePanel.add(Box.createVerticalStrut(20));

        // Game mode card
        JPanel modeCard = createCard();
        modeLabel = createStyledLabel("Local Friend", 14, TEXT_PRIMARY, false);
        JLabel modeSubLabel = createStyledLabel("Game Mode", 12, TEXT_SECONDARY, false);
        modeCard.add(modeSubLabel);
        modeCard.add(modeLabel);
        sidePanel.add(modeCard);
        sidePanel.add(Box.createVerticalStrut(15));

        // Turn indicator card
        JPanel turnCard = createCard();
        turnLabel = createStyledLabel("White's Turn", 16, ACCENT_COLOR, true);
        JLabel turnSubLabel = createStyledLabel("Current Player", 12, TEXT_SECONDARY, false);
        turnCard.add(turnSubLabel);
        turnCard.add(turnLabel);
        sidePanel.add(turnCard);
        sidePanel.add(Box.createVerticalStrut(15));

        // Game status card
        JPanel statusCard = createCard();
        statusLabel = createStyledLabel("Game in Progress", 14, TEXT_PRIMARY, false);
        JLabel statusSubLabel = createStyledLabel("Status", 12, TEXT_SECONDARY, false);
        statusCard.add(statusSubLabel);
        statusCard.add(statusLabel);
        sidePanel.add(statusCard);
        sidePanel.add(Box.createVerticalStrut(20));

        // Move history
        JLabel historyLabel = createStyledLabel("Move History", 16, TEXT_PRIMARY, true);
        historyLabel.setAlignmentX(Component.LEFT_ALIGNMENT);
        sidePanel.add(historyLabel);
        sidePanel.add(Box.createVerticalStrut(10));
        
        moveHistoryArea = new JTextArea(12, 0);
        moveHistoryArea.setBackground(CARD_BG);
        moveHistoryArea.setForeground(TEXT_PRIMARY);
        moveHistoryArea.setFont(new Font("Consolas", Font.PLAIN, 12));
        moveHistoryArea.setEditable(false);
        moveHistoryArea.setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
        
        JScrollPane historyScroll = new JScrollPane(moveHistoryArea);
        historyScroll.setBackground(CARD_BG);
        historyScroll.setBorder(BorderFactory.createLineBorder(BORDER_COLOR));
        historyScroll.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_AS_NEEDED);
        sidePanel.add(historyScroll);

        return sidePanel;
    }
    
    private JPanel createCard() {
        JPanel card = new JPanel();
        card.setLayout(new BoxLayout(card, BoxLayout.Y_AXIS));
        card.setBackground(CARD_BG);
        card.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(BORDER_COLOR),
            BorderFactory.createEmptyBorder(12, 15, 12, 15)
        ));
        card.setMaximumSize(new Dimension(Integer.MAX_VALUE, card.getPreferredSize().height));
        return card;
    }
    
    private JLabel createStyledLabel(String text, int fontSize, Color color, boolean bold) {
        JLabel label = new JLabel(text);
        label.setForeground(color);
        label.setFont(new Font("Segoe UI", bold ? Font.BOLD : Font.PLAIN, fontSize));
        label.setAlignmentX(Component.LEFT_ALIGNMENT);
        return label;
    }
    
    private void updateSidePanel() {
        if (turnLabel != null) {
            String currentPlayer = game.toMove.equals("white") ? "White" : "Black";
            turnLabel.setText(currentPlayer + "'s Turn");
            turnLabel.setForeground(game.toMove.equals("white") ? Color.WHITE : Color.GRAY);
        }
        
        if (modeLabel != null) {
            String mode = playWithComputer ? "vs Computer" : 
                         playWithLocalFriend ? "Local Friend" : "Global Friend";
            modeLabel.setText(mode);
        }
        
        if (statusLabel != null) {
            String status = game.isGameOver();
            if (status != null) {
                if (status.equals("checkmate")) {
                    statusLabel.setText("Checkmate!");
                    statusLabel.setForeground(new Color(220, 20, 60));
                } else {
                    statusLabel.setText("Stalemate");
                    statusLabel.setForeground(Color.ORANGE);
                }
            } else if (game.isInCheck(game.toMove)) {
                statusLabel.setText("Check!");
                statusLabel.setForeground(new Color(255, 165, 0));
            } else {
                statusLabel.setText("Game in Progress");
                statusLabel.setForeground(TEXT_PRIMARY);
            }
        }
    }

    // -----------------------------------------------------------------
    // 10) Enhanced Mouse Handling
    // -----------------------------------------------------------------
    private class EnhancedMouseHandler extends MouseAdapter {
        @Override
        public void mousePressed(MouseEvent e) {
            if (playWithGlobalFriend && !isMyTurn) {
                return;
            }
            
            Point square = pixelToSquare(e.getX(), e.getY());
            if (square != null) {
                handleSquareClick(square);
            }
        }
        
        @Override
        public void mouseExited(MouseEvent e) {
            hoverSquare = null;
            repaint();
        }
    }
    
    private class MouseMotionHandler extends MouseMotionAdapter {
        @Override
        public void mouseMoved(MouseEvent e) {
            Point newHover = pixelToSquare(e.getX(), e.getY());
            if (!Objects.equals(hoverSquare, newHover)) {
                hoverSquare = newHover;
                repaint();
            }
        }
    }
    
    private Point pixelToSquare(int x, int y) {
        int col = x / TILE_SIZE;
        int row = y / TILE_SIZE;
        if (col >= 0 && col < 8 && row >= 0 && row < 8) {
            if (isBlackPerspective) {
                row = 7 - row;
                col = 7 - col;
            }
            return new Point(row, col);
        }
        return null;
    }
    
    private void handleSquareClick(Point square) {
        int row = square.x;
        int col = square.y;
        
        if (selectedSquare == null) {
            Piece piece = game.board[row][col];
            if (piece != null && piece.color.equals(game.toMove)) {
                selectedSquare = new int[]{row, col};
                legalMoves = game.getLegalMovesForPiece(row, col);
                repaint();
            }
        } else {
            boolean foundMove = false;
            for (int[] mv : legalMoves) {
                if (mv[0] == row && mv[1] == col) {
                    foundMove = true;
                    break;
                }
            }
            
            if (foundMove) {
                executeMove(selectedSquare[0], selectedSquare[1], row, col);
            } else {
                // Try to select a different piece
                Piece piece = game.board[row][col];
                if (piece != null && piece.color.equals(game.toMove)) {
                    selectedSquare = new int[]{row, col};
                    legalMoves = game.getLegalMovesForPiece(row, col);
                } else {
                    selectedSquare = null;
                    legalMoves = new ArrayList<>();
                }
            }
            repaint();
        }
    }
    
    private void executeMove(int fromX, int fromY, int toX, int toY) {
        // Record move for history
        String moveNotation = generateMoveNotation(fromX, fromY, toX, toY);
        
        // Start animation
        Piece movingPiece = game.board[fromX][fromY];
        if (movingPiece != null) {
            currentAnimation = new PieceAnimation(
                new Point(fromX, fromY), 
                new Point(toX, toY), 
                movingPiece, 
                isBlackPerspective
            );
        }
        
        // Execute the move
        game.makeMove(fromX, fromY, toX, toY);
        
        // Add to move history
        moveHistory.add(moveNotation);
        updateMoveHistory();
        
        // Handle networking
        if (playWithGlobalFriend && globalNetwork != null) {
            try {
                globalNetwork.sendMove(fromX, fromY, toX, toY);
                isMyTurn = false;
                startListeningForMoves(globalNetwork);
            } catch (IOException ex) {
                JOptionPane.showMessageDialog(null,
                        "Failed to send move: " + ex.getMessage(),
                        "Network Error",
                        JOptionPane.ERROR_MESSAGE);
            }
        }

        selectedSquare = null;
        legalMoves = new ArrayList<>();
        lastMoveTime = System.currentTimeMillis();
        checkGameOverState();
        updateSidePanel();
    }
    
    private String generateMoveNotation(int fromX, int fromY, int toX, int toY) {
        Piece piece = game.board[fromX][fromY];
        if (piece == null) return "";
        
        String from = "" + (char)('a' + fromY) + (8 - fromX);
        String to = "" + (char)('a' + toY) + (8 - toX);
        
        return piece.symbol().toUpperCase() + from + "-" + to;
    }
    
    private void updateMoveHistory() {
        if (moveHistoryArea != null) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < moveHistory.size(); i++) {
                if (i % 2 == 0) {
                    sb.append(String.format("%d. ", (i / 2) + 1));
                }
                sb.append(moveHistory.get(i));
                if (i % 2 == 0) {
                    sb.append(" ");
                } else {
                    sb.append("\n");
                }
            }
            moveHistoryArea.setText(sb.toString());
            moveHistoryArea.setCaretPosition(moveHistoryArea.getDocument().getLength());
        }
    }

    // -----------------------------------------------------------------
    // 11) Enhanced Painting with Modern Graphics
    // -----------------------------------------------------------------
    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);
        Graphics2D g2d = (Graphics2D) g.create();
        
        // Enable anti-aliasing for smooth graphics
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g2d.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);

        drawBoard(g2d);
        drawCoordinates(g2d);
        drawPieces(g2d);
        drawHighlights(g2d);
        drawBoardBorder(g2d);
        
        g2d.dispose();
    }
    
    private void drawBoard(Graphics2D g2d) {
        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                int drawRow = isBlackPerspective ? 7 - i : i;
                int drawCol = isBlackPerspective ? 7 - j : j;
                
                // Base square color
                Color baseColor = ((i + j) % 2 == 0) ? LIGHT_SQ_COLOR : DARK_SQ_COLOR;
                
                // Create gradient for depth
                GradientPaint gradient = new GradientPaint(
                    drawCol * TILE_SIZE, drawRow * TILE_SIZE, baseColor.brighter(),
                    drawCol * TILE_SIZE + TILE_SIZE, drawRow * TILE_SIZE + TILE_SIZE, baseColor.darker()
                );
                g2d.setPaint(gradient);
                g2d.fillRect(drawCol * TILE_SIZE, drawRow * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                
                // Add subtle inner shadow for depth
                g2d.setColor(new Color(0, 0, 0, 20));
                g2d.drawRect(drawCol * TILE_SIZE, drawRow * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1);
            }
        }
    }
    
    private void drawCoordinates(Graphics2D g2d) {
        g2d.setColor(new Color(100, 100, 100, 150));
        g2d.setFont(new Font("Arial", Font.BOLD, 12));
        FontMetrics fm = g2d.getFontMetrics();
        
        for (int i = 0; i < 8; i++) {
            // Files (a-h)
            char file = isBlackPerspective ? (char)('h' - i) : (char)('a' + i);
            String fileStr = String.valueOf(file);
            int x = i * TILE_SIZE + TILE_SIZE/2 - fm.stringWidth(fileStr)/2;
            g2d.drawString(fileStr, x, BOARD_SIZE - 5);
            
            // Ranks (1-8)
            int rank = isBlackPerspective ? i + 1 : 8 - i;
            String rankStr = String.valueOf(rank);
            g2d.drawString(rankStr, 5, i * TILE_SIZE + TILE_SIZE/2 + fm.getAscent()/2);
        }
    }
    
    private void drawHighlights(Graphics2D g2d) {
        // Hover effect
        if (hoverSquare != null) {
            int drawRow = isBlackPerspective ? 7 - hoverSquare.x : hoverSquare.x;
            int drawCol = isBlackPerspective ? 7 - hoverSquare.y : hoverSquare.y;
            g2d.setColor(HOVER_COLOR);
            g2d.fillRect(drawCol * TILE_SIZE, drawRow * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
        
        // Selected square
        if (selectedSquare != null) {
            int drawRow = isBlackPerspective ? 7 - selectedSquare[0] : selectedSquare[0];
            int drawCol = isBlackPerspective ? 7 - selectedSquare[1] : selectedSquare[1];
            
            g2d.setColor(SELECTED_COLOR);
            g2d.fillRect(drawCol * TILE_SIZE, drawRow * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            
            // Animated border for selected square
            g2d.setStroke(new BasicStroke(3.0f));
            g2d.setColor(new Color(70, 130, 180, 200));
            g2d.drawRect(drawCol * TILE_SIZE + 1, drawRow * TILE_SIZE + 1, TILE_SIZE - 3, TILE_SIZE - 3);
        }
        
        // Legal moves with smooth circles
        if (!legalMoves.isEmpty()) {
            for (int[] mv : legalMoves) {
                int drawRow = isBlackPerspective ? 7 - mv[0] : mv[0];
                int drawCol = isBlackPerspective ? 7 - mv[1] : mv[1];
                
                int centerX = drawCol * TILE_SIZE + TILE_SIZE/2;
                int centerY = drawRow * TILE_SIZE + TILE_SIZE/2;
                
                // Larger circle for captures
                boolean isCapture = game.board[mv[0]][mv[1]] != null;
                int radius = isCapture ? 25 : 15;
                
                g2d.setColor(LEGAL_MOVE_COLOR);
                g2d.fillOval(centerX - radius, centerY - radius, radius * 2, radius * 2);
                
                // Subtle glow effect
                g2d.setColor(new Color(50, 205, 50, 60));
                g2d.fillOval(centerX - radius - 3, centerY - radius - 3, (radius + 3) * 2, (radius + 3) * 2);
            }
        }
        
        // King in check highlight
        if (game.isInCheck(game.toMove)) {
            Point kingPos = findKing(game.toMove);
            if (kingPos != null) {
                int drawRow = isBlackPerspective ? 7 - kingPos.x : kingPos.x;
                int drawCol = isBlackPerspective ? 7 - kingPos.y : kingPos.y;
                
                // Pulsing red effect
                long time = System.currentTimeMillis();
                float alpha = 0.5f + 0.3f * (float) Math.sin(time * 0.01);
                g2d.setColor(new Color(220, 20, 60, (int)(alpha * 255)));
                g2d.fillRect(drawCol * TILE_SIZE, drawRow * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
    
    private Point findKing(String color) {
        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                Piece p = game.board[i][j];
                if (p != null && p instanceof King && p.color.equals(color)) {
                    return new Point(i, j);
                }
            }
        }
        return null;
    }
    
    private void drawPieces(Graphics2D g2d) {
        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                Piece piece = game.board[i][j];
                if (piece != null) {
                    // Skip piece being animated
                    if (currentAnimation != null && 
                        currentAnimation.fromSquare.x == i && currentAnimation.fromSquare.y == j) {
                        continue;
                    }
                    
                    String key = piece.color + "_" + piece.getClass().getSimpleName().toLowerCase();
                    BufferedImage img = images.get(key);
                    if (img != null) {
                        int drawRow = isBlackPerspective ? 7 - i : i;
                        int drawCol = isBlackPerspective ? 7 - j : j;
                        
                        // Add subtle shadow
                        g2d.setColor(new Color(0, 0, 0, 30));
                        g2d.fillOval(drawCol * TILE_SIZE + 12, drawRow * TILE_SIZE + 12, 
                                   TILE_SIZE - 20, TILE_SIZE - 20);
                        
                        // Draw piece with smooth scaling
                        g2d.drawImage(img, drawCol * TILE_SIZE + 5, drawRow * TILE_SIZE + 5, 
                                    TILE_SIZE - 10, TILE_SIZE - 10, null);
                    }
                }
            }
        }
        
        // Draw animated piece
        if (currentAnimation != null) {
            String key = currentAnimation.piece.color + "_" + 
                        currentAnimation.piece.getClass().getSimpleName().toLowerCase();
            BufferedImage img = images.get(key);
            if (img != null) {
                // Add glow effect during animation
                g2d.setColor(new Color(255, 255, 255, 100));
                g2d.fillOval(currentAnimation.currentPixel.x - 5, currentAnimation.currentPixel.y - 5,
                           TILE_SIZE, TILE_SIZE);
                
                g2d.drawImage(img, currentAnimation.currentPixel.x, currentAnimation.currentPixel.y, 
                            TILE_SIZE - 10, TILE_SIZE - 10, null);
            }
        }
    }
    
    private void drawBoardBorder(Graphics2D g2d) {
        g2d.setStroke(new BasicStroke(2.0f));
        g2d.setColor(new Color(100, 100, 100));
        g2d.drawRect(0, 0, BOARD_SIZE - 1, BOARD_SIZE - 1);
        
        // Outer glow
        g2d.setColor(new Color(200, 200, 200, 50));
        g2d.drawRect(-1, -1, BOARD_SIZE + 1, BOARD_SIZE + 1);
    }

    // -----------------------------------------------------------------
    // 12) Rest of the methods (game logic, AI, networking) - keeping existing logic
    // -----------------------------------------------------------------
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
            // If playing with the computer and it's the computer's turn, trigger AI move
            if (playWithComputer && game.toMove.equals("black")) {
                performComputerMove();
            }
        }
    }

    private void performComputerMove() {
        int[][] move;
        if (aiDifficulty == 0) {
            move = pickRandomMove();
        } else if (aiDifficulty == 1) {
            move = computeBestMove(1);
        } else {
            move = computeBestMove(3);
        }
        if (move != null) {
            game.makeMove(move[0][0], move[0][1], move[1][0], move[1][1]);
            selectedSquare = null;
            legalMoves.clear();
            checkGameOverState();
            repaint();
        }
    }

    private int[][] pickRandomMove() {
        java.util.List<int[][]> moves = game.getAllLegalMoves("black");
        if (moves.isEmpty()) return null;
        return moves.get(new java.util.Random().nextInt(moves.size()));
    }

    private int[][] computeBestMove(int depth) {
        java.util.List<int[][]> moves = game.getAllLegalMoves("black");
        int bestScore = Integer.MIN_VALUE;
        int[][] best = null;
        for (int[][] mv : moves) {
            ChessGame copy = game.deepCopy();
            copy.makeMove(mv[0][0], mv[0][1], mv[1][0], mv[1][1]);
            int score = minimax(copy, depth - 1, Integer.MIN_VALUE, Integer.MAX_VALUE);
            if (score > bestScore) {
                bestScore = score;
                best = mv;
            }
        }
        return best;
    }

    private int minimax(ChessGame g, int depth, int alpha, int beta) {
        String state = g.isGameOver();
        if (depth == 0 || state != null) {
            if ("checkmate".equals(state)) {
                return g.toMove.equals("black") ? Integer.MIN_VALUE + depth : Integer.MAX_VALUE - depth;
            }
            return evaluateBoard(g);
        }

        boolean maximizing = g.toMove.equals("black");
        java.util.List<int[][]> moves = g.getAllLegalMoves(g.toMove);
        if (maximizing) {
            int max = Integer.MIN_VALUE;
            for (int[][] mv : moves) {
                ChessGame copy = g.deepCopy();
                copy.makeMove(mv[0][0], mv[0][1], mv[1][0], mv[1][1]);
                int score = minimax(copy, depth - 1, alpha, beta);
                max = Math.max(max, score);
                alpha = Math.max(alpha, score);
                if (beta <= alpha) break;
            }
            return max;
        } else {
            int min = Integer.MAX_VALUE;
            for (int[][] mv : moves) {
                ChessGame copy = g.deepCopy();
                copy.makeMove(mv[0][0], mv[0][1], mv[1][0], mv[1][1]);
                int score = minimax(copy, depth - 1, alpha, beta);
                min = Math.min(min, score);
                beta = Math.min(beta, score);
                if (beta <= alpha) break;
            }
            return min;
        }
    }

    private int evaluateBoard(ChessGame g) {
        int score = 0;
        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                Piece p = g.board[i][j];
                if (p != null) {
                    int val = pieceValue(p);
                    score += p.color.equals("white") ? -val : val;
                }
            }
        }
        return score;
    }

    private int pieceValue(Piece p) {
        if (p instanceof Pawn) return 100;
        if (p instanceof Knight || p instanceof Bishop) return 300;
        if (p instanceof Rook) return 500;
        if (p instanceof Queen) return 900;
        return 0;
    }

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
            } catch (IOException e) {
                JOptionPane.showMessageDialog(null, 
                        "Connection lost: " + e.getMessage(), 
                        "Error", 
                        JOptionPane.ERROR_MESSAGE
                );
                System.exit(0);
            }
        }).start();
    }

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

        ChessGame deepCopy() {
            ChessGame cp = new ChessGame();
            cp.board = new Piece[8][8];
            for (int i = 0; i < 8; i++) {
                for (int j = 0; j < 8; j++) {
                    Piece p = this.board[i][j];
                    if (p != null) {
                        Piece np;
                        if (p instanceof Pawn) np = new Pawn(p.color);
                        else if (p instanceof Rook) np = new Rook(p.color);
                        else if (p instanceof Knight) np = new Knight(p.color);
                        else if (p instanceof Bishop) np = new Bishop(p.color);
                        else if (p instanceof Queen) np = new Queen(p.color);
                        else np = new King(p.color);
                        np.hasMoved = p.hasMoved;
                        cp.board[i][j] = np;
                    } else {
                        cp.board[i][j] = null;
                    }
                }
            }
            cp.toMove = this.toMove;
            if (this.enPassantTarget != null) {
                cp.enPassantTarget = new int[]{this.enPassantTarget[0], this.enPassantTarget[1]};
            }
            cp.halfmoveClock = this.halfmoveClock;
            cp.fullmoveNumber = this.fullmoveNumber;
            return cp;
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

            // Castling (only when not skipping check validation)
            if(!skipCheck && piece instanceof King && !piece.hasMoved){
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
                if(piece.color.equals("black") && x==0 && y==4){
                    // King side
                    if(board[0][7] instanceof Rook && !board[0][7].hasMoved){
                        if(board[0][5]==null && board[0][6]==null){
                            if(!squareAttackedBy(0,4,"white") &&
                               !squareAttackedBy(0,5,"white") &&
                               !squareAttackedBy(0,6,"white")){
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
