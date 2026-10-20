PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS "user_preferences" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "appearance" TEXT NOT NULL DEFAULT 'system',
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL,
  CONSTRAINT "user_preferences_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "new_user_preferences" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "appearance" TEXT NOT NULL DEFAULT 'system',
  "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "viewingNotifications" BOOLEAN NOT NULL DEFAULT true,
  "applicationNotifications" BOOLEAN NOT NULL DEFAULT true,
  "maintenanceNotifications" BOOLEAN NOT NULL DEFAULT true,
  "messageNotifications" BOOLEAN NOT NULL DEFAULT true,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL,
  CONSTRAINT "user_preferences_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_user_preferences" (
  "id", "userId", "appearance", "created_at", "updated_at"
)
SELECT "id", "userId", "appearance", "created_at", "updated_at"
FROM "user_preferences";

DROP TABLE "user_preferences";
ALTER TABLE "new_user_preferences" RENAME TO "user_preferences";
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

PRAGMA foreign_keys=ON;
