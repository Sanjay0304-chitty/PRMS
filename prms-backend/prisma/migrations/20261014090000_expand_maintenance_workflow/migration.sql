ALTER TABLE "maintenance_tickets" ADD COLUMN "inspectionNotes" TEXT;
ALTER TABLE "maintenance_tickets" ADD COLUMN "contractorName" TEXT;
ALTER TABLE "maintenance_tickets" ADD COLUMN "appointmentAt" DATETIME;
ALTER TABLE "maintenance_tickets" ADD COLUMN "estimatedCost" REAL;
ALTER TABLE "maintenance_tickets" ADD COLUMN "actualCost" REAL;
ALTER TABLE "maintenance_tickets" ADD COLUMN "approvalRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "maintenance_tickets" ADD COLUMN "approvalStatus" TEXT;
ALTER TABLE "maintenance_tickets" ADD COLUMN "approvedAt" DATETIME;
ALTER TABLE "maintenance_tickets" ADD COLUMN "approvedById" TEXT;
ALTER TABLE "maintenance_tickets" ADD COLUMN "resolutionNotes" TEXT;

CREATE TABLE "maintenance_attachments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "maintenance_attachments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "maintenance_tickets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "maintenance_attachments_ticketId_idx" ON "maintenance_attachments"("ticketId");

CREATE TABLE "maintenance_activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "maintenance_activities_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "maintenance_tickets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "maintenance_activities_ticketId_idx" ON "maintenance_activities"("ticketId");
