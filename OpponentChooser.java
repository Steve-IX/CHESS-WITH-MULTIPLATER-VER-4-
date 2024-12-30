import javax.swing.*;
import java.io.*;
import java.net.*;

/**
 * Manages opponent selection for the chess game.
 */
public class OpponentChooser {

    /**
     * Displays a dialog to choose the opponent type.
     * @return True for playing against the computer, false for playing against a friend.
     */
    public static int chooseOpponent() {
        Object[] options = {"Computer", "Local Friend", "Global Friend"};
        int choice = JOptionPane.showOptionDialog(null,
                "Choose your opponent:",
                "Opponent Selection",
                JOptionPane.DEFAULT_OPTION,
                JOptionPane.INFORMATION_MESSAGE,
                null,
                options,
                options[0]);

        return choice;
    }
}
