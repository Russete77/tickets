import { z } from 'zod';
import { EventCategory, BatchType } from '../../generated/prisma/client';

/**
 * Validadores Zod para o módulo de eventos
 */

export const createEventSchema = z.object({
  title: z
    .string()
    .min(3, 'Título deve ter pelo menos 3 caracteres')
    .max(255, 'Título muito longo'),
  description: z
    .string()
    .min(10, 'Descrição deve ter pelo menos 10 caracteres')
    .max(5000, 'Descrição muito longa'),
  shortDescription: z
    .string()
    .min(10, 'Descrição curta deve ter pelo menos 10 caracteres')
    .max(500, 'Descrição curta muito longa'),
  category: z.enum(Object.values(EventCategory) as [string, ...string[]]),
  venueName: z
    .string()
    .min(3, 'Nome do local deve ter pelo menos 3 caracteres')
    .max(255, 'Nome do local muito longo'),
  venueAddress: z
    .string()
    .min(5, 'Endereço deve ter pelo menos 5 caracteres')
    .max(500, 'Endereço muito longo'),
  venueLat: z
    .number()
    .min(-90, 'Latitude inválida')
    .max(90, 'Latitude inválida')
    .optional(),
  venueLng: z
    .number()
    .min(-180, 'Longitude inválida')
    .max(180, 'Longitude inválida')
    .optional(),
  venueCapacity: z
    .number()
    .min(1, 'Capacidade deve ser maior que 0')
    .int('Capacidade deve ser um número inteiro'),
  startsAt: z.coerce.date().refine((date) => date > new Date(), 'Evento deve ser no futuro'),
  endsAt: z.coerce.date(),
  doorsOpenAt: z.coerce.date().optional(),
  coverImageUrl: z
    .string()
    .url('URL da imagem de capa inválida')
    .max(500, 'URL muito longa'),
  tags: z
    .array(z.string().max(50))
    .max(10, 'Máximo de 10 tags')
    .optional()
    .default([]),
  ageRating: z
    .string()
    .max(10, 'Classificação etária muito longa')
    .optional()
    .default('Livre'),
  dressCode: z
    .string()
    .max(100, 'Código de vestuário muito longo')
    .optional(),
  isOpenBar: z.boolean().optional().default(false),
  lineup: z
    .array(z.string().max(255))
    .optional()
    .default([]),
  rules: z
    .string()
    .max(2000, 'Regras muito longas')
    .optional(),
  maxTicketsPerCpf: z
    .number()
    .min(1, 'Máximo de ingressos deve ser maior que 0')
    .int('Deve ser um número inteiro')
    .optional()
    .default(4),
  batches: z
    .array(
      z.object({
        name: z
          .string()
          .min(1, 'Nome do lote obrigatório')
          .max(100, 'Nome do lote muito longo'),
        priceCents: z
          .number()
          .min(0, 'Preço não pode ser negativo')
          .int('Preço deve ser em centavos'),
        quantity: z
          .number()
          .min(1, 'Quantidade deve ser maior que 0')
          .int('Quantidade deve ser um número inteiro'),
        type: z.enum(Object.values(BatchType) as [string, ...string[]]).optional().default('regular'),
        startsAt: z.coerce.date().optional(),
        endsAt: z.coerce.date().optional(),
        autoSwitch: z.boolean().optional().default(true),
      }),
    )
    .min(1, 'Pelo menos um lote é obrigatório'),
});

export const updateEventSchema = createEventSchema.partial().omit({ batches: true });

export const searchEventsSchema = z.object({
  query: z.string().max(255).optional(),
  category: z.enum(Object.values(EventCategory) as [string, ...string[]]).optional(),
  city: z.string().max(100).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  isOpenBar: z.coerce.boolean().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const eventIdParamSchema = z.object({
  id: z.string().uuid('ID de evento inválido'),
});

export const nearbySchema = z.object({
  lat: z.coerce
    .number()
    .min(-90, 'Latitude deve estar entre -90 e 90')
    .max(90, 'Latitude deve estar entre -90 e 90'),
  lng: z.coerce
    .number()
    .min(-180, 'Longitude deve estar entre -180 e 180')
    .max(180, 'Longitude deve estar entre -180 e 180'),
  radius: z.coerce
    .number()
    .min(0.1, 'Raio deve ser maior que 0.1 km')
    .max(500, 'Raio deve ser menor que 500 km')
    .default(10),
  category: z.enum(Object.values(EventCategory) as [string, ...string[]]).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// Type exports
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type SearchEventsInput = z.infer<typeof searchEventsSchema>;
export type EventIdParam = z.infer<typeof eventIdParamSchema>;
export type NearbyInput = z.infer<typeof nearbySchema>;
