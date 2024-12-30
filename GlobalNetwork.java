import javax.swing.*;
import java.io.*;
import java.net.*;

/**
 * Handles global networking for "Global Friend" mode, allowing users to play chess
 * with opponents over different networks.
 */
public class GlobalNetwork {

    private Socket socket;
    private ObjectOutputStream out;
    private ObjectInputStream in;
    private boolean isHost;

    /**
     * Starts the server for "Global Friend" mode.
     * @param port The port to listen on.
     * @throws IOException If an I/O error occurs.
     */
    public void startServer(int port) throws IOException {
        // Explicitly bind to 0.0.0.0 so we accept connections from any interface
        ServerSocket serverSocket = new ServerSocket(
            port,
            50,
            InetAddress.getByName("0.0.0.0")
        );
        System.out.println("Waiting for opponent to connect on port " + port + "...");
        this.socket = serverSocket.accept();
        System.out.println("Opponent connected.");
        serverSocket.close();
        setUpStreams();
        this.isHost = true;
    }

    /**
     * Connects to a host for "Global Friend" mode.
     * @param host The host's IP address.
     * @param port The port to connect to.
     * @throws IOException If an I/O error occurs.
     */
    public void connectToHost(String host, int port) throws IOException {
        System.out.println("Connecting to host " + host + ":" + port + "...");
        this.socket = new Socket(host, port);
        System.out.println("Connected to host.");
        setUpStreams();
        this.isHost = false;
    }

    /**
     * Sets up input and output streams for communication.
     * @throws IOException If an I/O error occurs.
     */
    private void setUpStreams() throws IOException {
        this.out = new ObjectOutputStream(socket.getOutputStream());
        this.in = new ObjectInputStream(socket.getInputStream());
    }

    /**
     * Sends a chess move to the opponent.
     * @param fromX Starting X coordinate.
     * @param fromY Starting Y coordinate.
     * @param toX Ending X coordinate.
     * @param toY Ending Y coordinate.
     * @throws IOException If an I/O error occurs.
     */
    public void sendMove(int fromX, int fromY, int toX, int toY) throws IOException {
        int[] move = {fromX, fromY, toX, toY};
        out.writeObject(move);
        out.flush();
    }

    /**
     * Receives a chess move from the opponent.
     * @return An array representing the move: {fromX, fromY, toX, toY}.
     * @throws IOException If an I/O error occurs.
     * @throws ClassNotFoundException If the object received is of an unexpected type.
     */
    public int[] receiveMove() throws IOException, ClassNotFoundException {
        return (int[]) in.readObject();
    }

    /**
     * Closes the connection and cleans up resources.
     * @throws IOException If an I/O error occurs.
     */
    public void close() throws IOException {
        if (socket != null) socket.close();
        if (out != null) out.close();
        if (in != null) in.close();
    }

    /**
     * Checks if the current instance is the host.
     * @return True if this instance started the server, false otherwise.
     */
    public boolean isHost() {
        return isHost;
    }
    
    /**
     * Demo main (optional):
     */
    public static void main(String[] args) {
        GlobalNetwork globalNetwork = new GlobalNetwork();
        int choice = OpponentChooser.chooseOpponent();
        try {
            if (choice == 2) { // Global Friend
                String[] options = {"Host", "Connect"};
                int mode = JOptionPane.showOptionDialog(null, "Do you want to host or connect?", 
                    "Global Friend Mode", JOptionPane.DEFAULT_OPTION, 
                    JOptionPane.INFORMATION_MESSAGE, null, options, options[0]);
                if (mode == 0) {
                    String port = JOptionPane.showInputDialog("Enter port to host:");
                    globalNetwork.startServer(Integer.parseInt(port));
                } else {
                    String host = JOptionPane.showInputDialog("Enter host IP address:");
                    String port = JOptionPane.showInputDialog("Enter port to connect:");
                    globalNetwork.connectToHost(host, Integer.parseInt(port));
                }
            }
        } catch (IOException e) {
            JOptionPane.showMessageDialog(null, "An error occurred: " + e.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
        }
    }
}
