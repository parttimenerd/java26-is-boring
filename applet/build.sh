#!/bin/bash
# Build script for Java Applet example (requires Java 8 or older with applet support)

set -e

cd "$( dirname "$0" )"

echo "Building HelloApplet..."

# Clean previous build
rm -f HelloApplet.class hello-applet.jar

# Compile (requires Java 8 or older - applet was removed in Java 9+)
javac -source 8 -target 8 HelloApplet.java || exit

# Create JAR
jar cvf hello-applet.jar HelloApplet.class