import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: any;
  error?: any;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
  meta?: any
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta })
  };
  return res.status(statusCode).json(response);
};

export const sendCreated = <T>(
  res: Response,
  data: T,
  message = 'Resource created successfully',
  meta?: any
): Response => {
  return sendSuccess(res, data, message, 201, meta);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  error?: any
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    ...(error && { error })
  };
  return res.status(statusCode).json(response);
};
