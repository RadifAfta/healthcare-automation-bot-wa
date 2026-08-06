import { Router } from 'express';
import { verifyWebhook, receiveWhatsappChat } from '../controllers/webhook.controller';

const router = Router();

/**
 * Health check endpoint - Penting untuk memantau status server secara otomatis
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy and running!',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Endpoint Webhook WhatsApp (GET: Verifikasi dari Meta Developer Dashboard)
 */
router.get('/webhook', verifyWebhook);

/**
 * Endpoint Webhook WhatsApp (POST: Menerima pesan/event dari Meta Cloud API atau testing manual)
 */
router.post('/webhook', receiveWhatsappChat);

export default router;
