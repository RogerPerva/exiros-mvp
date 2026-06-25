import {
  Body,
  Controller,
  FileTypeValidator,
  HttpCode,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { AppKeyGuard } from '../common/app-key.guard';
import { CreateTripDto } from './dto/create-trip.dto';
import { TripsService } from './trips.service';

const UPLOADS_DIR = 'uploads';
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

// Extensión derivada del MIME aceptado (NO del originalname del cliente): impide que
// un atacante con la app-key aloje un .html/.svg ejecutable en el dominio. El MIME se
// re-valida con FileTypeValidator; si no es jpeg/png el archivo se descarta (H3).
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

const photoStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) =>
    cb(null, `${randomUUID()}${EXT_BY_MIME[file.mimetype] ?? '.bin'}`),
});

/** POST /api/mobile/trips — multipart: 7 campos + foto, crea viaje + emite tripToken. */
@UseGuards(AppKeyGuard)
@Controller('mobile/trips')
export class MobileTripsController {
  constructor(private readonly trips: TripsService) {}

  @Post()
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('photo', { storage: photoStorage }))
  create(
    @Body() dto: CreateTripDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_PHOTO_BYTES }),
          // diskStorage no expone buffer → validar por mimetype (no magic number).
          new FileTypeValidator({
            fileType: /^image\/(jpeg|png)$/,
            skipMagicNumbersValidation: true,
          }),
        ],
      }),
    )
    photo: Express.Multer.File,
  ) {
    return this.trips.create(dto, `/${UPLOADS_DIR}/${photo.filename}`);
  }
}
