import Redis from 'ioredis';
import { env } from '../config/env';
import { ExtractedBooking, ChatMessage } from './ai.service';

// Interface untuk data sesi reservasi klinik dan riwayat obrolan
export interface BookingSession {
  step: 'IDLE' | 'AWAITING_NAME' | 'AWAITING_DATE_TIME' | 'AWAITING_CONFIRMATION' | 'HANDOFF_ADMIN';
  booking?: ExtractedBooking;
  history: ChatMessage[];
}

/**
 * Service untuk mengelola sesi percakapan multi-turn Klinik Kecantikan & Gigi.
 * Menggunakan Redis sebagai media penyimpanan utama dengan mekanisme fallback otomatis ke In-Memory Map.
 */
class SessionService {
  private redis: Redis | null = null;
  private memoryStore = new Map<string, { data: BookingSession; expiresAt: number }>();
  private isRedisConnected = false;

  constructor() {
    try {
      console.log(`📡 [Session Service] Menghubungkan ke Redis di ${env.REDIS_HOST}:${env.REDIS_PORT}...`);
      this.redis = new Redis({
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        maxRetriesPerRequest: 1, // Retry rendah agar cepat fallback ke memori jika Redis mati
        connectTimeout: 2000,
      });

      this.redis.on('connect', () => {
        console.log('✅ [Session Service] Redis berhasil terhubung untuk manajemen sesi.');
        this.isRedisConnected = true;
      });

      this.redis.on('error', (err: any) => {
        console.warn('⚠️ [Session Service] Koneksi Redis bermasalah. Mengaktifkan Fallback In-Memory Store:', err.message);
        this.isRedisConnected = false;
      });
    } catch (error: any) {
      console.warn('⚠️ [Session Service] Gagal menginisialisasi Redis client. Mengaktifkan Fallback In-Memory Store:', error.message);
      this.isRedisConnected = false;
    }
  }

  private getSessionKey(phone: string): string {
    return `session:${phone}`;
  }

  /**
   * Mengambil sesi aktif pasien berdasarkan nomor HP JID
   */
  public async getSession(phone: string): Promise<BookingSession | null> {
    const key = this.getSessionKey(phone);

    if (this.isRedisConnected && this.redis) {
      try {
        const data = await this.redis.get(key);
        if (data) {
          return JSON.parse(data) as BookingSession;
        }
        return null;
      } catch (error: any) {
        console.error('❌ [Session Service] Gagal mengambil sesi dari Redis:', error.message || error);
      }
    }

    // Fallback ke Memory Store
    const record = this.memoryStore.get(phone);
    if (!record) return null;

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
  public async setSession(phone: string, sessionData: BookingSession, ttlSeconds = 900): Promise<void> {
    const key = this.getSessionKey(phone);

    if (this.isRedisConnected && this.redis) {
      try {
        await this.redis.set(key, JSON.stringify(sessionData), 'EX', ttlSeconds);
        console.log(`💾 [Session Service] Sesi tersimpan di Redis untuk ${phone} (TTL: ${ttlSeconds}s)`);
        return;
      } catch (error: any) {
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
  public async deleteSession(phone: string): Promise<void> {
    const key = this.getSessionKey(phone);

    if (this.isRedisConnected && this.redis) {
      try {
        await this.redis.del(key);
        console.log(`🗑️ [Session Service] Sesi dihapus dari Redis untuk ${phone}`);
      } catch (error: any) {
        console.error('❌ [Session Service] Gagal menghapus sesi dari Redis:', error.message || error);
      }
    }

    this.memoryStore.delete(phone);
    console.log(`🗑️ [Session Service] Sesi dihapus dari Memori Fallback untuk ${phone}`);
  }
}

export const sessionService = new SessionService();
