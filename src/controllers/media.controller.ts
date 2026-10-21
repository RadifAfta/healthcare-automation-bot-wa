import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

const MEDIA_DIR = path.join(process.cwd(), 'public', 'media');

// Pastikan direktori public/media tersedia
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

/**
 * Controller untuk mengunduh dan menyajikan media dari Meta Graph API ke browser admin tanpa perlu login Meta
 */
export const getMediaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mediaId } = req.params;

    if (!mediaId || mediaId.trim() === '') {
      res.status(400).send('Media ID tidak valid.');
      return;
    }

    // Jika ini ID simulasi testing
    if (mediaId.startsWith('img_') || mediaId.startsWith('test_')) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Simulasi Media Testing</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:50px;background:#f8f9fa;">
          <div style="max-width:500px;margin:auto;background:white;padding:30px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
            <h2>🧪 Media Pengujian Otomatis</h2>
            <p>Pesan ini berasal dari skrip simulasi testing (Media ID: <code>${mediaId}</code>).</p>
            <p style="color:#666;">Pada pasien nyata, foto kondisi kulit/jerawat yang diunggah akan otomatis terunduh dan tampil di sini.</p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    const localFilePath = path.join(MEDIA_DIR, `${mediaId}.jpg`);

    // 1. Cek apakah media sudah pernah diunduh dan tersimpan di cache disk lokal
    if (fs.existsSync(localFilePath)) {
      res.setHeader('Content-Type', 'image/jpeg');
      fs.createReadStream(localFilePath).pipe(res);
      return;
    }

    if (!env.META_WA_ACCESS_TOKEN) {
      res.status(500).send('META_WA_ACCESS_TOKEN belum dikonfigurasi di .env');
      return;
    }

    // 2. Minta URL unduh resmi ke Meta Graph API menggunakan Access Token
    console.log(`📡 [Media Service] Meminta tautan media ID: ${mediaId} dari Meta Graph API...`);
    const metaRes = await fetch(`https://graph.facebook.com/${env.META_GRAPH_API_VERSION || 'v20.0'}/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${env.META_WA_ACCESS_TOKEN}`,
      },
    });

    if (!metaRes.ok) {
      const errText = await metaRes.text();
      console.error(`❌ [Media Service] Gagal mengambil metadata media dari Meta:`, errText);
      res.status(metaRes.status).send('Gagal mengambil metadata media dari Meta.');
      return;
    }

    const metaData: any = await metaRes.json();
    const downloadUrl = metaData?.url;
    const mimeType = metaData?.mime_type || 'image/jpeg';

    if (!downloadUrl) {
      res.status(404).send('URL unduhan media tidak ditemukan di respon Meta.');
      return;
    }

    // 3. Unduh file biner gambar dari CDN Meta
    console.log(`⬇️ [Media Service] Mengunduh biner file media dari Meta CDN...`);
    const fileRes = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${env.META_WA_ACCESS_TOKEN}`,
      },
    });

    if (!fileRes.ok) {
      res.status(fileRes.status).send('Gagal mengunduh biner file media dari CDN Meta.');
      return;
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Simpan ke disk lokal
    try {
      fs.writeFileSync(localFilePath, buffer);
      console.log(`💾 [Media Service] File media berhasil disimpan ke cache lokal: ${localFilePath}`);
    } catch (writeErr) {
      console.warn('⚠️ Gagal menyimpan cache file media ke disk:', writeErr);
    }

    res.setHeader('Content-Type', mimeType);
    res.send(buffer);
  } catch (error: any) {
    console.error('💥 [Media Controller] Error saat menyajikan media:', error.message || error);
    res.status(500).send('Terjadi kesalahan internal saat memuat media.');
  }
};
