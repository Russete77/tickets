/**
 * Anti-IDOR: valida que recurso pertence à org no path.
 * Mismatch retorna NotFoundError (não vaza existência).
 */
import { prisma } from '../../../config/database';
import { NotFoundError } from '../../../shared/errors';

export async function assertPosBelongsToOrg(posId: string, organizationId: string) {
  const pos = await prisma.pointOfSale.findUnique({
    where: { id: posId },
    include: { event: { select: { organizationId: true } } },
  });
  if (!pos || pos.event.organizationId !== organizationId) {
    throw new NotFoundError('POS não encontrado');
  }
  return pos;
}

export async function assertProductBelongsToOrg(productId: string, organizationId: string) {
  const product = await prisma.pOSProduct.findUnique({
    where: { id: productId },
    include: { pos: { include: { event: { select: { organizationId: true } } } } },
  });
  if (!product || product.pos.event.organizationId !== organizationId) {
    throw new NotFoundError('Produto não encontrado');
  }
  return product;
}

export async function assertCategoryBelongsToOrg(categoryId: string, organizationId: string) {
  const category = await prisma.productCategory.findUnique({
    where: { id: categoryId },
    include: { event: { select: { organizationId: true } } },
  });
  if (!category || category.event.organizationId !== organizationId) {
    throw new NotFoundError('Categoria não encontrada');
  }
  return category;
}

export async function assertOperatorBelongsToOrg(operatorId: string, organizationId: string) {
  const operator = await prisma.pOSOperator.findUnique({
    where: { id: operatorId },
    include: { pos: { include: { event: { select: { organizationId: true } } } } },
  });
  if (!operator || operator.pos.event.organizationId !== organizationId) {
    throw new NotFoundError('Operador não encontrado');
  }
  return operator;
}

export async function assertEventBelongsToOrg(eventId: string, organizationId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, organizationId: true },
  });
  if (!event || event.organizationId !== organizationId) {
    throw new NotFoundError('Evento não encontrado');
  }
  return event;
}

export async function assertCustomerOrderBelongsToOrg(orderId: string, organizationId: string) {
  const order = await prisma.customerOrder.findUnique({
    where: { id: orderId },
    include: { event: { select: { organizationId: true } } },
  });
  if (!order || order.event.organizationId !== organizationId) {
    throw new NotFoundError('Pedido não encontrado');
  }
  return order;
}
