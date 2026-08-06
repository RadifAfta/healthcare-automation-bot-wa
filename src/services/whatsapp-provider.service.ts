import client from '../config/whatsapp';
import { env } from '../config/env';
import { MetaWhatsAppProvider } from './whatsapp-cloud.service';

export interface WhatsAppProvider {
  sendMessage(to: string, message: string): Promise<void>;
}

/**
 * Mengonversi string Unicode escape sequence (seperti \ud83d\ude05) menjadi karakter emoji asli.
 */
const decodeUnicodeEscapes = (str: string): string => {
  try {
    return str.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
      return String.fromCharCode(parseInt(grp, 16));
    });
  } catch (error) {
    console.error('⚠️ [Provider Helper] Gagal mendecode Unicode escapes:', error);
    return str;
  }
};

/**
 * Provider untuk WhatsApp Web (whatsapp-web.js) dengan simulasi mengetik manusiawi (Legacy / Fallback)
 */
export class WhatsAppWebProvider implements WhatsAppProvider {
  async sendMessage(to: string, message: string): Promise<void> {
    try {
      const decodedMessage = decodeUnicodeEscapes(message);
      
      // Ambil instance chat untuk memicu status sedang mengetik
      const chat = await client.getChatById(to);
      
      // Nyalakan status mengetik
      await chat.sendStateTyping();
      
      // Simulasi delay mengetik proporsional terhadap panjang teks
      const delayMs = Math.min(Math.max(decodedMessage.length * 35, 2000), 5500);
      
      console.log(`💬 [WA Web Provider] Mensimulasikan mengetik ke ${to} selama ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      
      // Kirim pesan asli & matikan status mengetik
      await client.sendMessage(to, decodedMessage);
      await chat.clearState();
      console.log(`✅ [WA Web Provider] Pesan berhasil dikirim ke: ${to}`);
    } catch (error: any) {
      console.warn(`⚠️ [WA Web Provider] Gagal mengirim dengan efek mengetik, mengirim instan ke ${to}:`, error.message || error);
      const decodedMessage = decodeUnicodeEscapes(message);
      await client.sendMessage(to, decodedMessage);
    }
  }
}

/**
 * Factory untuk mengatur instansiasi WhatsApp Provider (Mendukung Decoupled Clean Architecture)
 */
export class WhatsAppProviderFactory {
  private static providerInstance: WhatsAppProvider;

  public static getProvider(): WhatsAppProvider {
    if (!this.providerInstance) {
      if (env.WA_PROVIDER === 'cloud_api') {
        console.log('⚡ [WhatsApp Factory] Menggunakan Official Meta WhatsApp Cloud API Provider.');
        this.providerInstance = new MetaWhatsAppProvider();
      } else {
        console.log('🌐 [WhatsApp Factory] Menggunakan WhatsApp Web (wwebjs) Provider.');
        this.providerInstance = new WhatsAppWebProvider();
      }
    }
    return this.providerInstance;
  }
}
