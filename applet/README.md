# Java Applet Example

This folder contains a historical example of a Java applet — a technology that was popular in the 1990s but is now completely removed from modern Java.

## What is this?

A Java applet is a small application that runs in a web browser. They were introduced in 1995 as a way to add interactive content to web pages before JavaScript became mature.

## Files

- `HelloApplet.java` - A simple 10-line applet with a button and click counter
- `build.sh` - Build script (requires Java 8 or older)
- `index.html` - HTML page that embeds the applet (won't work in modern browsers)

## Building

**Note:** This will only work with Java 25 or younger, as the `java.applet` API was removed in Java 26+.

```bash
chmod +x build.sh
./build.sh
```

## Why this doesn't work anymore

1. **Java side:** The `java.applet` package was deprecated in Java 9 (2017) and removed in Java 11 (2018)
2. **Browser side:** All major browsers removed Java plugin support between 2015-2017
3. **Security:** Applets had numerous security vulnerabilities
4. **Better alternatives:** JavaScript, WebAssembly, and modern web technologies replaced applets

But you can still view the applet using e.g. [CheerpJ Applet Runner](https://chrome.google.com/webstore/detail/cheerpj-applet-runner/ljdobmomdgdljniojadhoplhkpialdid).

## Timeline

- **1995:** Java applets introduced in Java 1.0
- **2017:** Deprecated in Java 9
- **2018:** Removed in Java 11
- **2021:** Final cleanup in Java 17
- **2026:** Last vestiges removed in Java 26

## The Joke

The slides reference this as an example of Java removing "dead code" — technology that literally nobody uses anymore but still took 30+ years to fully remove from the platform.

## Historical Context

In 1997, this 10-line code would have been cutting-edge:

```java
import java.applet.Applet;
import java.awt.*;
import java.awt.event.*;

public class HelloApplet extends Applet implements ActionListener {
    int clicks = 0;
    public void init() { Button b = new Button("Click Me!"); add(b); b.addActionListener(this); }
    public void paint(Graphics g) { g.drawString("Clicks: " + clicks, 80, 60); }
    public void actionPerformed(ActionEvent e) { clicks++; repaint(); }
}
```

Today, it's a museum piece. 🪦
