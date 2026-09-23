/**
 * =========================================================================
 * MODUL KOMUNIKASI SERVER GOOGLE APPS SCRIPT (GAS) - PT. ENERGI MAJU JAYA
 * Endpoint URL Resmi Terintegrasi:
 * https://script.google.com/macros/s/AKfycbwGUnqC7U_57T2UgHytpsXbXZWJTRd9jRwZFeVSAD8iviE89Uz_puty-zPsEcOrDFo/exec
 * =========================================================================
 */

const GAS_ENDPOINT_URL = 'https://script.google.com/macros/s/AKfycbwGUnqC7U_57T2UgHytpsXbXZWJTRd9jRwZFeVSAD8iviE89Uz_puty-zPsEcOrDFo/exec';

/**
 * Universal Fetch Helper untuk Google Apps Script Web App
 * @param {string} action - Nama handler di Code.gs (misal: 'getBlocksSummary', 'submitReport')
 * @param {object} payload - Data JSON untuk POST atau query filter untuk GET
 * @param {string} method - 'GET' atau 'POST'
 */
async function callGasServer(action, payload = {}, method = 'POST') {
    try {
        let url = GAS_ENDPOINT_URL;
        let options = {
            method: method,
            redirect: 'follow' // Wajib untuk mengikuti redirect 302 Google Apps Script
        };

        if (method === 'GET') {
            // Tambahkan timestamp anti-cache agar browser HP/Desktop selalu memuat data terbaru dari Google Sheets
            const params = new URLSearchParams({ action, ...payload, _t: Date.now() });
            url += `?${params.toString()}`;
        } else {
            // Gunakan 'text/plain;charset=utf-8' agar browser tidak mengirim request preflight OPTIONS
            // yang memicu error CORS pada Google Apps Script.
            options.headers = {
                'Content-Type': 'text/plain;charset=utf-8'
            };
            options.body = JSON.stringify({ action, ...payload });
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`Server GAS merespon dengan status HTTP ${response.status}`);
        }

        const rawText = await response.text();
        let result;
        try {
            result = JSON.parse(rawText);
        } catch (jsonErr) {
            console.error('[GAS Response Not JSON]:', rawText);
            throw new Error('Respon server bukan format JSON. Pastikan izin deployment Google Apps Script: "Who has access" disetel ke "Anyone" (Siapa saja).');
        }
        return result;

    } catch (err) {
        console.error(`[GAS Server Error] Gagal pada aksi "${action}":`, err);
        throw err;
    }
}

/**
 * 1. Mengambil Ringkasan Blok & Realisasi Akumulasi (GET)
 * Endpoint: doGet -> action=getBlocksSummary
 */
async function fetchBlocksSummaryFromGAS() {
    try {
        const res = await callGasServer('getBlocksSummary', {}, 'GET');
        if (res && res.status === 'success' && Array.isArray(res.data)) {
            console.log('Data blok berhasil dimuat dari Google Sheets:', res.data);
            return res.data;
        }
        return null;
    } catch (e) {
        console.warn('Gagal memuat blok dari server GAS:', e);
        return null;
    }
}

/**
 * 2. Mengambil Transaksi Laporan Harian (GET)
 * Endpoint: doGet -> action=getReports
 */
async function fetchReportsFromGAS(filters = {}) {
    try {
        const res = await callGasServer('getReports', filters, 'GET');
        if (res && res.status === 'success' && Array.isArray(res.data)) {
            console.log(`Berhasil mengambil ${res.data.length} transaksi laporan dari Google Sheets.`);
            return res.data;
        }
        return [];
    } catch (e) {
        console.warn('Gagal memuat transaksi laporan dari server GAS:', e);
        return [];
    }
}

/**
 * 3. Mengirim Laporan Kegiatan Tanam Baru (POST)
 * Endpoint: doPost -> action=submitReport
 */
async function submitReportToGAS(reportData) {
    /*
    Format reportData:
    {
        tanggal: '2026-09-22',
        id_blok: 'OPD A',
        luas_ha: 6.68,
        kegiatan: 'Tanam',
        jml_tenaga_kerja: 2,
        nama_tenaga_kerja: 'Baco & Angga',
        uom: 'Ha',
        realisasi_jml: 0.20,
        todate: 0.94,
        sisa_ha: 5.74,
        keterangan: 'Lubang tanam 60x60x40 cm',
        lat_gps: -0.75825,
        lng_gps: 117.02401,
        foto_url: 'data:image/jpeg;base64,...',
        foto_kegiatan: ['data:image/...', 'data:image/...']
    }
    */
    return await callGasServer('submitReport', reportData, 'POST');
}

/**
 * 4. Mengambil Identitas Perusahaan dari Spreadsheet (GET)
 * Endpoint: doGet -> action=getCompanySettings
 */
async function fetchCompanySettingsFromGAS() {
    try {
        const res = await callGasServer('getCompanySettings', {}, 'GET');
        if (res && res.status === 'success' && res.data) {
            console.log('Profil perusahaan berhasil dimuat dari Google Sheets:', res.data);
            return res.data;
        }
        return null;
    } catch (e) {
        console.warn('Gagal memuat profil perusahaan dari server GAS:', e);
        return null;
    }
}

/**
 * 5. Menyimpan Identitas Perusahaan ke Spreadsheet (POST)
 * Endpoint: doPost -> action=saveCompanySettings
 */
async function saveCompanySettingsToGAS(settings) {
    try {
        const res = await callGasServer('saveCompanySettings', { settings: settings }, 'POST');
        return res;
    } catch (e) {
        console.error('Gagal menyimpan identitas perusahaan ke GAS:', e);
        throw e;
    }
}

/**
 * 6. Menyimpan / Memperbarui Master Blok ke Spreadsheet (POST)
 * Endpoint: doPost -> action=saveBlock
 */
async function saveBlockToGAS(blockData) {
    try {
        const res = await callGasServer('saveBlock', { block: blockData }, 'POST');
        return res;
    } catch (e) {
        console.warn('Gagal menyimpan blok ke server GAS:', e);
        return null;
    }
}

/**
 * 7. Menghapus Master Blok dari Spreadsheet (POST)
 * Endpoint: doPost -> action=deleteBlock
 */
async function deleteBlockFromGAS(idBlok) {
    try {
        const res = await callGasServer('deleteBlock', { id_blok: idBlok }, 'POST');
        return res;
    } catch (e) {
        console.warn('Gagal menghapus blok dari server GAS:', e);
        return null;
    }
}

/**
 * Helper: Pembaruan Status Koneksi Cloud pada Header
 */
function updateCloudStatusIndicator(status, text) {
    const badge = document.getElementById('cloudStatusBadge');
    if (!badge) return;
    
    badge.className = `cloud-status-badge badge-cloud-${status}`;
    if (status === 'syncing') {
        badge.innerHTML = `<i class="fas fa-spinner fa-spin text-cyan mr-1"></i> <span id="cloudStatusText">${text || 'Menyinkronkan...'}</span>`;
    } else if (status === 'online') {
        badge.innerHTML = `<i class="fas fa-cloud-arrow-up text-emerald mr-1"></i> <span id="cloudStatusText">${text || 'Cloud Terhubung (Live)'}</span>`;
    } else {
        badge.innerHTML = `<i class="fas fa-cloud-slash text-amber mr-1"></i> <span id="cloudStatusText">${text || 'Mode Offline'}</span>`;
    }
}

/**
 * 8. Sinkronisasi Seluruh Data dari Server ke Frontend
 * Mengambil Profil Perusahaan, Master Blok, dan Transaksi Laporan sekaligus.
 */
async function syncAllDataWithGAS(showToastNotification = true) {
    updateCloudStatusIndicator('syncing', 'Menyinkronkan Google Sheets...');
    if (showToastNotification && typeof showToast === 'function') {
        showToast('Menyinkronkan data dengan Google Sheets PT. EMJ...', 'info');
    }

    try {
        const [blocks, reports, companySettings] = await Promise.all([
            fetchBlocksSummaryFromGAS(),
            fetchReportsFromGAS(),
            fetchCompanySettingsFromGAS()
        ]);

        let hasLiveConnection = false;

        // A. Terapkan Identitas Perusahaan Live jika ada dari Google Sheets
        if (companySettings && typeof companySettings === 'object' && Object.keys(companySettings).length > 0) {
            localStorage.setItem('sawit_company_settings', JSON.stringify(companySettings));
            if (typeof applyCompanySettingsToDOM === 'function') {
                applyCompanySettingsToDOM(companySettings);
            }
            hasLiveConnection = true;
        }

        // B. Terapkan Master Blok Live
        if (blocks && Array.isArray(blocks) && blocks.length > 0 && typeof appData !== 'undefined') {
            appData.blocks = blocks;
            localStorage.setItem('sawit_master_blocks', JSON.stringify(blocks));
            if (typeof syncBlokMetadata === 'function') syncBlokMetadata();
            hasLiveConnection = true;
        }

        // C. Terapkan Transaksi Laporan Live
        // Jika server berhasil merespon dengan array reports (walaupun kosong),
        // gantikan data dummy dengan data riil dari Google Sheets!
        if (Array.isArray(reports) && typeof appData !== 'undefined') {
            appData.reports = reports;
            localStorage.setItem('sawit_trx_reports', JSON.stringify(reports));
            hasLiveConnection = true;
        }

        // Re-render seluruh antarmuka sistem
        if (typeof renderDashboard === 'function' && typeof appData !== 'undefined') {
            renderDashboard(appData.blocks, appData.reports);
        }
        if (typeof renderRekapTable === 'function' && typeof appData !== 'undefined') {
            renderRekapTable(appData.reports);
        }
        if (typeof renderMasterBlokTable === 'function') {
            renderMasterBlokTable();
        }
        if (typeof addGPSMarkers === 'function' && typeof appData !== 'undefined') {
            addGPSMarkers(appData.reports);
        }
        if (typeof loadBlockLayers === 'function') {
            loadBlockLayers();
        }

        if (hasLiveConnection) {
            updateCloudStatusIndicator('online', 'Cloud Terhubung (Live)');
            if (showToastNotification && typeof showToast === 'function') {
                showToast('Data Google Sheets PT. EMJ berhasil disinkronkan!', 'success');
            }
            return true;
        } else {
            updateCloudStatusIndicator('offline', 'Mode Offline (Lokal)');
            return false;
        }

    } catch (e) {
        console.error('Sinkronisasi Google Sheets gagal:', e);
        updateCloudStatusIndicator('offline', 'Mode Offline (Lokal)');
        if (showToastNotification && typeof showToast === 'function') {
            showToast('Gagal terhubung ke Google Sheets. Menggunakan data lokal.', 'warning');
        }
        return false;
    }
}

// Export global untuk diakses antarmuka lain
window.GAS_ENDPOINT_URL = GAS_ENDPOINT_URL;
window.callGasServer = callGasServer;
window.fetchBlocksSummaryFromGAS = fetchBlocksSummaryFromGAS;
window.fetchReportsFromGAS = fetchReportsFromGAS;
window.fetchCompanySettingsFromGAS = fetchCompanySettingsFromGAS;
window.submitReportToGAS = submitReportToGAS;
window.saveCompanySettingsToGAS = saveCompanySettingsToGAS;
window.saveBlockToGAS = saveBlockToGAS;
window.deleteBlockFromGAS = deleteBlockFromGAS;
window.updateCloudStatusIndicator = updateCloudStatusIndicator;
window.syncAllDataWithGAS = syncAllDataWithGAS;
