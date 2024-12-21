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
     * @return true if successfully connected to a client, false otherwise
     */
    public boolean startServer() {
        isServer = true;
        try {
            ServerSocket serverSocket = new ServerSocket(5000);
            JOptionPane.showMessageDialog(null, "Hosting a game... Waiting for a friend to connect on port 5000.");
            socket = serverSocket.accept();
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
     * Connects to a remote host.
     * @param host The IP or hostname to connect to
     * @return true if successfully connected, false otherwise
     */
    public boolean connectToHost(String host) {
        isServer = false;
        try {
            JOptionPane.showMessageDialog(null, "Connecting to " + host + " on port 5000...");
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
     * The move format could be a simple string like "fromX,fromY,toX,toY".
     */
    public void sendMove(int fromX, int fromY, int toX, int toY) {
        if (out != null) {
            out.println(fromX + "," + fromY + "," + toX + "," + toY);
        }
    }

    /**
     * Receives a move from the other player. This is a blocking call.
     * Returns an array of {fromX, fromY, toX, toY} or null if error.
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
            if (socket != null) socket.close();
        } catch (IOException ignored) {}
    }

    public boolean isServer() {
        return isServer;
    }
}
