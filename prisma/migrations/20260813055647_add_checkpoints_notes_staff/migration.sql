-- CreateTable
CREATE TABLE "DashboardCheckpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dashboardId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "scheduledTime" TEXT NOT NULL,
    "personalisedComplete" INTEGER,
    "shippedComplete" INTEGER,
    "note" TEXT,
    "recordedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DashboardCheckpoint_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "DailyDashboard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DashboardNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dashboardId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'NOTE',
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DashboardNote_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "DailyDashboard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StaffAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dashboardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "StaffAssignment_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "DailyDashboard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DashboardCheckpoint_dashboardId_idx" ON "DashboardCheckpoint"("dashboardId");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardCheckpoint_dashboardId_scheduledTime_key" ON "DashboardCheckpoint"("dashboardId", "scheduledTime");

-- CreateIndex
CREATE INDEX "DashboardNote_dashboardId_idx" ON "DashboardNote"("dashboardId");

-- CreateIndex
CREATE INDEX "StaffAssignment_dashboardId_idx" ON "StaffAssignment"("dashboardId");
