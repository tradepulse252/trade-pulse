-- Trade-Pulse PostgreSQL Initialization
-- Optimizations for time-series workloads and concurrent reads

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Partial indexes for hot query paths (created after Prisma migrations)
-- These supplement Prisma-generated indexes for production performance

-- Function: cleanup old snapshots (run via cron)
CREATE OR REPLACE FUNCTION cleanup_old_snapshots(retention_days INT DEFAULT 30)
RETURNS void AS $$
BEGIN
  DELETE FROM price_snapshots WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
  DELETE FROM open_interest_snapshots WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
  DELETE FROM volume_snapshots WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
  DELETE FROM funding_rate_snapshots WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
  DELETE FROM error_logs WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function: get top opportunities (used by dashboard)
CREATE OR REPLACE FUNCTION get_top_opportunities(
  p_limit INT DEFAULT 50,
  p_min_score DECIMAL DEFAULT 0,
  p_signal_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  symbol TEXT,
  signal_type TEXT,
  opportunity_score DECIMAL,
  price DECIMAL,
  open_interest DECIMAL,
  oi_change_pct DECIMAL,
  volume_usdt DECIMAL,
  volume_change_pct DECIMAL,
  funding_rate DECIMAL,
  rank INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.symbol,
    sig.signal_type::TEXT,
    sig.opportunity_score,
    sig.price,
    sig.open_interest,
    sig.oi_change_pct,
    sig.volume_usdt,
    sig.volume_change_pct,
    sig.funding_rate,
    sig.rank
  FROM signals sig
  JOIN symbols s ON s.id = sig.symbol_id
  WHERE sig.is_active = true
    AND sig.opportunity_score >= p_min_score
    AND (p_signal_type IS NULL OR sig.signal_type::TEXT = p_signal_type)
  ORDER BY sig.opportunity_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
