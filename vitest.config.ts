import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/thedays_test",
      DIRECT_DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/thedays_test",
      FRONTEND_URL: "http://localhost:5173",
      SESSION_SECRET: "test-session-secret-that-is-at-least-32-characters",
      BREVO_API_KEY: "test-brevo-api-key",
      EMAIL_FROM_ADDRESS: "thedays-test@example.com",
      EMAIL_FROM_NAME: "TheDays Test",
      GOOGLE_CLIENT_ID: "test-google-client-id.apps.googleusercontent.com",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
