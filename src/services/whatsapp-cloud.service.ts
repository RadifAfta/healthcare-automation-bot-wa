import { WhatsAppProvider } from './whatsapp-provider.service';
import { env } from '../config/env';

/**
 * Helper untuk memformat dan menormalisasi nomor HP ke format E.164 internasional (tanpa karakter + dan suffix @c.us / @lid)
 * Contoh: "08123456789" -> "628123456789", "628123456789@c.us" -> "628123456789"
 */
export const normalizePhoneNumber = (phone: string): string => {
  // Clear suffix @c.us atau @lid jika ada dari wwebjs legacy
  let cleaned = phone.split('@')[0].trim();
  
  // Hapus semua karakter selain angka
  cleaned = cleaned.replace(/\D/g, '');

  // Ubah awalan 08 menjadi 628 (format Indonesia)
  if (cleaned.startsWith('08')) {
    cleaned = '628' + cleaned.slice(2);
  }

  return cleaned;
};

/**
 * Mengonversi string Unicode escape sequence (seperti \ud83d\ude05) menjadi karakter emoji asli.
 */
const decodeUnicodeEscapes = (str: string): string => {
  try {
    return str.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
      return String.fromCharCode(parseInt(grp, 16));
    });
  } catch (error) {
    console.error('⚠️ [Meta Cloud API] Gagal mendecode Unicode escapes:', error);
    return str;
  }
};

/**
 * Implementation of WhatsAppProvider for Meta WhatsApp Business Cloud API (Official Graph API)
 */
export class MetaWhatsAppProvider implements WhatsAppProvider {
  private phoneNumberId: string;
  private accessToken: string;
  private apiVersion: string;

  constructor() {
    this.phoneNumberId = env.META_WA_PHONE_NUMBER_ID;
    this.accessToken = env.META_WA_ACCESS_TOKEN;
    this.apiVersion = env.META_GRAPH_API_VERSION || 'v20.0';
  }

  async sendMessage(to: string, message: string): Promise<void> {
    const recipientPhone = normalizePhoneNumber(to);
    const decodedMessage = decodeUnicodeEscapes(message);

    if (!this.phoneNumberId || !this.accessToken) {
      console.warn('⚠️ [Meta Cloud API] META_WA_PHONE_NUMBER_ID atau META_WA_ACCESS_TOKEN belum diisi di .env! Pesan simulasi log:');
      console.log(`💬 [Simulasi Cloud API] Ke: ${recipientPhone} | Pesan: "${decodedMessage}"`);
      return;
    }

    const endpoint = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: decodedMessage,
      },
    };

    try {
      console.log(`📡 [Meta Cloud API] Mengirim pesan ke ${recipientPhone}...`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData: any = await response.json();

      if (!response.ok) {
        console.error(`❌ [Meta Cloud API] Gagal mengirim pesan HTTP ${response.status}:`, JSON.stringify(responseData, null, 2));
        throw new Error(responseData?.error?.message || `HTTP error ${response.status}`);
      }

      const wamid = responseData?.messages?.[0]?.id;
      console.log(`✅ [Meta Cloud API] Pesan sukses terkirim ke ${recipientPhone} (WAMID: ${wamid})`);
    } catch (error: any) {
      console.error(`💥 [Meta Cloud API Error] Gagal mengirim pesan ke ${recipientPhone}:`, error.message || error);
      throw error;
    }
  }
}
