import app from './app';
import { env } from './config/env';
import './queue/whatsapp.worker';

const startServer = () => {
  try {
    // Jalankan server Express menggunakan port dari environment variable
    app.listen(env.PORT, async () => {
      console.log(`🚀 Server berjalan pada port ${env.PORT} dalam mode '${env.NODE_ENV}'`);
      console.log(`🔗 Health check endpoint : http://localhost:${env.PORT}/api/health`);
      console.log(`🔗 WhatsApp Webhook URL   : http://localhost:${env.PORT}/api/webhook`);

      if (env.WA_PROVIDER === 'cloud_api') {
        console.log('⚡ [Server] Mode: Official Meta WhatsApp Business Cloud API');
        console.log('📡 [Server] Siap menerima Webhook HTTP GET/POST dari Meta Developer Platform.\n');
      } else {
        console.log('🌐 [Server] Mode: Legacy WhatsApp Web (wwebjs). Menginisialisasi browser Puppeteer...');
        try {
          const client = (await import('./config/whatsapp')).default;
          await client.initialize();
        } catch (waError) {
          console.error('❌ [Server] Gagal menginisialisasi client WhatsApp Web:', waError);
        }
      }
    });
  } catch (error) {
    console.error('💥 Gagal menyalakan server:', error);
    process.exit(1);
  }
};

startServer();
