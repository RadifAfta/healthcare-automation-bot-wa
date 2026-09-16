"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConnection = void 0;
const env_1 = require("./env");
/**
 * Konfigurasi koneksi Redis yang dibagikan secara global ke modul Queue dan Worker.
 */
exports.redisConnection = {
    host: env_1.env.REDIS_HOST,
    port: env_1.env.REDIS_PORT,
    password: env_1.env.REDIS_PASSWORD ? env_1.env.REDIS_PASSWORD : undefined,
    tls: env_1.env.REDIS_TLS ? {} : undefined,
    maxRetriesPerRequest: null,
};
exports.default = exports.redisConnection;
