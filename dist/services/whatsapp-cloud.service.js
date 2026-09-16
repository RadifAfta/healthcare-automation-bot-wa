"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaWhatsAppProvider = exports.normalizePhoneNumber = void 0;
const env_1 = require("../config/env");
/**
 * Helper untuk memformat dan menormalisasi nomor HP ke format E.164 internasional (tanpa karakter + dan suffix @c.us / @lid)
 * Contoh: "08123456789" -> "628123456789", "628123456789@c.us" -> "628123456789"
 */
const normalizePhoneNumber = (phone) => {
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
exports.normalizePhoneNumber = normalizePhoneNumber;
/**
 * Mengonversi string Unicode escape sequence (seperti \ud83d\ude05) menjadi karakter emoji asli.
 */
const decodeUnicodeEscapes = (str) => {
    try {
        return str.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
            return String.fromCharCode(parseInt(grp, 16));
        });
    }
    catch (error) {
        console.error('⚠️ [Meta Cloud API] Gagal mendecode Unicode escapes:', error);
        return str;
    }
};
/**
 * Implementation of WhatsAppProvider for Meta WhatsApp Business Cloud API (Official Graph API)
 */
class MetaWhatsAppProvider {
    phoneNumberId;
    accessToken;
    apiVersion;
    constructor() {
        this.phoneNumberId = env_1.env.META_WA_PHONE_NUMBER_ID;
        this.accessToken = env_1.env.META_WA_ACCESS_TOKEN;
        this.apiVersion = env_1.env.META_GRAPH_API_VERSION || 'v20.0';
    }
    async sendMessage(to, message) {
        const recipientPhone = (0, exports.normalizePhoneNumber)(to);
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
            const responseData = await response.json();
            if (!response.ok) {
                console.error(`❌ [Meta Cloud API] Gagal mengirim pesan HTTP ${response.status}:`, JSON.stringify(responseData, null, 2));
                throw new Error(responseData?.error?.message || `HTTP error ${response.status}`);
            }
            const wamid = responseData?.messages?.[0]?.id;
            console.log(`✅ [Meta Cloud API] Pesan sukses terkirim ke ${recipientPhone} (WAMID: ${wamid})`);
        }
        catch (error) {
            console.error(`💥 [Meta Cloud API Error] Gagal mengirim pesan ke ${recipientPhone}:`, error.message || error);
            throw error;
        }
    }
}
exports.MetaWhatsAppProvider = MetaWhatsAppProvider;
