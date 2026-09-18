import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Đã có lỗi xảy ra phía máy chủ.';

  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'Dung lượng tệp tải lên vượt quá giới hạn tối đa cho phép (20MB/tệp). Vui lòng nén hoặc chọn tệp nhỏ hơn.';
  } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Số lượng tệp tải lên vượt quá số lượng cho phép trong một lần gửi.';
  }

  console.error(`[Lỗi] ${req.method} ${req.originalUrl}:`, err);

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy đường dẫn: ${req.method} ${req.originalUrl}`,
  });
};
