import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

export interface StorageFile {
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  path: string;
}

export interface IStorageService {
  saveFile(file: Express.Multer.File, subfolder: string): Promise<StorageFile>;
  deleteFile(relativeFilePath: string): Promise<boolean>;
  getFileStream(relativeFilePath: string, start?: number, end?: number): Readable;
  getFileStats(relativeFilePath: string): Promise<{ size: number; exists: boolean }>;
  getPublicUrl(subfolder: string, filename: string): string;
}

export class LocalStorageService implements IStorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(__dirname, '../../../storage/uploads');
    this.ensureDirectories();
  }

  private ensureDirectories() {
    const folders = ['videos', 'thumbnails', 'avatars', 'attachments', 'subtitles'];
    for (const folder of folders) {
      const dirPath = path.join(this.baseDir, folder);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }
  }

  async saveFile(file: Express.Multer.File, subfolder: string): Promise<StorageFile> {
    const targetFolder = path.join(this.baseDir, subfolder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uniquePrefix}${ext}`;
    const destinationPath = path.join(targetFolder, filename);

    if (file.path) {
      // If already stored temporarily by multer, move it
      fs.renameSync(file.path, destinationPath);
    } else if (file.buffer) {
      fs.writeFileSync(destinationPath, file.buffer);
    }

    const relativeUrl = `/uploads/${subfolder}/${filename}`;

    return {
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size || (fs.existsSync(destinationPath) ? fs.statSync(destinationPath).size : 0),
      url: relativeUrl,
      path: destinationPath,
    };
  }

  async deleteFile(relativeFilePath: string): Promise<boolean> {
    try {
      const cleanPath = relativeFilePath.replace(/^\/uploads\//, '');
      const fullPath = path.join(this.baseDir, cleanPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  getFileStream(relativeFilePath: string, start?: number, end?: number): Readable {
    const cleanPath = relativeFilePath.replace(/^\/uploads\//, '');
    const fullPath = path.join(this.baseDir, cleanPath);
    if (typeof start === 'number' && typeof end === 'number') {
      return fs.createReadStream(fullPath, { start, end });
    }
    return fs.createReadStream(fullPath);
  }

  async getFileStats(relativeFilePath: string): Promise<{ size: number; exists: boolean }> {
    try {
      const cleanPath = relativeFilePath.replace(/^\/uploads\//, '');
      const fullPath = path.join(this.baseDir, cleanPath);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        return { size: stats.size, exists: true };
      }
      return { size: 0, exists: false };
    } catch {
      return { size: 0, exists: false };
    }
  }

  getPublicUrl(subfolder: string, filename: string): string {
    return `/uploads/${subfolder}/${filename}`;
  }
}

// Global Storage Singleton (Swappable for S3/GCS in cloud deployment)
export const storageService: IStorageService = new LocalStorageService();
