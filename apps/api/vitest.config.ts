import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

const envFile = "../../.env";
if (existsSync(envFile)) process.loadEnvFile(envFile);

const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
}

// Tests run against <database>_test, so they never touch the real training log.
const testUrl = new URL(baseUrl);
testUrl.pathname = `${testUrl.pathname}_test`;

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    env: { DATABASE_URL: testUrl.href },
    globalSetup: "./src/test/global-setup.ts",
    // Test files share one database, so they must not run at the same time.
    fileParallelism: false,
  },
});
