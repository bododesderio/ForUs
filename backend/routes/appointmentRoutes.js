import express from 'express';
import { body } from 'express-validator';
import { create, 
    get, 
    reject, 
    review, 
    update, 
    cancel,
    confirm, 
    blockSlot, 
    reschedule,
    getUserAppointments, 
    getAvailableAppointments, 
    getConsultantAppointments, 
    getConsultantReviewsPaginated,
    startSession, 
    getAll
} from '../controllers/AppointmentController.js';
import { authenticate } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/error.js';

const router = express.Router();

router.post('/create', authenticate, create);
router.get('/user/:userId', authenticate, getUserAppointments);
router.get('/consultant/:consultantId', authenticate, getConsultantAppointments);
router.get('/consultant/:consultantId/availability', authenticate, getAvailableAppointments);
router.get('/get', authenticate, [
    body('status').optional(),
    body('date_from').optional(),
    body('date_to').optional()
], handleValidationErrors, get);
router.get('/all', authenticate, getAll)
router.patch('/:id/status', authenticate, update);
router.get('/consultants/:consultantId/reviews', getConsultantReviewsPaginated);
router.post('/:id/review', authenticate, [
    body('review_text').optional().isString().withMessage('Review text must be a string')
], handleValidationErrors, review);
router.post('/block', authenticate, blockSlot);
router.post('/:id/confirm', authenticate, confirm);
router.post('/:id/reject', authenticate, reject);
router.post('/:id/reschedule', authenticate, reschedule);
router.post('/:id/cancel', authenticate, cancel);
router.post('/:id/start-session', authenticate, startSession);

export default router;
