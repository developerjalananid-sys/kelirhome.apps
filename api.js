// ================================================================
// api.js - Jembatan google.script.run -> fetch (Google Apps Script Web App)
// ----------------------------------------------------------------
// Seluruh kode di index.html tetap memakai:
//   google.script.run.withSuccessHandler(fn).withFailureHandler(fn).namaFungsi(arg...)
// File ini membuat objek tersebut di luar lingkungan Apps Script, lalu
// meneruskan panggilan ke doPost() di Code.gs lewat HTTP POST.
// ================================================================
(function () {
  'use strict';

  // Bila dibuka langsung dari Apps Script (bukan PWA), pakai bawaan Google.
  if (window.google && window.google.script && window.google.script.run) return;
  window.KELIR_IS_PWA = true;

  var TIMEOUT_MS = 120000; // export PDF/XLSX di server bisa lama

  function isConfigured() {
    var u = window.KELIR_API_URL || '';
    return /^https:\/\/script\.google\.com\/.+\/exec/.test(u) || /^https:\/\/script\.googleusercontent\.com\//.test(u);
  }

  function callServer(fn, args) {
    if (!isConfigured()) {
      return Promise.reject(new Error('URL API belum diatur. Isi KELIR_API_URL di config.js.'));
    }
    if (navigator.onLine === false) {
      return Promise.reject(new Error('Tidak ada koneksi internet.'));
    }
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS) : null;

    // Content-Type text/plain => "simple request", tanpa preflight CORS
    // (Apps Script tidak mendukung OPTIONS).
    return fetch(window.KELIR_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ fn: fn, args: args }),
      redirect: 'follow',
      credentials: 'omit',
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (res) { return res.text(); })
      .then(function (text) {
        var data;
        try { data = JSON.parse(text); }
        catch (e) {
          throw new Error('Respons server tidak valid. Pastikan Web App di-deploy dengan akses "Anyone" dan versi terbaru.');
        }
        if (!data || data.ok !== true) {
          throw new Error((data && data.error) || 'Terjadi kesalahan di server.');
        }
        return data.result;
      })
      .catch(function (err) {
        if (err && err.name === 'AbortError') throw new Error('Server terlalu lama merespons. Coba lagi.');
        if (err instanceof TypeError) throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet.');
        throw err;
      })
      .then(function (r) { if (timer) clearTimeout(timer); return r; },
            function (e) { if (timer) clearTimeout(timer); throw e; });
  }

  function makeRunner(onOk, onFail, userObj) {
    return new Proxy({}, {
      get: function (_t, prop) {
        if (typeof prop !== 'string') return undefined;
        if (prop === 'withSuccessHandler') return function (f) { return makeRunner(f, onFail, userObj); };
        if (prop === 'withFailureHandler') return function (f) { return makeRunner(onOk, f, userObj); };
        if (prop === 'withUserObject') return function (o) { return makeRunner(onOk, onFail, o); };
        if (prop === 'then') return undefined; // jangan dianggap Promise
        return function () {
          var args = Array.prototype.slice.call(arguments);
          callServer(prop, args).then(
            function (result) { if (onOk) onOk(result, userObj); },
            function (err) {
              if (onFail) onFail(err, userObj);
              else console.error('[api] ' + prop + ':', err);
            }
          );
        };
      }
    });
  }

  window.google = { script: { run: makeRunner(null, null, undefined) } };
})();
