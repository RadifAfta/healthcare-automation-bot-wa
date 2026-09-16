"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addChatToQueue = exports.whatsappQueue = exports.WHATSAPP_QUEUE_NAME = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = __importDefault(require("../config/redis"));
// Definisikan nama antrean
exports.WHATSAPP_QUEUE_NAME = 'whatsapp-chats';
// Inisialisasi Queue BullMQ (Producer)
exports.whatsappQueue = new bullmq_1.Queue(exports.WHATSAPP_QUEUE_NAME, {
    connection: redis_1.default,
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
 */
const addChatToQueue = async (sender, message) => {
    try {
        // Tambahkan job dengan payload data pengirim dan pesan
        const job = await exports.whatsappQueue.add('process-chat', { sender, message });
        console.log(`📡 [Queue] Job #${job.id} berhasil dimasukkan ke antrean untuk pengirim: ${sender}`);
        return job;
    }
    catch (error) {
        console.error('❌ [Queue] Gagal memasukkan job ke antrean Redis:', error);
        throw error;
    }
};
exports.addChatToQueue = addChatToQueue;
