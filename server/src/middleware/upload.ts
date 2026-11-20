import multer from 'multer';
import path from 'path';
import fs from 'fs';

const tempDir = path.resolve(__dirname, '../../../storage/temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

export const uploadMedia = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB max for videos
  },
  fileFilter: (req, file, cb) => {
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska'];
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedDocTypes = ['application/pdf', 'text/plain', 'text/vtt'];

    if (
      allowedVideoTypes.includes(file.mimetype) ||
      allowedImageTypes.includes(file.mimetype) ||
      allowedDocTypes.includes(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(new Error(`File type '${file.mimetype}' is not permitted.`));
    }
  },
});

