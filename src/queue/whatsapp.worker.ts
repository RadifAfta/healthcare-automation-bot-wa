import { Worker, Job } from 'bullmq';
import redisConnection from '../config/redis';
import { WHATSAPP_QUEUE_NAME } from './whatsapp.queue';
import { classifyIntent, extractBookingFromChat, answerInquiry } from '../services/ai.service';
import { appendBookingToSheet, getCatalogFromSheet } from '../services/sheets.service';
import { WhatsAppProviderFactory } from '../services/whatsapp-provider.service';
import { sessionService, BookingSession } from '../services/session.service';

// Definisikan bentuk interface data yang ditangani oleh Job
interface ChatJobData {
  sender: string;
  message: string;
}

// Inisialisasi WhatsApp Provider dari Factory
const whatsappProvider = WhatsAppProviderFactory.getProvider();

// Helper untuk menyusun teks Kartu Reservasi Klinik Gigi
const renderBookingRecap = (booking: any, cleanSenderPhone: string): string => {
  const treatmentDetailsStr = booking.layanan_dipilih
    .map((p: any) => `- *${p.nama_layanan}*: Rp${p.estimasi_harga.toLocaleString('id-ID')}`)
    .join('\n');

  return `🤖 *📋 KARTU RESERVASI KLINIK GIGI* \n\nBerikut rincian jadwal janji temu pemeriksaan gigi Kakak:\n\n- *Nama Pasien:* ${booking.nama_pasien || 'Pasien'}\n- *Nomor HP:* ${booking.nomor_hp || cleanSenderPhone}\n- *Tanggal Booking:* ${booking.tanggal_booking || '-'}\n- *Jam Slot:* ${booking.jam_booking || '-'}\n- *Dokter Gigi Pilihan:* ${booking.dokter_pilihan || '-'}\n\n*Tindakan Gigi Dipilih:*\n${treatmentDetailsStr}\n\n*💰 Total Estimasi Biaya:* *Rp${booking.total_estimasi.toLocaleString('id-ID')}*\n\nApakah jadwal reservasi periksa gigi di atas sudah sesuai? (Ketik **Ya** untuk konfirmasi, atau ketik jika ada perubahan/tambahan). 😊`;
};

// Inisialisasi Worker BullMQ (Consumer)
export const whatsappWorker = new Worker<ChatJobData>(
  WHATSAPP_QUEUE_NAME,
  async (job: Job<ChatJobData>) => {
    const { sender, message } = job.data;
    const cleanSenderPhone = sender.split('@')[0];

    console.log(`\n👷 [Worker] Mulai memproses job #${job.id} dari pengirim: ${sender}`);
    
    // ------------------------------------------------------------------------
    // AMBIL ATAU INISIALISASI SESI DENGAN RIWAYAT CHAT
    // ------------------------------------------------------------------------
    let session = await sessionService.getSession(sender);
    if (!session) {
      session = {
        step: 'IDLE',
        history: [],
      };
    }

    // 1. Simpan pesan pengguna ke riwayat chat
    session.history.push({ role: 'user', content: message });

    // Batasi panjang riwayat chat (maksimal 6 pesan terakhir)
    if (session.history.length > 6) {
      session.history.shift();
    }

    console.log(`👷 [Worker] Status Sesi ${sender}: ${session.step}, Riwayat Chat: ${session.history.length} pesan`);

    let replyText = '';

    // 0. PERINTAH KHUSUS RESET/REAKTIVASI BOT OLEH ADMIN/PASIEN
    const cleanMessageLower = message.trim().toLowerCase();
    if (cleanMessageLower === '!bot-on' || cleanMessageLower === '!reset' || cleanMessageLower === '!aktif') {
      console.log(`👷 [Worker] Perintah reaktivasi bot terdeteksi dari ${sender}`);
      session.step = 'IDLE';
      session.booking = undefined;
      replyText = `🤖 *Bot AI Klinik Gigi Telah Aktif Kembali!* \n\nHalo Kak! Bot AI kami siap melayani pertanyaan tarif, informasi dokter gigi, dan reservasi periksa gigi Kakak 24/7. Ada yang bisa kami bantu? 😊`;
      await whatsappProvider.sendMessage(sender, replyText);
      session.history.push({ role: 'assistant', content: replyText });
      await sessionService.setSession(sender, session);
      return;
    }

    // 1. JIKA DALAM MODE HANDOFF_ADMIN (BOT SILENT MODE)
    if (session.step === 'HANDOFF_ADMIN') {
      console.log(`ℹ️ [Worker] Mengabaikan pesan dari ${sender} karena sesi sedang ditangani Admin Manusia via Meta Business Suite.`);
      return;
    }

    // 2. Klasifikasi niat dengan riwayat chat
    const intent = await classifyIntent(message, session.history);
    console.log(`👷 [Worker] Niat terdeteksi: ${intent.toUpperCase()}`);

    // Ambil data katalog perawatan gigi aktif dari Google Sheets
    const catalog = await getCatalogFromSheet();
    const catalogContext = catalog
      .map((item) => `- ${item.nama} (Tarif: Rp${item.harga.toLocaleString('id-ID')}, Durasi: ${item.durasi || '45m'}, Dokter Gigi: ${item.dokter || 'Tim Dokter Gigi'})`)
      .join('\n');

    // ------------------------------------------------------------------------
    // HANDLING GLOBAL INTENT: HANDOFF TO HUMAN ADMIN (TALK_TO_HUMAN / COMPLAINT)
    // ------------------------------------------------------------------------
    if (intent === 'TALK_TO_HUMAN' || intent === 'COMPLAINT') {
      console.log(`👷 [Worker] Menerima permintaan pengalihan ke Admin Manusia dari ${sender}`);
      session.step = 'HANDOFF_ADMIN';
      replyText = `🤖 Baik Kak, pesan Kakak telah kami teruskan ke Admin Resepsionis Klinik Gigi kami. Bot otomatis diistirahatkan sementara untuk nomor ini. Admin kami akan segera membalas percakapan Kakak secara manual di Meta Business Suite ya. Terima kasih! 🙏`;
      await whatsappProvider.sendMessage(sender, replyText);
      session.history.push({ role: 'assistant', content: replyText });
      // Simpan sesi HANDOFF_ADMIN dengan TTL 2 jam (7200 detik)
      await sessionService.setSession(sender, session, 7200);
      console.log(`👷 [Worker] Sesi diubah ke HANDOFF_ADMIN (TTL: 2 jam) untuk ${sender}\n`);
      return;
    }

    // ------------------------------------------------------------------------
    // HANDLING GLOBAL INTENT: CANCEL (BATALKAN RESERVASI KLINIK GIGI)
    // ------------------------------------------------------------------------
    if (intent === 'CANCEL') {
      console.log(`👷 [Worker] Menerima permintaan pembatalan dari ${sender}`);
      session.step = 'IDLE';
      session.booking = undefined;
      replyText = `🤖 Baik Kak, reservasi janji temu dokter gigi Anda saat ini telah dibatalkan. Jika ingin melakukan reservasi pemeriksaan gigi di lain waktu, cukup ketik kembali tindakan yang diinginkan ya Kak. Terima kasih! 😊`;
      await whatsappProvider.sendMessage(sender, replyText);
      session.history.push({ role: 'assistant', content: replyText });
      await sessionService.setSession(sender, session);
      console.log(`👷 [Worker] Reservasi dibatalkan & sesi direset ke IDLE untuk ${sender}\n`);
      return;
    }

    // ------------------------------------------------------------------------
    // STATE MACHINE FLOW (KLINIK GIGI / DENTAL CLINIC)
    // ------------------------------------------------------------------------

    // A. STATE: AWAITING_NAME (MENUNGGU NAMA PASIEN)
    if (session.step === 'AWAITING_NAME') {
      if (intent === 'INQUIRY') {
        replyText = await answerInquiry(message, catalogContext, session.history);
        replyText = `${replyText}\n\n*Catatan:* Mohon infokan **Nama Lengkap Pasien** terlebih dahulu ya Kak agar reservasi klinik gigi bisa kami catat. 😊`;
        await whatsappProvider.sendMessage(sender, replyText);
        session.history.push({ role: 'assistant', content: replyText });
        await sessionService.setSession(sender, session);
        return;
      }

      const inputName = message.trim();
      if (session.booking) {
        session.booking.nama_pasien = inputName;
        
        const isDateTimeMissing = !session.booking.tanggal_booking || 
                                  session.booking.tanggal_booking.trim() === '-' || 
                                  session.booking.tanggal_booking.trim() === '';
                                  
        if (isDateTimeMissing) {
          session.step = 'AWAITING_DATE_TIME';
          replyText = `🤖 Terima kasih Kak *${inputName}*! Selanjutnya, mohon infokan **Hari/Tanggal & Jam Slot Kedatangan** yang Kakak inginkan untuk periksa gigi ya. 😊`;
        } else {
          session.step = 'AWAITING_CONFIRMATION';
          replyText = renderBookingRecap(session.booking, cleanSenderPhone);
        }
        await whatsappProvider.sendMessage(sender, replyText);
        session.history.push({ role: 'assistant', content: replyText });
        await sessionService.setSession(sender, session);
      }
      return;
    }

    // B. STATE: AWAITING_DATE_TIME (MENUNGGU TANGGAL & JAM KEDATANGAN)
    if (session.step === 'AWAITING_DATE_TIME') {
      if (intent === 'INQUIRY') {
        replyText = await answerInquiry(message, catalogContext, session.history);
        replyText = `${replyText}\n\n*Catatan:* Mohon infokan **Hari/Tanggal & Jam Slot Kedatangan** Kakak terlebih dahulu ya agar bisa kami jadwalkan dokter giginya. 😊`;
        await whatsappProvider.sendMessage(sender, replyText);
        session.history.push({ role: 'assistant', content: replyText });
        await sessionService.setSession(sender, session);
        return;
      }

      const inputDateTime = message.trim();
      if (session.booking) {
        session.booking.tanggal_booking = inputDateTime;
        session.booking.jam_booking = session.booking.jam_booking || 'Sesuai Jadwal';
        session.booking.nomor_hp = session.booking.nomor_hp || cleanSenderPhone;
        
        session.step = 'AWAITING_CONFIRMATION';
        replyText = renderBookingRecap(session.booking, cleanSenderPhone);
        
        await whatsappProvider.sendMessage(sender, replyText);
        session.history.push({ role: 'assistant', content: replyText });
        await sessionService.setSession(sender, session);
      }
      return;
    }

    // C. STATE: AWAITING_CONFIRMATION (MENUNGGU KONFIRMASI FINAL)
    if (session.step === 'AWAITING_CONFIRMATION') {
      if (intent === 'CONFIRM') {
        if (session.booking) {
          console.log(`📊 [Sheets Service] Menulis data reservasi klinik gigi ke Google Sheets...`);
          await appendBookingToSheet(session.booking);
          
          replyText = `🤖 *Reservasi Klinik Gigi Berhasil Terdaftar!* \n\nHalo Kak *${session.booking.nama_pasien}*, janji temu pemeriksaan gigi Anda telah resmi terdaftar di klinik gigi kami. Tim resepsionis kami akan mengonfirmasi ulang jadwal Kakak. Terima kasih dan sampai jumpa di klinik gigi kami! 🙏😊`;
          
          await whatsappProvider.sendMessage(sender, replyText);
          session.history.push({ role: 'assistant', content: replyText });
          
          session.step = 'IDLE';
          session.booking = undefined;
          await sessionService.setSession(sender, session);
          console.log(`👷 [Worker] Reservasi klinik gigi selesai & ditulis ke Google Sheets untuk ${sender}`);
        }
        return;
      }
      
      if (intent === 'BOOKING') {
        console.log(`👷 [Worker] Mendeteksi perubahan/tambahan tindakan dalam AWAITING_CONFIRMATION`);
        const updatedBooking = await extractBookingFromChat(message, catalogContext, session.history, session.booking);
        
        if (updatedBooking && updatedBooking.layanan_dipilih && updatedBooking.layanan_dipilih.length > 0) {
          session.booking = updatedBooking;
          replyText = renderBookingRecap(session.booking, cleanSenderPhone);
        } else {
          replyText = `🤖 Maaf Kak, perubahan reservasi belum sesuai dengan katalog perawatan gigi kami. Silakan ketik kembali nama tindakan gigi yang diinginkan ya Kak.`;
        }
        
        await whatsappProvider.sendMessage(sender, replyText);
        session.history.push({ role: 'assistant', content: replyText });
        await sessionService.setSession(sender, session);
        return;
      }

      if (intent === 'INQUIRY') {
        replyText = await answerInquiry(message, catalogContext, session.history);
        replyText = `${replyText}\n\n*Catatan:* Konfirmasi jadwal periksa gigi Kakak di atas masih menggantung. Apakah rincian janji temu sudah sesuai? (Ketik **Ya** jika sesuai). 😊`;
        await whatsappProvider.sendMessage(sender, replyText);
        session.history.push({ role: 'assistant', content: replyText });
        await sessionService.setSession(sender, session);
        return;
      }
    }

    // D. STATE: IDLE (TIDAK ADA RESERVASI AKTIF)
    if (session.step === 'IDLE') {
      if (intent === 'BOOKING') {
        console.log(`👷 [Worker] Memproses pendaftaran reservasi klinik gigi baru...`);
        const extractedBooking = await extractBookingFromChat(message, catalogContext, session.history);
        
        if (!extractedBooking.layanan_dipilih || extractedBooking.layanan_dipilih.length === 0) {
          console.log(`⚠️ [Worker] Pasien berniat booking tetapi tidak ada tindakan gigi yang cocok dengan katalog.`);
          replyText = `🤖 Halo Kak! Kami mendeteksi Kakak ingin melakukan reservasi pemeriksaan gigi, tetapi jenis tindakan yang disebutkan belum tersedia di katalog kami.\n\n*Berikut Perawatan Gigi yang Tersedia:* \n${catalogContext}\n\nSilakan ketik ulang nama tindakan gigi yang Kakak inginkan ya! Terima kasih! 😊`;
          await whatsappProvider.sendMessage(sender, replyText);
          session.history.push({ role: 'assistant', content: replyText });
          await sessionService.setSession(sender, session);
          return;
        }

        extractedBooking.nomor_hp = extractedBooking.nomor_hp || cleanSenderPhone;
        session.booking = extractedBooking;

        const isNameMissing = !extractedBooking.nama_pasien || 
                              extractedBooking.nama_pasien.trim() === '-' || 
                              extractedBooking.nama_pasien.trim() === '';
                              
        const isDateTimeMissing = !extractedBooking.tanggal_booking || 
                                  extractedBooking.tanggal_booking.trim() === '-' || 
                                  extractedBooking.tanggal_booking.trim() === '';

        if (isNameMissing) {
          session.step = 'AWAITING_NAME';
          replyText = `🤖 Terima kasih! Mohon infokan **Nama Lengkap Pasien** Kakak ya agar reservasi periksa gigi bisa kami catat. 😊`;
        } else if (isDateTimeMissing) {
          session.step = 'AWAITING_DATE_TIME';
          replyText = `🤖 Terima kasih Kak *${extractedBooking.nama_pasien}*! Mohon infokan **Hari/Tanggal & Jam Slot Kedatangan** Kakak ya agar kami jadwalkan dokter giginya. 😊`;
        } else {
          session.step = 'AWAITING_CONFIRMATION';
          replyText = renderBookingRecap(extractedBooking, cleanSenderPhone);
        }
        
        await whatsappProvider.sendMessage(sender, replyText);
        session.history.push({ role: 'assistant', content: replyText });
        await sessionService.setSession(sender, session);
        return;
      }

      if (intent === 'INQUIRY') {
        replyText = await answerInquiry(message, catalogContext, session.history);
        replyText = `🤖 ${replyText}`;
        await whatsappProvider.sendMessage(sender, replyText);
        session.history.push({ role: 'assistant', content: replyText });
        await sessionService.setSession(sender, session);
        return;
      }

      // Default Greeting
      replyText = `🤖 Halo Kak! Selamat datang di Klinik Gigi (Dental Clinic) Kami. 😊\n\nAda yang bisa kami bantu seputar perawatan atau kesehatan gigi Kakak? Kakak bisa menanyakan estimasi biaya/tarif dokter gigi, atau bisa langsung mengetikkan jadwal booking periksa gigi Kakak.\n\n*Contoh Format Reservasi:*\n_\"Mau booking scaling gigi dan tambal gigi untuk besok jam 2 siang kak\"_`;
      await whatsappProvider.sendMessage(sender, replyText);
      session.history.push({ role: 'assistant', content: replyText });
      await sessionService.setSession(sender, session);
      return;
    }
  },
  {
    connection: redisConnection,
    concurrency: 1,
  }
);

whatsappWorker.on('completed', (job) => {
  console.log(`✅ [Worker] Job #${job?.id} SELESAI diproses secara sukses.`);
});

whatsappWorker.on('failed', (job, err) => {
  console.error(`🚨 [Worker] Job #${job?.id} GAGAL diproses! Alasan:`, err.message);
});

console.log(`⚙️ [Worker] Worker '${WHATSAPP_QUEUE_NAME}' (Dental Clinic Booking) aktif...`);
export default whatsappWorker;
