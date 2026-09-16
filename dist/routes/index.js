"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webhook_controller_1 = require("../controllers/webhook.controller");
const router = (0, express_1.Router)();
/**
 * Health check endpoint - Penting untuk memantau status server secara otomatis
 */
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Server is healthy and running!',
        timestamp: new Date().toISOString(),
    });
});
/**
 * Endpoint Webhook WhatsApp (GET: Verifikasi dari Meta Developer Dashboard)
 */
router.get('/webhook', webhook_controller_1.verifyWebhook);
/**
 * Endpoint Webhook WhatsApp (POST: Menerima pesan/event dari Meta Cloud API atau testing manual)
 */
router.post('/webhook', webhook_controller_1.receiveWhatsappChat);
exports.default = router;
