/* ========================================================
   🚀 SUPABASE ONLY MODE (The Smart Hybrid Mock v8)
   ======================================================== */

(function() {
  console.log("[Supabase Patch] Injecting Smart Mock Overrides...");

  // --- FIREBASE MOCK (tanpa Firebase SDK) ---
  function MockReference() {}
  MockReference.prototype = {
      once: () => Promise.resolve({ val: () => ({}), exists: () => false }),
      set: () => Promise.resolve(),
      update: () => Promise.resolve(),
      remove: () => Promise.resolve(),
      push: () => ({ key: 'mock_' + Date.now(), set: () => Promise.resolve() }),
      on: () => {},
      off: () => {}
  };
  const mockDbInstance = {
      ref: () => ({ once: () => Promise.resolve({ val: () => ({}), exists: () => false }) }),
      goOffline: () => {}, goOnline: () => {},
      Reference: MockReference,
      ServerValue: { TIMESTAMP: Date.now() }
  };
  const dbFunc = function() { return Object.assign({}, mockDbInstance); };
  dbFunc.Reference = MockReference;
  dbFunc.ServerValue = mockDbInstance.ServerValue;
  const mockAuth = {
      currentUser: { uid: 'supa_user' },
      onAuthStateChanged: (cb) => { setTimeout(() => cb({ uid: 'supa_user' }), 100); return () => {}; },
      signInAnonymously: () => Promise.resolve({ user: { uid: 'supa_user' } })
  };
  window.firebase = {
      apps: [],
      initializeApp: function() { this.apps = [{ name: '[MOCK]' }]; },
      database: dbFunc,
      auth: () => mockAuth
  };
  window.db = mockDbInstance;
  window.withDB = async function(cb) { return cb(mockDbInstance); };

  // --- 1. THE SMART MOCK (Redirects Firebase Writes to Supabase) ---
  const smartRef = (path) => {
    const rawPath = String(path || '');
    const normalizedPath = rawPath.replace(/^\/+/, '').replace(/\/+/g, '/');
    return {
        once: async (type) => {
            if (normalizedPath === 'config/identity') {
                const res = await fetchSupabase('config', { key: 'eq.identity' });
                return { val: () => (res.success && res.data.length > 0) ? safeParse(res.data[0].value) : null, exists: () => res.success && res.data.length > 0 };
            }
            if (normalizedPath === 'config/security') {
                const res = await fetchSupabase('config', { key: 'eq.security' });
                return { val: () => (res.success && res.data.length > 0) ? safeParse(res.data[0].value) : null, exists: () => res.success && res.data.length > 0 };
            }
            if (normalizedPath === 'config/admin_pass') {
                const res = await fetchSupabase('config', { key: 'eq.admin_pass' });
                return { val: () => (res.success && res.data.length > 0) ? res.data[0].value : null, exists: () => res.success && res.data.length > 0 };
            }
            if (normalizedPath === 'config/security/bypassCode') {
                const res = await fetchSupabase('config', { key: 'eq.security' });
                if (res.success && res.data.length > 0) {
                    const sec = safeParse(res.data[0].value);
                    return { val: () => (sec && sec.bypassCode) ? sec.bypassCode : null, exists: () => !!(sec && sec.bypassCode) };
                }
                return { val: () => null, exists: () => false };
            }
            if (normalizedPath === 'config/editor_token') {
                const res = await fetchSupabase('config', { key: 'eq.editor_token' });
                if (res.success && res.data.length > 0) return { val: () => res.data[0].value, exists: () => true };
                // Fallback to admin_pass
                const res2 = await fetchSupabase('config', { key: 'eq.admin_pass' });
                return { val: () => (res2.success && res2.data.length > 0) ? res2.data[0].value : null, exists: () => res2.success && res2.data.length > 0 };
            }
            if (normalizedPath === 'peserta') {
                const res = await fetchSupabase('peserta');
                const data = {};
                if (res.success) res.data.forEach(p => data[p.id] = { nama: p.nama, kelas: p.kelas });
                return { val: () => data, exists: () => res.success };
            }
            if (normalizedPath === 'jadwal') {
                const res = await fetchSupabase('jadwal_ujian');
                const data = {};
                if (res.success) res.data.forEach(j => data[j.id] = j);
                return { val: () => data, exists: () => res.success };
            }
            if (normalizedPath.startsWith('jadwal/')) {
                const examId = normalizedPath.split('/')[1];
                const res = await fetchSupabase('jadwal_ujian', { id: 'eq.' + examId });
                return { val: () => (res.success && res.data.length > 0) ? res.data[0] : null, exists: () => res.success && res.data.length > 0 };
            }
            if (normalizedPath === 'soal') {
                const res = await fetchSupabase('soal');
                const data = {};
                if (res.success) {
                    const byBank = {};
                    res.data.forEach(s => {
                        if (!byBank[s.bank_id]) byBank[s.bank_id] = {};
                        byBank[s.bank_id][s.id] = s;
                    });
                    return { val: () => byBank, exists: () => res.success };
                }
                return { val: () => ({}), exists: () => false };
            }
            if (normalizedPath.startsWith('soal/')) {
                const parts = normalizedPath.split('/');
                const bankId = parts[1];
                if (parts.length === 3) {
                    const soalId = parts[2];
                    const res = await fetchSupabase('soal', { bank_id: 'eq.' + bankId, id: 'eq.' + soalId });
                    return { val: () => (res.success && res.data.length > 0) ? res.data[0] : null, exists: () => res.success && res.data.length > 0 };
                }
                const res = await fetchSupabase('soal', { bank_id: 'eq.' + bankId });
                const data = {};
                if (res.success) res.data.forEach(s => data[s.id] = s);
                return { val: () => data, exists: () => res.success };
            }
            if (normalizedPath.startsWith('kunci/')) {
                const parts = normalizedPath.split('/');
                const bankId = parts[1];
                if (parts.length === 3) {
                    const soalId = parts[2];
                    const res = await fetchSupabase('kunci', { bank_id: 'eq.' + bankId, id: 'eq.' + soalId });
                    return { val: () => (res.success && res.data.length > 0) ? res.data[0].kunci : null, exists: () => res.success && res.data.length > 0 };
                }
                const res = await fetchSupabase('kunci', { bank_id: 'eq.' + bankId });
                const data = {};
                if (res.success) res.data.forEach(k => data[k.id] = k.kunci);
                return { val: () => data, exists: () => res.success };
            }
            if (path === 'hasil') {
                const res = await fetchSupabase('hasil', { order: 'timestamp.desc', limit: 1000 });
                const data = {};
                if (res.success) res.data.forEach(h => data[h.id] = h);
                return { val: () => data, exists: () => res.success };
            }
            if (path.startsWith('hasil/')) {
                const parts = path.split('/');
                const examId = parts[1];
                if (parts.length === 3 && parts[2]) {
                    const userId = parts[2];
                    const res = await fetchSupabase('hasil', { id: 'eq.' + examId + '_' + userId });
                    return { val: () => (res.success && res.data.length > 0) ? res.data[0] : null, exists: () => res.success && res.data.length > 0 };
                }
                const res = await fetchSupabase('hasil', { exam_id: 'eq.' + examId });
                const data = {};
                if (res.success) res.data.forEach(h => data[h.user_id] = h);
                return { val: () => data, exists: () => res.success };
            }
            if (path === 'pelanggaran') {
                const res = await fetchSupabase('pelanggaran', { order: 'timestamp.desc', limit: 200 });
                const data = {};
                if (res.success) res.data.forEach((p, i) => data['p' + i] = p);
                return { val: () => data, exists: () => res.success };
            }
            if (path === 'status_sync') {
                const res = await fetchSupabase('status_sync');
                const data = {};
                if (res.success) res.data.forEach(s => {
                    if (!data[s.exam_id]) data[s.exam_id] = {};
                    data[s.exam_id][s.user_id] = s;
                });
                return { val: () => data, exists: () => res.success };
            }
            if (path === 'online_status') {
                const res = await fetchSupabase('online_status', { last_seen: 'gt.' + (Date.now() - 600000) });
                const data = {};
                if (res.success) res.data.forEach(o => {
                    if (!data[o.exam_id]) data[o.exam_id] = {};
                    data[o.exam_id][o.user_id] = { last_seen: o.last_seen };
                });
                return { val: () => data, exists: () => res.success };
            }
            if (path.startsWith('online_status/')) {
                const parts = path.split('/');
                const examId = parts[1];
                const res = await fetchSupabase('online_status', { exam_id: 'eq.' + examId });
                const data = {};
                if (res.success) res.data.forEach(o => data[o.user_id] = { last_seen: o.last_seen });
                return { val: () => data, exists: () => res.success };
            }
            if (path === 'reset_flags') {
                const res = await fetchSupabase('reset_flags');
                const data = {};
                if (res.success) res.data.forEach(r => {
                    if (!data[r.exam_id]) data[r.exam_id] = {};
                    data[r.exam_id][r.user_id] = r;
                });
                return { val: () => data, exists: () => res.success };
            }
            if (path.startsWith('reset_flags/')) {
                const parts = path.split('/');
                const examId = parts[1];
                const userId = parts[2];
                const res = await fetchSupabase('reset_flags', { exam_id: 'eq.' + examId, user_id: 'eq.' + userId });
                return { val: () => (res.success && res.data.length > 0) ? res.data[0] : null, exists: () => res.success && res.data.length > 0 };
            }
            if (path.startsWith('broadcasts/')) {
                const examId = path.split('/')[1];
                const res = await fetchSupabase('broadcasts', { exam_id: 'eq.' + examId, order: 'timestamp.desc', limit: 1 });
                return { val: () => (res.success && res.data.length > 0) ? res.data[0] : null, exists: () => res.success && res.data.length > 0 };
            }
            return { val: () => ({}), exists: () => false };
        },
        update: async (data) => {
            console.log(`[Supabase Mock] Intercepting update on: /${normalizedPath}`);
            if (normalizedPath === 'config/security') {
                if (typeof window.invokeSupabaseFunction === 'function') {
                    const adminPass = sessionStorage.getItem('admin_pwd') || '';
                    if (adminPass) {
                        const fnRes = await window.invokeSupabaseFunction('admin_config', { adminPass, key: 'security', value: data }, 12000);
                        if (fnRes.success && fnRes.data && fnRes.data.success) return fnRes.data;
                        console.warn('[config/security] Edge Function fallback:', fnRes.error || fnRes.status || 'unknown');
                    }
                }
                return await insertSupabase('config', { key: 'security', value: JSON.stringify(data) });
            }
            if (normalizedPath === 'config/identity') {
                if (typeof window.invokeSupabaseFunction === 'function') {
                    const adminPass = sessionStorage.getItem('admin_pwd') || '';
                    if (adminPass) {
                        const fnRes = await window.invokeSupabaseFunction('admin_config', { adminPass, key: 'identity', value: data }, 12000);
                        if (fnRes.success && fnRes.data && fnRes.data.success) return fnRes.data;
                        console.warn('[config/identity] Edge Function fallback:', fnRes.error || fnRes.status || 'unknown');
                    }
                }
                return await insertSupabase('config', { key: 'identity', value: JSON.stringify(data) });
            }
            if (normalizedPath === 'jadwal') {
                const rows = Object.keys(data).map(id => ({ id, ...data[id] }));
                return await insertSupabase('jadwal_ujian', rows);
            }
            if (normalizedPath.startsWith('jadwal/')) {
                const examId = normalizedPath.split('/')[1];
                if (typeof window.invokeSupabaseFunction === 'function') {
                    const adminPass = sessionStorage.getItem('admin_pwd') || '';
                    if (adminPass) {
                        const fnRes = await window.invokeSupabaseFunction('admin_jadwal', { action: 'upsert', adminPass, id: examId, data }, 12000);
                        if (fnRes.success && fnRes.data && fnRes.data.success) return fnRes.data;
                        console.warn('[jadwal/update] Edge Function fallback:', fnRes.error || fnRes.status || 'unknown');
                    }
                }
                return await insertSupabase('jadwal_ujian', { id: examId, ...(data || {}) });
            }
            if (normalizedPath === 'peserta') {
                const rows = Object.keys(data || {}).map(id => {
                    const src = data[id] || {};
                    return { id: String(id), nama: src.nama || '', kelas: src.kelas || '' };
                });
                if (typeof window.invokeSupabaseFunction === 'function') {
                    const adminPass = sessionStorage.getItem('admin_pwd') || '';
                    if (adminPass) {
                        const fnRes = await window.invokeSupabaseFunction('admin_peserta', { action: 'upsert_many', adminPass, pesertaList: rows }, 20000);
                        if (fnRes.success && fnRes.data && fnRes.data.success) return fnRes.data;
                        console.warn('[peserta/update] Edge Function fallback:', fnRes.error || fnRes.status || 'unknown');
                    }
                }
                return await insertSupabase('peserta', rows);
            }
            if (normalizedPath.startsWith('peserta/')) {
                const siswaId = normalizedPath.split('/')[1];
                const row = { id: String(siswaId), nama: (data && data.nama) || '', kelas: (data && data.kelas) || '' };
                if (typeof window.invokeSupabaseFunction === 'function') {
                    const adminPass = sessionStorage.getItem('admin_pwd') || '';
                    if (adminPass) {
                        const fnRes = await window.invokeSupabaseFunction('admin_peserta', { action: 'upsert_one', adminPass, peserta: row }, 12000);
                        if (fnRes.success && fnRes.data && fnRes.data.success) return fnRes.data;
                        console.warn('[peserta/update-one] Edge Function fallback:', fnRes.error || fnRes.status || 'unknown');
                    }
                }
                return await insertSupabase('peserta', row);
            }
            if (normalizedPath.startsWith('soal/')) {
                const parts = normalizedPath.split('/');
                const bankId = parts[1];
                if (parts.length === 3) {
                    const soalId = parts[2];
                    const parsedId = parseInt(soalId, 10);
                    const row = { bank_id: bankId, ...data };
                    if (!Number.isNaN(parsedId)) row.id = parsedId;
                    return await insertSupabase('soal', row);
                }
            }
            if (normalizedPath.startsWith('kunci/')) {
                const parts = normalizedPath.split('/');
                const bankId = parts[1];
                if (parts.length === 3) {
                    const soalId = parts[2];
                    const parsedId = parseInt(soalId, 10);
                    const row = { bank_id: bankId, kunci: (typeof data === 'string' ? data : data.kunci) };
                    if (!Number.isNaN(parsedId)) row.id = parsedId;
                    else row.id = String(soalId);
                    return await insertSupabase('kunci', row);
                }
            }
            return Promise.resolve();
        },
        set: async (data) => {
            console.log(`[Supabase Mock] Intercepting set on: /${normalizedPath}`);
            if (normalizedPath === 'config/security') {
                if (typeof window.invokeSupabaseFunction === 'function') {
                    const adminPass = sessionStorage.getItem('admin_pwd') || '';
                    if (adminPass) {
                        const fnRes = await window.invokeSupabaseFunction('admin_config', { adminPass, key: 'security', value: data }, 12000);
                        if (fnRes.success && fnRes.data && fnRes.data.success) return fnRes.data;
                        console.warn('[config/security/set] Edge Function fallback:', fnRes.error || fnRes.status || 'unknown');
                    }
                }
                return await insertSupabase('config', { key: 'security', value: JSON.stringify(data) });
            }
            if (normalizedPath === 'config/identity') {
                if (typeof window.invokeSupabaseFunction === 'function') {
                    const adminPass = sessionStorage.getItem('admin_pwd') || '';
                    if (adminPass) {
                        const fnRes = await window.invokeSupabaseFunction('admin_config', { adminPass, key: 'identity', value: data }, 12000);
                        if (fnRes.success && fnRes.data && fnRes.data.success) return fnRes.data;
                        console.warn('[config/identity/set] Edge Function fallback:', fnRes.error || fnRes.status || 'unknown');
                    }
                }
                return await insertSupabase('config', { key: 'identity', value: JSON.stringify(data) });
            }
            if (normalizedPath === 'config/admin_pass') {
                return await insertSupabase('config', { key: 'admin_pass', value: data });
            }
            if (normalizedPath === 'jadwal') {
                const rows = Object.keys(data).map(id => ({ id, ...data[id] }));
                return await insertSupabase('jadwal_ujian', rows);
            }
            if (normalizedPath.startsWith('jadwal/')) {
                const examId = normalizedPath.split('/')[1];
                // Prefer Edge Function (RLS hardening)
                if (typeof window.invokeSupabaseFunction === 'function') {
                    const adminPass = sessionStorage.getItem('admin_pwd') || '';
                    if (adminPass) {
                        const fnRes = await window.invokeSupabaseFunction('admin_jadwal', { action: 'upsert', adminPass, id: examId, data }, 12000);
                        if (fnRes.success && fnRes.data && fnRes.data.success) return fnRes.data;
                        console.warn('[jadwal/set] Edge Function fallback:', fnRes.error || fnRes.status || 'unknown');
                    }
                }
                return await insertSupabase('jadwal_ujian', { id: examId, ...(data || {}) });
            }
            if (normalizedPath === 'peserta') {
                const rows = Object.keys(data || {}).map(id => {
                    const src = data[id] || {};
                    return { id: String(id), nama: src.nama || '', kelas: src.kelas || '' };
                });
                if (typeof window.invokeSupabaseFunction === 'function') {
                    const adminPass = sessionStorage.getItem('admin_pwd') || '';
                    if (adminPass) {
                        const fnRes = await window.invokeSupabaseFunction('admin_peserta', { action: 'upsert_many', adminPass, pesertaList: rows }, 20000);
                        if (fnRes.success && fnRes.data && fnRes.data.success) return fnRes.data;
                        console.warn('[peserta/set-many] Edge Function fallback:', fnRes.error || fnRes.status || 'unknown');
                    }
                }
                return await insertSupabase('peserta', rows);
            }
            if (normalizedPath.startsWith('peserta/')) {
                const siswaId = normalizedPath.split('/')[1];
                const row = { id: String(siswaId), nama: (data && data.nama) || '', kelas: (data && data.kelas) || '' };
                if (typeof window.invokeSupabaseFunction === 'function') {
                    const adminPass = sessionStorage.getItem('admin_pwd') || '';
                    if (adminPass) {
                        const fnRes = await window.invokeSupabaseFunction('admin_peserta', { action: 'upsert_one', adminPass, peserta: row }, 12000);
                        if (fnRes.success && fnRes.data && fnRes.data.success) return fnRes.data;
                        console.warn('[peserta/set-one] Edge Function fallback:', fnRes.error || fnRes.status || 'unknown');
                    }
                }
                return await insertSupabase('peserta', row);
            }
            if (normalizedPath.startsWith('soal/')) {
                const parts = normalizedPath.split('/');
                const bankId = parts[1];
                
                // Case: soal/BANK/ID
                if (parts.length === 3) {
                    const soalId = parts[2];
                    const parsedId = parseInt(soalId, 10);
                    const qType = data.tipe || 'PG';
                    const row = {
                        bank_id: bankId,
                        pertanyaan: data.pertanyaan || '',
                        tipe: qType,
                        gambar: data.gambar || '',
                        opsi: Array.isArray(data.opsi) ? data.opsi : [],
                        bobot: (data.bobot !== undefined && data.bobot !== null) ? Number(data.bobot) || 1 : 1,
                        kiri: qType === 'JODOH' && Array.isArray(data.kiri) ? data.kiri : [],
                        kanan: qType === 'JODOH' && Array.isArray(data.kanan) ? data.kanan : [],
                    };
                    if (!Number.isNaN(parsedId)) row.id = parsedId;
                    return await insertSupabase('soal', row);
                }

                if (typeof window.invokeSupabaseFunction === 'function') {
                    const adminPass = sessionStorage.getItem('admin_pwd') || '';
                    if (adminPass) {
                        const fnRes = await window.invokeSupabaseFunction('admin_banksoal', { action: 'upsert_soal_bulk', adminPass, bankId, soal: data || {} }, 30000);
                        if (fnRes.success && fnRes.data && fnRes.data.success) return fnRes.data;
                        console.warn('[soal/set] Edge Function fallback:', fnRes.error || fnRes.status || 'unknown');
                    }
                }
                const rows = Object.keys(data).map(id => {
                    const parsedId = parseInt(id, 10);
                    const src = data[id] || {};
                    const qType = src.tipe || 'PG';
                    const row = {
                        bank_id: bankId,
                        id: Number.isNaN(parsedId) ? null : parsedId,
                        pertanyaan: src.pertanyaan || '',
                        tipe: qType,
                        gambar: src.gambar || '',
                        opsi: Array.isArray(src.opsi) ? src.opsi : [],
                        bobot: (src.bobot !== undefined && src.bobot !== null) ? Number(src.bobot) || 1 : 1,
                        // Selalu include kiri/kanan agar semua row konsisten (PGRST102 fix)
                        kiri: qType === 'JODOH' && Array.isArray(src.kiri) ? src.kiri : [],
                        kanan: qType === 'JODOH' && Array.isArray(src.kanan) ? src.kanan : [],
                    };
                    return row;
                });
                const cleanRows = rows.filter(r => r.id !== null);
                return await insertSupabase('soal', cleanRows);
            }
            if (normalizedPath.startsWith('kunci/')) {
                const parts = normalizedPath.split('/');
                const bankId = parts[1];
                
                // Case: kunci/BANK/ID
                if (parts.length === 3) {
                    const soalId = parts[2];
                    const parsedId = parseInt(soalId, 10);
                    const row = { bank_id: bankId, kunci: data };
                    if (!Number.isNaN(parsedId)) row.id = parsedId;
                    else row.id = String(soalId);
                    return await insertSupabase('kunci', row);
                }

                if (typeof window.invokeSupabaseFunction === 'function') {
                    const adminPass = sessionStorage.getItem('admin_pwd') || '';
                    if (adminPass) {
                        const fnRes = await window.invokeSupabaseFunction('admin_banksoal', { action: 'upsert_kunci_bulk', adminPass, bankId, kunci: data || {} }, 30000);
                        if (fnRes.success && fnRes.data && fnRes.data.success) return fnRes.data;
                        console.warn('[kunci/set] Edge Function fallback:', fnRes.error || fnRes.status || 'unknown');
                    }
                }
                const rows = Object.keys(data).map(id => {
                    const parsedId = parseInt(id, 10);
                    return { bank_id: bankId, id: Number.isNaN(parsedId) ? String(id) : parsedId, kunci: data[id] };
                });
                return await insertSupabase('kunci', rows);
            }
            if (normalizedPath.startsWith('status_sync/')) {
                const parts = normalizedPath.split('/');
                const examId = parts[1];
                const userId = parts[2];
                if (typeof window.invokeSupabaseFunction === 'function') {
                    const fnRes = await window.invokeSupabaseFunction('set_status_sync', { examId, userId, ready: true }, 8000);
                    if (fnRes.success && fnRes.data && fnRes.data.success) return fnRes.data;
                    if (fnRes.success && fnRes.data && fnRes.data.throttled) return { success: true }; // rate limited, ok
                    console.warn('[status_sync] Edge Function failed:', fnRes.error || fnRes.status || 'unknown');
                }
                // ✅ FIX: Fallback langsung insert — jika RLS memblokir, log warning tapi jangan crash
                // Jika pakai supabase-stage1-hardening.sql, hanya Edge Function yang bisa write
                const extraFields = (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
                const id = `${examId}_${userId}`;
                const result = await insertSupabase('status_sync', {
                    id,
                    exam_id: examId,
                    user_id: userId,
                    ready: true,
                    timestamp: Date.now(),
                    ...extraFields
                });
                if (!result.success) {
                    console.warn('[status_sync] Direct insert blocked (RLS?). Status sync tidak tersimpan untuk', userId);
                }
                return result;
            }
            return Promise.resolve();
        },
        remove: async () => {
            console.log(`[Supabase Mock] Intercepting remove on: /${normalizedPath}`);
            if (normalizedPath.startsWith('jadwal/')) {
                const examId = normalizedPath.split('/')[1];
                if (typeof window.invokeSupabaseFunction === 'function') {
                    const adminPass = sessionStorage.getItem('admin_pwd') || '';
                    if (adminPass) {
                        const fnRes = await window.invokeSupabaseFunction('admin_jadwal', { action: 'delete', adminPass, id: examId }, 12000);
                        if (fnRes.success && fnRes.data && fnRes.data.success) return fnRes.data;
                        console.warn('[jadwal/remove] Edge Function fallback:', fnRes.error || fnRes.status || 'unknown');
                    }
                }
                return await deleteSupabase('jadwal_ujian', { id: 'eq.' + examId });
            }
            if (normalizedPath.startsWith('peserta/')) {
                const siswaId = normalizedPath.split('/')[1];
                if (typeof window.invokeSupabaseFunction === 'function') {
                    const adminPass = sessionStorage.getItem('admin_pwd') || '';
                    if (adminPass) {
                        const fnRes = await window.invokeSupabaseFunction('admin_peserta', { action: 'delete_one', adminPass, id: siswaId }, 12000);
                        if (fnRes.success && fnRes.data && fnRes.data.success) return fnRes.data;
                        console.warn('[peserta/remove] Edge Function fallback:', fnRes.error || fnRes.status || 'unknown');
                    }
                }
                return await deleteSupabase('peserta', { id: 'eq.' + siswaId });
            }
            if (normalizedPath.startsWith('soal/')) {
                const parts = normalizedPath.split('/');
                const bankId = parts[1];
                if (parts.length === 3) {
                    const soalId = parts[2];
                    const parsedId = parseInt(soalId, 10);
                    const filters = { bank_id: 'eq.' + bankId };
                    if (!Number.isNaN(parsedId)) filters.id = 'eq.' + parsedId;
                    else filters.id = 'eq.' + soalId; // Fallback if it's text
                    await deleteSupabase('soal', filters);
                    return await deleteSupabase('kunci', filters);
                }
                if (typeof window.invokeSupabaseFunction === 'function') {
                    const adminPass = sessionStorage.getItem('admin_pwd') || '';
                    if (adminPass) {
                        const fnRes = await window.invokeSupabaseFunction('admin_banksoal', { action: 'delete_bank', adminPass, bankId }, 20000);
                        if (fnRes.success && fnRes.data && fnRes.data.success) return fnRes.data;
                        console.warn('[banksoal/remove] Edge Function fallback:', fnRes.error || fnRes.status || 'unknown');
                    }
                }
                await deleteSupabase('soal', { bank_id: 'eq.' + bankId });
                return await deleteSupabase('kunci', { bank_id: 'eq.' + bankId });
            }
            return Promise.resolve();
        },
        on: () => {}, off: () => {}, 
        push: () => ({ key: 'mock_' + Date.now(), set: () => Promise.resolve() })
    };
  };

  const mockDb = {
    ref: (path) => smartRef(path || ''),
    goOffline: () => {}, goOnline: () => {},
    Reference: { prototype: { once: () => Promise.resolve({ val: () => ({}), exists: () => false }), set: () => Promise.resolve(), update: () => Promise.resolve(), remove: () => Promise.resolve(), push: () => ({ key: 'mock_' + Date.now(), set: () => Promise.resolve() }), on: () => {}, off: () => {} } },
    ServerValue: { TIMESTAMP: Date.now() }
  };

  // Update mockDbInstance.ref to use smartRef (so firebase.database() also works)
  mockDbInstance.ref = (path) => smartRef(path || '');
  // Also update window.db which points to mockDbInstance
  if (window.db) window.db.ref = mockDbInstance.ref;

  if (window.firebase) {
      // Keep existing firebase.database structure, just patch Reference if needed
      const existingDb = window.firebase.database;
      if (typeof existingDb === 'function') {
          // firebase.database is a function - wrap it
          const newDbFunc = function() {
              const db = existingDb();
              // Ensure Reference exists on returned db
              if (!db.Reference) {
                  db.Reference = mockDb.Reference;
              }
              return db;
          };
          // Preserve .Reference on the function itself (needed by patchFirebase)
          newDbFunc.Reference = existingDb.Reference || mockDb.Reference;
          newDbFunc.ServerValue = existingDb.ServerValue || mockDb.ServerValue;
          window.firebase.database = newDbFunc;
      } else if (existingDb && !existingDb.Reference) {
          existingDb.Reference = mockDb.Reference;
      }
      window.firebase.auth = () => mockAuth;
  }

  // --- 2. CORE HELPERS ---
  const safeParse = (val) => {
      if (typeof val === 'object' && val !== null) return val;
      try { return JSON.parse(val); } catch(e) { return val; }
  };

  // Override window functions
  const Overrides = {
      initSchoolIdentity: async function() {
          const supRes = await fetchSupabase('config', { key: 'eq.identity' });
          if (supRes.success && supRes.data.length > 0) {
              const iden = safeParse(supRes.data[0].value);
              if (iden && window.applySchoolIdentity) window.applySchoolIdentity(iden);
          }
      },
       loadPesertaCache: async function(force = false) {
           const supRes = await fetchSupabase('peserta');
           if (supRes.success && supRes.data) {
               const results = supRes.data.map(p => ({ id: p.id, name: p.nama, kelas: p.kelas, _search: (p.nama + ' ' + p.kelas + ' ' + p.id).toLowerCase() }));
               await localDB.set('cache', 'PESERTA', results);
               await localDB.set('cache', 'PESERTA_TIME', Date.now().toString());
               window.cachedPeserta = results;
               return results;
           }
           return [];
       },
      syncAllDataForPortal: async function(force = false) {
          try {
              // QUEUE SYSTEM: Antrian dimulai dari sini (initial load)
              // Ini adalah titik bottleneck sebenarnya saat 900 siswa buka app bersamaan
              if (window.QueueSystem && window.QueueSystem.enabled && !force) {
                  console.log('[SyncPortal] Entering queue for initial data load...');
                  const canProceed = await window.QueueSystem.waitInQueue();
                  if (!canProceed) {
                      console.warn('[SyncPortal] Queue cancelled, using cache only');
                      if (typeof window.updateMobileSyncBadge === 'function') window.updateMobileSyncBadge(false);
                      return;
                  }
                  console.log('[SyncPortal] Queue cleared, loading data...');
              }

              await window.initSchoolIdentity();
              await window.loadPesertaCache(force);
              const [supJadwal, supSec] = await Promise.all([ fetchSupabase('jadwal_ujian'), fetchSupabase('config', { key: 'eq.security' }) ]);
               if (supJadwal.success && supJadwal.data) {
                   let jadwals = {};
                   supJadwal.data.forEach(j => { jadwals[j.id] = { id: j.id, ...j }; });
                   await localDB.set('cache', 'JADWAL', jadwals);
                   await localDB.set('cache', 'JADWAL_TIME', Date.now().toString());
                   // ✅ FIX MULTI-USER: Hanya update State.schedules jika user belum login
                  // Jika sudah login, State.schedules dikelola oleh loadSchedules() dengan
                  // status completion yang benar untuk user tersebut
                  if (!window.State || !window.State.user) {
                      if (window.State) window.State.schedules = Object.values(jadwals);
                  }
              }
              if (supSec.success && supSec.data.length > 0) { if (window.State) window.State.security = safeParse(supSec.data[0].value); }
              const dot = document.getElementById('top-sync-dot');
              if (dot) dot.style.background = '#10B981';
              // Update mobile UI setelah sync selesai
              if (typeof window.updateMobileSyncBadge === 'function') window.updateMobileSyncBadge(true);
              if (typeof window.updateMobileStatus === 'function') window.updateMobileStatus('', 'ready');
              // Enforce PWA jika setting ON
              if (typeof window.checkAndEnforcePwa === 'function') window.checkAndEnforcePwa();
              // Render jadwal hanya jika user belum login
              if (!window.State || !window.State.user) {
                  if (typeof window.renderMobileSchedule === 'function') window.renderMobileSchedule();
              }
          } catch (e) {
              console.error("Sync Error", e);
              if (typeof window.updateMobileSyncBadge === 'function') window.updateMobileSyncBadge(false);
          } finally {
              // Release queue slot setelah initial load selesai
              if (window.QueueSystem && window.QueueSystem.enabled) {
                  window.QueueSystem.releaseSlot();
              }
          }
      },
      gasRun: async function(funcName, ...args) {
          try {
              if (funcName === 'getAdminMonitoringData') {
                  const nowMs = Date.now();
                  const res = { success: true, activeExams: [], peserta: [], completions: {}, onlines: {} };
                  const [supP, supJ, supO, supH] = await Promise.all([ fetchSupabase('peserta'), fetchSupabase('jadwal_ujian'), fetchSupabase('online_status', { last_seen: 'gt.' + (nowMs - 600000) }), fetchSupabase('hasil', { order: 'timestamp.desc', limit: 1000 }) ]);
                  if (supP.success) res.peserta = supP.data.map(p => ({ id: p.id, nama: p.nama, kelas: p.kelas }));
                  if (supJ.success) res.activeExams = supJ.data.filter(j => j.aktif).map(j => ({ id: j.id, ...j }));
                  if (supO.success) supO.data.forEach(row => { if (!res.onlines[row.exam_id]) res.onlines[row.exam_id] = {}; res.onlines[row.exam_id][row.user_id] = { last_seen: row.last_seen, progress: row.progress, total: row.total, status: row.status }; });
                  if (supH.success) supH.data.forEach(h => { if (!res.completions[h.exam_id]) res.completions[h.exam_id] = []; res.completions[h.exam_id].push(h.user_id); });
                  return res;
              }
              if (funcName === 'submitExam') {
                  const [payload] = args;
                  if (typeof window.invokeSupabaseFunction === 'function') {
                      const fnRes = await window.invokeSupabaseFunction('submit_exam', payload, 15000);
                      if (fnRes.success && fnRes.data && fnRes.data.success) {
                          return fnRes.data;
                      }
                      if (fnRes.success && fnRes.data && fnRes.data.alreadySubmitted) {
                          return fnRes.data;
                      }
                      console.warn('[submitExam] Edge Function fallback:', fnRes.error || fnRes.status || 'unknown');
                  }
                  // Duplicate check
                  const existing = await fetchSupabase('hasil', { id: 'eq.' + payload.examId + '_' + payload.user.id });
                  if (existing.success && existing.data.length > 0) {
                      return { success: true, score: existing.data[0].skor, alreadySubmitted: true };
                  }
                  let finalScore = Number(payload.score);
                  if (!Number.isFinite(finalScore)) {
                      finalScore = 0;
                      const [supJ] = await Promise.all([
                          fetchSupabase('jadwal_ujian', { id: 'eq.' + payload.examId })
                      ]);
                      if (supJ.success && supJ.data.length > 0) {
                          const sch = supJ.data[0];
                          const [supK, supS] = await Promise.all([
                              fetchSupabase('kunci', { bank_id: 'eq.' + sch.nama_soal }),
                              fetchSupabase('soal', { bank_id: 'eq.' + sch.nama_soal })
                          ]);
                          if (supK.success && supS.success) {
                              const answers = payload.answers || {};
                              const bobotById = {};
                              supS.data.forEach(q => { bobotById[String(q.id)] = parseFloat(q.bobot) || 1; });
                              let totalPoints = 0;
                              let maxPoints = 0;
                              const keysById = {};
                              const detailResult = {};
                              supK.data.forEach(k => { keysById[String(k.id)] = k.kunci; });
                              Object.keys(keysById).forEach((qId) => {
                                  const qType = (supS.data.find(q => String(q.id) === qId) || {}).tipe || 'PG';
                                  const bobot = bobotById[qId] || 1;
                                  const correctAns = keysById[qId];
                                  const userAns = answers[qId];
                                  let isCorrect = false;
                                  maxPoints += bobot;
                                  if (userAns !== undefined && userAns !== null) {
                                      if (qType === 'PG' || qType === 'BS') {
                                          isCorrect = String(userAns).trim().toUpperCase() === String(correctAns || '').trim().toUpperCase();
                                      } else if (qType === 'KOMPLEKS') {
                                          if (Array.isArray(userAns)) {
                                              const cArr = String(correctAns || '').split(',').map(s => s.trim().toUpperCase()).sort();
                                              const uArr = userAns.map(s => String(s).trim().toUpperCase()).sort();
                                              isCorrect = JSON.stringify(cArr) === JSON.stringify(uArr);
                                          }
                                      } else if (qType === 'ISIAN') {
                                          isCorrect = String(userAns).trim().toLowerCase() === String(correctAns || '').trim().toLowerCase();
                                      } else if (qType === 'JODOH') {
                                          const cPairs = {};
                                          String(correctAns || '').split(';').forEach(p => {
                                              const pt = p.split('=');
                                              if (pt.length === 2) cPairs[pt[0].trim()] = pt[1].trim();
                                          });
                                          if (typeof userAns === 'object' && !Array.isArray(userAns)) {
                                              let allMatch = true;
                                              const kList = Object.keys(cPairs);
                                              if (kList.length === 0) allMatch = false;
                                              for (const k of kList) { if (userAns[k] !== cPairs[k]) { allMatch = false; break; } }
                                              isCorrect = allMatch;
                                          }
                                      }
                                  }
                                  if (isCorrect) totalPoints += bobot;
                                  // ✅ Simpan detail per soal
                                  detailResult[qId] = {
                                      answer: userAns !== undefined && userAns !== null ? userAns : '-',
                                      correct: isCorrect
                                  };
                              });
                              finalScore = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
                              // ✅ Simpan detail ke Supabase dan kembalikan ke client
                              await insertSupabase('hasil', { 
                                  id: payload.examId + '_' + payload.user.id, 
                                  exam_id: payload.examId, 
                                  user_id: payload.user.id, 
                                  nama: payload.user.name, 
                                  kelas: payload.user.kelas || '-', 
                                  skor: finalScore,
                                  detail: JSON.stringify(detailResult),
                                  waktu: payload.usedTime || '', 
                                  timestamp: Date.now() 
                              });
                              return { success: true, score: finalScore, detail: detailResult };
                          }
                      }
                  }
                  // Jika tidak ada re-grading (score sudah ada dari client)
                  const insertRes = await insertSupabase('hasil', { 
                      id: payload.examId + '_' + payload.user.id, 
                      exam_id: payload.examId, 
                      user_id: payload.user.id, 
                      nama: payload.user.name, 
                      kelas: payload.user.kelas || '-', 
                      skor: finalScore, 
                      detail: typeof payload.detail === 'string' ? payload.detail : JSON.stringify(payload.detail || {}), 
                      waktu: payload.usedTime || '', 
                      timestamp: Date.now() 
                  });
                  return { success: !!insertRes.success, score: finalScore };
              }
              if (funcName === 'syncAnswers') {
                  const [payload] = args;
                  if (typeof window.invokeSupabaseFunction === 'function') {
                      const fnRes = await window.invokeSupabaseFunction('sync_answer_delta', payload, 12000);
                      if (fnRes.success && fnRes.data && fnRes.data.success) {
                          return fnRes.data;
                      }
                      console.warn('[syncAnswers] Edge Function fallback:', fnRes.error || fnRes.status || 'unknown');
                  }
                  return await insertSupabase('sync_answers', { exam_id: payload.id_ujian, user_id: payload.id_siswa, answers: payload.answerDelta || {}, time_remaining: payload.timeRemaining || 0, violations: payload.violations || 0, last_sync: Date.now() });
              }
              if (funcName === 'setStudentOnline') {
                  const [examId, userId] = args;
                  if (typeof window.invokeSupabaseFunction === 'function') {
                      const payload = {
                          examId,
                          userId,
                          progress: (window.State && window.State.answers) ? Object.keys(window.State.answers).length : 0,
                          total: (window.State && window.State.questions) ? window.State.questions.length : 0,
                          status: 'MENGERJAKAN'
                      };
                      const fnRes = await window.invokeSupabaseFunction('set_student_online', payload, 8000);
                      if (fnRes.success && fnRes.data && fnRes.data.success) {
                          return fnRes.data;
                      }
                      console.warn('[setStudentOnline] Edge Function fallback:', fnRes.error || fnRes.status || 'unknown');
                  }
                  // Check reset flags
                  const rFlag = await fetchSupabase('reset_flags', { exam_id: 'eq.' + examId, user_id: 'eq.' + userId });
                  if (rFlag.success && rFlag.data.length > 0) {
                      await deleteSupabase('reset_flags', { exam_id: 'eq.' + examId, user_id: 'eq.' + userId });
                      return { success: true, sessionReset: true };
                  }
                  await insertSupabase('online_status', { exam_id: examId, user_id: userId, last_seen: Date.now(), progress: (window.State && window.State.answers) ? Object.keys(window.State.answers).length : 0, total: (window.State && window.State.questions) ? window.State.questions.length : 0, status: 'MENGERJAKAN' });
                  // Check broadcast
                  const bcast = await fetchSupabase('broadcasts', { exam_id: 'eq.' + examId, order: 'timestamp.desc', limit: 1 });
                  if (bcast.success && bcast.data.length > 0) return { success: true, broadcast: bcast.data[0] };
                  return { success: true };
              }
              if (funcName === 'getSchedules') {
                  const [userId, kelas] = args;
                  const [supJ, supH] = await Promise.all([ fetchSupabase('jadwal_ujian'), fetchSupabase('hasil', { user_id: 'eq.' + userId }) ]);
                  if (!supJ.success) return { success: false, message: 'Gagal muat jadwal' };
                  
                  const completedSet = new Set();
                  if (supH.success) supH.data.forEach(h => completedSet.add(h.exam_id));

                  const nowMs = Date.now();
                  const schedules = supJ.data.filter(sch => {
                      let targetKelasRaw = sch.target_kelas || sch.kelas || '';
                      if (targetKelasRaw && targetKelasRaw.toLowerCase() !== 'semua' && targetKelasRaw.toLowerCase() !== 'all' && kelas) {
                          const targets = String(targetKelasRaw).split(',').map(k => k.trim().toLowerCase()).filter(k => k);
                          return targets.some(t => kelas.toLowerCase().includes(t) || t.includes(kelas.toLowerCase()));
                      }
                      return true;
                  }).map(sch => {
                      let status = 'BELUM_MULAI';
                      if (completedSet.has(sch.id)) status = 'SELESAI';
                      else if (sch.aktif === false) status = 'NONAKTIF';
                      else if (sch.force_aktif) status = 'AKTIF';
                      else if (nowMs < sch.mulai) status = 'BELUM_MULAI';
                      else if (nowMs > sch.selesai) status = 'TUTUP';
                      else status = 'AKTIF';
                      return { ...sch, status };
                  });
                  return { success: true, schedules, serverTime: nowMs };
              }
              if (funcName === 'validateAdmin') {
                  const [pwd] = args;
                  const supRes = await fetchSupabase('config', { key: 'eq.admin_pass' });
                  let cp = null;
                  if (supRes.success && supRes.data.length > 0) { const val = supRes.data[0].value; cp = (typeof val === 'object') ? (val.pass || val.value || val) : val; }
                  return { success: true, valid: !!cp && pwd === cp };
              }
              if (funcName === 'getPortalInfo') {
                  const res = await fetchSupabase('jadwal_ujian');
                  if (!res.success) return { success: false };
                  const nowMs = Date.now();
                  const activeSchedules = res.data.map(sch => {
                      const isAktif = sch.aktif !== false;
                      let statusText = 'Aktif';
                      let badgeClass = 'live';
                      if (!isAktif) { statusText = 'Nonaktif'; badgeClass = 'wait'; }
                      else if (nowMs < sch.mulai) { statusText = 'Belum Mulai'; badgeClass = 'wait'; }
                      else if (nowMs > sch.selesai) { statusText = 'Selesai'; badgeClass = 'done'; }
                      return { nama: sch.nama, durasi: sch.durasi, statusText, badgeClass };
                  });
                  return { success: true, activeSchedules };
              }
              if (funcName === 'getAdminLaporanLengkap') {
                  const [examId] = args;
                  const [supH, supP, supJ] = await Promise.all([ 
                      fetchSupabase('hasil', { order: 'timestamp.desc', limit: 1000 }),
                      fetchSupabase('pelanggaran', { order: 'timestamp.desc', limit: 200 }),
                      fetchSupabase('jadwal_ujian')
                  ]);
                  let hData = supH.success ? supH.data : [];
                  let pData = supP.success ? supP.data : [];
                  console.log('📊 [supabase-patch] getAdminLaporanLengkap - pData length:', pData.length);
                  
                  // ✅ FIX: Jika Supabase kosong, baca dari Firebase juga
                  if (pData.length === 0) {
                      try {
                          const fbPelRef = db.ref('/pelanggaran');
                          const fbPelSnap = await fbPelRef.once('value');
                          const fbPelData = fbPelSnap.val() || {};
                          const fbPelArray = Object.values(fbPelData);
                          console.log('📊 [supabase-patch] Firebase pelanggaran:', fbPelArray.length, 'items');
                          pData = [...pData, ...fbPelArray];
                      } catch (e) {
                          console.warn('[supabase-patch] Error reading Firebase pelanggaran:', e);
                      }
                  }
                  const jadwalMap = {};
                  if (supJ.success) supJ.data.forEach(j => { jadwalMap[j.id] = j; });

                  // ✅ FIX: Re-grade otomatis untuk data yang skor=0 tapi punya detail jawaban
                  // Ini handle data lama yang tersimpan sebelum fix grading
                  const reGradePromises = [];
                  for (const h of hData) {
                      if (h.skor !== 0 && h.skor !== null) continue; // skip yang sudah punya nilai
                      const detailRaw = h.detail || h.jawaban;
                      if (!detailRaw) continue;
                      const detail = typeof detailRaw === 'string' ? (() => { try { return JSON.parse(detailRaw); } catch(_) { return null; } })() : detailRaw;
                      if (!detail || typeof detail !== 'object') continue;
                      const entries = Object.values(detail);
                      // Jika detail punya correct=true/false, hitung ulang skor
                      const hasCorrect = entries.some(e => e && e.correct !== null && e.correct !== undefined);
                      if (hasCorrect) {
                          const correctCount = entries.filter(e => e && e.correct === true).length;
                          const total = entries.length;
                          if (total > 0 && correctCount > 0) {
                              const newSkor = Math.round((correctCount / total) * 100);
                              h.skor = newSkor; // update in-memory langsung
                              reGradePromises.push(
                                  insertSupabase('hasil', { id: h.id, skor: newSkor })
                              );
                          }
                      }
                  }
                  // Fire-and-forget re-grade (tidak perlu tunggu)
                  if (reGradePromises.length > 0) {
                      Promise.all(reGradePromises).catch(e => console.warn('[ReGrade] Error:', e));
                  }

                  const hasilResult = hData
                      .filter(h => !examId || h.exam_id === examId)
                      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                      .map(h => {
                          const jadwal = jadwalMap[h.exam_id] || {};
                          let d = h.timestamp ? new Date(h.timestamp) : new Date();
                          return {
                              waktu: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
                              nama: h.nama, kelas: h.kelas, ujian: jadwal.nama || h.exam_id, skor: h.skor ?? 0, detail: h.detail, userId: h.user_id, examId: h.exam_id
                          };
                      });
                  
                  const pelResult = pData.map(p => {
                      let d = p.timestamp ? new Date(p.timestamp) : new Date();
                      return {
                          waktu: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
                          nama: p.nama || 'Unknown', kelas: p.kelas || '', ujian: p.exam_id || '', tipe: p.tipe || '', userId: p.user_id
                      };
                  });
                  return { success: true, hasil: hasilResult, pelanggaran: pelResult };
              }
              if (funcName === 'getAdminPreviewSoal') {
                  const [examId] = args;
                  const supJ = await fetchSupabase('jadwal_ujian', { id: 'eq.' + examId });
                  if (!supJ.success || supJ.data.length === 0) return { success: false, message: "Ujian tidak ditemukan" };
                  
                  const sch = supJ.data[0];
                  const [supS, supK] = await Promise.all([
                      fetchSupabase('soal', { bank_id: 'eq.' + sch.nama_soal }),
                      fetchSupabase('kunci', { bank_id: 'eq.' + sch.nama_soal })
                  ]);
                  
                  if (!supS.success || !supK.success) return { success: false, message: "Gagal memuat soal" };
                  
                  const questions = supS.data.map((q, idx) => {
                      const kData = supK.data.find(k => k.id === q.id);
                      return { ...q, _index: idx, kunci: kData ? kData.kunci : '' };
                  });
                  return { success: true, examName: sch.nama, questions };
              }
              if (funcName === 'sendBroadcastAdmin') {
                  const [examId, pesan, targetKelas, targetStatus] = args;
                  const bData = { exam_id: examId, message: pesan, kelas: targetKelas || 'all', status: targetStatus || 'all', timestamp: Date.now() };
                  await insertSupabase('broadcasts', bData);
                  setTimeout(async () => { await deleteSupabase('broadcasts', { exam_id: 'eq.' + examId }); }, 600000);
                  return { success: true };
              }
              if (funcName === 'resetStudentSession') {
                  const [examId, userId] = args;
                  await deleteSupabase('online_status', { exam_id: 'eq.' + examId, user_id: 'eq.' + userId });
                  await deleteSupabase('status_sync', { exam_id: 'eq.' + examId, user_id: 'eq.' + userId });
                  await deleteSupabase('hasil', { id: 'eq.' + examId + '_' + userId });
                  await insertSupabase('reset_flags', { exam_id: examId, user_id: userId, time: Date.now() });
                  return { success: true };
              }
              if (funcName === 'remedialStudent') {
                  const [examId, userId] = args;
                  await deleteSupabase('online_status', { exam_id: 'eq.' + examId, user_id: 'eq.' + userId });
                  await deleteSupabase('hasil', { id: 'eq.' + examId + '_' + userId });
                  await insertSupabase('reset_flags', { exam_id: examId, user_id: userId, time: Date.now() });
                  return { success: true };
              }
              if (funcName === 'forceSelesaiSemua') {
                  const [examId] = args;
                  const supO = await fetchSupabase('online_status', { exam_id: 'eq.' + examId });
                  const supP = await fetchSupabase('peserta');
                  const supJ = await fetchSupabase('jadwal_ujian', { id: 'eq.' + examId });
                  
                  if (!supO.success || !supP.success || !supJ.success) return { success: true };
                  
                  const ujianNama = supJ.data.length > 0 ? supJ.data[0].nama : examId;
                  for (const online of supO.data) {
                      const pData = supP.data.find(p => p.id === online.user_id);
                      await insertSupabase('hasil', {
                          id: examId + '_' + online.user_id,
                          exam_id: examId,
                          user_id: online.user_id,
                          nama: pData ? pData.nama : online.user_id,
                          kelas: pData ? pData.kelas : '-',
                          skor: 0,
                          waktu: 'Force Submit',
                          jawaban: '{"forced":true}',
                          timestamp: Date.now()
                      });
                      await deleteSupabase('online_status', { exam_id: 'eq.' + examId, user_id: 'eq.' + online.user_id });
                  }
                  return { success: true };
              }
              if (funcName === 'getStudentResult') {
                  const [examId, userId] = args;
                  const supH = await fetchSupabase('hasil', { id: 'eq.' + examId + '_' + userId });
                  if (!supH.success || supH.data.length === 0) return { success: false, message: "Hasil tidak ditemukan." };
                  
                  const h = supH.data[0];
                  const supJ = await fetchSupabase('jadwal_ujian', { id: 'eq.' + examId });

                  // ✅ FIX: Baca dari kolom detail, fallback ke jawaban (kompatibilitas tabel lama)
                  let detailData = h.detail || h.jawaban || null;
                  // Jika detail ada tapi correct semua null, coba re-grade dari kunci
                  let needsRegrade = false;
                  if (detailData) {
                      const parsed = typeof detailData === 'string' ? JSON.parse(detailData) : detailData;
                      const entries = Object.values(parsed || {});
                      needsRegrade = entries.length > 0 && entries.every(e => e && e.correct === null);
                  } else {
                      needsRegrade = true;
                  }

                  // Re-grade jika detail tidak punya info benar/salah
                  if (needsRegrade && supJ.success && supJ.data.length > 0) {
                      const sch = supJ.data[0];
                      const [supK, supS] = await Promise.all([
                          fetchSupabase('kunci', { bank_id: 'eq.' + sch.nama_soal }),
                          fetchSupabase('soal', { bank_id: 'eq.' + sch.nama_soal })
                      ]);
                      if (supK.success && supS.success) {
                          // Ambil jawaban siswa dari detail atau jawaban lama
                          let answers = {};
                          if (detailData) {
                              const parsed = typeof detailData === 'string' ? JSON.parse(detailData) : detailData;
                              // Format lama: {qId: {answer, correct}} atau {qId: "A"}
                              Object.keys(parsed).forEach(qId => {
                                  const v = parsed[qId];
                                  answers[qId] = (v && typeof v === 'object' && 'answer' in v) ? v.answer : v;
                              });
                          }
                          const keysById = {};
                          supK.data.forEach(k => { keysById[String(k.id)] = k.kunci; });
                          const bobotById = {};
                          supS.data.forEach(q => { bobotById[String(q.id)] = parseFloat(q.bobot) || 1; });
                          const typeById = {};
                          supS.data.forEach(q => { typeById[String(q.id)] = q.tipe || 'PG'; });

                          let totalPoints = 0, maxPoints = 0;
                          const newDetail = {};
                          Object.keys(keysById).forEach(qId => {
                              const bobot = bobotById[qId] || 1;
                              const qType = typeById[qId] || 'PG';
                              const correctAns = keysById[qId];
                              const userAns = answers[qId];
                              maxPoints += bobot;
                              let isCorrect = false;
                              if (userAns !== undefined && userAns !== null && userAns !== '-') {
                                  if (qType === 'PG' || qType === 'BS') {
                                      isCorrect = String(userAns).trim().toUpperCase() === String(correctAns || '').trim().toUpperCase();
                                  } else if (qType === 'ISIAN') {
                                      isCorrect = String(userAns).trim().toLowerCase() === String(correctAns || '').trim().toLowerCase();
                                  }
                              }
                              if (isCorrect) totalPoints += bobot;
                              newDetail[qId] = { answer: userAns !== undefined ? userAns : '-', correct: isCorrect };
                          });
                          const reGradedScore = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : h.skor;
                          // Update di Supabase dengan detail dan score yang sudah di-grade
                          await insertSupabase('hasil', { id: examId + '_' + userId, detail: JSON.stringify(newDetail), skor: reGradedScore });
                          detailData = newDetail;
                          // Update h.skor agar response mengembalikan nilai yang benar
                          h.skor = reGradedScore;
                      }
                  }

                  return {
                      success: true,
                      result: {
                          score: h.skor,
                          namaUjian: h.namaUjian || (supJ.success && supJ.data.length > 0 ? supJ.data[0].nama : 'Ujian'),
                          user: { id: h.user_id, name: h.nama, kelas: h.kelas },
                          usedTime: h.waktu || '',
                          violations: h.violations || 0,
                          detail: detailData || {},
                          config: { kkm: supJ.success && supJ.data.length > 0 ? (supJ.data[0].kkm || 75) : 75 }
                      }
                  };
              }
              if (funcName === 'updateJadwalSistem') {
                  const [id, token, status, force_aktif] = args;
                  await insertSupabase('jadwal_ujian', { id, token, aktif: status === 'Aktif', force_aktif: force_aktif === true });
                  return { success: true };
              }
              if (funcName === 'updateJadwalFull') {
                  const [id, payload] = args;
                  await insertSupabase('jadwal_ujian', [{ id, ...payload }]);
                  return { success: true };
              }
          } catch (e) { console.error("gasRun Supabase Error", e); }
          return { success: false, message: 'Dialihkan ke Supabase' };
      },
      getExamDataOptimized: async function(examId, token, force = false, skipTokenCheck = false) {
          const supJadwal = await fetchSupabase('jadwal_ujian', { id: 'eq.' + examId });
          if (!supJadwal.success || supJadwal.data.length === 0) return { success: false, message: "Ujian tidak ditemukan" };
          
          const sch = supJadwal.data[0];
          
          // Token validation
          if (!skipTokenCheck && sch.token) {
              if (String(token || '').toUpperCase().trim() !== String(sch.token).toUpperCase().trim()) {
                  return { success: false, message: "Token salah!" };
              }
          }

          const ver = typeof getScheduleVersion === 'function' 
              ? getScheduleVersion(sch) 
              : String(sch.versi_soal || sch.updated_at || sch.mulai || 0);
          const CACHE_KEY = `SOAL_${examId}_v${ver}`;
          
          if (!force) {
              const cached = localStorage.getItem(CACHE_KEY);
              if (cached) {
                  try {
                      const parsed = JSON.parse(cached);
                      if (parsed && parsed.keys) {
                          delete parsed.keys;
                          localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
                      }
                      return parsed;
                  } catch(e) {}
              }
          }

          const supSoal = await fetchSupabase('soal', { bank_id: 'eq.' + sch.nama_soal });

          if (supSoal.success) {
              // ✅ FIX: Normalisasi q.id ke String agar konsisten dengan State.answers dan server grading
              const questions = supSoal.data
                  .sort((a, b) => Number(a.id) - Number(b.id))
                  .map((q, idx) => ({ ...q, id: String(q.id), _index: idx }));

              // ✅ FIX: Ambil kunci jawaban sekaligus agar client-side grading bisa berjalan
              // Tanpa ini State.config.keys selalu {} → score selalu null → server harus re-grade
              const supKunci = await fetchSupabase('kunci', { bank_id: 'eq.' + sch.nama_soal });
              const keys = {};
              if (supKunci.success) {
                  supKunci.data.forEach(k => {
                      keys[String(k.id)] = k.kunci;
                  });
              }

              const result = { 
                  success: true, 
                  config: {
                      id_ujian: examId,
                      nama_ujian: sch.nama,
                      durasi: sch.durasi,
                      end_ms: sch.selesai,
                      min_selesai: sch.min_selesai || 0,
                      shuffle_soal: sch.shuffle_soal,
                      shuffle_opsi: sch.shuffle_opsi,
                      versi_soal: ver
                  }, 
                  questions,
                  keys,  // ✅ Sertakan kunci agar client-side grading berjalan
                  tokenHash: sch.token ? (typeof simpleHash === 'function' ? simpleHash(String(sch.token).toUpperCase().trim()) : null) : null
              };
              // Simpan ke IndexedDB (primary) dan localStorage (fallback)
              // ✅ JANGAN simpan keys ke cache — keamanan (kunci tidak boleh ada di device)
              const resultForCache = { ...result };
              delete resultForCache.keys;
              if (typeof window.cbtIdbSet === 'function') {
                  window.cbtIdbSet(CACHE_KEY, resultForCache).catch(() => {});
              }
              localStorage.setItem(CACHE_KEY, JSON.stringify(resultForCache));
              // Simpan tokenHash untuk offline verification
              if (result.tokenHash) {
                  localStorage.setItem(`CBT_TOKEN_HASH_${examId}`, result.tokenHash);
              }
              return result;
          }
          return { success: false, message: "Gagal memuat soal dari database" };
      }
  };

  for (let key in Overrides) window[key] = Overrides[key];
  // Keep a separate reference so script.js gasRun can delegate to it
  window._supaGasRun = Overrides.gasRun;

  // --- 3. BACKGROUND SYNC (tanpa aggressive clearing) ---
  window.syncAllDataForPortal(true).catch(() => {});

  // Broadcast Polling
  let lastB = null;
  setInterval(async () => {
      const eid = window.State && window.State.config ? window.State.config.id_ujian : null;
      if (!eid) return;
      const res = await fetchSupabase('broadcasts', { exam_id: 'eq.' + eid, order: 'timestamp.desc', limit: 1 });
      if (res.success && res.data.length > 0) {
          const b = res.data[0];
          if (b.id !== lastB) { 
              lastB = b.id; 
              if (window.checkAndShowBroadcast) window.checkAndShowBroadcast(b); 
          }
      }
  }, 10000);

})();
