import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../../middleware/auth';
import { requireOrganizationRole } from '../../../middleware/organization';
import { validate } from '../../../middleware/validate';
import { asyncHandler } from '../../../shared/asyncHandler';
import { BadRequestError } from '../../../shared/errors';
import { ProductsService } from './products.service';
import {
  orgEventParamsSchema,
  orgPosParamsSchema,
  orgProductParamsSchema,
  cloneFromParamsSchema,
  createProductSchema,
  updateProductSchema,
  productListQuerySchema,
  cloneCatalogQuerySchema,
} from './products.validators';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(new BadRequestError('Tipo de imagem não suportado. Use JPEG, PNG ou WebP.'));
      return;
    }
    cb(null, true);
  },
});

export const productsRouter = Router();
productsRouter.use(authenticate);

productsRouter.get(
  '/:organizationId/events/:eventId/products',
  requireOrganizationRole('viewer'),
  validate({ params: orgEventParamsSchema, query: productListQuerySchema }),
  asyncHandler(async (req, res) => {
    const data = await ProductsService.listByEvent({
      organizationId: String(req.params.organizationId),
      eventId: String(req.params.eventId),
      posId: req.query.posId as string | undefined,
      categoryId: req.query.categoryId as string | undefined,
      isAvailable: req.query.isAvailable === undefined ? undefined : req.query.isAvailable === 'true',
    });
    res.json({ success: true, data });
  }),
);

productsRouter.post(
  '/:organizationId/pos/:posId/products',
  requireOrganizationRole('finance'),
  validate({ params: orgPosParamsSchema, body: createProductSchema }),
  asyncHandler(async (req, res) => {
    const data = await ProductsService.create({
      organizationId: String(req.params.organizationId),
      posId: String(req.params.posId),
      actorId: req.user!.userId,
      data: req.body,
    });
    res.status(201).json({ success: true, data });
  }),
);

productsRouter.patch(
  '/:organizationId/products/:productId',
  requireOrganizationRole('finance'),
  validate({ params: orgProductParamsSchema, body: updateProductSchema }),
  asyncHandler(async (req, res) => {
    const data = await ProductsService.update({
      organizationId: String(req.params.organizationId),
      productId: String(req.params.productId),
      actorId: req.user!.userId,
      data: req.body,
    });
    res.json({ success: true, data });
  }),
);

productsRouter.delete(
  '/:organizationId/products/:productId',
  requireOrganizationRole('admin'),
  validate({ params: orgProductParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await ProductsService.archive({
      organizationId: String(req.params.organizationId),
      productId: String(req.params.productId),
      actorId: req.user!.userId,
    });
    res.json({ success: true, data });
  }),
);

productsRouter.post(
  '/:organizationId/products/:productId/image',
  requireOrganizationRole('finance'),
  upload.single('image'),
  validate({ params: orgProductParamsSchema }),
  asyncHandler(async (req, res) => {
    if (!req.file?.buffer) throw new BadRequestError('Arquivo "image" é obrigatório (multipart)');
    const data = await ProductsService.uploadImage({
      organizationId: String(req.params.organizationId),
      productId: String(req.params.productId),
      actorId: req.user!.userId,
      buffer: req.file.buffer,
    });
    res.json({ success: true, data });
  }),
);

productsRouter.delete(
  '/:organizationId/products/:productId/image',
  requireOrganizationRole('finance'),
  validate({ params: orgProductParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await ProductsService.deleteImage({
      organizationId: String(req.params.organizationId),
      productId: String(req.params.productId),
      actorId: req.user!.userId,
    });
    res.json({ success: true, data });
  }),
);

productsRouter.post(
  '/:organizationId/pos/:posId/products/clone-from/:sourcePosId',
  requireOrganizationRole('admin'),
  validate({ params: cloneFromParamsSchema, query: cloneCatalogQuerySchema }),
  asyncHandler(async (req, res) => {
    const data = await ProductsService.cloneCatalog({
      organizationId: String(req.params.organizationId),
      posId: String(req.params.posId),
      sourcePosId: String(req.params.sourcePosId),
      actorId: req.user!.userId,
      overwrite: req.query.overwrite === 'true',
    });
    res.json({ success: true, data });
  }),
);
