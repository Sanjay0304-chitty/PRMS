import { defineConfig } from "@prisma/config";

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? "mysql://root:root123@localhost:3306/prms_db",
  },
});
