import javax.swing.*;
import java.io.*;
import java.net.*;

public class NetworkManager {
    private Socket socket;
    private BufferedReader in;
    private PrintWriter out;
    private boolean isServer;

    /**
     * Starts a server waiting for a single client to connect.
     * Listens on 0.0.0.0:5000 so that external connections can reach it.
     */
    public boolean startServer() {
        isServer = true;
        try {
            // Bind to 0.0.0.0 so we accept incoming connections from ANY network interface
            ServerSocket serverSocket = new ServerSocket(
                5000,                       // port
                50,                         // backlog (can be any integer buffer size)
                InetAddress.getByName("0.0.0.0")  // listen on ALL interfaces
            );
            JOptionPane.showMessageDialog(null, 
                "Hosting a game... Waiting for a friend to connect on port 5000."
            );

            // Accept exactly one client connection
            socket = serverSocket.accept();
            
            // Close the server socket once a connection is made (single-client model)
            serverSocket.close();

            setUpStreams();
            JOptionPane.showMessageDialog(null, "Friend connected!");
            return true;
        } catch (IOException e) {
            JOptionPane.showMessageDialog(null, "Error starting server: " + e.getMessage());
            return false;
        }
    }

    /**
     * Connects to a remote host on port 5000.
     * @param host The IP or hostname to connect to
     * @return true if successfully connected, false otherwise
     */
    public boolean connectToHost(String host) {
        isServer = false;
        try {
            JOptionPane.showMessageDialog(null, 
                "Connecting to " + host + " on port 5000..."
            );
            socket = new Socket(host, 5000);
            setUpStreams();
            JOptionPane.showMessageDialog(null, "Connected to friend!");
            return true;
        } catch (IOException e) {
            JOptionPane.showMessageDialog(null, "Error connecting to host: " + e.getMessage());
            return false;
        }
    }

    private void setUpStreams() throws IOException {
        in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
        out = new PrintWriter(socket.getOutputStream(), true);
    }

    /**
     * Sends a move to the other player.
     * Format: "fromX,fromY,toX,toY"
     */
    public void sendMove(int fromX, int fromY, int toX, int toY) {
        if (out != null) {
            out.println(fromX + "," + fromY + "," + toX + "," + toY);
        }
    }

    /**
     * Receives a move (blocking call).
     * Returns {fromX, fromY, toX, toY} or null if there's an error/EOF.
     */
    public int[] receiveMove() {
        try {
            String line = in.readLine();
            if (line == null) return null;
            String[] parts = line.split(",");
            if (parts.length != 4) return null;
            return new int[]{
                Integer.parseInt(parts[0]),
                Integer.parseInt(parts[1]),
                Integer.parseInt(parts[2]),
                Integer.parseInt(parts[3])
            };
        } catch (IOException | NumberFormatException e) {
            return null;
        }
    }

    /**
     * Closes the connection.
     */
    public void close() {
        try {
            if (socket != null) {
                socket.close();
            }
        } catch (IOException ignored) {}
    }

    public boolean isServer() {
        return isServer;
    }
}
