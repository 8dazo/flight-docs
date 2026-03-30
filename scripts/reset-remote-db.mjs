import { spawnSync } from "node:child_process";

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

requireEnv("DATABASE_URL");

const commands = [
  ["exec", "prisma", "db", "execute", "--schema", "prisma/schema.prisma", "--file", "prisma/reset.sql"],
  ["exec", "prisma", "db", "push", "--accept-data-loss", "--schema", "prisma/schema.prisma"],
  ["exec", "prisma", "generate", "--schema", "prisma/schema.prisma"],
];

for (const args of commands) {
  const result = spawnSync("pnpm", args, {
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
