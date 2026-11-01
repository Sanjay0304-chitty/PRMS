ALTER TABLE "properties" ADD COLUMN "rating" REAL DEFAULT 4.8;
ALTER TABLE "properties" ADD COLUMN "reviewsCount" INTEGER DEFAULT 0;

CREATE TABLE "reviews" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "propertyId" TEXT NOT NULL,
  "userId" TEXT,
  "userName" TEXT NOT NULL,
  "userAvatar" TEXT,
  "rating" REAL NOT NULL DEFAULT 5.0,
  "comment" TEXT NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reviews_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "reviews_propertyId_idx" ON "reviews"("propertyId");
