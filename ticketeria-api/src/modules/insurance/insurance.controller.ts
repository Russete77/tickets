import { Request, Response, NextFunction } from 'express';
import { InsuranceService } from './insurance.service';
import { CreateInsuranceInput, UpdateInsuranceInput } from './insurance.validators';

/**
 * Controllers para o módulo de seguro
 */

/**
 * POST /insurance/:eventId
 * Cria um novo registro de seguro para um evento
 */
export const createInsurance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eventId = req.params.eventId;
    const data = req.body as CreateInsuranceInput;

    const insurance = await InsuranceService.create(eventId, data);

    res.status(201).json({
      success: true,
      data: insurance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /insurance/:eventId
 * Obtém seguro de um evento
 */
export const getInsurance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eventId = req.params.eventId;

    const insurance = await InsuranceService.getByEvent(eventId);

    res.json({
      success: true,
      data: insurance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /insurance/:id
 * Atualiza um registro de seguro
 */
export const updateInsurance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const insuranceId = req.params.id;
    const data = req.body as UpdateInsuranceInput;

    const insurance = await InsuranceService.update(insuranceId, data);

    res.json({
      success: true,
      data: insurance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /insurance/:id
 * Deleta um registro de seguro
 */
export const deleteInsurance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const insuranceId = req.params.id;

    await InsuranceService.delete(insuranceId);

    res.json({
      success: true,
      message: 'Seguro deletado com sucesso',
    });
  } catch (error) {
    next(error);
  }
};
