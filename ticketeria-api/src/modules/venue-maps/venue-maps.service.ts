import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../shared/errors';

export interface VenueZone {
  id: string;
  name: string;
  polygon: Array<[number, number]>;
  capacity?: number;
  color?: string;
  kind?: 'general' | 'vip' | 'bar' | 'bathroom' | 'first_aid' | 'stage' | 'exit';
}

export interface VenueMapPayload {
  svgUrl?: string | null;
  zones: VenueZone[];
}

function validateZones(zones: unknown): VenueZone[] {
  if (!Array.isArray(zones)) {
    throw new BadRequestError('zones deve ser um array');
  }
  const out: VenueZone[] = [];
  const seenIds = new Set<string>();
  for (const z of zones) {
    if (!z || typeof z !== 'object') throw new BadRequestError('zone inválida');
    const zone = z as Record<string, unknown>;
    if (typeof zone.id !== 'string' || !zone.id.trim()) throw new BadRequestError('zone.id obrigatório');
    if (seenIds.has(zone.id)) throw new BadRequestError(`zone.id duplicado: ${zone.id}`);
    seenIds.add(zone.id);
    if (typeof zone.name !== 'string' || !zone.name.trim()) throw new BadRequestError('zone.name obrigatório');
    if (!Array.isArray(zone.polygon) || zone.polygon.length < 3) {
      throw new BadRequestError(`zone ${zone.id}: polygon precisa de ao menos 3 pontos`);
    }
    for (const pt of zone.polygon as unknown[]) {
      if (!Array.isArray(pt) || pt.length !== 2 || !pt.every((n) => typeof n === 'number')) {
        throw new BadRequestError(`zone ${zone.id}: polygon points devem ser [x,y]`);
      }
    }
    if (zone.capacity != null && (typeof zone.capacity !== 'number' || zone.capacity < 0)) {
      throw new BadRequestError(`zone ${zone.id}: capacity deve ser número >= 0`);
    }
    out.push({
      id: zone.id,
      name: zone.name,
      polygon: zone.polygon as Array<[number, number]>,
      capacity: zone.capacity as number | undefined,
      color: typeof zone.color === 'string' ? zone.color : undefined,
      kind: zone.kind as VenueZone['kind'] | undefined,
    });
  }
  return out;
}

export class VenueMapsService {
  static async getByEvent(eventId: string) {
    const map = await prisma.venueMap.findUnique({ where: { eventId } });
    if (!map) throw new NotFoundError('Mapa do venue não configurado');
    return map;
  }

  static async upsert(eventId: string, payload: VenueMapPayload) {
    const validated = validateZones(payload.zones);
    const svgUrl = payload.svgUrl ?? null;
    return prisma.venueMap.upsert({
      where: { eventId },
      create: { eventId, svgUrl, zones: validated as unknown as object },
      update: { svgUrl, zones: validated as unknown as object },
    });
  }

  static async remove(eventId: string) {
    const map = await prisma.venueMap.findUnique({ where: { eventId } });
    if (!map) throw new NotFoundError('Mapa do venue não existe');
    await prisma.venueMap.delete({ where: { eventId } });
    return { deleted: true };
  }
}
