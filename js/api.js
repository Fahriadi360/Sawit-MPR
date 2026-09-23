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
            const params = new URLSearchParams({ action, ...payload });
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

        const result = await response.json();
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
 * 4. Menyimpan Identitas Perusahaan ke Spreadsheet (POST)
 * Endpoint: doPost -> action=saveCompanySettings
 */
async function saveCompanySettingsToGAS(settings) {
    return await callGasServer('saveCompanySettings', settings, 'POST');
}

/**
 * 5. Sinkronisasi Seluruh Data dari Server ke Frontend
 */
async function syncAllDataWithGAS(showToastNotification = true) {
    if (showToastNotification && typeof showToast === 'function') {
        showToast('Menyinkronkan data dengan Google Sheets PT. EMJ...', 'info');
    }

    try {
        const [blocks, reports] = await Promise.all([
            fetchBlocksSummaryFromGAS(),
            fetchReportsFromGAS()
        ]);

        if (blocks && blocks.length > 0 && typeof appData !== 'undefined') {
            appData.blocks = blocks;
            localStorage.setItem('sawit_master_blocks', JSON.stringify(blocks));
        }

        if (reports && reports.length > 0 && typeof appData !== 'undefined') {
            appData.reports = reports;
            localStorage.setItem('sawit_trx_reports', JSON.stringify(reports));
        }

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

        if (showToastNotification && typeof showToast === 'function') {
            showToast('Sinkronisasi data Google Sheets berhasil!', 'success');
        }
        return true;
    } catch (e) {
        console.error('Sinkronisasi gagal:', e);
        if (showToastNotification && typeof showToast === 'function') {
            showToast('Gagal menyinkronkan data dengan server.', 'error');
        }
        return false;
    }
}

// Export global untuk diakses antarmuka lain
window.GAS_ENDPOINT_URL = GAS_ENDPOINT_URL;
window.callGasServer = callGasServer;
window.fetchBlocksSummaryFromGAS = fetchBlocksSummaryFromGAS;
window.fetchReportsFromGAS = fetchReportsFromGAS;
window.submitReportToGAS = submitReportToGAS;
window.saveCompanySettingsToGAS = saveCompanySettingsToGAS;
window.syncAllDataWithGAS = syncAllDataWithGAS;
