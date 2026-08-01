/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
import express from 'express';
import { create, del, detail, get, update } from '../controllers/eventController.js';
import { authenticate } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/error.js';
import { body } from 'express-validator';

const router = express.Router();

router.post('/create', authenticate, create)
router.get('/get', authenticate, handleValidationErrors, [body('page').optional(), body('limit').optional(), body('date_from').optional(), body('date_to').optional(), body('location').optional()], get)
router.get('/details/:id', authenticate, detail)
router.delete('/delete/:id', authenticate, del)
router.patch('/update/:id', authenticate, handleValidationErrors, [body('title').optional(), body('description').optional(), body('event_date').optional(), body('location').optional(), body('organizer').optional()], update)

export default router;
