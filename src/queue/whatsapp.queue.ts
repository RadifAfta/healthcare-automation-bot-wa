import { Queue } from 'bullmq';
import redisConnection from '../config/redis';

// Definisikan nama antrean
export const WHATSAPP_QUEUE_NAME = 'whatsapp-chats';

// Inisialisasi Queue BullMQ (Producer)
export const whatsappQueue = new Queue(WHATSAPP_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Otomatis mengulang (retry) sebanyak 3 kali jika proses gagal
    backoff: {
      type: 'exponential',
      delay: 5000, // Delay awal retry adalah 5 detik, berlipat ganda secara eksponensial (5s -> 10s -> 20s)
    },
    removeOnComplete: true, // Langsung hapus job dari Redis jika sukses untuk menghemat memori Redis
    removeOnFail: false, // Biarkan job tetap tersimpan jika gagal agar kita bisa melihat & men-debug-nya nanti
  },
});

/**
 * Fungsi Producer untuk memasukkan data WhatsApp chat ke dalam antrean Redis.
 * Mendukung idempotency berbasis WAMID (messageId) dari Meta Cloud API.
 */
export const addChatToQueue = async (sender: string, message: string, messageId?: string) => {
  try {
    // BullMQ melarang karakter ':' di dalam custom jobId
    const sanitizedJobId = messageId ? `wamid_${messageId.replace(/[^a-zA-Z0-9_-]/g, '_')}` : undefined;
    const jobOptions = sanitizedJobId
      ? {
          jobId: sanitizedJobId,
        }
      : undefined;

    // Tambahkan job dengan payload data pengirim, pesan, dan WAMID
    const job = await whatsappQueue.add('process-chat', { sender, message, messageId }, jobOptions);
    console.log(`📡 [Queue] Job #${job.id} berhasil dimasukkan ke antrean untuk pengirim: ${sender}`);
    return job;
  } catch (error: any) {
    if (error?.message?.includes('already exists') || error?.message?.includes('Job with ID')) {
      console.warn(`⚠️ [Queue] Pesan duplikat terdeteksi (WAMID: ${messageId}), mengabaikan penambahan ke antrean.`);
      return null;
    }
    console.error('❌ [Queue] Gagal memasukkan job ke antrean Redis:', error);
    throw error;
  }
};
