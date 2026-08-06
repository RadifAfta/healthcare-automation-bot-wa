import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { env } from '../config/env';
import { addChatToQueue } from '../queue/whatsapp.queue';
import { CustomRequest } from '../app';

// Skema validasi fallback jika dipanggil manual via Postman / REST Client
const manualChatSchema = z.object({
  sender: z.string().min(1),
  message: z.string().min(1),
});

/**
 * Controller GET /api/webhook untuk verifikasi Webhook URL dari Meta Developer Portal
 */
export const verifyWebhook = (req: Request, res: Response): void => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('📡 [Meta Webhook GET] Permintaan verifikasi webhook terdeteksi...');

    if (mode && token) {
      if (mode === 'subscribe' && token === env.META_WA_VERIFY_TOKEN) {
        console.log('✅ [Meta Webhook GET] Verifikasi sukses! Respon challenge dikembalikan.');
        res.status(200).send(challenge);
        return;
      } else {
        console.warn('❌ [Meta Webhook GET] Verifikasi gagal! Token tidak cocok.');
        res.status(403).json({ error: 'Verify token tidak cocok.' });
        return;
      }
    }

    res.status(400).json({ error: 'Parameter hub.mode atau hub.verify_token tidak lengkap.' });
  } catch (error) {
    console.error('💥 [Meta Webhook GET] Error verifikasi:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Helper untuk memvalidasi HMAC-SHA256 signature dari Meta (Security Best Practice)
 */
const verifyMetaSignature = (req: CustomRequest): boolean => {
  const signature = req.headers['x-hub-signature-256'] as string;

  if (!env.META_APP_SECRET || env.META_APP_SECRET.trim() === '') {
    // Jika APP_SECRET tidak diisi di .env, lewati validasi (untuk kemudahan dev lokal)
    return true;
  }

  if (!signature) {
    console.warn('⚠️ [Webhook Security] Header X-Hub-Signature-256 tidak ditemukan pada request Meta.');
    return false;
  }

  if (!req.rawBody) {
    console.warn('⚠️ [Webhook Security] Raw body request kosong, tidak dapat memverifikasi signature.');
    return false;
  }

  const elements = signature.split('=');
  const signatureHash = elements[1];

  const expectedHash = crypto
    .createHmac('sha256', env.META_APP_SECRET)
    .update(req.rawBody)
    .digest('hex');

  return signatureHash === expectedHash;
};

/**
 * Controller POST /api/webhook untuk menerima pesan masuk dari Meta Cloud API atau testing manual
 */
export const receiveWhatsappChat = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Verifikasi Keamanan Signature HMAC-SHA256 (jika META_APP_SECRET terpasang)
    if (env.META_APP_SECRET && env.META_APP_SECRET.trim() !== '' && !verifyMetaSignature(req)) {
      console.warn('⛔ [Webhook Security] Signature Webhook Meta tidak valid! Request ditolak.');
      res.status(401).json({ status: 'error', message: 'Unauthorized: Invalid signature' });
      return;
    }

    const body = req.body;

    // 2. Opsi A: Payload Resmi dari Meta WhatsApp Business Cloud API
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      // Jika ini adalah status update (misal: pesan terkirim/dibaca), kembalikan HTTP 200 tanpa mengantrekan
      if (!messages || messages.length === 0) {
        res.status(200).json({ status: 'ignored', message: 'Status notification received.' });
        return;
      }

      for (const msg of messages) {
        const senderPhone = msg.from; // Nomor HP pengirim (misal "628123456789")
        let messageText = '';

        if (msg.type === 'text' && msg.text?.body) {
          messageText = msg.text.body;
        } else if (msg.type === 'interactive') {
          messageText = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '';
        } else if (msg.type === 'button') {
          messageText = msg.button?.text || '';
        } else {
          console.log(`ℹ️ [Meta Webhook] Menerima tipe pesan '${msg.type}' dari ${senderPhone}, mengabaikan media non-teks.`);
          continue;
        }

        console.log(`\n📥 [Meta Cloud Webhook] Pesan Resmi Masuk!`);
        console.log(`📱 Pengirim: ${senderPhone}`);
        console.log(`💬 Teks: "${messageText}"\n`);

        // Masukkan ke antrean BullMQ Redis secara asinkronus
        await addChatToQueue(senderPhone, messageText);
      }

      // Selalu kembalikan HTTP 200 OK dengan cepat ke Meta agar server Meta tidak timeout atau melakukan retry
      res.status(200).json({ status: 'success' });
      return;
    }

    // 3. Opsi B: Fallback Payload Manual untuk Testing (Misal via Postman JSON: { "sender": "62812...", "message": "Halo" })
    const manualResult = manualChatSchema.safeParse(body);
    if (manualResult.success) {
      const { sender, message } = manualResult.data;
      console.log(`\n📥 [Manual Test Webhook] Pesan Pengujian Diterima!`);
      console.log(`📱 Pengirim: ${sender}`);
      console.log(`💬 Isi Chat: "${message}"\n`);

      const job = await addChatToQueue(sender, message);
      res.status(200).json({
        status: 'queued',
        message: 'Chat pengujian manual berhasil masuk antrean pemrosesan.',
        jobId: job.id,
      });
      return;
    }

    // Jika struktur payload tidak dikenal
    res.status(400).json({
      status: 'error',
      message: 'Format payload webhook tidak dikenal.',
    });
  } catch (error) {
    console.error('💥 [Meta Webhook POST] Terjadi kesalahan saat memproses webhook:', error);
    next(error);
  }
};
