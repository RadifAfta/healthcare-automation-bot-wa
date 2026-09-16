"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
// Muat variabel dari file .env
dotenv_1.default.config();
// Definisikan skema validasi menggunakan Zod
const envSchema = zod_1.z.object({
    PORT: zod_1.z.coerce.number().default(5000),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    REDIS_HOST: zod_1.z.string().default('127.0.0.1'),
    REDIS_PORT: zod_1.z.coerce.number().default(6379),
    REDIS_PASSWORD: zod_1.z.string().default(''),
    REDIS_TLS: zod_1.z.coerce.boolean().default(false),
    WA_PROVIDER: zod_1.z.enum(['cloud_api', 'web']).default('cloud_api'),
    META_WA_PHONE_NUMBER_ID: zod_1.z.string().default(''),
    META_WA_ACCESS_TOKEN: zod_1.z.string().default(''),
    META_WA_VERIFY_TOKEN: zod_1.z.string().default('my_secure_verify_token_123'),
    META_APP_SECRET: zod_1.z.string().default(''),
    META_GRAPH_API_VERSION: zod_1.z.string().default('v20.0'),
    GROQ_API_KEY: zod_1.z.string({
        required_error: 'GROQ_API_KEY wajib diisi di .env!',
    }).min(1, 'GROQ_API_KEY tidak boleh kosong!'),
    GROQ_MODEL: zod_1.z.string().default('openai/gpt-oss-120b'),
    // Nomor WA HP Admin / Resepsionis untuk menerima alert handoff & membalas pasien (!balas)
    ADMIN_WA_NUMBER: zod_1.z.string().default(''),
    // Konfigurasi Google Apps Script Web App Endpoint (Metode Tanpa Service Account)
    GOOGLE_SHEETS_WEBAPP_URL: zod_1.z.string().default(''),
    GOOGLE_SHEETS_SECRET_TOKEN: zod_1.z.string().default(''),
    // Legacy Service Account Configuration (Opsional / Fallback)
    GOOGLE_SERVICE_ACCOUNT_EMAIL: zod_1.z.string().default(''),
    GOOGLE_PRIVATE_KEY: zod_1.z.string().default(''),
    GOOGLE_SPREADSHEET_ID: zod_1.z.string().default(''),
});
// Fungsi untuk memvalidasi dan mem-parsing process.env
const parseEnv = () => {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error('❌ Validasi environment variables gagal:');
        console.error(JSON.stringify(result.error.format(), null, 2));
        process.exit(1); // Stop aplikasi secepatnya (fail-fast)
    }
    return result.data;
};
// Ekspor variabel yang sudah divalidasi dan memiliki tipe data yang statis (type-safe)
exports.env = parseEnv();
