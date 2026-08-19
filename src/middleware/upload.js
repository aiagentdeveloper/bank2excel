import multer from 'multer';

const PDF_MAGIC = Buffer.from('%PDF-');

export function assertPdf(buffer) {
  if (!buffer || buffer.length < 5) return false;
  return buffer.subarray(0, 5).equals(PDF_MAGIC);
}

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 0,
    parts: 2,
  },
  fileFilter: (req, file, cb) => {
    if (!file || !file.originalname) return cb(new Error('missing_file'));
    if (file.mimetype && file.mimetype !== 'application/pdf') {
      return cb(new Error('invalid_type'));
    }
    cb(null, true);
  },
});

export function validatePdf(req, res, next) {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ error: 'no_file', detail: 'PDF file required.' });
  }
  if (!assertPdf(req.file.buffer)) {
    return res.status(400).json({ error: 'invalid_pdf', detail: 'File is not a valid PDF.' });
  }
  next();
}