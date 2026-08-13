-- CreateTable
CREATE TABLE "DailyDashboard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dashboardDate" TEXT NOT NULL,
    "personalisingOrderDate" TEXT,
    "personalisedOrderCount" INTEGER,
    "personalisedItemCount" INTEGER,
    "nonPersonalisedOrderCount" INTEGER,
    "shippingOrderDate" TEXT,
    "shippingOrderCount" INTEGER,
    "shippingItemCount" INTEGER,
    "courierCutoff" TEXT,
    "expressCount" INTEGER,
    "priorityCount" INTEGER,
    "redoCount" INTEGER,
    "onHoldCount" INTEGER,
    "overallStatus" TEXT NOT NULL DEFAULT 'ON_TRACK',
    "dailyMessage" TEXT,
    "secondaryMessage" TEXT,
    "updatedBy" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyDashboard_dashboardDate_key" ON "DailyDashboard"("dashboardDate");

-- CreateIndex
CREATE INDEX "DailyDashboard_dashboardDate_idx" ON "DailyDashboard"("dashboardDate");
