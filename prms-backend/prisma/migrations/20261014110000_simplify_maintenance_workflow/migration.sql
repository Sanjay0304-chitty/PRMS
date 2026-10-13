DROP TABLE IF EXISTS "maintenance_activities";

ALTER TABLE "maintenance_tickets" DROP COLUMN "contractorName";
ALTER TABLE "maintenance_tickets" DROP COLUMN "appointmentAt";
ALTER TABLE "maintenance_tickets" DROP COLUMN "estimatedCost";
ALTER TABLE "maintenance_tickets" DROP COLUMN "actualCost";
ALTER TABLE "maintenance_tickets" DROP COLUMN "approvalRequired";
ALTER TABLE "maintenance_tickets" DROP COLUMN "approvalStatus";
ALTER TABLE "maintenance_tickets" DROP COLUMN "approvedAt";
ALTER TABLE "maintenance_tickets" DROP COLUMN "approvedById";
ALTER TABLE "maintenance_tickets" DROP COLUMN "resolutionNotes";
