# 🎫 Panduan Queue System (Sistem Antrian Terpusat)

## 🎯 Konsep: Tiket Antrian Seperti Bank/Rumah Sakit

Sistem antrian terpusat yang mengontrol akses sinkronisasi secara bertahap dan stabil.

---

## 🔄 Cara Kerja

### **Flow Siswa:**

```
1. Buka Aplikasi
   ↓
2. Login (client-side, instant)
   ↓
3. Klik "Sinkronisasi"
   ↓
4. [QUEUE SYSTEM AKTIF]
   ├─ Dapat tiket antrian (nomor urut)
   ├─ Lihat screen: "Nomor Antrian: 45"
   ├─ Estimasi waktu: "~4 menit"
   ├─ Progress bar animasi
   └─ STAY di halaman (jangan tutup)
   ↓
5. Sistem check posisi setiap 5 detik
   ├─ Posisi 45 → 40 → 35 → ... → 5 → 0
   └─ Update UI real-time
   ↓
6. Posisi = 0 (Giliran Anda!)
   ↓
7. Auto-proceed ke download soal
   ↓
8. Selesai sync
```

---

## ✅ Keuntungan Queue System

### **vs Jitter Random:**

| Aspek | Jitter Random | Queue System |
|-------|---------------|--------------|
| **Kontrol** | ❌ Tidak terprediksi | ✅ Terpusat & terkontrol |
| **Fairness** | ⚠️ Bisa tidak adil | ✅ First-come first-served |
| **Visibility** | ❌ Siswa tidak tahu posisi | ✅ Siswa lihat nomor antrian |
| **Load** | ⚠️ Bisa spike | ✅ Stabil (max 10 concurrent) |
| **UX** | ⚠️ Countdown buta | ✅ Progress bar + estimasi |
| **Admin** | ❌ Tidak bisa monitor | ✅ Bisa lihat queue real-time |

---

## 📊 Konfigurasi

### **Default Settings:**

```javascript
const QUEUE_CONFIG = {
  enabled: true,              // Enable/disable queue
  maxConcurrent: 10,          // Max 10 siswa sync bersamaan
  queueInterval: 5000,        // Check queue setiap 5 detik
  ticketExpiry: 300000,       // Tiket expired 5 menit
  storageKey: 'CBT_QUEUE_TICKET',
  serverQueuePath: '/queue_status'
};
```

### **Cara Disable Queue:**

Jika ingin kembali ke jitter random:

```javascript
// Di console browser atau script.js
window.QueueSystem.setEnabled(false);
```

---

## 🎨 UI Queue Screen

### **Elemen:**

1. **Icon Animasi** - Clock rotating + pulse effect
2. **Nomor Antrian** - Besar, bold, gradient background
3. **Estimasi Waktu** - "~4 menit"
4. **Status** - "Menunggu..." / "Giliran Anda!"
5. **Progress Bar** - Visual progress
6. **Progress Text** - "45 siswa di depan Anda"
7. **Tips** - Jangan tutup halaman, dll

### **Animasi:**

- ✅ Slide up entrance
- ✅ Pulse icon
- ✅ Rotating clock
- ✅ Smooth progress bar
- ✅ Number countdown

---

## 🔧 Implementasi Server-Side

### **Option 1: Supabase Edge Function**

Buat Edge Function `queue_manager`:

```typescript
// supabase/functions/queue_manager/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Queue state (in-memory, bisa pakai Redis untuk production)
const queue: string[] = []
const processing = new Set<string>()
const MAX_CONCURRENT = 10

serve(async (req) => {
  const { action, ticketId } = await req.json()
  
  if (action === 'request') {
    // Add to queue
    queue.push(ticketId)
    
    // Save to database
    await supabase.from('queue_tickets').insert({
      id: ticketId,
      status: 'waiting',
      position: queue.length,
      created_at: new Date().toISOString()
    })
    
    return new Response(JSON.stringify({
      success: true,
      ticketId,
      position: queue.length
    }))
  }
  
  if (action === 'check') {
    // Check position
    const position = queue.indexOf(ticketId)
    
    if (position === -1) {
      // Not in queue, check if processing
      if (processing.has(ticketId)) {
        return new Response(JSON.stringify({
          success: true,
          position: 0,
          status: 'processing'
        }))
      }
      
      // Check if can process
      if (processing.size < MAX_CONCURRENT) {
        processing.add(ticketId)
        queue.splice(queue.indexOf(ticketId), 1)
        
        return new Response(JSON.stringify({
          success: true,
          position: 0,
          status: 'ready'
        }))
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      position: position + 1,
      total: queue.length,
      status: 'waiting'
    }))
  }
  
  if (action === 'complete') {
    // Remove from processing
    processing.delete(ticketId)
    
    // Update database
    await supabase.from('queue_tickets').update({
      status: 'completed',
      completed_at: new Date().toISOString()
    }).eq('id', ticketId)
    
    return new Response(JSON.stringify({
      success: true
    }))
  }
  
  return new Response(JSON.stringify({ success: false }))
})
```

### **Option 2: Supabase Realtime (Simpler)**

Gunakan tabel `queue_tickets` dengan Realtime subscription:

```sql
-- Create table
CREATE TABLE queue_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  status TEXT DEFAULT 'waiting',
  position INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE queue_tickets;

-- Create index
CREATE INDEX idx_queue_status ON queue_tickets(status, created_at);
```

Client-side subscribe:

```javascript
// Subscribe to queue updates
const subscription = supabase
  .channel('queue_updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'queue_tickets'
  }, (payload) => {
    // Update UI based on queue changes
    updateQueuePosition(payload.new.position)
  })
  .subscribe()
```

---

## 📊 Load Calculation

### **Dengan Queue System:**

```
Max concurrent: 10 siswa
Avg sync time: 3 detik per siswa
Throughput: 10 ÷ 3 = 3.33 siswa/detik = 200 siswa/menit

900 siswa:
├─ Waktu total: 900 ÷ 200 = 4.5 menit
├─ Load: 10 req/s sustained (stable)
└─ Status: ✅ Sangat stabil
```

### **vs Jitter 120s:**

```
Jitter 120s:
├─ 900 siswa tersebar 2 menit
├─ Load: 7.5 req/s average
├─ Peak: bisa 10-15 req/s (random spike)
└─ Status: ✅ Aman tapi kurang stabil

Queue System:
├─ 900 siswa dalam 4.5 menit
├─ Load: 3.33 req/s sustained
├─ Peak: TIDAK ADA (controlled)
└─ Status: ✅ Sangat stabil
```

**Trade-off:**
- Queue: Lebih lama (4.5 menit) tapi **sangat stabil**
- Jitter: Lebih cepat (2 menit) tapi **bisa spike**

---

## 🎯 Rekomendasi Penggunaan

### **Gunakan Queue System Jika:**

✅ Ujian besar (>500 siswa)
✅ Butuh kontrol ketat
✅ Butuh fairness (first-come first-served)
✅ Butuh monitoring real-time
✅ Koneksi internet stabil
✅ Ada waktu persiapan cukup (30-45 menit)

### **Gunakan Jitter Random Jika:**

✅ Ujian kecil (<200 siswa)
✅ Butuh cepat (2 menit)
✅ Tidak butuh monitoring
✅ Koneksi internet bervariasi
✅ Waktu persiapan terbatas (15 menit)

---

## 🔧 Cara Enable/Disable

### **Enable Queue System:**

```javascript
// Di console browser atau script.js
window.QueueSystem.setEnabled(true);
```

### **Disable Queue System (Fallback ke Jitter):**

```javascript
window.QueueSystem.setEnabled(false);
```

### **Check Status:**

```javascript
console.log('Queue enabled:', window.QueueSystem.enabled);
console.log('Currently waiting:', window.QueueSystem.isWaiting());
```

---

## 🧪 Testing

### **Test dengan 10 Siswa:**

1. Buka 10 tab browser (incognito)
2. Login dengan nama berbeda di setiap tab
3. Klik "Sinkronisasi" bersamaan
4. Observe:
   - Tab 1-10: Dapat nomor antrian 1-10
   - Tab 1-10: Proses bertahap (10 concurrent)
   - Load server: Stabil ~3 req/s

### **Test dengan 100 Siswa (Simulasi):**

```javascript
// Script simulasi
for (let i = 0; i < 100; i++) {
  setTimeout(async () => {
    const ticket = await window.QueueSystem.waitInQueue();
    console.log(`Siswa ${i} selesai sync`);
  }, i * 100); // Stagger 100ms
}
```

---

## 📈 Monitoring Dashboard (Admin)

### **Metrics yang Bisa Dimonitor:**

1. **Queue Length** - Jumlah siswa dalam antrian
2. **Processing Count** - Jumlah siswa sedang sync
3. **Completed Count** - Jumlah siswa selesai sync
4. **Avg Wait Time** - Rata-rata waktu tunggu
5. **Throughput** - Siswa/menit

### **Query Supabase:**

```sql
-- Current queue
SELECT COUNT(*) as queue_length
FROM queue_tickets
WHERE status = 'waiting';

-- Processing
SELECT COUNT(*) as processing_count
FROM queue_tickets
WHERE status = 'processing';

-- Completed
SELECT COUNT(*) as completed_count
FROM queue_tickets
WHERE status = 'completed';

-- Avg wait time
SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_wait_seconds
FROM queue_tickets
WHERE status = 'completed';
```

---

## ✅ Kesimpulan

### **Queue System:**

**Pros:**
- ✅ Sangat stabil (no spike)
- ✅ Fair (first-come first-served)
- ✅ Visible (siswa lihat posisi)
- ✅ Monitorable (admin lihat queue)
- ✅ Controlled (max concurrent)

**Cons:**
- ⚠️ Lebih lama (4.5 menit vs 2 menit)
- ⚠️ Butuh server-side logic
- ⚠️ Siswa harus stay di halaman

### **Rekomendasi:**

**Untuk 900 siswa:**
- **Option 1:** Queue System (paling stabil)
- **Option 2:** Jitter 120s (lebih cepat)
- **Option 3:** H-1 Sync (paling optimal)

**Best Practice:**
- H-1 Sync untuk persiapan
- Queue System untuk hari H (jika ada yang belum sync)

---

**Version:** 1.0  
**Last Updated:** 8 Mei 2026  
**Status:** Ready to use (need server-side implementation)
