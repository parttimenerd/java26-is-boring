# Java 26 is boring, which is why it is brilliant

When people hear “boring tech”, they usually mean old, slow, or not innovative. But in production, boring implies something very different. Boring means predictable, with no surprises. Boring means your system still works at 3 a.m. when nobody wants to debug a memory leak. And boring also means that you can understand your system years after you wrote it.

Many platforms try to impress developers with significant changes, shiny rewrites, or breaking updates. Java took another path. Java optimizes for trust.

If a Java release feels boring, that usually means:

- Your code still compiles  
- Your API’s will still work  
- Your upgrade does not turn into a rewrite project

And that’s not a weakness. That’s why Java has survived for decades.

If you look back at the different Java versions, you notice that not much has changed since Java 8\. The significant changes to the language itself are minor: var and record are just syntax sugar, and even the new switch expression and pattern matching feel like an evolution of existing syntax rather than something completely new. Most additions, like the foreign function interface or virtual threads, are only beneficial for library developers and not something the average developer will likely use. But allowing library developers to write faster, better code means that anyone gets better foundations for their applications. So Java can be proud to be boring.

For example, take:

```java
import java.util.*;

class Example {
    Map<String, List<Set<Map<Integer, String>>>> complex;
    List<? extends Number> wildcardExtends;
    List<? super Integer> wildcardSuper;
}
```

Can you guess the Java version? It's Java 5.

Or of the following snippet?

```java
class Example {
    record Pair<T, U>(T first, U second) {}

    Pair<String, Integer> pair = new Pair<>("test", 42);
}
```

It's Java 16, released in 2021.

But it still feels modern. Improvements in Java are driven by its libraries and ecosystem, not by the Java language itself.

# How to upgrade

For most projects, upgrading from Java 25 to Java 26 is straightforward. If you use Maven, the change often starts and ends with updating the Java release version in your build configuration:

```xml
<properties>
   <maven.compiler.release>26</maven.compiler.release>
</properties>
```

Maven will automatically use the configured JDK, and you can then rebuild and run your tests. Modern IDEs typically highlight deprecated or removed APIs and suggest alternatives where needed. Thanks to Java’s strong backward compatibility guarantees, most applications compile and run without changes, making the upgrade a routine maintenance task rather than a migration project.

# What Java 26 actual changes

Java 26 introduces many JEPs (Java Enhancement Proposals), but not all have the same impact on day-to-day development. Some changes affect how Java behaves at runtime or how you interact with core APIs. Others are previews or incubating features that are intentionally not final yet.

Honestly, the most considerable improvement in Java 26 is not in the language or its APIs; it is the improved throughput with the G1 garbage collector. So an upgrade gives you better performance.

In this section, we focus on the changes most likely to matter to Java developers today. These are features that are enabled by default, influence performance or behavior, or represent a clear step forward for the platform.

Preview and incubating features are treated differently. They are still evolving, require explicit opt-in, and may change or even be removed in future releases. Because of that, they are summarized later in this article, with a short explanation for each JEP. The goal there is awareness, not immediate adoption.

The following paragraphs, therefore, highlight the most concrete changes in Java 26. After that, we will briefly step through the preview and incubating features to give you an idea of what is being explored and what might become part of Java in a future release.

# G1 GC: Improve Throughput by Reducing Synchronization (JEP 522)

The Garbage-First collector (G1) is the default garbage collector, so its performance is critical. Ivan Walulya and Thomas Schatzl improved G1 by reducing the synchronization required between application and GC threads. This significantly improves the throughput and latency.

When you move to the new JVM, your throughput improves by 5-15% without you doing anything. This is the best kind of change. Of course, this is aided by the JVM developers not having to chase the newest cool language feature: they would rather spend their time improving the JVM implementation.

But be aware that the new changes might introduce bugs; use `-XX:-G1UseConcRefinement` to disable them.

# HTTP/3 in the standard HTTP client (JEP 517)

Java 26 adds support for HTTP/3 to the standard *java.net.http HTTP* Client API. This allows Java applications to communicate with HTTP/3 servers using the same client that was introduced in Java 11, without requiring a new API or a rewrite. Support for HTTP/3 is explicitly opt-in and does not change the default protocol behavior.

## Why HTTP/3 matters today?

HTTP/3 is the successor to HTTP/2 and is built on top of the QUIC transport protocol rather than TCP. QUIC is a modern transport protocol designed for web traffic and runs over UDP, with TLS 1.3 integrated by default. This design reduces connection setup time, avoids head-of-line blocking, and improves performance on unreliable or high-latency networks. HTTP/3 is already widely used by modern browsers and supported by a large portion of public web infrastructure, making it increasingly relevant for client-side applications.

## What does it mean that HTTP/3 lives in JDK 26?

By including HTTP/3 support in the standard HTTP Client API, Java removes the need for third-party networking libraries to access modern web protocols. Existing application code remains essentially unchanged, and developers can opt in to HTTP/3 on a per-client or per-request basis. If a server does not support HTTP/3, the client transparently falls back to HTTP/2 or HTTP/1.1. This approach preserves backward compatibility while allowing applications to adopt newer protocols at their own pace.

## Do you need HTTP/3?

Honestly, you’ll be fine without it. As most of the time, HTTP isn’t the bottleneck (and HTTP/2 is good enough). It’s nice that Java keeps pace with the new protocols, but you’ll probably only use it once your server frameworks adopt them or you really know what you’re doing.

## PEM Encodings of Cryptographic Objects (JEP 524)

Java 26 continues its focus on usability and security with a preview API for working with PEM (Privacy-Enhanced Mail) formatted cryptographic data.

PEM is a text-based format defined by RFC 7468 and is widely used for exchanging public keys, private keys, certificates, and certificate revocation lists. It's the format you see everywhere in practice — from TLS certificates to OpenSSH keys and hardware security devices.

Until now, the Java Platform lacked a straightforward way to encode and decode PEM. While Java's cryptography APIs can already produce and consume binary formats like PKCS#8 and X.509, developers were left to manually handle Base64 encoding, PEM headers and footers, encryption, and provider selection.

### Why it matters

This API significantly reduces boilerplate and the risk of security mistakes when working with PEM files. Tasks that once took dozens of lines of careful, error-prone code can now be done in a few clear method calls, all using standard Java APIs.

As a preview feature, it must be explicitly enabled in Java 26, and its design may evolve. Still, it’s a strong signal that Java is closing long-standing gaps in its cryptography tooling.

# The end of Java Applets

Java applets were once the way you implemented interactive web applications if you didn’t want to use Flash. As an example:

```java
import java.applet.Applet;
import java.awt.Button;
import java.awt.Graphics;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

public class HelloApplet extends Applet {
    private String message = "Hello from an Applet";
    private int clicks = 0;

    @Override
    public void init() {
        Button button = new Button("Click me");
        button.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                clicks++;
                message = "Clicks: " + clicks;
                repaint(); // trigger redraw
            }
        });
        add(button);
    }

    @Override
    public void paint(Graphics g) {
        g.drawString(message, 20, 40);
    }
}
```

You could embed this via:

```html
<!doctype html>
<html>
  <body>
    <applet code="HelloApplet.class" archive="hello-applet.jar" width="300" height="120">
      Your browser does not support Java applets.
    </applet>
  </body>
</html>
```

Java 26 removes the Applet API. This is not a breaking change in practice, but the final step of a very long deprecation process.

Applets have been obsolete for years. Web browsers stopped supporting them long ago; the appletviewer tool was removed in Java 11. And the API itself was deprecated for removal in Java 17. With the Security Manager now permanently disabled, there is no longer any technical foundation to run applets safely.

As a result, Java 26 removes the `java.applet` package, along with related classes such as `JApplet`. For most developers, this has zero impact. Code that was still dependent on applets was already tied to older Java versions. And modern alternatives have existed for a long, long time.

This change is a good example of Java’s careful evolution: once a core feature, the Java platform phased it out gradually with years of notice, clear migration paths, and a quiet removal when the API lost its relevance.

# Preview and incubating features

Java 26 includes several preview and incubating features, each described in a JEP (Java Enhancement Proposal). A JEP is a design document that explains a proposed change to the Java platform, including its motivation, scope, and current status.

Preview and incubating features are disabled by default, and developers must explicitly enable them using preview feature flags at compile time and runtime. They exist to gather feedback and allow features to mature safely before becoming part of the standard language or API. Don’t use them in production; they might disappear in the next Java version.

To try them out, you must explicitly enable previews, for example:

```bash
javac --enable-preview --release 26 PrimitivePatternExample.java
java --enable-preview PrimitivePatternExample
```

## Primitive patterns (JEP 530)

Primitive patterns extend pattern matching so that it works consistently with primitive types in instanceof and switch. This allows Java to safely check and bind primitive values without manual casts or error-prone range checks. The compiler can now automatically reject unsafe conversions. This feature is still in preview, and while it improves language consistency, most production code does not yet rely on advanced pattern matching with primitives.

Eventually, you’ll be able to use primitive types like any other type in the pattern-matching expressions:

```java
switch (value) {
    case int i -> "integer: " + i;
}
```

## Lazy constants (JEP 526)

Lazy constants introduce a way to define immutable values that the JVM initializes only when first used, instead of eagerly at startup. They combine the safety and performance benefits of final fields with the flexibility of lazy initialization, including correct behavior in multi-threaded code. This API helps optimize startup time, but as a preview feature, it is intended primarily for experimentation rather than widespread production use.

This also makes your code far more readable, as you don’t have to write your own caching logic. Now you can write the following to lazily, for example create a database connection:

```java
private final LazyConstant<Connection> connection
        = LazyConstant.of(() -> {
            try {
                return DriverManager.getConnection(
                        "jdbc:postgresql://localhost:5432/appdb",
                        "appuser",
                        "apppass"
                );
            } catch (SQLException e) {
                throw new IllegalStateException("Failed to create DB connection", e);
            }
        });
```

## Vector API (JEP 529)

The Vector API provides an explicit way to write vectorized computations that map reliably to modern CPU SIMD instructions. It is designed for performance-critical workloads such as numerical processing, cryptography, or machine learning. While powerful, it remains an incubating API and is deliberately niche. Most Java applications do not need explicit vectorization, and auto-vectorization already covers many common cases. It’s mostly aimed at libraries like Lucene or AI.

## Structured concurrency (JEP 525)

Structured concurrency groups related concurrent tasks into a single unit of work, making error handling, cancellation, and observability more predictable. It aligns concurrent code structure with normal block structure, reducing thread leaks and subtle bugs. Although promising, this API is still in preview, and many production systems continue to rely on established concurrency abstractions while it matures. Good APIs take time.

## You don’t need this (yet)

All of these features are previews for a reason. They allow developers to explore new ideas, provide feedback, and shape the platform's future without forcing adoption. Java deliberately keeps preview features opt-in, so production systems remain stable by default. You can safely ignore these features today and still benefit from Java 26, and that is very much by design.

The same goes for the non-Long-Term-Support releases: with versions like Java 26, the JVM developers give you access to new language features, whether they're final or preview. So you don't have to spend so much time waiting, like when switching from Java 7 to Java 8.

But still: Please try out these features if you want and give the JVM developers feedback. Java is not developed in a separate reality, it's developed in conjunction with the changing needs of its users.

# Conclusion

Well, Java 26 is boring, except for the JVM. So upgrading to the next JVM might be great, even if the language didn’t change. The great thing about Java is that you can write Java 8 code and nobody will notice. You can focus on your actual application without having to follow all the language news like in Scala or Rust.

Evolution over revolution is what kept Java alive for 30 years. Careful language design and runtime development will hopefully keep it relevant for far longer.

Can Java be improved? Are some existing features not the best? Does it miss features like string interpolation that other languages already have? Yes to all.

But also: Has it been around far longer than its competitors? Is it a vibrant community? Is the implementation of the runtime managed by more than one company? Does it run almost everywhere? Also yes to all.

It has never been a better time to be a Java developer, see you in another 30 years!