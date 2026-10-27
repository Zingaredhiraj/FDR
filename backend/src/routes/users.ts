import { Router } from 'express';
import { z } from 'zod';
import * as userService from '../services/user.service';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { sendSuccess, sendCreated } from '../utils/response';
import { UserRole } from '../constants';

const router = Router();

// All user routes require auth; most require SUPER_ADMIN
router.use(authenticate);

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: UserRole,
  phone: z.string().optional(),
  institutionId: z.string().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  role: UserRole.optional(),
  isActive: z.boolean().optional(),
  institutionId: z.string().optional(),
});

/**
 * @swagger
 * /users:
 *   get:
 *     summary: List users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const result = await userService.listUsers(req.query as Record<string, unknown>);
    sendSuccess(res, result.users, undefined, result.meta);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id as string);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authorize('SUPER_ADMIN'), validateBody(createUserSchema), async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body, req.user!.sub, req.ip);
    sendCreated(res, user, 'User created successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authorize('SUPER_ADMIN'), validateBody(updateUserSchema), async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id as string, req.body, req.user!.sub, req.ip);
    sendSuccess(res, user, 'User updated successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete user (soft)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id as string, req.user!.sub, req.ip);
    sendSuccess(res, null, 'User deleted successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
