/**
 * Router de organizações.
 * Auditoria CTO 2026-05 — gap 4.1
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { requireOrganizationRole } from '../../middleware/organization';
import { asyncHandler } from '../../shared/asyncHandler';
import { OrganizationsService } from './organizations.service';
import {
  createOrganizationSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  memberParamsSchema,
} from './organizations.validators';

export const organizationsRouter = Router();

organizationsRouter.use(authenticate);

/** Lista organizações onde sou membro. */
organizationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const memberships = await OrganizationsService.listForUser(req.user!.userId);
    res.json({ success: true, data: memberships });
  }),
);

/** Cria organização (qualquer usuário pode). */
organizationsRouter.post(
  '/',
  validate(createOrganizationSchema),
  asyncHandler(async (req, res) => {
    const org = await OrganizationsService.create(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: org });
  }),
);

/** Detalhes — exige ser membro. */
organizationsRouter.get(
  '/:organizationId',
  requireOrganizationRole('viewer'),
  asyncHandler(async (req, res) => {
    const org = await OrganizationsService.getById(String(req.params.organizationId));
    res.json({ success: true, data: org });
  }),
);

/** Convidar membro — admin+. */
organizationsRouter.post(
  '/:organizationId/members',
  requireOrganizationRole('admin'),
  validate(inviteMemberSchema),
  asyncHandler(async (req, res) => {
    const member = await OrganizationsService.inviteMember({
      organizationId: String(req.params.organizationId),
      email: req.body.email,
      role: req.body.role,
      invitedBy: req.user!.userId,
    });
    res.status(201).json({ success: true, data: member });
  }),
);

/** Aceitar convite — só o próprio usuário. */
organizationsRouter.post(
  '/:organizationId/accept',
  asyncHandler(async (req, res) => {
    const member = await OrganizationsService.acceptInvite(
      String(req.params.organizationId),
      req.user!.userId,
    );
    res.json({ success: true, data: member });
  }),
);

/** Alterar role de membro — owner only. */
organizationsRouter.patch(
  '/:organizationId/members/:userId',
  requireOrganizationRole('owner'),
  validate(updateMemberRoleSchema),
  asyncHandler(async (req, res) => {
    const updated = await OrganizationsService.updateMemberRole(
      String(req.params.organizationId),
      String(req.params.userId),
      req.body.role,
      req.user!.userId,
    );
    res.json({ success: true, data: updated });
  }),
);

/** Remover membro — owner only. */
organizationsRouter.delete(
  '/:organizationId/members/:userId',
  requireOrganizationRole('owner'),
  validate(memberParamsSchema),
  asyncHandler(async (req, res) => {
    await OrganizationsService.removeMember(
      String(req.params.organizationId),
      String(req.params.userId),
      req.user!.userId,
    );
    res.status(204).end();
  }),
);
