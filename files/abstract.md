# Java 26 is boring, Which is why it is brilliant

Java’s predictable release cycle avoids big surprises. This predictability is one of Java’s strengths. While some other platforms introduce dramatic changes or even break existing code, JDK 26 delivers a set of small, practical improvements. These enhancements are easy to adopt and beneficial in everyday development.  
This talk covers key updates in JDK 26, including faster G1 garbage collector throughput; ahead-of-time class data sharing enhancements that work with any GC; and built-in HTTP/3 support in the standard HTTP client. It also touches on ongoing previews for primitive patterns, lazy constants, structured concurrency, and the Vector API. None of these changes are headline material on their own, but together they make Java faster, cleaner, and more pleasant to use.  
You will learn how this incremental approach keeps upgrades simple, allows new features to mature safely, and helps Java remain a reliable platform in production. By the end of the session, you will have a clear overview of what JDK 26 adds and why its quiet improvements matter.  

Takeaways

* A clear overview of what is new in JDK 26  
* Why predictable, incremental releases keep Java stable and simplify upgrades  
* How to take advantage of JDK 26’s preview and incubating features

**Elevator pitch:**  
This talk offers strong learning value for a broad Java audience by clearly explaining what JDK 26 adds and why those changes matter in practice. It focuses on concrete improvements such as G1 GC throughput, ahead-of-time class data sharing across garbage collectors, and HTTP/3 support, alongside a balanced overview of preview and incubating features. The demo-driven format helps developers understand the impact of these updates without requiring deep specialization.  
The session is accessible to mid-level and senior Java developers, particularly those responsible for maintaining and upgrading production systems. Its emphasis on incremental evolution and safe adoption makes it relevant to teams across different industries and project sizes.  
From a program perspective, this talk provides a grounded, non-hype view of a new Java release, complementing deeper dives and more experimental sessions. It helps balance the schedule with a practical, production-focused Java talk that many attendees can directly relate to.

45min talk for voxxed days Amsterdam

## 

## **Features**

| 500: | [Prepare to Make Final Mean Final](https://openjdk.org/jeps/500) |
| :---- | :---- |
| 504: | [Remove the Applet API](https://openjdk.org/jeps/504) |
| 516: | [Ahead-of-Time Object Caching with Any GC](https://openjdk.org/jeps/516) |
| 517: | [HTTP/3 for the HTTP Client API](https://openjdk.org/jeps/517) |
| 522: | [G1 GC: Improve Throughput by Reducing Synchronization](https://openjdk.org/jeps/522) |
| 524: | [PEM Encodings of Cryptographic Objects (Second Preview)](https://openjdk.org/jeps/524) |
| 525: | [Structured Concurrency (Sixth Preview)](https://openjdk.org/jeps/525) |
| 526: | [Lazy Constants (Second Preview)](https://openjdk.org/jeps/526) |
| 529: | [Vector API (Eleventh Incubator)](https://openjdk.org/jeps/529) |
| 530: | [Primitive Types in Patterns, instanceof, and switch (Fourth Preview)](https://openjdk.org/jeps/530) |

**Slides**

- Intro (\~5min)  
  - Why boring isn’t negative  
  - Who we are  
  - How to upgrade (probably everybody already knows this?)  
- How old is your code really? (\~5min)  
  - Do 3 examples with the Java version quiz  
  - Show some really old code that is already in there since Java \<5  
- Predictable releases (\~1 min)  
  - Java’s release cycle  
- What Java 26 actual changes (\~2 min)  
  - GC  
  - Startup  
  - Networking  
  - Language evolution  
  - Quickly show list of preview features  
- Fast G1 Garbage collection (\~6min)  
  - Why garbage collection changes aim to be boring and safe  
  - Show before and after  
- HTTP /3 in the standard HTTP client (\~5min)  
  - Why HTTP/3 matters today?  
  - What does it means that it lives in the standard library?  
- Removing stuff (\~1 min)  
  - Applet API  
- Preview and incubating features (\~4min)  
  - Primitive patterns  
  - Lazy constants  
  - Vector API  
  - Structured concurrency  
  - You don’t need this\! and why  
- Java’s stability (\~3 min)  
  - Comparisons with other languages   
  - good career path  
  - stable for business  
  - backward compatibility  
- Closing (\~4 min)  
  - key learning points  
  - qr codes to ratings/ our socials  
  - thank you