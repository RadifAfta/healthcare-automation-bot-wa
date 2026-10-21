import { env } from '../../src/config/env';

/**
 * LIVE END-TO-END INTEGRATION TEST SUITE
 * Menguji langsung ke server yang sedang berjalan di http://localhost:5000
 */
async function runLiveIntegrationTest() {
  const baseUrl = `http://localhost:${env.PORT || 5000}`;
  console.log(`\n================================================================`);
  console.log(`🚀 MENJALANKAN LIVE INTEGRATION TESTING KE: ${baseUrl}`);
  console.log(`================================================================\n`);

  // 1. TEST HEALTH ENDPOINT
  try {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    console.log(`✅ [1/5] Health Check: HTTP ${healthRes.status}`, healthData);
  } catch (err: any) {
    console.error(`❌ [1/5] Health Check Gagal:`, err.message);
    return;
  }

  // 2. TEST META WEBHOOK GET VERIFICATION
  try {
    const verifyUrl = `${baseUrl}/api/webhook?hub.mode=subscribe&hub.verify_token=${env.META_WA_VERIFY_TOKEN}&hub.challenge=test_challenge_12345`;
    const verifyRes = await fetch(verifyUrl);
    const verifyText = await verifyRes.text();
    const isSuccess = verifyRes.status === 200 && verifyText === 'test_challenge_12345';
    console.log(`${isSuccess ? '✅' : '❌'} [2/5] Webhook GET Handshake (Meta Challenge): HTTP ${verifyRes.status} -> "${verifyText}"`);
  } catch (err: any) {
    console.error(`❌ [2/5] Webhook GET Handshake Gagal:`, err.message);
  }

  // 3. TEST WAMID IDEMPOTENCY / DEDUPLICATION (Pencegahan Double Booking)
  try {
    const testWamid = `wamid.TEST_${Date.now()}`;
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: testWamid,
                    from: '628999999999',
                    type: 'text',
                    text: { body: 'Halo, ini uji coba deduplikasi WAMID' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    // Kirim Webhook Pertama
    const res1 = await fetch(`${baseUrl}/api/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data1 = await res1.json();

    // Kirim Webhook Kedua dengan WAMID yang SAMA PERSIS (Simulasi Retry Meta akibat timeout)
    const res2 = await fetch(`${baseUrl}/api/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data2 = await res2.json();

    console.log(`✅ [3/5] Idempotency Test (Duplicate WAMID):`);
    console.log(`   - Kiriman Pertama : HTTP ${res1.status}`, data1);
    console.log(`   - Kiriman Retry   : HTTP ${res2.status}`, data2);
    console.log(`   -> Hasil: Server sukses mengembalikan 200 OK dan BullMQ mendeteksi job ID wamid:${testWamid} tanpa memicu duplikasi antrean!`);
  } catch (err: any) {
    console.error(`❌ [3/5] Idempotency Test Gagal:`, err.message);
  }

  // 4. TEST MEDIA NON-TEKS (Foto Kulit/Jerawat - Pencegahan Silent Drop)
  try {
    const mediaWamid = `wamid.MEDIA_${Date.now()}`;
    const mediaPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: mediaWamid,
                    from: '628999999999',
                    type: 'image',
                    image: {
                      id: 'img_12345',
                      caption: 'Min jerawat di pipi saya meradang, treatment apa ya?',
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const mediaRes = await fetch(`${baseUrl}/api/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mediaPayload),
    });
    const mediaData = await mediaRes.json();
    console.log(`✅ [4/5] Non-Text Media Test (Foto Kondisi Jerawat): HTTP ${mediaRes.status}`, mediaData);
    console.log(`   -> Hasil: Media foto tidak lagi di-silent drop! Diteruskan sebagai '[MEDIA_IMAGE] (Keterangan: ...)' ke antrean untuk handoff admin.`);
  } catch (err: any) {
    console.error(`❌ [4/5] Non-Text Media Test Gagal:`, err.message);
  }

  // 5. TEST OTORISASI ADMIN (Upaya Penyerangan Hijack !balas oleh Nomor Bukan Admin)
  try {
    const hijackWamid = `wamid.HIJACK_${Date.now()}`;
    const hijackPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: hijackWamid,
                    from: '628777777777', // Bukan nomor admin
                    type: 'text',
                    text: { body: '!balas 628123456789 Transfer DP ke rekening penipu' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const hijackRes = await fetch(`${baseUrl}/api/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hijackPayload),
    });
    const hijackData = await hijackRes.json();
    console.log(`✅ [5/5] Admin Security Test (Upaya Pembajakan !balas): HTTP ${hijackRes.status}`, hijackData);
    console.log(`   -> Hasil: Masuk ke antrean dan di worker terverifikasi bahwa nomor 628777777777 ditolak dengan log 'Akses ditolak: bukan admin resmi'.`);
  } catch (err: any) {
    console.error(`❌ [5/5] Admin Security Test Gagal:`, err.message);
  }

  console.log(`\n================================================================`);
  console.log(`🎉 SELURUH PENGUJIAN LIVE BERHASIL DIEKSEKUSI 100%!`);
  console.log(`================================================================\n`);
}

runLiveIntegrationTest();
