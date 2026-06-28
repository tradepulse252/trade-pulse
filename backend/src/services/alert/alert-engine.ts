import { AlertType } from '../../lib/db/types';
import { db } from '../../lib/db';
import { env } from '../../config/env';
import { publish } from '../../lib/redis';
import type { MarketSnapshot, OpportunityResult } from '../../types';

interface PreviousState {
  signalType: string;
  fundingRate: number;
  oiChangePct: number;
  volumeChangePct: number;
}

class AlertEngine {
  private previousStates = new Map<string, PreviousState>();

  async evaluate(
    snapshot: MarketSnapshot,
    opportunity: OpportunityResult,
    primary: { oiChangePct: number; volumeChangePct: number }
  ): Promise<void> {
    const prev = this.previousStates.get(snapshot.symbol);
    const alerts: Array<{ type: AlertType; title: string; message: string }> = [];

    if (prev) {
      if (
        opportunity.signalType === 'STRONG_LONG' &&
        prev.signalType !== 'STRONG_LONG'
      ) {
        alerts.push({
          type: AlertType.NEW_STRONG_LONG,
          title: `🔥 Strong Long: ${snapshot.symbol}`,
          message: `OI +${primary.oiChangePct.toFixed(2)}%, Vol +${primary.volumeChangePct.toFixed(2)}%, Funding ${(snapshot.fundingRate * 100).toFixed(4)}%`,
        });
      }

      if (
        opportunity.signalType === 'STRONG_SHORT' &&
        prev.signalType !== 'STRONG_SHORT'
      ) {
        alerts.push({
          type: AlertType.NEW_STRONG_SHORT,
          title: `🔴 Strong Short: ${snapshot.symbol}`,
          message: `OI +${primary.oiChangePct.toFixed(2)}%, Vol +${primary.volumeChangePct.toFixed(2)}%, Funding ${(snapshot.fundingRate * 100).toFixed(4)}%`,
        });
      }

      const oiDelta = primary.oiChangePct - prev.oiChangePct;
      if (oiDelta >= env.OI_SPIKE_THRESHOLD_PCT) {
        alerts.push({
          type: AlertType.OI_SPIKE,
          title: `OI Spike: ${snapshot.symbol}`,
          message: `Open Interest jumped ${oiDelta.toFixed(2)}% in the last cycle`,
        });
      }

      const volDelta = primary.volumeChangePct - prev.volumeChangePct;
      if (volDelta >= env.VOLUME_SPIKE_THRESHOLD_PCT) {
        alerts.push({
          type: AlertType.VOLUME_SPIKE,
          title: `Volume Spike: ${snapshot.symbol}`,
          message: `Volume surged ${volDelta.toFixed(2)}% in the last cycle`,
        });
      }

      const wasPositive = prev.fundingRate > env.FUNDING_FLIP_THRESHOLD;
      const wasNegative = prev.fundingRate < -env.FUNDING_FLIP_THRESHOLD;
      const isPositive = snapshot.fundingRate > env.FUNDING_FLIP_THRESHOLD;
      const isNegative = snapshot.fundingRate < -env.FUNDING_FLIP_THRESHOLD;

      if ((wasPositive && isNegative) || (wasNegative && isPositive)) {
        alerts.push({
          type: AlertType.FUNDING_FLIP,
          title: `Funding Flip: ${snapshot.symbol}`,
          message: `Funding rate flipped from ${(prev.fundingRate * 100).toFixed(4)}% to ${(snapshot.fundingRate * 100).toFixed(4)}%`,
        });
      }
    }

    this.previousStates.set(snapshot.symbol, {
      signalType: opportunity.signalType,
      fundingRate: snapshot.fundingRate,
      oiChangePct: primary.oiChangePct,
      volumeChangePct: primary.volumeChangePct,
    });

    if (alerts.length === 0) return;

    const users = await db.users.findActiveWithAlertSettings();

    for (const alert of alerts) {
      for (const user of users) {
        const settings = user.alertSettings[0];
        if (!settings) continue;

        const enabled = this.isAlertEnabled(alert.type, settings);
        if (!enabled) continue;

        await db.alerts.create({
          userId: user.id,
          symbolId: snapshot.symbolId,
          alertType: alert.type,
          title: alert.title,
          message: alert.message,
          metadata: {
            opportunityScore: opportunity.opportunityScore,
            signalType: opportunity.signalType,
          },
        });

        if (user.fcmToken) {
          await publish('push-notifications', {
            token: user.fcmToken,
            title: alert.title,
            body: alert.message,
          });
        }
      }

      await publish('alerts', {
        type: 'alert',
        data: { alertType: alert.type, symbol: snapshot.symbol, title: alert.title, message: alert.message },
        timestamp: Date.now(),
      });
    }
  }

  private isAlertEnabled(
    type: AlertType,
    settings: {
      enableStrongLong: boolean;
      enableStrongShort: boolean;
      enableOiSpike: boolean;
      enableVolumeSpike: boolean;
      enableFundingFlip: boolean;
    }
  ): boolean {
    switch (type) {
      case AlertType.NEW_STRONG_LONG:
        return settings.enableStrongLong;
      case AlertType.NEW_STRONG_SHORT:
        return settings.enableStrongShort;
      case AlertType.OI_SPIKE:
        return settings.enableOiSpike;
      case AlertType.VOLUME_SPIKE:
        return settings.enableVolumeSpike;
      case AlertType.FUNDING_FLIP:
        return settings.enableFundingFlip;
      default:
        return true;
    }
  }
}

export const alertEngine = new AlertEngine();
