import { Router } from 'express';
import { verifyWebhook, receiveWhatsappChat } from '../controllers/webhook.controller';
import { getMediaById } from '../controllers/media.controller';

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

/**
 * Endpoint Proxy Media (GET: Membuka dan mengunduh foto/audio yang dikirim pasien)
 */
router.get('/media/:mediaId', getMediaById);

export default router;
