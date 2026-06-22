# ---------------------------------------------------------------------------
# Multi-stage Dockerfile for the Spring Boot backend.
#
# "Multi-stage" means we use TWO temporary images:
#   1. a BUILD image that has Maven + the full JDK to compile the app, and
#   2. a small RUNTIME image that only has a JRE to actually run the .jar.
#
# Why bother? The build tools (Maven, source code, the whole JDK) are heavy and
# you don't need any of them once the app is compiled. By copying ONLY the
# finished .jar into a fresh, slim image, the final image stays small and has a
# smaller attack surface. The build-stage image is thrown away automatically.
# ---------------------------------------------------------------------------

# ===== Stage 1: build =====
# Pin a specific Maven + Temurin JDK 21 image (matches <java.version>21</java.version> in pom.xml).
FROM maven:3.9-eclipse-temurin-21 AS build

# All following commands run inside /app in the image's filesystem.
WORKDIR /app

# Copy ONLY the pom.xml first, then download dependencies.
# Docker caches each step ("layer"). Because we copy pom.xml before the source
# code, Docker can reuse the cached, already-downloaded dependencies on later
# builds as long as pom.xml hasn't changed. This makes rebuilds much faster.
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Now copy the actual source code and build the jar.
# -DskipTests keeps image builds fast; run tests in CI / locally instead.
COPY src ./src
RUN mvn clean package -DskipTests -B

# ===== Stage 2: runtime =====
# A much smaller image: just a Java RUNTIME (JRE), no compiler, no Maven.
FROM eclipse-temurin:21-jre AS runtime

WORKDIR /app

# Security best practice: don't run as root inside the container.
# Create an unprivileged user and switch to it.
RUN useradd --system --no-create-home --shell /usr/sbin/nologin appuser

# Copy the compiled jar from the build stage. The wildcard avoids hard-coding
# the version (leap-and-bound-0.0.1-SNAPSHOT.jar) so it survives version bumps.
COPY --from=build /app/target/*.jar app.jar

USER appuser

# Documents that the app listens on 8080 (matches server.port in application.properties).
# This is informational; you still publish the port in docker-compose / docker run.
EXPOSE 8080

# The command that runs when the container starts.
# "exec form" (JSON array) makes Java PID 1 so it receives stop signals correctly.
ENTRYPOINT ["java", "-jar", "app.jar"]
