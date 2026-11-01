-- Preserve all records and give new/local-only listings a stable position after
-- the imported reference catalogue until explicitly ordered.
ALTER TABLE "properties" ADD COLUMN "catalogueOrder" INTEGER NOT NULL DEFAULT 2147483647;
ALTER TABLE "property_images" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "properties_catalogueOrder_id_idx" ON "properties"("catalogueOrder", "id");
CREATE INDEX "property_images_propertyId_sortOrder_idx" ON "property_images"("propertyId", "sortOrder");
