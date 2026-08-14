import { Worker, Job } from 'bullmq';
import redisConnection from '../config/redis';
import { WHATSAPP_QUEUE_NAME } from './whatsapp.queue';
import { classifyIntent, extractBookingFromChat, answerInquiry } from '../services/ai.service';
import { appendBookingToSheet, getCatalogFromSheet } from '../services/sheets.service';
import { WhatsAppProviderFactory } from '../services/whatsapp-provider.service';
import { sessionService, BookingSession } from '../services/session.service';
import { env } from '../config/env';

// Definisikan bentuk interface data yang ditangani oleh Job
interface ChatJobData {
  sender: string;
  message: string;
}

// Inisialisasi WhatsApp Provider dari Factory
const whatsappProvider = WhatsAppProviderFactory.getProvider();

// Helper untuk menyanitasi nomor HP pasien (memastikan berupa deretan angka WA pengirim asli)
const sanitizePhoneNumber = (extractedPhone: string | undefined, senderPhone: string): string => {
  if (!extractedPhone || extractedPhone.trim() === '') return senderPhone;
  const digitsOnly = extractedPhone.replace(/[^0-9]/g, '');
  const lower = extractedPhone.toLowerCase();
  if (digitsOnly.length < 8 || lower.includes('nomor') || lower.includes('wa') || lower.includes('pake')) {
    return senderPhone;
  }
  return digitsOnly;
};

// Helper untuk menyusun teks Kartu Reservasi Klinik Gigi
const renderBookingRecap = (booking: any, cleanSenderPhone: string): string => {
  const validPhone = sanitizePhoneNumber(booking.nomor_hp, cleanSenderPhone);
  booking.nomor_hp = validPhone;

  const treatmentDetailsStr = booking.layanan_dipilih
    .map((p: any) => `- *${p.nama_layanan}*: Rp${p.estimasi_harga.toLocaleString('id-ID')}`)
    .join('\n');

  return `🤖 *📋 KARTU RESERVASI KLINIK GIGI* \n\nBerikut rincian jadwal janji temu pemeriksaan gigi Kakak:\n\n- *Nama Pasien:* ${booking.nama_pasien || 'Pasien'}\n- *Nomor WA:* ${validPhone}\n- *Tanggal Booking:* ${booking.tanggal_booking || '-'}\n- *Jam Slot:* ${booking.jam_booking || '-'}\n- *Dokter Gigi Pilihan:* ${booking.dokter_pilihan || '-'}\n\n*Tindakan Gigi Dipilih:*\n${treatmentDetailsStr}\n\n*💰 Total Estimasi Biaya:* *Rp${booking.total_estimasi.toLocaleString('id-ID')}*\n\nApakah jadwal reservasi periksa gigi di atas sudah sesuai? (Ketik **Ya** untuk konfirmasi, atau ketik jika ada perubahan/tambahan). 😊`;
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
    const cleanMessageTrim = message.trim();
    const cleanMessageLower = cleanMessageTrim.toLowerCase();

    // ------------------------------------------------------------------------
    // 0. PERINTAH KHUSUS ADMIN RELAY VIA WHATSAPP (!balas & !bot-on)
    // ------------------------------------------------------------------------
    
    // A. PERINTAH ADMIN: !balas <nomor_pasien> <pesan_admin>
    if (cleanMessageLower.startsWith('!balas')) {
      const parts = cleanMessageTrim.split(/\s+/);
      if (parts.length >= 3) {
        const targetPhone = parts[1].replace(/[^0-9]/g, '');
        const adminReplyText = parts.slice(2).join(' ');

        console.log(`👷 [Worker] Admin ${sender} membalas ke pasien ${targetPhone}: "${adminReplyText}"`);
        
        await whatsappProvider.sendMessage(targetPhone, adminReplyText);

        let patientSession = await sessionService.getSession(targetPhone);
        if (patientSession) {
          patientSession.history.push({ role: 'assistant', content: adminReplyText });
          await sessionService.setSession(targetPhone, patientSession);
        }

        replyText = `✅ *Pesan Berhasil Terkirim!*\n\n📲 *Penerima:* ${targetPhone}\n💬 *Pesan Admin:* "${adminReplyText}"`;
        await whatsappProvider.sendMessage(sender, replyText);
        return;
      } else {
        replyText = `⚠️ *Format Perintah Balas Salah!*\n\nGunakan format: \`!balas <nomor_pasien> <pesan_admin>\`\n*Contoh:* \`!balas 6282245480975 Halo Pak, ada yang bisa dibantu?\``;
        await whatsappProvider.sendMessage(sender, replyText);
        return;
      }
    }

    // B. PERINTAH ADMIN: !bot-on <nomor_pasien> ATAU !bot-on
    if (cleanMessageLower.startsWith('!bot-on') || cleanMessageLower.startsWith('!reset') || cleanMessageLower.startsWith('!aktif')) {
      const parts = cleanMessageTrim.split(/\s+/);
      const targetPhone = parts.length >= 2 ? parts[1].replace(/[^0-9]/g, '') : sender;

      console.log(`👷 [Worker] Perintah reaktivasi bot terdeteksi untuk pasien ${targetPhone}`);
      
      let targetSession = await sessionService.getSession(targetPhone);
      if (!targetSession) {
        targetSession = { step: 'IDLE', history: [] };
      }
      targetSession.step = 'IDLE';
      targetSession.booking = undefined;
      await sessionService.setSession(targetPhone, targetSession);

      const patientNotification = `🤖 *Bot AI Klinik Gigi Telah Aktif Kembali!* \n\nHalo Kak! Bot AI kami siap melayani pertanyaan tarif, informasi dokter gigi, dan reservasi periksa gigi Kakak 24/7. Ada yang bisa kami bantu? 😊`;
      await whatsappProvider.sendMessage(targetPhone, patientNotification);

      if (targetPhone !== sender) {
        replyText = `✅ *Bot AI Berhasil Diaktifkan Kembali!*\n\n📲 *Nomor Pasien:* ${targetPhone}`;
        await whatsappProvider.sendMessage(sender, replyText);
      }
      return;
    }

    // ------------------------------------------------------------------------
    // 1. JIKA PASIEN DALAM MODE HANDOFF_ADMIN (BOT SILENT MODE)
    // ------------------------------------------------------------------------
    if (session.step === 'HANDOFF_ADMIN') {
      console.log(`ℹ️ [Worker] Mengabaikan pesan dari ${sender} karena sesi sedang dalam mode HANDOFF_ADMIN.`);
      
      if (env.ADMIN_WA_NUMBER && env.ADMIN_WA_NUMBER.trim() !== '') {
        const patientName = session.booking?.nama_pasien || 'Pasien';
        const adminAlertText = `💬 *[PESAN BARU PASIEN HANDOFF]*\n\n👤 *Pasien:* ${patientName} (${cleanSenderPhone})\n💬 *Pesan:* "${message}"\n\n*Balas via WA:* \`!balas ${cleanSenderPhone} <pesan_anda>\``;
        await whatsappProvider.sendMessage(env.ADMIN_WA_NUMBER, adminAlertText);
      }
      return;
    }

    // ------------------------------------------------------------------------
    // 2. KLASIFIKASI NIAT CHAT
    // ------------------------------------------------------------------------
    const intent = await classifyIntent(message, session.history);
    console.log(`👷 [Worker] Niat terdeteksi: ${intent.toUpperCase()}`);

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
      replyText = `🤖 Baik Kak, pesan Kakak telah kami teruskan ke Admin Resepsionis Klinik Gigi kami. Bot otomatis diistirahatkan sementara untuk nomor ini. Admin kami akan segera membalas percakapan Kakak secara manual ya. Terima kasih! 🙏`;
      await whatsappProvider.sendMessage(sender, replyText);
      session.history.push({ role: 'assistant', content: replyText });
      
      await sessionService.setSession(sender, session, 7200);

      if (env.ADMIN_WA_NUMBER && env.ADMIN_WA_NUMBER.trim() !== '') {
        const patientName = session.booking?.nama_pasien || 'Pasien';
        const adminAlertMessage = `🚨 *[ALERT PASIEN HANDOFF KLINIK GIGI]*\n\n👤 *Pasien:* ${patientName} (${cleanSenderPhone})\n💬 *Pesan Pasien:* "${message}"\n\n💬 *Cara Balas dari WA:* \n\`!balas ${cleanSenderPhone} <pesan_anda>\` \n\n🤖 *Cara Aktifkan Bot Kembali:* \n\`!bot-on ${cleanSenderPhone}\``;
        console.log(`📡 [Worker] Meneruskan notifikasi Handoff ke WA Admin: ${env.ADMIN_WA_NUMBER}`);
        await whatsappProvider.sendMessage(env.ADMIN_WA_NUMBER, adminAlertMessage);
      }
      return;
    }

    // ------------------------------------------------------------------------
    // HANDLING GLOBAL INTENT: GRATITUDE (UCAPAN TERIMA KASIH / SALAM PENUTUP)
    // ------------------------------------------------------------------------
    if (intent === 'GRATITUDE') {
      console.log(`👷 [Worker] Menerima ucapan terima kasih dari ${sender}`);
      const patientName = session.booking?.nama_pasien || '';
      const nameCall = patientName ? ` Kak *${patientName}*` : ' Kak';
      replyText = `🤖 Sama-sama${nameCall}! Senang bisa membantu melayani Kakak. Jika ada pertanyaan seputar perawatan gigi atau ingin konsultasi lagi, jangan ragu untuk chat kami kembali ya. Sampai jumpa di klinik gigi kami! 🙏😊🦷`;
      await whatsappProvider.sendMessage(sender, replyText);
      session.history.push({ role: 'assistant', content: replyText });
      await sessionService.setSession(sender, session);
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
        session.booking.nomor_hp = sanitizePhoneNumber(session.booking.nomor_hp, cleanSenderPhone);
        
        const isDateMissing = !session.booking.tanggal_booking || session.booking.tanggal_booking.trim() === '' || session.booking.tanggal_booking.trim() === '-';
        const isTimeMissing = !session.booking.jam_booking || session.booking.jam_booking.trim() === '' || session.booking.jam_booking.trim() === '-' || session.booking.jam_booking.includes('Sesuai');
                                  
        if (isDateMissing || isTimeMissing) {
          session.step = 'AWAITING_DATE_TIME';
          if (isDateMissing) {
            replyText = `🤖 Terima kasih Kak *${inputName}*! Selanjutnya, mohon infokan **Hari/Tanggal & Jam Slot Kedatangan** yang Kakak inginkan untuk periksa gigi ya (contoh: *Besok jam 14:00 WIB* atau *Sabtu jam 10:00 WIB*). 😊`;
          } else {
            replyText = `🤖 Terima kasih Kak *${inputName}*! Untuk tanggal *${session.booking.tanggal_booking}*, Kakak ingin mengambil **Jam Slot** berapa? (Klinik kami buka 09:00 - 20:00 WIB, contoh: *14:00 WIB* atau *10:00 WIB*). 😊`;
          }
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

      // Gunakan AI untuk ekstraksi presisi tanggal/jam dari pesan baru pasien
      if (session.booking) {
        const extractedNew = await extractBookingFromChat(message, catalogContext, session.history, session.booking);
        
        session.booking.nama_pasien = session.booking.nama_pasien || extractedNew.nama_pasien || 'Pasien';
        session.booking.nomor_hp = sanitizePhoneNumber(extractedNew.nomor_hp || session.booking.nomor_hp, cleanSenderPhone);
        session.booking.tanggal_booking = extractedNew.tanggal_booking || session.booking.tanggal_booking || message.trim();
        session.booking.jam_booking = extractedNew.jam_booking || session.booking.jam_booking || '';
        
        const isTimeStillMissing = !session.booking.jam_booking || 
                                   session.booking.jam_booking.trim() === '' || 
                                   session.booking.jam_booking.trim() === '-' || 
                                   session.booking.jam_booking.includes('Sesuai');

        if (isTimeStillMissing) {
          replyText = `🤖 Terima kasih Kak *${session.booking.nama_pasien}*! Untuk tanggal *${session.booking.tanggal_booking}*, Kakak ingin mengambil **Jam Slot** berapa? (Klinik kami buka 09:00 - 20:00 WIB, contoh: *14:00 WIB* atau *10:00 WIB*). 😊`;
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

    // C. STATE: AWAITING_CONFIRMATION (MENUNGGU KONFIRMASI FINAL)
    if (session.step === 'AWAITING_CONFIRMATION') {
      if (intent === 'CONFIRM') {
        if (session.booking) {
          session.booking.nomor_hp = sanitizePhoneNumber(session.booking.nomor_hp, cleanSenderPhone);
          
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
          updatedBooking.nomor_hp = sanitizePhoneNumber(updatedBooking.nomor_hp, cleanSenderPhone);
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

        extractedBooking.nomor_hp = sanitizePhoneNumber(extractedBooking.nomor_hp, cleanSenderPhone);
        session.booking = extractedBooking;

        const isNameMissing = !extractedBooking.nama_pasien || 
                              extractedBooking.nama_pasien.trim() === '-' || 
                              extractedBooking.nama_pasien.trim() === '';
                              
        const isDateMissing = !extractedBooking.tanggal_booking || 
                              extractedBooking.tanggal_booking.trim() === '-' || 
                              extractedBooking.tanggal_booking.trim() === '';

        const isTimeMissing = !extractedBooking.jam_booking || 
                              extractedBooking.jam_booking.trim() === '-' || 
                              extractedBooking.jam_booking.trim() === '' ||
                              extractedBooking.jam_booking.includes('Sesuai');

        if (isNameMissing) {
          session.step = 'AWAITING_NAME';
          replyText = `🤖 Terima kasih! Mohon infokan **Nama Lengkap Pasien** Kakak ya agar reservasi periksa gigi bisa kami catat. 😊`;
        } else if (isDateMissing || isTimeMissing) {
          session.step = 'AWAITING_DATE_TIME';
          if (isDateMissing) {
            replyText = `🤖 Terima kasih Kak *${extractedBooking.nama_pasien}*! Mohon infokan **Hari/Tanggal & Jam Slot Kedatangan** Kakak ya agar kami jadwalkan dokter giginya (contoh: *Besok jam 14:00 WIB*). 😊`;
          } else {
            replyText = `🤖 Terima kasih Kak *${extractedBooking.nama_pasien}*! Untuk tanggal *${extractedBooking.tanggal_booking}*, Kakak ingin mengambil **Jam Slot** berapa? (Klinik kami buka 09:00 - 20:00 WIB, contoh: *14:00 WIB* atau *10:00 WIB*). 😊`;
          }
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

      // Default Response (Sapaan Pembuka atau Percakapan Umum)
      const isGreeting = /^(halo|hai|p|pagi|siang|sore|malam|assalamu|halo kak|hi|menu|bantuan)/i.test(cleanMessageLower);
      if (isGreeting) {
        replyText = `🤖 Halo Kak! Selamat datang di Klinik Gigi (Dental Clinic) Kami. 😊\n\nAda yang bisa kami bantu seputar perawatan atau kesehatan gigi Kakak? Kakak bisa menanyakan estimasi biaya/tarif dokter gigi, atau bisa langsung mengetikkan jadwal booking periksa gigi Kakak.\n\n*Contoh Format Reservasi:*\n_\"Mau booking scaling gigi dan tambal gigi untuk besok jam 2 siang kak\"_`;
      } else {
        replyText = await answerInquiry(message, catalogContext, session.history);
        replyText = `🤖 ${replyText}`;
      }
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
