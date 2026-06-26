import {
  BadRequestException,
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
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readSync,
  unlinkSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { AppKeyGuard } from '../common/app-key.guard';
import { CreateTripDto } from './dto/create-trip.dto';
import { TripsService } from './trips.service';

const UPLOADS_DIR = 'uploads';
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

// Magic numbers reales (M-2): el MIME del cliente es falsificable; confirmamos que los
// primeros bytes del archivo correspondan a JPEG/PNG de verdad.
function isRealImage(header: Buffer, mimetype: string): boolean {
  const isJpeg =
    header.length >= 3 &&
    header[0] === 0xff &&
    header[1] === 0xd8 &&
    header[2] === 0xff;
  const isPng =
    header.length >= 8 &&
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47;
  return (
    (mimetype === 'image/jpeg' && isJpeg) || (mimetype === 'image/png' && isPng)
  );
}

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
          // Filtro rápido por mimetype; el magic number se re-valida en el handler tras
          // escribir (diskStorage no expone buffer aquí), ver isRealImage (M-2).
          new FileTypeValidator({
            fileType: /^image\/(jpeg|png)$/,
            skipMagicNumbersValidation: true,
          }),
        ],
      }),
    )
    photo: Express.Multer.File,
  ) {
    // diskStorage ya escribió el archivo; re-validamos por magic number y lo descartamos
    // si no es una imagen real (M-2: el MIME declarado por el cliente no basta).
    const fd = openSync(photo.path, 'r');
    const header = Buffer.alloc(8);
    readSync(fd, header, 0, 8, 0);
    closeSync(fd);
    if (!isRealImage(header, photo.mimetype)) {
      unlinkSync(photo.path);
      throw new BadRequestException('La foto no es una imagen JPEG/PNG válida');
    }
    return this.trips.create(dto, `/${UPLOADS_DIR}/${photo.filename}`);
  }
}
