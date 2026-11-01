import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import type { TestProject } from "vitest/node";

// Runs once before the test files: creates the test database if needed and
// applies the same migrations as the real one.
export default async function setup(project: TestProject) {
  const databaseUrl = project.config.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("vitest.config.ts must set DATABASE_URL");
  }
  const testUrl = new URL(databaseUrl);
  const databaseName = testUrl.pathname.slice(1);

  // CREATE DATABASE must run from a connection to another database.
  const adminUrl = new URL(testUrl);
  adminUrl.pathname = "/postgres";
  const admin = postgres(adminUrl.href, { max: 1 });
  const [existing] =
    await admin`select 1 from pg_database where datname = ${databaseName}`;
  if (!existing) {
    await admin.unsafe(`create database "${databaseName}"`);
  }
  await admin.end();

  const client = postgres(testUrl.href, { max: 1, onnotice: () => {} });
  await migrate(drizzle(client), {
    migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)),
  });
  await client.end();
}
