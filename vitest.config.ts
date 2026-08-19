import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/thedays_test",
      FRONTEND_URL: "http://localhost:5173",
      SESSION_SECRET: "test-session-secret-that-is-at-least-32-characters",
      EMAIL_USER: "thedays-test@example.com",
      EMAIL_APP_PASSWORD: "test-gmail-app-password",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
