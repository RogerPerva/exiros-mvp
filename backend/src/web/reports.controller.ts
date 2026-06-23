import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto/report-query.dto';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Reporte de viajes en Excel (RN-07). Protegido con JWT como todo /api/web/*. */
@Controller('web/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /** GET /api/web/reports/export?from&to&status&destinationId → .xlsx (13 columnas). */
  @Get('export')
  async export(
    @Query() query: ReportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.reports.exportXlsx(query);
    const filename = `reporte-viajes-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.set({
      'Content-Type': XLSX_MIME,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
      // El portal (otro origen) necesita leer el nombre del archivo del header.
      'Access-Control-Expose-Headers': 'Content-Disposition',
    });
    res.end(buffer);
  }
}
