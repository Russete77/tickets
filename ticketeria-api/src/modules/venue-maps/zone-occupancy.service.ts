import { prisma } from '../../config/database';
import { publishBroadcast } from '../../shared/socketBridge';
import type { VenueZone } from './venue-maps.service';

export interface ZoneOccupancy {
  zoneId: string;
  name: string;
  current: number;
  capacity: number | null;
  ratio: number | null;
  status: 'green' | 'yellow' | 'red' | 'unknown';
}

const GENERAL_ZONE_ID = 'general';

function statusFor(ratio: number | null): ZoneOccupancy['status'] {
  if (ratio == null) return 'unknown';
  if (ratio < 0.7) return 'green';
  if (ratio < 0.9) return 'yellow';
  return 'red';
}

export class ZoneOccupancyService {
  static async computeForEvent(eventId: string): Promise<ZoneOccupancy[]> {
    const map = await prisma.venueMap.findUnique({ where: { eventId } });
    const zones = (map?.zones ?? []) as unknown as VenueZone[];

    const logs = await prisma.checkinLog.findMany({
      where: { eventId, result: { in: ['valid', 'offline_valid'] } },
      select: { metadata: true },
    });

    const counts = new Map<string, number>();
    for (const log of logs) {
      const meta = (log.metadata as { zoneId?: string } | null) ?? null;
      const zid = meta?.zoneId ?? GENERAL_ZONE_ID;
      counts.set(zid, (counts.get(zid) ?? 0) + 1);
    }

    const out: ZoneOccupancy[] = zones.map((z) => {
      const current = counts.get(z.id) ?? 0;
      const capacity = typeof z.capacity === 'number' ? z.capacity : null;
      const ratio = capacity && capacity > 0 ? current / capacity : null;
      return { zoneId: z.id, name: z.name, current, capacity, ratio, status: statusFor(ratio) };
    });

    if (counts.has(GENERAL_ZONE_ID) && !zones.some((z) => z.id === GENERAL_ZONE_ID)) {
      out.push({
        zoneId: GENERAL_ZONE_ID,
        name: 'Geral',
        current: counts.get(GENERAL_ZONE_ID) ?? 0,
        capacity: null,
        ratio: null,
        status: 'unknown',
      });
    }

    return out;
  }

  static async publishLiveUpdate(eventId: string): Promise<void> {
    const data = await this.computeForEvent(eventId);
    await publishBroadcast(`event:${eventId}`, 'zone:occupancy', { eventId, zones: data, ts: Date.now() });
  }

  static async tickAllPublishedEvents(): Promise<number> {
    const now = new Date();
    const events = await prisma.event.findMany({
      where: { status: 'published', startsAt: { lte: now }, endsAt: { gte: now } },
      select: { id: true },
    });
    for (const e of events) {
      await this.publishLiveUpdate(e.id);
    }
    return events.length;
  }
}
