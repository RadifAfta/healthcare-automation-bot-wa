"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
/**
 * Service untuk mengelola sesi percakapan multi-turn Klinik Kecantikan & Estetika.
 * Menggunakan Redis sebagai media penyimpanan utama dengan mekanisme fallback otomatis ke In-Memory Map.
 */
class SessionService {
    redis = null;
    memoryStore = new Map();
    isRedisConnected = false;
    constructor() {
        try {
            console.log(`📡 [Session Service] Menghubungkan ke Redis di ${env_1.env.REDIS_HOST}:${env_1.env.REDIS_PORT}...`);
            this.redis = new ioredis_1.default({
                host: env_1.env.REDIS_HOST,
                port: env_1.env.REDIS_PORT,
                password: env_1.env.REDIS_PASSWORD ? env_1.env.REDIS_PASSWORD : undefined,
                tls: env_1.env.REDIS_TLS ? {} : undefined,
                maxRetriesPerRequest: 1, // Retry rendah agar cepat fallback ke memori jika Redis mati
                connectTimeout: 5000,
            });
            this.redis.on('connect', () => {
                console.log('✅ [Session Service] Redis berhasil terhubung untuk manajemen sesi.');
                this.isRedisConnected = true;
            });
            this.redis.on('error', (err) => {
                console.warn('⚠️ [Session Service] Koneksi Redis bermasalah. Mengaktifkan Fallback In-Memory Store:', err.message);
                this.isRedisConnected = false;
            });
        }
        catch (error) {
            console.warn('⚠️ [Session Service] Gagal menginisialisasi Redis client. Mengaktifkan Fallback In-Memory Store:', error.message);
            this.isRedisConnected = false;
        }
    }
    getSessionKey(phone) {
        return `session:${phone}`;
    }
    /**
     * Mengambil sesi aktif pasien berdasarkan nomor HP JID
     */
    async getSession(phone) {
        const key = this.getSessionKey(phone);
        if (this.isRedisConnected && this.redis) {
            try {
                const data = await this.redis.get(key);
                if (data) {
                    return JSON.parse(data);
                }
                return null;
            }
            catch (error) {
                console.error('❌ [Session Service] Gagal mengambil sesi dari Redis:', error.message || error);
            }
        }
        // Fallback ke Memory Store
        const record = this.memoryStore.get(phone);
        if (!record)
            return null;
        // Bersihkan record jika sudah kadaluwarsa
        if (Date.now() > record.expiresAt) {
            this.memoryStore.delete(phone);
            return null;
        }
        return record.data;
    }
    /**
     * Menyimpan sesi aktif pasien ke database dengan durasi kedaluwarsa (TTL) default 15 menit (900 detik)
     */
    async setSession(phone, sessionData, ttlSeconds = 900) {
        const key = this.getSessionKey(phone);
        if (this.isRedisConnected && this.redis) {
            try {
                await this.redis.set(key, JSON.stringify(sessionData), 'EX', ttlSeconds);
                console.log(`💾 [Session Service] Sesi tersimpan di Redis untuk ${phone} (TTL: ${ttlSeconds}s)`);
                return;
            }
            catch (error) {
                console.error('❌ [Session Service] Gagal menyimpan sesi ke Redis:', error.message || error);
            }
        }
        // Fallback ke Memory Store
        const expiresAt = Date.now() + ttlSeconds * 1000;
        this.memoryStore.set(phone, { data: sessionData, expiresAt });
        console.log(`💾 [Session Service] Sesi tersimpan di Memori Fallback untuk ${phone} (TTL: ${ttlSeconds}s)`);
    }
    /**
     * Menghapus sesi pasien (setelah reservasi terkonfirmasi atau dibatalkan)
     */
    async deleteSession(phone) {
        const key = this.getSessionKey(phone);
        if (this.isRedisConnected && this.redis) {
            try {
                await this.redis.del(key);
                console.log(`🗑️ [Session Service] Sesi dihapus dari Redis untuk ${phone}`);
            }
            catch (error) {
                console.error('❌ [Session Service] Gagal menghapus sesi dari Redis:', error.message || error);
            }
        }
        this.memoryStore.delete(phone);
        console.log(`🗑️ [Session Service] Sesi dihapus dari Memori Fallback untuk ${phone}`);
    }
}
exports.sessionService = new SessionService();
