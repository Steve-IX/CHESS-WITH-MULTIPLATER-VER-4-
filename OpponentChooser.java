import javax.swing.JOptionPane;

public class OpponentChooser {

    public static boolean chooseOpponent() {
        String[] options = {"Friend", "Computer"};
        int choice = JOptionPane.showOptionDialog(
            null,
            "Would you like to play with a friend or with the computer?",
            "Choose Opponent",
            JOptionPane.DEFAULT_OPTION,
            JOptionPane.PLAIN_MESSAGE,
            null,
            options,
            options[0]
        );

        return (choice == 1); // true if Computer, false if Friend
    }
}
