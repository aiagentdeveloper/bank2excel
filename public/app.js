(function () {
  'use strict';

  var dropzone = document.getElementById('dropzone');
  var fileInput = document.getElementById('fileInput');
  var dropText = document.getElementById('dropText');
  var fileInfo = document.getElementById('fileInfo');
  var statusEl = document.getElementById('status');
  var resultsEl = document.getElementById('results');
  var summaryEl = document.getElementById('summary');
  var paywallEl = document.getElementById('paywall');
  var dlCsv = document.getElementById('dlCsv');
  var dlXlsx = document.getElementById('dlXlsx');
  var licenseKey = document.getElementById('licenseKey');
  var activateBtn = document.getElementById('activateBtn');
  var licenseMsg = document.getElementById('licenseMsg');

  var ACCESS_TOKEN_KEY = 'b2e_access_token';
  var config = { freeQuota: 1 };
  var pending = null;

  function $(id) { return document.getElementById(id); }

  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = 'status ' + (kind || 'info');
    show(statusEl);
  }

  function clearStatus() { hide(statusEl); }

  function errorText(code) {
    var map = {
      file_too_large: 'The file is too large (max 10 MB).',
      invalid_pdf: 'That file is not a valid PDF.',
      invalid_type: 'Only PDF files are accepted.',
      no_transactions: 'No transactions detected. This statement layout may not be supported yet.',
      no_text_layer: 'This PDF appears to be a scanned image. Text-based statements are required for now.',
      too_many_pages: 'Statements over 250 pages are not supported.',
      parse_timeout: 'The PDF took too long to parse. Try a smaller file.',
      license_required: 'Free trial used. Purchase a license to continue.',
      invalid_access_token: 'Your license session has expired. Activate your license again.',
      rate_limited: 'Too many requests. Please wait a few minutes.',
      server_error: 'Something went wrong on our side. Please try again.',
    };
    return map[code] || 'Something went wrong. Please try again.';
  }

  function getAccessToken() {
    try { return localStorage.getItem(ACCESS_TOKEN_KEY) || ''; } catch (e) { return ''; }
  }

  function setAccessToken(token) {
    try { localStorage.setItem(ACCESS_TOKEN_KEY, token); } catch (e) {}
  }

  async function api(path, options) {
    options = options || {};
    options.headers = options.headers || {};
    var token = getAccessToken();
    if (token) options.headers['X-Access-Token'] = token;
    var res = await fetch(path, options);
    if (res.status === 403 && token) {
      setAccessToken('');
    }
    return res;
  }

  function selectFile(file) {
    if (!file) return;
    if (file.type && file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      setStatus('Please choose a PDF file.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setStatus('File is too large (max 10 MB).', 'error');
      return;
    }
    pending = file;
    fileInfo.textContent = file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
    show(fileInfo);
    hide(dropText);
    clearStatus();
    hide(resultsEl);
    hide(paywallEl);
    convert(file);
  }

  async function convert(file) {
    var form = new FormData();
    form.append('file', file, file.name);
    setStatus('Parsing your statement\u2026', 'info');
    var res = await api('/api/convert', { method: 'POST', body: form });
    var body;
    try { body = await res.json(); } catch (e) {}

    if (res.status === 402) {
      showPaywall(body && body.checkoutUrl);
      return;
    }
    if (!res.ok || !body || !body.ok) {
      setStatus(errorText(body && body.error), 'error');
      if (body && body.error === 'license_required') showPaywall(body.checkoutUrl);
      return;
    }

    clearStatus();
    pending = null;
    renderResults(body);
  }

  function renderResults(body) {
    var s = body.summary;
    var currency = s.currency || '';
    var fmt = function (n) {
      if (n === null || n === undefined) return '';
      var parts = n.toFixed(2).split('.');
      return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + parts[1];
    };
    summaryEl.innerHTML =
      '<b>' + s.count + '</b> transactions found' +
      (s.firstDate ? ' &middot; ' + s.firstDate + ' to ' + s.lastDate : '') +
      '<br>Credits: <b>+' + fmt(s.credits) + '</b> ' + currency +
      ' &middot; Debits: <b>&minus;' + fmt(s.debits) + '</b> ' + currency +
      ' &middot; Net: <b>' + (s.net >= 0 ? '+' : '&minus;') + fmt(Math.abs(s.net)) + '</b> ' + currency;

    dlCsv.href = '/api/download/' + body.files.csv.id + '?t=' + encodeURIComponent(body.files.csv.token);
    dlXlsx.href = '/api/download/' + body.files.xlsx.id + '?t=' + encodeURIComponent(body.files.xlsx.token);

    show(resultsEl);
    hide(paywallEl);
  }

  function showPaywall(checkoutUrl) {
    hide(resultsEl);
    hide(statusEl);
    show(paywallEl);
    if (checkoutUrl) {
      $('buyBtn').href = checkoutUrl;
      $('buyBtn2').href = checkoutUrl;
    }
  }

  async function activate() {
    var key = licenseKey.value.trim();
    if (!key) {
      licenseMsg.textContent = 'Enter your license key first.';
      licenseMsg.className = 'license-msg err';
      return;
    }
    activateBtn.disabled = true;
    licenseMsg.textContent = 'Verifying\u2026';
    licenseMsg.className = 'license-msg';
    try {
      var res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: key }),
      });
      var body = await res.json();
      if (!res.ok) {
        licenseMsg.textContent = body && body.error === 'invalid_license'
          ? 'Invalid license key.'
          : (body && body.detail) || 'Activation failed.';
        licenseMsg.className = 'license-msg err';
        return;
      }
      setAccessToken(body.token);
      licenseMsg.textContent = 'License activated! Welcome back.';
      licenseMsg.className = 'license-msg ok';
      hide(paywallEl);
      if (pending) convert(pending);
      else licenseMsg.textContent = 'License activated! Upload a PDF to convert.';
    } catch (e) {
      licenseMsg.textContent = 'Activation failed. Please try again.';
      licenseMsg.className = 'license-msg err';
    } finally {
      activateBtn.disabled = false;
    }
  }

  dropzone.addEventListener('click', function () { fileInput.click(); });
  dropzone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener('change', function () { selectFile(fileInput.files[0]); });
  activateBtn.addEventListener('click', activate);
  licenseKey.addEventListener('keydown', function (e) { if (e.key === 'Enter') activate(); });

  ['dragenter', 'dragover'].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });
  dropzone.addEventListener('drop', function (e) {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      selectFile(e.dataTransfer.files[0]);
    }
  });

  fetch('/api/config')
    .then(function (r) { return r.json(); })
    .then(function (c) { config = c || config; })
    .catch(function () {});
})();