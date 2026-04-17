import { Request, Response, NextFunction } from 'express';
import { FormFieldsService } from './form-fields.service';
import { CreateFieldInput, UpdateFieldInput, SubmitResponseInput } from './form-fields.validators';

/**
 * Controllers para o módulo de campos de formulário
 */

/**
 * POST /form-fields/:eventId
 * Cria um novo campo de formulário
 */
export const createField = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eventId = req.params.eventId as string;
    const data = req.body as CreateFieldInput;

    const field = await FormFieldsService.createField(eventId, data);

    res.status(201).json({
      success: true,
      data: field,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /form-fields/:eventId
 * Lista campos de formulário de um evento
 */
export const listFields = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eventId = req.params.eventId as string;

    const fields = await FormFieldsService.listFields(eventId);

    res.json({
      success: true,
      data: fields,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /form-fields/:id
 * Atualiza um campo de formulário
 */
export const updateField = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const fieldId = req.params.id as string;
    const data = req.body as UpdateFieldInput;

    const field = await FormFieldsService.updateField(fieldId, data);

    res.json({
      success: true,
      data: field,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /form-fields/:id
 * Deleta um campo de formulário
 */
export const deleteField = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const fieldId = req.params.id as string;

    await FormFieldsService.deleteField(fieldId);

    res.json({
      success: true,
      message: 'Campo de formulário deletado com sucesso',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /form-fields/responses/:ticketId
 * Submete respostas de formulário para um ticket
 */
export const submitResponses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ticketId = req.params.ticketId as string;
    const data = req.body as SubmitResponseInput;

    const responses = await FormFieldsService.submitResponses(ticketId, data);

    res.status(201).json({
      success: true,
      data: responses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /form-fields/responses/:ticketId
 * Obtém respostas de formulário de um ticket
 */
export const getResponses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ticketId = req.params.ticketId as string;

    const responses = await FormFieldsService.getResponses(ticketId);

    res.json({
      success: true,
      data: responses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /form-fields/:eventId/export
 * Exporta todas as respostas de um evento
 */
export const exportResponses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eventId = req.params.eventId as string;

    const responses = await FormFieldsService.getEventResponses(eventId);

    res.json({
      success: true,
      data: responses,
    });
  } catch (error) {
    next(error);
  }
};
