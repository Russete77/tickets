import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Polygon, Image as SvgImage, Text as SvgText } from 'react-native-svg';
import { Colors } from '../styles/tokens';
import { getSocket } from '../lib/socket';
import { getVenueMap, getZoneOccupancy, type VenueZone, type VenueZoneKind, type ZoneOccupancy } from '../lib/venueMap';

const HEATMAP_COLOR: Record<ZoneOccupancy['status'], string> = {
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
  unknown: '#64748b',
};

const KIND_COLORS: Record<VenueZoneKind, string> = {
  general: '#3b82f6',
  vip: '#a855f7',
  bar: '#f59e0b',
  bathroom: '#94a3b8',
  first_aid: '#ef4444',
  stage: '#10b981',
  exit: '#64748b',
};

function zoneFill(z: VenueZone): string {
  if (z.color) return z.color;
  if (z.kind) return KIND_COLORS[z.kind];
  return KIND_COLORS.general;
}

interface Props {
  eventId: string;
  onZonePress?: (z: VenueZone) => void;
}

export function VenueMapScreen({ eventId, onZonePress }: Props) {
  const queryClient = useQueryClient();
  const { data: map, isLoading, error } = useQuery({
    queryKey: ['venue-map', eventId],
    queryFn: () => getVenueMap(eventId),
    enabled: !!eventId,
  });
  const { data: occupancy = [] } = useQuery({
    queryKey: ['zone-occupancy', eventId],
    queryFn: () => getZoneOccupancy(eventId),
    enabled: !!eventId,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!eventId) return;
    let cleanup: (() => void) | undefined;
    void (async () => {
      const s = await getSocket();
      s.emit('event:join', { eventId });
      const handler = () => queryClient.invalidateQueries({ queryKey: ['zone-occupancy', eventId] });
      s.on('zone:occupancy', handler);
      cleanup = () => s.off('zone:occupancy', handler);
    })();
    return () => cleanup?.();
  }, [eventId, queryClient]);

  const occMap = useMemo(() => {
    const m = new Map<string, ZoneOccupancy>();
    for (const o of occupancy) m.set(o.zoneId, o);
    return m;
  }, [occupancy]);

  const viewBox = useMemo(() => {
    if (!map?.zones || map.zones.length === 0) return '0 0 200 200';
    const xs = map.zones.flatMap((z) => z.polygon.map(([x]) => x));
    const ys = map.zones.flatMap((z) => z.polygon.map(([, y]) => y));
    const minX = Math.min(0, ...xs);
    const minY = Math.min(0, ...ys);
    const maxX = Math.max(...xs, 200);
    const maxY = Math.max(...ys, 200);
    return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  }, [map]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.textPrimary} />
      </View>
    );
  }

  if (error || !map) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Mapa do venue não disponível.</Text>
      </View>
    );
  }

  const { minX = 0, minY = 0, w = 200, h = 200 } = parseViewBox(viewBox);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Mapa do venue</Text>
      <Svg viewBox={viewBox} style={styles.svg}>
        {map.svgUrl && (
          <SvgImage href={{ uri: map.svgUrl }} x={minX} y={minY} width={w} height={h} preserveAspectRatio="xMidYMid meet" />
        )}
        {map.zones.map((z) => {
          const occ = occMap.get(z.id);
          const fill = occ ? HEATMAP_COLOR[occ.status] : zoneFill(z);
          const opacity = occ?.status === 'red' ? 'cc' : occ?.status === 'yellow' ? 'aa' : '88';
          return (
            <Polygon
              key={z.id}
              points={z.polygon.map((p) => p.join(',')).join(' ')}
              fill={`${fill}${opacity}`}
              stroke="#fff"
              strokeWidth={1}
              onPress={() => onZonePress?.(z)}
            />
          );
        })}
        {map.zones.map((z) => {
          const cx = z.polygon.reduce((s, [x]) => s + x, 0) / z.polygon.length;
          const cy = z.polygon.reduce((s, [, y]) => s + y, 0) / z.polygon.length;
          return (
            <SvgText key={`${z.id}-l`} x={cx} y={cy} fill="#fff" fontSize="10" textAnchor="middle">
              {z.name}
            </SvgText>
          );
        })}
      </Svg>
      <View style={styles.legend}>
        {Object.entries(KIND_COLORS).map(([k, c]) => (
          <View key={k} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: c }]} />
            <Text style={styles.legendText}>{k}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function parseViewBox(vb: string): { minX: number; minY: number; w: number; h: number } {
  const [minX, minY, w, h] = vb.split(/\s+/).map(Number);
  return {
    minX: minX ?? 0,
    minY: minY ?? 0,
    w: w ?? 200,
    h: h ?? 200,
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: Colors.bg },
  header: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  svg: { flex: 1, backgroundColor: '#0f172a', borderRadius: 8 },
  muted: { color: Colors.textSecondary, textAlign: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 4 },
  legendText: { color: Colors.textSecondary, fontSize: 12 },
});
