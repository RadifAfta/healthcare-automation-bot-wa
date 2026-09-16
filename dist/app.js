"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const routes_1 = __importDefault(require("./routes"));
const app = (0, express_1.default)();
// Global Middlewares
app.use((0, cors_1.default)());
// Parsing body JSON sekaligus menyimpan rawBody Buffer untuk verifikasi HMAC signature Webhook Meta
app.use(express_1.default.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    },
}));
app.use(express_1.default.urlencoded({ extended: true }));
// Mount Routing modular ke path '/api'
app.use('/api', routes_1.default);
// Penanganan Route 404 (Not Found) jika client mengakses endpoint yang tidak terdaftar
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Rute tidak ditemukan: ${req.method} ${req.originalUrl}`,
    });
});
exports.default = app;
