import { PrismaClient } from "@prisma/client";

declare global {
  var __flightDocsPrisma__: PrismaClient | undefined;
}

export const db =
  global.__flightDocsPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__flightDocsPrisma__ = db;
}
