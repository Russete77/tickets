import { prisma } from '../../config/database';
import { BadRequestError } from '../../shared/errors';

interface CSVRow {
  name: string;
  cpf?: string;
  phone?: string;
  email?: string;
}

interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

/**
 * Serviço de importação de CSV para guest lists
 */
export class ImportService {
  /**
   * Importar entradas de um string CSV
   * Formato esperado: name,cpf,phone,email (sem header)
   */
  async importFromCSV(
    guestListConfigId: string,
    csvContent: string,
    listType: string,
  ): Promise<ImportResult> {
    const lines = csvContent.trim().split('\n');

    if (lines.length === 0) {
      throw new BadRequestError('CSV vazio');
    }

    // Verificar se o arquivo tem header ou não
    let startIndex = 0;
    const firstLine = lines[0].toLowerCase();
    if (
      firstLine.includes('name') ||
      firstLine.includes('nome') ||
      firstLine.includes('cpf')
    ) {
      startIndex = 1; // Pular header
    }

    const result: ImportResult = {
      total: lines.length - startIndex,
      created: 0,
      skipped: 0,
      errors: [],
    };

    // Coletar IDs para deduplicação
    const processedCPFs = new Set<string>();
    const rows: CSVRow[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) {
        result.skipped++;
        continue;
      }

      try {
        const [name, cpf = '', phone = '', email = ''] = line.split(',').map((v) => v.trim());

        if (!name) {
          result.errors.push({
            row: i + 1,
            error: 'Nome é obrigatório',
          });
          result.skipped++;
          continue;
        }

        // Validar CPF se fornecido
        if (cpf && cpf.length !== 11) {
          result.errors.push({
            row: i + 1,
            error: 'CPF inválido (deve ter 11 dígitos)',
          });
          result.skipped++;
          continue;
        }

        // Deduplicar por CPF
        if (cpf && processedCPFs.has(cpf)) {
          result.errors.push({
            row: i + 1,
            error: 'CPF duplicado no arquivo',
          });
          result.skipped++;
          continue;
        }

        if (cpf) {
          processedCPFs.add(cpf);
        }

        rows.push({
          name,
          cpf: cpf || undefined,
          phone: phone || undefined,
          email: email || undefined,
        });
      } catch (error) {
        result.errors.push({
          row: i + 1,
          error: 'Erro ao processar linha',
        });
        result.skipped++;
      }
    }

    // Bulk create
    if (rows.length > 0) {
      try {
        await prisma.guestEntry.createMany({
          data: rows.map((row) => ({
            guestListId: guestListConfigId,
            name: row.name,
            cpf: row.cpf || null,
            phone: row.phone || null,
            email: row.email || null,
            listType,
            status: 'pending',
            plusOnes: 0,
          })),
          skipDuplicates: false,
        });

        result.created = rows.length;
      } catch (error) {
        throw new BadRequestError('Erro ao importar entradas: ' + (error instanceof Error ? error.message : 'desconhecido'));
      }
    }

    return result;
  }
}

export const importService = new ImportService();
