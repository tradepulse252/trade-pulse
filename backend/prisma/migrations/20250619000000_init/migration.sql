-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SignalType" AS ENUM ('STRONG_LONG', 'WEAK_LONG', 'STRONG_SHORT', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('NEW_STRONG_LONG', 'NEW_STRONG_SHORT', 'OI_SPIKE', 'VOLUME_SPIKE', 'FUNDING_FLIP', 'SCORE_THRESHOLD');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Timeframe" AS ENUM ('M5', 'M15', 'M30', 'H1', 'H2', 'H4', 'H24', 'D7');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "fcmToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symbols" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "baseAsset" TEXT NOT NULL,
    "quoteAsset" TEXT NOT NULL DEFAULT 'USDT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minQty" DECIMAL(20,8),
    "tickSize" DECIMAL(20,8),
    "contractSize" DECIMAL(20,8),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "symbols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_snapshots" (
    "id" TEXT NOT NULL,
    "symbolId" TEXT NOT NULL,
    "price" DECIMAL(20,8) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "open_interest_snapshots" (
    "id" TEXT NOT NULL,
    "symbolId" TEXT NOT NULL,
    "openInterest" DECIMAL(30,8) NOT NULL,
    "openInterestValue" DECIMAL(30,2) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "open_interest_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volume_snapshots" (
    "id" TEXT NOT NULL,
    "symbolId" TEXT NOT NULL,
    "volume" DECIMAL(30,8) NOT NULL,
    "volumeUsdt" DECIMAL(30,2) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "volume_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funding_rate_snapshots" (
    "id" TEXT NOT NULL,
    "symbolId" TEXT NOT NULL,
    "fundingRate" DECIMAL(12,8) NOT NULL,
    "markPrice" DECIMAL(20,8),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "funding_rate_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_metrics" (
    "id" TEXT NOT NULL,
    "symbolId" TEXT NOT NULL,
    "timeframe" "Timeframe" NOT NULL,
    "priceChangePct" DECIMAL(10,4) NOT NULL,
    "oiChangePct" DECIMAL(10,4) NOT NULL,
    "volumeChangePct" DECIMAL(10,4) NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "growth_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signals" (
    "id" TEXT NOT NULL,
    "symbolId" TEXT NOT NULL,
    "signalType" "SignalType" NOT NULL,
    "opportunityScore" DECIMAL(5,2) NOT NULL,
    "price" DECIMAL(20,8) NOT NULL,
    "openInterest" DECIMAL(30,2) NOT NULL,
    "oiChangePct" DECIMAL(10,4) NOT NULL,
    "volumeUsdt" DECIMAL(30,2) NOT NULL,
    "volumeChangePct" DECIMAL(10,4) NOT NULL,
    "fundingRate" DECIMAL(12,8) NOT NULL,
    "priceMomentum" DECIMAL(10,4) NOT NULL,
    "rank" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbolId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "watchlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbolId" TEXT,
    "alertType" "AlertType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isPushed" BOOLEAN NOT NULL DEFAULT false,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enableStrongLong" BOOLEAN NOT NULL DEFAULT true,
    "enableStrongShort" BOOLEAN NOT NULL DEFAULT true,
    "enableOiSpike" BOOLEAN NOT NULL DEFAULT true,
    "enableVolumeSpike" BOOLEAN NOT NULL DEFAULT true,
    "enableFundingFlip" BOOLEAN NOT NULL DEFAULT true,
    "minOpportunityScore" DECIMAL(5,2) NOT NULL DEFAULT 70,
    "oiSpikeThresholdPct" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "volumeSpikeThresholdPct" DECIMAL(5,2) NOT NULL DEFAULT 10,
    CONSTRAINT "alert_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_health" (
    "id" TEXT NOT NULL,
    "restApiStatus" TEXT NOT NULL DEFAULT 'unknown',
    "wsStatus" TEXT NOT NULL DEFAULT 'unknown',
    "lastRestPing" TIMESTAMP(3),
    "lastWsMessage" TIMESTAMP(3),
    "activeSymbols" INTEGER NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "alertsToday" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_logs" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE UNIQUE INDEX "symbols_symbol_key" ON "symbols"("symbol");
CREATE INDEX "symbols_isActive_idx" ON "symbols"("isActive");
CREATE INDEX "symbols_symbol_idx" ON "symbols"("symbol");
CREATE INDEX "price_snapshots_symbolId_timestamp_idx" ON "price_snapshots"("symbolId", "timestamp" DESC);
CREATE INDEX "open_interest_snapshots_symbolId_timestamp_idx" ON "open_interest_snapshots"("symbolId", "timestamp" DESC);
CREATE INDEX "volume_snapshots_symbolId_timestamp_idx" ON "volume_snapshots"("symbolId", "timestamp" DESC);
CREATE INDEX "funding_rate_snapshots_symbolId_timestamp_idx" ON "funding_rate_snapshots"("symbolId", "timestamp" DESC);
CREATE INDEX "growth_metrics_symbolId_idx" ON "growth_metrics"("symbolId");
CREATE INDEX "growth_metrics_calculatedAt_idx" ON "growth_metrics"("calculatedAt" DESC);
CREATE UNIQUE INDEX "growth_metrics_symbolId_timeframe_key" ON "growth_metrics"("symbolId", "timeframe");
CREATE INDEX "signals_symbolId_isActive_idx" ON "signals"("symbolId", "isActive");
CREATE INDEX "signals_opportunityScore_idx" ON "signals"("opportunityScore" DESC);
CREATE INDEX "signals_signalType_idx" ON "signals"("signalType");
CREATE INDEX "signals_rank_idx" ON "signals"("rank");
CREATE INDEX "watchlist_items_userId_idx" ON "watchlist_items"("userId");
CREATE UNIQUE INDEX "watchlist_items_userId_symbolId_key" ON "watchlist_items"("userId", "symbolId");
CREATE INDEX "alerts_userId_isRead_idx" ON "alerts"("userId", "isRead");
CREATE INDEX "alerts_triggeredAt_idx" ON "alerts"("triggeredAt" DESC);
CREATE UNIQUE INDEX "alert_settings_userId_key" ON "alert_settings"("userId");
CREATE INDEX "system_health_recordedAt_idx" ON "system_health"("recordedAt" DESC);
CREATE INDEX "error_logs_source_idx" ON "error_logs"("source");
CREATE INDEX "error_logs_createdAt_idx" ON "error_logs"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "symbols"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "open_interest_snapshots" ADD CONSTRAINT "open_interest_snapshots_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "symbols"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "volume_snapshots" ADD CONSTRAINT "volume_snapshots_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "symbols"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "funding_rate_snapshots" ADD CONSTRAINT "funding_rate_snapshots_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "symbols"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "growth_metrics" ADD CONSTRAINT "growth_metrics_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "symbols"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "signals" ADD CONSTRAINT "signals_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "symbols"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "symbols"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "symbols"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "alert_settings" ADD CONSTRAINT "alert_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
