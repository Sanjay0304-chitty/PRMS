CREATE TABLE "record_archives" (
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "archivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "kind", "recordId"),
  CONSTRAINT "record_archives_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
