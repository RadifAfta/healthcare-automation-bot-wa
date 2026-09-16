"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppProviderFactory = exports.WhatsAppWebProvider = void 0;
const whatsapp_1 = __importDefault(require("../config/whatsapp"));
const env_1 = require("../config/env");
const whatsapp_cloud_service_1 = require("./whatsapp-cloud.service");
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
        console.error('⚠️ [Provider Helper] Gagal mendecode Unicode escapes:', error);
        return str;
    }
};
/**
 * Provider untuk WhatsApp Web (whatsapp-web.js) dengan simulasi mengetik manusiawi (Legacy / Fallback)
 */
class WhatsAppWebProvider {
    async sendMessage(to, message) {
        try {
            const decodedMessage = decodeUnicodeEscapes(message);
            // Ambil instance chat untuk memicu status sedang mengetik
            const chat = await whatsapp_1.default.getChatById(to);
            // Nyalakan status mengetik
            await chat.sendStateTyping();
            // Simulasi delay mengetik proporsional terhadap panjang teks
            const delayMs = Math.min(Math.max(decodedMessage.length * 35, 2000), 5500);
            console.log(`💬 [WA Web Provider] Mensimulasikan mengetik ke ${to} selama ${delayMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            // Kirim pesan asli & matikan status mengetik
            await whatsapp_1.default.sendMessage(to, decodedMessage);
            await chat.clearState();
            console.log(`✅ [WA Web Provider] Pesan berhasil dikirim ke: ${to}`);
        }
        catch (error) {
            console.warn(`⚠️ [WA Web Provider] Gagal mengirim dengan efek mengetik, mengirim instan ke ${to}:`, error.message || error);
            const decodedMessage = decodeUnicodeEscapes(message);
            await whatsapp_1.default.sendMessage(to, decodedMessage);
        }
    }
}
exports.WhatsAppWebProvider = WhatsAppWebProvider;
/**
 * Factory untuk mengatur instansiasi WhatsApp Provider (Mendukung Decoupled Clean Architecture)
 */
class WhatsAppProviderFactory {
    static providerInstance;
    static getProvider() {
        if (!this.providerInstance) {
            if (env_1.env.WA_PROVIDER === 'cloud_api') {
                console.log('⚡ [WhatsApp Factory] Menggunakan Official Meta WhatsApp Cloud API Provider.');
                this.providerInstance = new whatsapp_cloud_service_1.MetaWhatsAppProvider();
            }
            else {
                console.log('🌐 [WhatsApp Factory] Menggunakan WhatsApp Web (wwebjs) Provider.');
                this.providerInstance = new WhatsAppWebProvider();
            }
        }
        return this.providerInstance;
    }
}
exports.WhatsAppProviderFactory = WhatsAppProviderFactory;
