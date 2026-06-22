package com.leapandbound;

import java.util.Arrays;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS config for the REST API (/api/**). This must read the SAME origin value
 * as the WebSocket config, otherwise the browser blocks /api calls with
 * "No 'Access-Control-Allow-Origin' header". The value comes from the
 * cors.allowed-origins property, which reads the CORS_ALLOWED_ORIGINS env var.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

  // Reads application.properties -> cors.allowed-origins -> CORS_ALLOWED_ORIGINS
  // env var. Default keeps local dev working. Comma-separate multiple origins.
  @Value("${cors.allowed-origins:http://localhost:3000}")
  private String allowedOrigins;

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    String[] origins = Arrays.stream(allowedOrigins.split(","))
        .map(String::trim)
        .toArray(String[]::new);

    registry
        .addMapping("/api/**")
        .allowedOrigins(origins)
        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        .allowedHeaders("*")
        .allowCredentials(true);
  }
}
