import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

requireEnv("DATABASE_URL");
const demoPassword = requireEnv("DEMO_USER_PASSWORD");

const prisma = new PrismaClient();
const users = [
  { email: "ava@flightdocs.dev", name: "Ava Chen" },
  { email: "sam@flightdocs.dev", name: "Sam Rivera" },
];

for (const user of users) {
  await prisma.user.upsert({
    create: {
      email: user.email,
      name: user.name,
      passwordHash: hashPassword(demoPassword),
    },
    update: {
      name: user.name,
      passwordHash: hashPassword(demoPassword),
    },
    where: {
      email: user.email,
    },
  });
}

console.log("Seeded demo users:");
for (const user of users) {
  console.log(`- ${user.email}`);
}

await prisma.$disconnect();
