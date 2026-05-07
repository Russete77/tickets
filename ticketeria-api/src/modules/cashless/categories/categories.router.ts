import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireOrganizationRole } from '../../../middleware/organization';
import { validate } from '../../../middleware/validate';
import { asyncHandler } from '../../../shared/asyncHandler';
import { CategoriesService } from './categories.service';
import {
  orgEventParamsSchema,
  orgCategoryParamsSchema,
  createCategorySchema,
  updateCategorySchema,
  reorderCategoriesSchema,
  deleteCategoryQuerySchema,
} from './categories.validators';

export const categoriesRouter = Router();

categoriesRouter.use(authenticate);

categoriesRouter.get(
  '/:organizationId/events/:eventId/categories',
  requireOrganizationRole('viewer'),
  validate({ params: orgEventParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await CategoriesService.list({
      organizationId: String(req.params.organizationId),
      eventId: String(req.params.eventId),
    });
    res.json({ success: true, data });
  }),
);

categoriesRouter.post(
  '/:organizationId/events/:eventId/categories',
  requireOrganizationRole('finance'),
  validate({ params: orgEventParamsSchema, body: createCategorySchema }),
  asyncHandler(async (req, res) => {
    const data = await CategoriesService.create({
      organizationId: String(req.params.organizationId),
      eventId: String(req.params.eventId),
      actorId: req.user!.userId,
      data: req.body,
    });
    res.status(201).json({ success: true, data });
  }),
);

categoriesRouter.patch(
  '/:organizationId/categories/:categoryId',
  requireOrganizationRole('finance'),
  validate({ params: orgCategoryParamsSchema, body: updateCategorySchema }),
  asyncHandler(async (req, res) => {
    const data = await CategoriesService.update({
      organizationId: String(req.params.organizationId),
      categoryId: String(req.params.categoryId),
      actorId: req.user!.userId,
      data: req.body,
    });
    res.json({ success: true, data });
  }),
);

categoriesRouter.delete(
  '/:organizationId/categories/:categoryId',
  requireOrganizationRole('admin'),
  validate({ params: orgCategoryParamsSchema, query: deleteCategoryQuerySchema }),
  asyncHandler(async (req, res) => {
    const data = await CategoriesService.archive({
      organizationId: String(req.params.organizationId),
      categoryId: String(req.params.categoryId),
      actorId: req.user!.userId,
      force: req.query.force === 'true',
    });
    res.json({ success: true, data });
  }),
);

categoriesRouter.patch(
  '/:organizationId/events/:eventId/categories/reorder',
  requireOrganizationRole('finance'),
  validate({ params: orgEventParamsSchema, body: reorderCategoriesSchema }),
  asyncHandler(async (req, res) => {
    const data = await CategoriesService.reorder({
      organizationId: String(req.params.organizationId),
      eventId: String(req.params.eventId),
      actorId: req.user!.userId,
      items: req.body.items,
    });
    res.json({ success: true, data });
  }),
);
