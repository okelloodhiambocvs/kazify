import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

/**
 * Express Middleware using Zod schema validation
 */
export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error: any) {
      if (error instanceof ZodError || error?.issues) {
        const issuesList = (error.issues || []).map((e: any) => `${(e.path || []).join('.') || 'body'}: ${e.message}`).join('; ');
        return res.status(400).json({
          error: `Validation failure: ${issuesList}`,
          details: error.issues || []
        });
      }
      return res.status(400).json({ error: 'Invalid request payload format' });
    }
  };
};

// ============================================================================
// REUSABLE ZOD SCHEMAS
// ============================================================================

export const loginSchema = z.object({
  email: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  identifier: z.string().optional().or(z.literal('')),
  password: z.string().min(1, 'Password is required')
}).refine(data => !!(data.email || data.phone || data.identifier), {
  message: 'Either email, phone, or identifier must be provided'
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Valid email address is required'),
  phone: z.string().min(8, 'Phone number must be at least 8 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  role: z.enum(['customer', 'fundi', 'admin']),
  category: z.string().optional(),
  subcategories: z.array(z.string()).optional(),
  bio: z.string().optional(),
  location: z.any().optional()
});

export const createJobSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  category: z.string().min(2, 'Category is required'),
  amount: z.number().positive('Amount/Budget must be positive').optional(),
  budget: z.number().positive('Amount/Budget must be positive').optional(),
  location: z.any().optional(),
  description: z.string().min(5, 'Description must be at least 5 characters')
}).refine(data => data.amount !== undefined || data.budget !== undefined, {
  message: 'Job amount or budget must be provided'
});

export const fundEscrowSchema = z.object({
  jobId: z.string().min(1, 'jobId is required'),
  amount: z.number().positive('amount must be positive'),
  fundiId: z.string().optional()
});

export const releaseEscrowSchema = z.object({
  jobId: z.string().min(1, 'jobId is required')
});

export const stkPushSchema = z.object({
  phoneNumber: z.string().min(8, 'phoneNumber is required'),
  amount: z.number().positive('amount must be positive'),
  jobId: z.string().optional()
});
