-- CreateTable
CREATE TABLE "DailyDashboard" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyDashboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardCheckpoint" (
    "id" TEXT NOT NULL,
    "dashboardId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "scheduledTime" TEXT NOT NULL,
    "personalisedComplete" INTEGER,
    "shippedComplete" INTEGER,
    "note" TEXT,
    "recordedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardNote" (
    "id" TEXT NOT NULL,
    "dashboardId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'NOTE',
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAssignment" (
    "id" TEXT NOT NULL,
    "dashboardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StaffAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyDashboard_dashboardDate_key" ON "DailyDashboard"("dashboardDate");

-- CreateIndex
CREATE INDEX "DailyDashboard_dashboardDate_idx" ON "DailyDashboard"("dashboardDate");

-- CreateIndex
CREATE INDEX "DashboardCheckpoint_dashboardId_idx" ON "DashboardCheckpoint"("dashboardId");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardCheckpoint_dashboardId_scheduledTime_key" ON "DashboardCheckpoint"("dashboardId", "scheduledTime");

-- CreateIndex
CREATE INDEX "DashboardNote_dashboardId_idx" ON "DashboardNote"("dashboardId");

-- CreateIndex
CREATE INDEX "StaffAssignment_dashboardId_idx" ON "StaffAssignment"("dashboardId");

-- AddForeignKey
ALTER TABLE "DashboardCheckpoint" ADD CONSTRAINT "DashboardCheckpoint_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "DailyDashboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardNote" ADD CONSTRAINT "DashboardNote_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "DailyDashboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "DailyDashboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
