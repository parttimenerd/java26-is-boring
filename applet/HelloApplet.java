import java.applet.Applet;
import java.awt.*;
import java.awt.event.*;

public class HelloApplet extends Applet implements ActionListener {
    int clicks = 0;
    public void init() { Button b = new Button("Click Me!"); add(b); b.addActionListener(this); }
    public void paint(Graphics g) { g.drawString("Clicks: " + clicks, 80, 60); }
    public void actionPerformed(ActionEvent e) { clicks++; repaint(); }
}