const express = require('express');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('[Upload] Missing Cloudinary environment variables. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in backend/.env');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const limits = { fileSize: 50 * 1024 * 1024 };

const fileFilter = (req, file, cb) => {
  const allowedImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedDoc = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/x-zip-compressed'];
  const allowedAudio = ['audio/webm', 'audio/ogg', 'audio/mp3', 'audio/mpeg', 'audio/mp4'];
  if ([...allowedImage, ...allowedDoc, ...allowedAudio].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not supported'), false);
  }
};

const cloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: 'chatsphere',
    resource_type: file.mimetype.startsWith('image/') ? 'image' : 'raw',
    public_id: `${Date.now()}-${path.parse(file.originalname).name}`
  })
});

const uploadsDir = path.join(__dirname, '..', 'uploads');
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${Date.now()}-${name}${ext}`);
  }
});

let upload;
const cloudinaryReady = (async () => {
  try {
    await cloudinary.api.ping();
    console.log('[Upload] Cloudinary connection OK');
    upload = multer({ storage: cloudinaryStorage, limits, fileFilter });
  } catch (err) {
    console.log('[Upload] Cloudinary unavailable (' + (err && err.message ? err.message : err) + '), using local disk storage');
    upload = multer({ storage: localStorage, limits, fileFilter });
  }
})();

router.post('/', authMiddleware, async (req, res, next) => {
  await cloudinaryReady;
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('[Upload] Multer/Cloudinary error:', err.name, '-', err.message);
      if (err.storageErrors?.length) {
        console.error('[Upload] Storage errors:', err.storageErrors);
      }
      return res.status(500).json({ message: err.message || 'Upload failed' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const resolvedPath = path.resolve(req.file.path);
    const resolvedDir = path.resolve(uploadsDir);
    const url = resolvedPath.startsWith(resolvedDir)
      ? '/uploads/' + req.file.filename
      : req.file.path;
    console.log('[Upload] Success:', { url, name: req.file.originalname, size: req.file.size });
    res.json({
      url,
      name: req.file.originalname,
      size: req.file.size,
      format: req.file.mimetype
    });
  } catch (err) {
    console.error('[Upload] Route error:', err.message, err.stack?.split('\n')[0]);
    res.status(500).json({ message: err.message || 'Upload failed' });
  }
});

module.exports = router;
