import { ConnectionOptions } from 'bullmq';
import { env } from './env';

/**
 * Konfigurasi koneksi Redis yang dibagikan secara global ke modul Queue dan Worker.
 */
export const redisConnection: ConnectionOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD ? env.REDIS_PASSWORD : undefined,
  tls: env.REDIS_TLS ? {} : undefined,
  maxRetriesPerRequest: null,
};
export default redisConnection;
