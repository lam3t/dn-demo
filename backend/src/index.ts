import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import app from './app';

const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 TN EDU Backend API đang chạy tại: http://localhost:${PORT}`);
  console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📁 Uploads dir: ${uploadsDir}`);
  console.log(`====================================================`);
});
