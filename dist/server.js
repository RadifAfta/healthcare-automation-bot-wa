"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
require("./queue/whatsapp.worker");
const startServer = () => {
    try {
        // Jalankan server Express menggunakan port dari environment variable
        app_1.default.listen(env_1.env.PORT, async () => {
            console.log(`🚀 Server berjalan pada port ${env_1.env.PORT} dalam mode '${env_1.env.NODE_ENV}'`);
            console.log(`🔗 Health check endpoint : http://localhost:${env_1.env.PORT}/api/health`);
            console.log(`🔗 WhatsApp Webhook URL   : http://localhost:${env_1.env.PORT}/api/webhook`);
            if (env_1.env.WA_PROVIDER === 'cloud_api') {
                console.log('⚡ [Server] Mode: Official Meta WhatsApp Business Cloud API');
                console.log('📡 [Server] Siap menerima Webhook HTTP GET/POST dari Meta Developer Platform.\n');
            }
            else {
                console.log('🌐 [Server] Mode: Legacy WhatsApp Web (wwebjs). Menginisialisasi browser Puppeteer...');
                try {
                    const client = (await Promise.resolve().then(() => __importStar(require('./config/whatsapp')))).default;
                    await client.initialize();
                }
                catch (waError) {
                    console.error('❌ [Server] Gagal menginisialisasi client WhatsApp Web:', waError);
                }
            }
        });
    }
    catch (error) {
        console.error('💥 Gagal menyalakan server:', error);
        process.exit(1);
    }
};
startServer();
