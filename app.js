/* =========================================================
   SupplyIQ Pro — app.js
   FMCG Supply Chain Intelligence Dashboard
   ========================================================= */

var APIKEY = localStorage.getItem('supplyiq_key') || '';
var notifOn = true;

// ── INIT ────────────────────────────────────────────────
(function () {
  if (APIKEY) showActive();
  else showSetup();
})();

// ── NOTIFICATIONS ────────────────────────────────────────
function toggleNotifications() {
  notifOn = !notifOn;
  document.getElementById('notif-tgl').className = 'tgl' + (notifOn ? ' on' : '');
}

// ── AI KEY SETUP ─────────────────────────────────────────
function showSetup() {
  document.getElementById('setup-box').style.display = 'block';
  var b = document.getElementById('ai-status-badge');
  b.textContent = 'Setup required';
  b.className = 'ai-status as-setup';
}

function showActive() {
  document.getElementById('setup-box').style.display = 'none';
  var b = document.getElementById('ai-status-badge');
  b.textContent = 'Active';
  b.className = 'ai-status as-active';
}

function activateKey() {
  var k = document.getElementById('keyInp').value.trim();
  if (!k) { showToast('r', 'Error', 'Paste your API key first.'); return; }
  APIKEY = k;
  localStorage.setItem('supplyiq_key', k);
  showActive();
  var msgs = document.getElementById('chat-msgs');
  msgs.innerHTML = '';
  addMsg('ai', 'Ready! I have visibility into all 40 SKUs. Currently ' + getCritical() + ' SKUs are critically low. Ask me anything!');
}

// ── TOAST NOTIFICATIONS ───────────────────────────────────
function showToast(type, title, body, dur) {
  if (!notifOn && type !== 'b') return;
  var tc = document.getElementById('toast-container');
  var t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.innerHTML = '<span class="toast-icon">' + (type === 'r' ? '🚨' : type === 'o' ? '⚠️' : type === 'g' ? '✅' : 'ℹ️') + '</span><div><div style="font-weight:700;font-size:11.5px">' + title + '</div><div class="toast-body">' + body + '</div></div>';
  tc.appendChild(t);
  setTimeout(function () {
    t.style.animation = 'fadeOut .3s ease forwards';
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
  }, (dur || 3500));
}

// ── NAVIGATION ────────────────────────────────────────────
var pages = {
  overview:  { title: 'Overview',         sub: 'Supply chain health at a glance' },
  inventory: { title: 'Inventory',         sub: 'All SKUs with live stock levels — click any row for details' },
  stockout:  { title: 'Stockout risk',     sub: 'AI-scored risk prediction — click any item for drill-down' },
  suppliers: { title: 'Suppliers',         sub: 'Lead times, reliability and SKU coverage' },
  abc:       { title: 'ABC analysis',      sub: 'Inventory classification by value contribution' },
  forecast:  { title: 'Demand forecast',   sub: '12-week historical + 4-week AI projection' },
  restock:   { title: 'Restock planner',   sub: 'Prioritized reorder recommendations' },
  ai:        { title: 'AI analyst',        sub: 'Natural language supply chain intelligence' }
};

function navigate(pg) {
  document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function (n) { n.classList.remove('active'); });
  var el = document.getElementById('page-' + pg);
  if (el) { el.classList.remove('fade-in'); void el.offsetWidth; el.classList.add('active', 'fade-in'); }
  var nav = document.getElementById('nav-' + pg);
  if (nav) nav.classList.add('active');
  var info = pages[pg] || { title: pg, sub: '' };
  document.getElementById('page-title').textContent = info.title;
  document.getElementById('page-sub').textContent = info.sub;
  if (pg === 'suppliers') renderSuppliers();
  if (pg === 'abc') renderABC();
  if (pg === 'forecast') renderForecast();
  if (pg === 'restock') renderRestockPage();
  if (pg === 'stockout') renderStockoutPage();
  if (pg === 'inventory') { renderInvCharts(); renderTable(); }
}

// ── SEEDED RNG ────────────────────────────────────────────
var seed = 77;
function rand() { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return ((seed >>> 0) / 4294967296); }
function ri(a, b) { return Math.floor(rand() * (b - a + 1)) + a; }
function pick(a) { return a[Math.floor(rand() * a.length)]; }

// ── STATIC DATA ────────────────────────────────────────────
var CATS = {
  beverages: ['Coca-Cola 2L', 'Pepsi 1.5L', 'Sprite 500ml', 'Red Bull 250ml', 'Minute Maid 1L', 'Mountain Dew 1L', 'Tropicana OJ 1L', 'Fanta 500ml'],
  dairy:     ['Amul Milk 1L', 'Britannia Butter 500g', 'Mother Dairy Curd 400g', 'Nestle Yogurt 200g', 'Amul Cheese 400g', 'Nandini Paneer 200g'],
  snacks:    ['Lays Chips 200g', 'Kurkure 100g', 'Bingo Mad Angles', 'Parle-G Biscuit 800g', 'Oreo Cookies 300g', 'Sunfeast Marie'],
  personal:  ['Dove Soap 100g', 'Head & Shoulders 400ml', 'Colgate 200g', 'Dettol 250ml', 'Vaseline 250ml', 'Nivea Cream 100ml'],
  household: ['Ariel Powder 1kg', 'Vim Dishwash 750ml', 'Harpic 500ml', 'Surf Excel 1kg', 'Comfort Fabric 500ml', 'Scotch-Brite Pad']
};
var SUPS = ['Hindustan Unilever', 'PepsiCo India', 'Amul Dairy', 'ITC Foods', 'Britannia Ind', 'Nestle India'];
var CAT_COL = ['#38bdf8', '#22d3a4', '#f97316', '#a78bfa', '#2dd4bf'];

// ── DATA GENERATION ────────────────────────────────────────
function makeData() {
  var out = [];
  Object.keys(CATS).forEach(function (cat) {
    CATS[cat].forEach(function (name) {
      var stock = ri(50, 900);
      var daily = ri(20, 120);
      var rop = daily * ri(3, 7);
      var lead = ri(2, 14);
      var price = ri(30, 450);
      var dos = Math.round(stock / daily);
      var rs = dos < 5 ? 95 : dos < 10 ? ri(70, 89) : dos < 15 ? ri(40, 65) : ri(5, 35);
      if (stock < rop) rs = Math.min(99, rs + 15);
      var abc = rs > 60 || price > 300 ? 'A' : price > 150 || daily > 80 ? 'B' : 'C';
      out.push({ sku: 'SKU-' + String(1000 + out.length), name: name, cat: cat, stock: stock, daily: daily, rop: rop, lead: lead, price: price, dos: dos, rs: rs, abc: abc, value: stock * price, fillRate: dos > 10 ? ri(88, 99) : dos > 5 ? ri(70, 87) : ri(50, 70), supplier: pick(SUPS) });
    });
  });
  return out;
}

var allData = makeData();
var filtered = allData.slice();

// ── FILTER ────────────────────────────────────────────────
function applyFilter() {
  var c = document.getElementById('catFilter').value;
  filtered = c === 'all' ? allData.slice() : allData.filter(function (d) { return d.cat === c; });
  renderAll();
}

// ── METRICS ───────────────────────────────────────────────
function getCritical() { return filtered.filter(function (d) { return d.dos < 7; }).length; }
function getInvVal()   { return Math.round(filtered.reduce(function (a, d) { return a + d.value; }, 0) / 1000); }
function getAvgDOS()   { return Math.round(filtered.reduce(function (a, d) { return a + d.dos; }, 0) / filtered.length); }
function getFill()     { return (filtered.reduce(function (a, d) { return a + d.fillRate; }, 0) / filtered.length).toFixed(1); }
function getHighRisk() { return filtered.filter(function (d) { return d.dos < 14; }).length; }

// ── KPI CARDS ─────────────────────────────────────────────
function renderKPIs() {
  var crit = getCritical();
  var cats = [...new Set(filtered.map(function (d) { return d.cat; }))];
  document.getElementById('k-skus').textContent = filtered.length;
  document.getElementById('k-skus-sub').textContent = cats.length + ' categories active';
  document.getElementById('k-val').textContent = '$' + getInvVal() + 'K';
  document.getElementById('k-dos').textContent = getAvgDOS() + 'd';
  document.getElementById('k-risk').textContent = crit;
  document.getElementById('k-risk-sub').textContent = crit + ' SKUs below safety stock';
  document.getElementById('k-fill').textContent = getFill() + '%';
  document.getElementById('last-upd').textContent = new Date().toLocaleTimeString();
  document.getElementById('nb-crit').textContent = crit;
  document.getElementById('nb-risk').textContent = getHighRisk();
}

// ── INSIGHT CHIPS ──────────────────────────────────────────
function renderInsights() {
  var crit = getCritical();
  var fill = getFill();
  var top = allData.slice().sort(function (a, b) { return b.rs - a.rs; })[0];
  var over = allData.filter(function (d) { return d.dos > 30; }).length;
  var aSkus = allData.filter(function (d) { return d.abc === 'A'; }).length;
  document.getElementById('insight-chips').innerHTML =
    '<div class="ic ic-r" onclick="navigate(\'stockout\')"><div class="ic-icon">🚨</div><div><strong>' + crit + ' critical SKUs</strong> have &lt;7 days of stock. Immediate reorder required to prevent lost sales.</div></div>' +
    '<div class="ic ic-o" onclick="navigate(\'inventory\')"><div class="ic-icon">⚠️</div><div><strong>Fill rate at ' + fill + '%</strong> — below 95% target. Beverages and dairy show largest service gap.</div></div>' +
    '<div class="ic ic-b" onclick="navigate(\'forecast\')"><div class="ic-icon">📊</div><div><strong>Avg ' + getAvgDOS() + ' days of stock</strong> vs 21-day target. ' + over + ' SKUs overstocked — capital tied up.</div></div>' +
    '<div class="ic ic-r" onclick="openSKUModal(top)"><div class="ic-icon">🔥</div><div><strong>' + top.name + '</strong> is the highest-risk SKU at ' + top.rs + '% risk — only ' + top.dos + ' days remaining.</div></div>' +
    '<div class="ic ic-g" onclick="navigate(\'abc\')"><div class="ic-icon">🎯</div><div><strong>' + aSkus + ' A-class SKUs</strong> hold 70% of inventory value. Prioritize for immediate reorder cycles.</div></div>';
}

// ── CHART HELPERS ──────────────────────────────────────────
var charts = {};
function mkChart(id, cfg) {
  if (charts[id]) { charts[id].destroy(); }
  var canvas = document.getElementById(id);
  if (!canvas) return null;
  charts[id] = new Chart(canvas, cfg);
  return charts[id];
}

// ── OVERVIEW CHARTS ────────────────────────────────────────
function renderCatBar() {
  var cats = Object.keys(CATS);
  var stocks = cats.map(function (c) { return filtered.filter(function (d) { return d.cat === c; }).reduce(function (a, d) { return a + d.stock; }, 0); });
  mkChart('c-catbar', { type: 'bar', data: { labels: cats.map(function (c) { return c.charAt(0).toUpperCase() + c.slice(1); }), datasets: [{ data: stocks, backgroundColor: CAT_COL, borderRadius: 5, borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return ' ' + c.raw.toLocaleString() + ' units'; } } } }, scales: { x: { ticks: { color: '#3d5470', font: { size: 10 } }, grid: { color: 'rgba(56,189,248,0.06)' } }, y: { ticks: { color: '#3d5470' }, grid: { color: 'rgba(56,189,248,0.06)' }, beginAtZero: true } } } });
}

function renderRadar() {
  var cats = ['Beverages', 'Dairy', 'Snacks', 'Personal', 'Household'];
  var risks = cats.map(function (c) { var g = allData.filter(function (d) { return d.cat === c.toLowerCase(); }); return g.length ? Math.round(g.reduce(function (a, d) { return a + d.rs; }, 0) / g.length) : 0; });
  mkChart('c-radar', { type: 'radar', data: { labels: cats, datasets: [{ label: 'Risk %', data: risks, borderColor: '#f43f5e', backgroundColor: 'rgba(244,63,94,0.1)', pointBackgroundColor: '#f43f5e', pointRadius: 4, borderWidth: 1.5 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { r: { ticks: { color: '#3d5470', backdropColor: 'transparent', font: { size: 9 } }, grid: { color: 'rgba(56,189,248,0.1)' }, pointLabels: { color: '#7b9bbf', font: { size: 10 } }, suggestedMin: 0, suggestedMax: 100 } } } });
}

function renderTrend() {
  var wks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12'];
  var stock  = [420, 398, 445, 410, 388, 401, 375, 362, 389, 345, 320, 304];
  var demand = [310, 325, 318, 340, 355, 330, 360, 370, 350, 380, 390, 405];
  mkChart('c-trend', { type: 'line', data: { labels: wks, datasets: [{ label: 'Stock', data: stock, borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.05)', tension: 0.4, fill: true, pointRadius: 3, pointBackgroundColor: '#38bdf8', borderWidth: 1.5 }, { label: 'Demand', data: demand, borderColor: '#f43f5e', borderDash: [4, 3], tension: 0.4, pointRadius: 3, pointBackgroundColor: '#f43f5e', fill: false, borderWidth: 1.5 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#3d5470', font: { size: 10 }, boxWidth: 8 } } }, scales: { x: { ticks: { color: '#3d5470', font: { size: 9 } }, grid: { color: 'rgba(56,189,248,0.06)' } }, y: { ticks: { color: '#3d5470' }, grid: { color: 'rgba(56,189,248,0.06)' } } } } });
}

function renderDOSHist() {
  var bins = [0, 0, 0, 0, 0];
  allData.forEach(function (d) { if (d.dos < 7) bins[0]++; else if (d.dos < 14) bins[1]++; else if (d.dos < 21) bins[2]++; else if (d.dos < 30) bins[3]++; else bins[4]++; });
  mkChart('c-dos-hist', { type: 'bar', data: { labels: ['<7d', '7-14d', '14-21d', '21-30d', '>30d'], datasets: [{ data: bins, backgroundColor: ['#f43f5e', '#f97316', '#fbbf24', '#22d3a4', '#38bdf8'], borderRadius: 5, borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#3d5470', font: { size: 10 } }, grid: { color: 'rgba(56,189,248,0.06)' } }, y: { ticks: { color: '#3d5470' }, grid: { color: 'rgba(56,189,248,0.06)' }, beginAtZero: true } } } });
}

function renderHeatmap() {
  var cats = ['Beverages', 'Dairy', 'Snacks', 'Personal', 'Household'];
  var g = document.getElementById('heat-grid');
  var savedSeed = seed; seed = 99;
  var rows = cats.map(function (c) {
    var row = '<div class="hm-row"><div class="hm-lbl">' + c + '</div>';
    for (var w = 0; w < 7; w++) {
      var risk = ri(10, 90);
      var cls = risk < 25 ? 'hc0' : risk < 50 ? 'hc1' : risk < 70 ? 'hc2' : 'hc3';
      row += '<div class="hm-cell ' + cls + '" title="' + c + ' W' + (w + 1) + ': ' + risk + '% risk" onclick="showToast(\'' + (risk < 25 ? 'g' : risk < 50 ? 'b' : risk < 70 ? 'o' : 'r') + '\',\'' + c + ' — Week ' + (w + 1) + '\',\'Risk level: ' + risk + '%. ' + (risk < 25 ? 'Stock healthy.' : risk < 50 ? 'Monitor closely.' : risk < 70 ? 'Consider reorder.' : 'Urgent reorder needed!') + '\')" >' + risk + '</div>';
    }
    return row + '</div>';
  });
  seed = savedSeed;
  g.innerHTML = rows.join('');
}

// ── INVENTORY TABLE ────────────────────────────────────────
function renderTable() {
  var sort = document.getElementById('tbl-sort') ? document.getElementById('tbl-sort').value : 'risk';
  var search = (document.getElementById('search-inp') ? document.getElementById('search-inp').value.trim().toLowerCase() : '');
  var rows = filtered.slice().filter(function (d) { return !search || (d.name.toLowerCase().includes(search) || d.sku.toLowerCase().includes(search) || d.cat.toLowerCase().includes(search) || d.supplier.toLowerCase().includes(search)); });
  rows.sort(function (a, b) { return sort === 'risk' ? b.rs - a.rs : sort === 'dos' ? a.dos - b.dos : sort === 'val' ? b.value - a.value : a.name.localeCompare(b.name); });
  var abc_cls = { A: 'p-g', B: 'p-b', C: 'p-p' };
  var st_cls = function (d) { return d.dos < 7 ? 'p-r' : d.dos < 14 ? 'p-o' : d.stock > d.rop * 3 ? 'p-p' : 'p-g'; };
  var st_lbl = function (d) { return d.dos < 7 ? 'Critical' : d.dos < 14 ? 'Low stock' : d.stock > d.rop * 3 ? 'Overstock' : 'OK'; };
  document.getElementById('inv-tbody').innerHTML = rows.map(function (d) {
    var sbar = '<div class="sbar"><div class="strack"><div class="sfill" style="width:' + d.rs + '%;background:' + (d.rs > 70 ? '#f43f5e' : d.rs > 40 ? '#f97316' : '#22d3a4') + '"></div></div><span style="font-size:10.5px;color:#7b9bbf;width:28px;flex-shrink:0;text-align:right;font-family:JetBrains Mono,monospace">' + d.rs + '%</span></div>';
    return '<tr onclick="openSKUModal(allData.find(function(x){return x.sku===\'' + d.sku + '\'}))" style="cursor:pointer"><td>' + d.sku + '</td><td style="color:var(--text1);font-weight:500">' + d.name + '</td><td style="color:var(--text3)">' + d.cat + '</td><td><span class="pill ' + abc_cls[d.abc] + '">' + d.abc + '</span></td><td>' + d.stock.toLocaleString() + '</td><td>' + d.rop.toLocaleString() + '</td><td style="color:' + (d.dos < 7 ? 'var(--red)' : d.dos < 14 ? 'var(--orange)' : 'var(--text2)') + '">' + d.dos + 'd</td><td>' + d.lead + 'd</td><td>$' + Math.round(d.value / 1000) + 'K</td><td>' + sbar + '</td><td><span class="pill ' + st_cls(d) + '">' + st_lbl(d) + '</span></td></tr>';
  }).join('');
  if (document.getElementById('table-count')) document.getElementById('table-count').textContent = 'Showing ' + rows.length + ' of ' + filtered.length + ' SKUs';
}

// ── INVENTORY CHARTS ────────────────────────────────────────
function renderInvCharts() {
  var cats = Object.keys(CATS);
  var vals = cats.map(function (c) { return Math.round(allData.filter(function (d) { return d.cat === c; }).reduce(function (a, d) { return a + d.value; }, 0) / 1000); });
  mkChart('c-val-pie', { type: 'pie', data: { labels: cats.map(function (c) { return c.charAt(0).toUpperCase() + c.slice(1); }), datasets: [{ data: vals, backgroundColor: CAT_COL, borderWidth: 0, hoverOffset: 5 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#3d5470', font: { size: 9.5 }, boxWidth: 7 } } } } });
  document.getElementById('fill-progs').innerHTML = cats.map(function (c, i) { var g = filtered.filter(function (d) { return d.cat === c; }); var r = g.length ? Math.round(g.reduce(function (a, d) { return a + d.fillRate; }, 0) / g.length) : 0; var col = r >= 90 ? '#22d3a4' : r >= 75 ? '#f97316' : '#f43f5e'; return '<div class="prog-item"><div class="prog-top"><span class="prog-name">' + c.charAt(0).toUpperCase() + c.slice(1) + '</span><span class="prog-val" style="color:' + col + '">' + r + '%</span></div><div class="prog-track"><div class="prog-fill" style="width:' + r + '%;background:' + col + '"></div></div></div>'; }).join('');
  var over  = cats.map(function (c) { return allData.filter(function (d) { return d.cat === c && d.dos > 30; }).length; });
  var under = cats.map(function (c) { return allData.filter(function (d) { return d.cat === c && d.dos < 14; }).length; });
  mkChart('c-overunder', { type: 'bar', data: { labels: cats.map(function (c) { return c.charAt(0).toUpperCase() + c.slice(1); }), datasets: [{ label: 'Overstock', data: over, backgroundColor: '#a78bfa', borderRadius: 4, borderWidth: 0 }, { label: 'Understock', data: under, backgroundColor: '#f43f5e', borderRadius: 4, borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#3d5470', font: { size: 10 }, boxWidth: 8 } } }, scales: { x: { ticks: { color: '#3d5470', font: { size: 9.5 } }, grid: { color: 'rgba(56,189,248,0.06)' } }, y: { ticks: { color: '#3d5470' }, grid: { color: 'rgba(56,189,248,0.06)' }, beginAtZero: true } } } });
}

// ── STOCKOUT PAGE ──────────────────────────────────────────
function renderStockoutPage() {
  var crit = allData.filter(function (d) { return d.dos < 7; }).length;
  var high = allData.filter(function (d) { return d.dos >= 7 && d.dos < 14; }).length;
  var safe = allData.filter(function (d) { return d.dos >= 14; }).length;
  document.getElementById('so-crit').textContent = crit;
  document.getElementById('so-high').textContent = high;
  document.getElementById('so-safe').textContent = safe;
  var top = allData.slice().sort(function (a, b) { return b.rs - a.rs; }).slice(0, 10);
  document.getElementById('risk-items').innerHTML = top.map(function (d) {
    var col = d.dos < 7 ? 'var(--red)' : d.dos < 14 ? 'var(--orange)' : 'var(--blue)';
    return '<div class="risk-item" onclick="openSKUModal(allData.find(function(x){return x.sku===\'' + d.sku + '\'}))"><div class="risk-dot" style="background:' + col + '"></div><div class="risk-info"><div class="risk-name">' + d.name + '</div><div class="risk-meta">' + d.dos + 'd stock · ' + d.daily + '/day demand · ' + d.lead + 'd lead · ' + d.supplier + '</div></div><div><div class="risk-num" style="color:' + col + '">' + d.rs + '%</div><div class="risk-lbl">risk score</div></div></div>';
  }).join('');
  var bins = [0, 0, 0, 0, 0];
  allData.forEach(function (d) { if (d.rs < 20) bins[0]++; else if (d.rs < 40) bins[1]++; else if (d.rs < 60) bins[2]++; else if (d.rs < 80) bins[3]++; else bins[4]++; });
  mkChart('c-risk-dist', { type: 'bar', data: { labels: ['0-20%', '20-40%', '40-60%', '60-80%', '80-100%'], datasets: [{ data: bins, backgroundColor: ['#22d3a4', '#38bdf8', '#f97316', '#f43f5e', '#7f1d1d'], borderRadius: 5, borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#3d5470', font: { size: 10 } }, grid: { color: 'rgba(56,189,248,0.06)' } }, y: { ticks: { color: '#3d5470' }, grid: { color: 'rgba(56,189,248,0.06)' }, beginAtZero: true } } } });
}

// ── SUPPLIERS PAGE ─────────────────────────────────────────
function renderSuppliers() {
  var sups = SUPS;
  var leads = sups.map(function (s) { var g = allData.filter(function (d) { return d.supplier === s; }); return g.length ? +(g.reduce(function (a, d) { return a + d.lead; }, 0) / g.length).toFixed(1) : 0; });
  var scores = sups.map(function (s, i) { var savedSeed = seed; seed = 300 + i * 7; var sc = Math.round(100 - leads[i] * 4 + ri(0, 10)); seed = savedSeed; return Math.min(99, Math.max(40, sc)); });
  var skuCounts = sups.map(function (s) { return allData.filter(function (d) { return d.supplier === s; }).length; });
  mkChart('c-sup-bar', { type: 'bar', data: { labels: sups.map(function (s) { return s.split(' ')[0]; }), datasets: [{ data: leads, backgroundColor: leads.map(function (l) { return l > 10 ? '#f43f5e' : l > 6 ? '#f97316' : '#22d3a4'; }), borderRadius: 5, borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return ' ' + c.raw.toFixed(1) + ' days avg lead time'; } } } }, scales: { x: { ticks: { color: '#3d5470' }, grid: { color: 'rgba(56,189,248,0.06)' }, beginAtZero: true, max: 20 }, y: { ticks: { color: '#7b9bbf', font: { size: 10.5 } }, grid: { color: 'rgba(56,189,248,0.06)' } } } } });
  document.getElementById('sup-prog').innerHTML = sups.map(function (s, i) { var col = scores[i] >= 80 ? '#22d3a4' : scores[i] >= 60 ? '#f97316' : '#f43f5e'; return '<div class="prog-item"><div class="prog-top"><span class="prog-name">' + s.split(' ')[0] + '</span><span class="prog-val" style="color:' + col + '">' + scores[i] + '%</span></div><div class="prog-track"><div class="prog-fill" style="width:' + scores[i] + '%;background:' + col + '"></div></div></div>'; }).join('');
  document.getElementById('sup-cards').innerHTML = sups.map(function (s, i) { return '<div class="sup-card"><div class="sup-hd"><span class="sup-name">' + s + '</span><span class="pill ' + (leads[i] > 10 ? 'p-r' : leads[i] > 6 ? 'p-o' : 'p-g') + '">' + leads[i] + 'd avg lead</span></div><div class="sup-metrics"><div class="sup-metric"><div class="sm-val">' + skuCounts[i] + '</div><div class="sm-lbl">SKUs</div></div><div class="sup-metric"><div class="sm-val" style="color:' + (scores[i] >= 80 ? 'var(--green)' : scores[i] >= 60 ? 'var(--orange)' : 'var(--red)') + '">' + scores[i] + '%</div><div class="sm-lbl">Reliability</div></div><div class="sup-metric"><div class="sm-val">$' + Math.round(allData.filter(function (d) { return d.supplier === s; }).reduce(function (a, d) { return a + d.value; }, 0) / 1000) + 'K</div><div class="sm-lbl">Inv. value</div></div></div></div>'; }).join('');
}

// ── ABC PAGE ───────────────────────────────────────────────
function renderABC() {
  var a = allData.filter(function (d) { return d.abc === 'A'; });
  var b = allData.filter(function (d) { return d.abc === 'B'; });
  var c = allData.filter(function (d) { return d.abc === 'C'; });
  var tot = allData.reduce(function (a, d) { return a + d.value; }, 0);
  document.getElementById('abc-summary').innerHTML =
    '<div class="abc-card abc-a"><div class="abc-letter">A</div><div style="font-size:13.5px;font-weight:600;color:var(--text1)">' + a.length + ' SKUs</div><div style="font-size:10.5px;color:var(--text3);margin-top:3px;line-height:1.5">High value · 70% of inventory<br>Top priority for reorder</div></div>' +
    '<div class="abc-card abc-b"><div class="abc-letter">B</div><div style="font-size:13.5px;font-weight:600;color:var(--text1)">' + b.length + ' SKUs</div><div style="font-size:10.5px;color:var(--text3);margin-top:3px;line-height:1.5">Medium value · 20% of inventory<br>Monitor closely</div></div>' +
    '<div class="abc-card abc-c"><div class="abc-letter">C</div><div style="font-size:13.5px;font-weight:600;color:var(--text1)">' + c.length + ' SKUs</div><div style="font-size:10.5px;color:var(--text3);margin-top:3px;line-height:1.5">Low value · 10% of inventory<br>Bulk reorder strategy</div></div>';
  var aVal = a.reduce(function (x, d) { return x + d.value; }, 0);
  var bVal = b.reduce(function (x, d) { return x + d.value; }, 0);
  var cVal = c.reduce(function (x, d) { return x + d.value; }, 0);
  mkChart('c-abc-bar', { type: 'bar', data: { labels: ['A — High', 'B — Medium', 'C — Low'], datasets: [{ label: 'Value ($K)', data: [Math.round(aVal / 1000), Math.round(bVal / 1000), Math.round(cVal / 1000)], backgroundColor: ['#22d3a4', '#38bdf8', '#3d5470'], borderRadius: 5, borderWidth: 0 }, { label: 'SKU count', data: [a.length, b.length, c.length], backgroundColor: ['rgba(34,211,164,0.15)', 'rgba(56,189,248,0.15)', 'rgba(61,84,112,0.15)'], borderRadius: 5, borderWidth: 0, yAxisID: 'y1' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#3d5470', font: { size: 10 }, boxWidth: 8 } } }, scales: { x: { ticks: { color: '#3d5470', font: { size: 10 } }, grid: { color: 'rgba(56,189,248,0.06)' } }, y: { ticks: { color: '#3d5470' }, grid: { color: 'rgba(56,189,248,0.06)' }, beginAtZero: true }, y1: { ticks: { color: '#3d5470' }, grid: { display: false }, beginAtZero: true, position: 'right' } } } });
  var pts  = allData.map(function (d) { return { x: +(d.value / 1000).toFixed(1), y: d.daily, r: d.abc === 'A' ? 7 : d.abc === 'B' ? 5 : 3 }; });
  var cols = allData.map(function (d) { return d.abc === 'A' ? 'rgba(34,211,164,0.7)' : d.abc === 'B' ? 'rgba(56,189,248,0.7)' : 'rgba(61,84,112,0.5)'; });
  mkChart('c-abc-scatter', { type: 'bubble', data: { datasets: [{ data: pts, backgroundColor: cols }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return 'Value: $' + c.raw.x + 'K | Daily: ' + c.raw.y + '/day'; } } } }, scales: { x: { title: { display: true, text: 'Value ($K)', color: '#3d5470', font: { size: 10 } }, ticks: { color: '#3d5470' }, grid: { color: 'rgba(56,189,248,0.06)' }, min: 0 }, y: { title: { display: true, text: 'Daily demand', color: '#3d5470', font: { size: 10 } }, ticks: { color: '#3d5470' }, grid: { color: 'rgba(56,189,248,0.06)' }, min: 0 } }, layout: { padding: 15 } } });
  document.getElementById('abc-tbody').innerHTML = allData.slice().sort(function (a, b) { return b.value - a.value; }).slice(0, 15).map(function (d) { var pct = (d.value / tot * 100).toFixed(1); var abc_cls = { A: 'p-g', B: 'p-b', C: 'p-p' }; return '<tr onclick="openSKUModal(allData.find(function(x){return x.sku===\'' + d.sku + '\'}))" style="cursor:pointer"><td>' + d.sku + '</td><td style="color:var(--text1);font-weight:500">' + d.name + '</td><td><span class="pill ' + abc_cls[d.abc] + '">' + d.abc + '</span></td><td>$' + Math.round(d.value / 1000) + 'K</td><td>' + pct + '%</td><td>' + d.daily + '/day</td><td><span class="pill ' + (d.dos < 7 ? 'p-r' : d.dos < 14 ? 'p-o' : 'p-g') + '">' + (d.dos < 7 ? 'Critical' : d.dos < 14 ? 'Low' : 'OK') + '</span></td></tr>'; }).join('');
}

// ── FORECAST PAGE ──────────────────────────────────────────
function renderForecast() {
  var wks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12', 'F1', 'F2', 'F3', 'F4'];
  var tot = [310, 325, 318, 340, 355, 330, 360, 370, 350, 380, 390, 405, null, null, null, null];
  var fc  = [null, null, null, null, null, null, null, null, null, null, null, 405, 420, 435, 428, 445];
  mkChart('c-fc-main', { type: 'line', data: { labels: wks, datasets: [{ label: 'Actual demand', data: tot, borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.05)', tension: 0.4, fill: true, pointRadius: 3, pointBackgroundColor: '#38bdf8', borderWidth: 1.5, spanGaps: false }, { label: 'AI forecast', data: fc, borderColor: '#a78bfa', borderDash: [5, 4], tension: 0.4, pointRadius: 3, pointBackgroundColor: '#a78bfa', fill: false, borderWidth: 1.5, spanGaps: true }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#3d5470', font: { size: 10 }, boxWidth: 8 } } }, scales: { x: { ticks: { color: '#3d5470', font: { size: 9 } }, grid: { color: 'rgba(56,189,248,0.06)' } }, y: { ticks: { color: '#3d5470' }, grid: { color: 'rgba(56,189,248,0.06)' } } } } });
  var cats = Object.keys(CATS); var wkLabels = ['W9', 'W10', 'W11', 'W12']; var savedSeed = seed; seed = 200;
  var datasets = cats.map(function (c, i) { var baseVals = [ri(60, 100), ri(65, 110), ri(70, 115), ri(75, 120)]; return { label: c.charAt(0).toUpperCase() + c.slice(1), data: baseVals, backgroundColor: CAT_COL[i], borderRadius: 4, borderWidth: 0 }; });
  seed = savedSeed;
  mkChart('c-fc-stack', { type: 'bar', data: { labels: wkLabels, datasets: datasets }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#3d5470', font: { size: 10 }, boxWidth: 8 } } }, scales: { x: { stacked: true, ticks: { color: '#3d5470', font: { size: 10 } }, grid: { color: 'rgba(56,189,248,0.06)' } }, y: { stacked: true, ticks: { color: '#3d5470' }, grid: { color: 'rgba(56,189,248,0.06)' } } } } });
  var topSKUs = allData.slice().sort(function (a, b) { return b.daily - a.daily; }).slice(0, 8);
  document.getElementById('forecast-rows').innerHTML = topSKUs.map(function (d) {
    var w1 = d.daily * 7, w2 = Math.round(w1 * 1.05), w3 = Math.round(w1 * 1.08), w4 = Math.round(w1 * 1.12);
    var max = w4;
    var bars = [w1, w2, w3, w4].map(function (v, i) { var h = Math.round(v / max * 28); var col = ['#38bdf8', '#22d3a4', '#a78bfa', '#f97316'][i]; return '<div class="fc-bar" style="height:' + h + 'px;background:' + col + '"></div>'; }).join('');
    return '<div class="fc-row"><div class="fc-name">' + d.name + ' <span style="font-size:10px;color:var(--text3)">(' + d.cat + ')</span></div><div class="fc-bars">' + bars + '</div><div class="fc-label" style="color:var(--text2)">+' + Math.round((w4 - w1) / w1 * 100) + '% growth</div></div>';
  }).join('');
}

// ── RESTOCK PAGE ────────────────────────────────────────────
function renderRestockPage() {
  var items = allData.filter(function (d) { return d.dos < 14; }).sort(function (a, b) { return a.dos - b.dos; });
  document.getElementById('restock-items').innerHTML = items.map(function (d) {
    var urg  = d.dos < 7 ? 'u-now' : d.dos < 10 ? 'u-soon' : 'u-plan';
    var urgl = d.dos < 7 ? 'Order now' : d.dos < 10 ? 'Order soon' : 'Plan ahead';
    var qty  = Math.round(d.daily * 30);
    return '<div class="rst-item"><div class="rst-hd"><span class="rst-name">' + d.name + '</span><span class="urg ' + urg + '">' + urgl + '</span></div><div class="rst-body">Current stock: <strong>' + d.stock + '</strong> units · Daily sales: <strong>' + d.daily + '/day</strong> · <strong>' + d.dos + ' days</strong> remaining · Lead time: <strong>' + d.lead + ' days</strong></div><div class="rst-action"><span>Suggested order: <strong>' + qty + ' units</strong> from <strong>' + d.supplier + '</strong> — 30-day supply at $' + Math.round(qty * d.price / 1000) + 'K</span><button class="btn btn-primary" style="font-size:10.5px;padding:4px 10px" onclick="showToast(\'g\',\'Order queued\',\'' + qty + ' units of ' + d.name + ' queued for ' + d.supplier + '.\')">Queue order ↗</button></div></div>';
  }).join('');
}

// ── SKU DETAIL MODAL ────────────────────────────────────────
function openSKUModal(d) {
  if (!d) return;
  var col    = d.dos < 7 ? 'var(--red)' : d.dos < 14 ? 'var(--orange)' : 'var(--green)';
  var status = d.dos < 7 ? 'Critical' : d.dos < 14 ? 'Low stock' : d.stock > d.rop * 3 ? 'Overstock' : 'OK';
  var qty30  = Math.round(d.daily * 30);
  document.getElementById('modal-body').innerHTML =
    '<div class="modal-title">' + d.name + '</div>' +
    '<div class="modal-sub">' + d.sku + ' · ' + d.cat + ' · ' + d.supplier + ' · ABC class: <strong>' + d.abc + '</strong></div>' +
    '<div class="modal-section"><div class="modal-section-title">Stock status</div>' +
    '<div class="mstat"><span class="mstat-label">Current stock</span><span class="mstat-value">' + d.stock.toLocaleString() + ' units</span></div>' +
    '<div class="mstat"><span class="mstat-label">Days of stock</span><span class="mstat-value" style="color:' + col + '">' + d.dos + ' days</span></div>' +
    '<div class="mstat"><span class="mstat-label">Daily demand</span><span class="mstat-value">' + d.daily + ' units/day</span></div>' +
    '<div class="mstat"><span class="mstat-label">Reorder point</span><span class="mstat-value">' + d.rop.toLocaleString() + ' units</span></div>' +
    '<div class="mstat"><span class="mstat-label">Status</span><span class="mstat-value" style="color:' + col + '">' + status + '</span></div></div>' +
    '<div class="modal-section"><div class="modal-section-title">Financial</div>' +
    '<div class="mstat"><span class="mstat-label">Unit price</span><span class="mstat-value">$' + d.price + '</span></div>' +
    '<div class="mstat"><span class="mstat-label">Inventory value</span><span class="mstat-value">$' + Math.round(d.value / 1000) + 'K</span></div>' +
    '<div class="mstat"><span class="mstat-label">Risk score</span><span class="mstat-value" style="color:' + (d.rs > 70 ? 'var(--red)' : d.rs > 40 ? 'var(--orange)' : 'var(--green)') + '">' + d.rs + '%</span></div>' +
    '<div class="mstat"><span class="mstat-label">Fill rate</span><span class="mstat-value">' + d.fillRate + '%</span></div></div>' +
    '<div class="modal-section"><div class="modal-section-title">Reorder recommendation</div>' +
    '<div class="mstat"><span class="mstat-label">Supplier</span><span class="mstat-value">' + d.supplier + '</span></div>' +
    '<div class="mstat"><span class="mstat-label">Lead time</span><span class="mstat-value">' + d.lead + ' days</span></div>' +
    '<div class="mstat"><span class="mstat-label">Suggested order qty</span><span class="mstat-value">' + qty30.toLocaleString() + ' units (30-day)</span></div>' +
    '<div class="mstat"><span class="mstat-label">Order cost</span><span class="mstat-value">$' + Math.round(qty30 * d.price / 1000) + 'K</span></div></div>' +
    '<div style="display:flex;gap:8px;margin-top:14px">' +
    '<button class="btn btn-primary" onclick="showToast(\'g\',\'Order queued\',\'30-day supply of ' + d.name + ' queued for ' + d.supplier + '.\')" style="flex:1">Queue reorder ↗</button>' +
    '<button class="btn" onclick="showToast(\'b\',\'Alert set\',\'Stock alert set for ' + d.name + ' at ' + Math.round(d.rop * 0.8) + ' units.\')">Set alert</button>' +
    '<button class="btn" onclick="closeModal()">Close</button></div>';
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal(e) {
  if (!e || e.target === document.getElementById('modal-overlay'))
    document.getElementById('modal-overlay').classList.remove('open');
}

// ── CSV EXPORT ─────────────────────────────────────────────
function exportCSV() {
  var rows = [['SKU', 'Product', 'Category', 'ABC', 'Stock', 'Reorder Pt', 'Days of Stock', 'Lead Time', 'Value', 'Risk Score', 'Status', 'Supplier']];
  var st_lbl = function (d) { return d.dos < 7 ? 'Critical' : d.dos < 14 ? 'Low stock' : d.stock > d.rop * 3 ? 'Overstock' : 'OK'; };
  filtered.forEach(function (d) { rows.push([d.sku, d.name, d.cat, d.abc, d.stock, d.rop, d.dos, d.lead, Math.round(d.value / 1000) + 'K', d.rs + '%', st_lbl(d), d.supplier]); });
  var csv = rows.map(function (r) { return r.map(function (v) { return '"' + v + '"'; }).join(','); }).join('\n');
  var blob = new Blob([csv], { type: 'text/csv' }); var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = 'supplyiq_inventory.csv'; a.click(); URL.revokeObjectURL(url);
  showToast('g', 'Export complete', 'Inventory CSV downloaded (' + filtered.length + ' SKUs).');
}

// ── AI TABS ────────────────────────────────────────────────
function switchTab(tab) {
  ['chat', 'predict', 'restock-ai'].forEach(function (t) {
    document.getElementById('pane-' + t).style.display = t === tab ? 'block' : 'none';
    document.getElementById('tab-' + t).className = 'ai-tab' + (t === tab ? ' active' : '');
  });
}

// ── AI CHAT ────────────────────────────────────────────────
function addMsg(role, text) {
  var box = document.getElementById('chat-msgs');
  var el  = document.createElement('div');
  el.className = 'msg msg-' + role;
  if (role === 'ai') el.innerHTML = '<strong style="color:var(--blue)">AI Agent</strong><br>' + text;
  else el.textContent = text;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  return el;
}

function getCtx() {
  var crit     = getCritical();
  var topRisks = allData.slice().sort(function (a, b) { return b.rs - a.rs; }).slice(0, 5).map(function (d) { return d.name + ' (' + d.dos + 'd, ' + d.rs + '% risk)'; }).join(', ');
  var over     = allData.filter(function (d) { return d.dos > 30; }).length;
  return 'You are a senior supply chain analyst AI for a Retail FMCG company in India. Live data: ' + filtered.length + ' SKUs across 5 categories (beverages, dairy, snacks, personal care, household). Metrics: avg days of stock ' + getAvgDOS() + ', fill rate ' + getFill() + '%, ' + crit + ' critically low SKUs (<7 days), ' + over + ' overstocked (>30 days), inventory value $' + getInvVal() + 'K. Top 5 at-risk: ' + topRisks + '. ABC: 35% A-class hold 70% value. Respond in 4-6 sentences max. Plain prose only, no markdown, no bullets. Use specific numbers.';
}

async function callAI(sys, msg) {
  if (!APIKEY) return 'Please activate the AI agent with your API key first.';
  try {
    var res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': APIKEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 400, system: sys, messages: [{ role: 'user', content: msg }] })
    });
    var d = await res.json();
    if (d.error) return 'API Error: ' + d.error.message;
    return d.content && d.content[0] ? d.content[0].text : 'No response.';
  } catch (e) { return 'Error: ' + e.message; }
}

async function sendMsg() {
  var v = document.getElementById('ai-inp').value.trim();
  if (!v) return;
  document.getElementById('ai-inp').value = '';
  addMsg('user', v);
  var box = document.getElementById('chat-msgs');
  var typ = document.createElement('div'); typ.className = 'msg-typing'; typ.innerHTML = '<span></span><span></span><span></span>'; box.appendChild(typ); box.scrollTop = box.scrollHeight;
  var r = await callAI(getCtx(), v);
  typ.remove(); addMsg('ai', r);
}

async function askAgent(q) {
  navigate('ai');
  setTimeout(async function () {
    document.getElementById('ai-inp').value = '';
    addMsg('user', q);
    var box = document.getElementById('chat-msgs');
    var typ = document.createElement('div'); typ.className = 'msg-typing'; typ.innerHTML = '<span></span><span></span><span></span>'; box.appendChild(typ); box.scrollTop = box.scrollHeight;
    var r = await callAI(getCtx(), q);
    typ.remove(); addMsg('ai', r);
  }, 100);
}

// ── AI PREDICTIONS ─────────────────────────────────────────
async function aiPredictAll() {
  var out  = document.getElementById('ai-predict-out') || document.getElementById('predict-output');
  var card = document.getElementById('predict-card'); if (card) card.style.display = 'block';
  if (out) out.innerHTML = '<span style="color:var(--text3);font-size:11.5px">Analyzing all at-risk SKUs…</span>';
  var topRisks = allData.slice().sort(function (a, b) { return b.rs - a.rs; }).slice(0, 8).map(function (d) { return d.name + ': ' + d.dos + 'd stock, ' + d.daily + '/day, ' + d.lead + 'd lead, risk ' + d.rs + '%'; }).join('; ');
  var sys = 'You are a supply chain risk analyst. Analyze SKU data and provide a concise stockout prediction report. Be specific about timing and business impact. Max 6 sentences. Plain prose only.';
  var r = await callAI(sys, 'Predict stockout timing and revenue impact for: ' + topRisks);
  if (out) out.innerHTML = r;
}

async function aiRestockPlan() {
  var out  = document.getElementById('ai-restock-out') || document.getElementById('ai-restock-text');
  var card = document.getElementById('ai-restock-card'); if (card) card.style.display = 'block';
  if (out) out.innerHTML = '<span style="color:var(--text3);font-size:11.5px">Generating restock plan…</span>';
  var items  = allData.filter(function (d) { return d.dos < 14; }).sort(function (a, b) { return a.dos - b.dos; }).slice(0, 6);
  var detail = items.map(function (d) { return d.name + ' (' + d.dos + 'd left, ' + d.supplier + ', ' + d.lead + 'd lead)'; }).join('; ');
  var sys = 'You are a supply chain planner. Create a prioritized restock plan. Mention order sequencing by urgency, quantities, and timing. Max 5 sentences. Plain prose only.';
  var r = await callAI(sys, 'Generate restock plan for: ' + detail);
  if (out) out.innerHTML = r;
}

// ── MAIN RENDER ────────────────────────────────────────────
function renderAll() {
  renderKPIs();
  renderInsights();
  renderCatBar();
  renderRadar();
  renderTrend();
  renderDOSHist();
  renderHeatmap();
}

renderAll();
renderInvCharts();

// ── LIVE UPDATE — every 8 seconds ──────────────────────────
setInterval(function () {
  allData = allData.map(function (d) {
    var ns = Math.max(10, d.stock - Math.round(d.daily * (0.85 + Math.random() * 0.3)));
    var nd = Math.max(0, Math.round(ns / d.daily));
    var rs = nd < 5 ? 95 : nd < 10 ? Math.round(70 + Math.random() * 19) : nd < 15 ? Math.round(40 + Math.random() * 24) : Math.round(5 + Math.random() * 30);
    return Object.assign({}, d, { stock: ns, dos: nd, rs: rs, value: ns * d.price });
  });
  if (document.getElementById('catFilter').value === 'all') filtered = allData.slice();
  // Alert on newly critical SKUs
  var newCrit = allData.filter(function (d) { return d.dos <= 5; });
  if (newCrit.length > 0 && notifOn) {
    var item = newCrit[Math.floor(Math.random() * newCrit.length)];
    showToast('r', 'Stock alert: ' + item.name, 'Only ' + item.dos + ' days of stock remaining. Reorder from ' + item.supplier + ' immediately.', 4500);
  }
  renderAll();
  if (document.getElementById('page-stockout').classList.contains('active')) renderStockoutPage();
  if (document.getElementById('page-restock').classList.contains('active')) renderRestockPage();
  if (document.getElementById('page-inventory').classList.contains('active')) renderTable();
}, 8000);
