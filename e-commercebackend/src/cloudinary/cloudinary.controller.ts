import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from './cloudinary.service';
import 'multer';

function imageFileFilter(
  _req: any,
  file: Express.Multer.File,
  cb: (error: any, acceptFile: boolean) => void,
) {
  if (!file?.mimetype?.startsWith('image/')) {
    return cb(new BadRequestException('Only image files are allowed'), false);
  }
  return cb(null, true);
}

@Controller('cloudinary')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Missing file');
    }

    const url = await this.cloudinaryService.uploadFile(file, 'nextshop');
    return { url };
  }

  @Post('store/logo')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadStoreLogo(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Missing file');
    }

    const url = await this.cloudinaryService.uploadFile(file, 'nextshop/store');
    return { url };
  }

  @Post('store/banner')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadStoreBanner(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Missing file');
    }

    const url = await this.cloudinaryService.uploadFile(file, 'nextshop/store');
    return { url };
  }

  @Post('products/image')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadProductImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Missing file');
    }

    const url = await this.cloudinaryService.uploadFile(file, 'nextshop/products');
    return { url };
  }
}
