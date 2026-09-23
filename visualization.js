/* ==========================================================================
   visualization.js — seed tree, faith-visualization map, river, globe,
   Vision Mode, milestone celebrations and the completion experience.
   ---------------------------------------------------------------------------
   All drawings are Canvas 2D, driven by one requestAnimationFrame loop that
   skips canvases that are off-screen or detached, and draws a single still
   frame when reduced motion is preferred.
   Everything labelled "FAITH VISUALIZATION" is symbolic — it never shows
   money figures and never predicts outcomes.
   ========================================================================== */
(function (M) {
  'use strict';
  const U = M.U;
  const V = {};
  const TAU = Math.PI * 2;

  /* ---------------- colors from CSS tokens ---------------- */
  let C = {};
  const scratch = document.createElement('canvas').getContext('2d');
  /** Normalize any CSS color (hsl(), named, hex) to #rrggbb / rgba() via canvas */
  function norm(c, fallback) {
    try { scratch.fillStyle = '#000'; scratch.fillStyle = c; const v = scratch.fillStyle; return (v === '#000000' && !/^(#000|#000000|black|rgb\(0, ?0, ?0\))$/i.test(c)) ? fallback : v; } catch (e) { return fallback; }
  }
  function readColors(el) {
    const cs = getComputedStyle(el || document.documentElement);
    const g = (n, d) => norm((cs.getPropertyValue(n) || '').trim() || d, d);
    return { accent: g('--accent', '#d4ae62'), text: g('--text', '#ece6d8'), muted: g('--muted', '#8b93a7'), leaf: g('--leaf', '#7fa98a'), bg: g('--bg', '#0a0f1c'), bark: g('--bark', '#b9a58a'), ground: g('--line', '#2a3142') };
  }
  // Colors are read from each canvas's own computed style, so a canvas inside
  // an always-dark surface (prayer room, cinema, dark panels) gets dark tokens.
  V.refreshColors = () => { C = readColors(); };
  function rgba(hex, a) {
    hex = (hex || '#ffffff').trim();
    if (hex.startsWith('rgb')) return hex.replace(/rgba?\(([^)]+)\)/, (m, v) => 'rgba(' + v.split(',').slice(0, 3).join(',') + ',' + a + ')');
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  V.rgba = rgba;
  const uiFont = () => (getComputedStyle(document.documentElement).getPropertyValue('--sans') || 'system-ui, sans-serif').trim();
  const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const smooth = (a, b, x) => { const t = U.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  /* ---------------- animation manager ---------------- */
  const items = new Set();
  let raf = null, last = 0;
  function fit(cv) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = cv.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; return true; }
    return false;
  }
  function visible(cv) {
    if (!cv.isConnected) return false;
    const r = cv.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
  }
  function frame(ts) {
    raf = null;
    if (document.hidden) { return; }
    if (ts - last > 30) { // ~30fps is plenty for slow, peaceful motion
      last = ts;
      items.forEach((it) => {
        if (!it.cv.isConnected) { items.delete(it); return; }
        if (!visible(it.cv)) return;
        const resized = fit(it.cv);
        if (it.still && it.drawn && !resized) return;
        const ctx = it.cv.getContext('2d');
        C = it.colors || (it.colors = readColors(it.cv));
        const dpr = it.cv.width / Math.max(1, it.cv.getBoundingClientRect().width);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        try { it.draw(ctx, it.cv.width / dpr, it.cv.height / dpr, it.still ? 20 : (ts - it.t0) / 1000); } catch (e) { console.warn(e); items.delete(it); }
        it.drawn = true;
      });
    }
    if (items.size) raf = requestAnimationFrame(frame);
  }
  V.animate = (cv, draw) => {
    if (!cv) return null;
    items.forEach((it) => { if (it.cv === cv) items.delete(it); });
    const it = { cv, draw, t0: performance.now(), still: U.reducedMotion(), drawn: false };
    items.add(it);
    if (!raf) raf = requestAnimationFrame(frame);
    return it;
  };
  V.redrawAll = () => { V.refreshColors(); items.forEach((it) => { it.drawn = false; it.colors = null; it.still = U.reducedMotion(); }); if (!raf && items.size) raf = requestAnimationFrame(frame); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden && items.size && !raf) raf = requestAnimationFrame(frame); });
  window.addEventListener('scroll', () => { if (items.size && !raf) raf = requestAnimationFrame(frame); }, { passive: true });

  /* =========================================================================
     SEED TREE
     ========================================================================= */
  const STAGES = [
    { key: 'seed', name: 'Seed', from: 0, note: 'A single seed, placed in the ground.' },
    { key: 'rooted', name: 'Rooted', from: 5, note: 'Roots are reaching down where no one sees.' },
    { key: 'growing', name: 'Growing', from: 10, note: 'A small plant is breaking through.' },
    { key: 'developing', name: 'Developing', from: 20, note: 'A young tree, gaining strength.' },
    { key: 'flourishing', name: 'Flourishing', from: 35, note: 'A large tree, full of life.' },
    { key: 'fruitful', name: 'Fruitful', from: 45, note: 'Fruit is appearing on the branches.' },
    { key: 'abundant', name: 'Abundant', from: 55, note: 'Full bloom. The journey is almost complete.' }
  ];
  V.STAGES = STAGES;
  /** Stage from progress fraction (thresholds are defined on the 58-hour scale) */
  V.stage = (pct) => { const h = pct * 58; let s = STAGES[0]; STAGES.forEach((x) => { if (h >= x.from) s = x; }); return Object.assign({ index: STAGES.indexOf(s) }, s); };

  // Pre-built branch structure (deterministic).
  const TREE = (() => {
    const rnd = U.rng(58);
    const build = (depth, max) => {
      const node = { depth, len: depth === 0 ? 1 : 0.62 + rnd() * 0.22, ang: 0, kids: [], leaves: [], fruit: rnd() < 0.5, bloom: rnd() };
      if (depth < max) {
        const n = depth < 2 ? 2 + (rnd() < 0.4 ? 1 : 0) : 2 + (rnd() < 0.25 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const k = build(depth + 1, max);
          const spread = depth === 0 ? 0.55 : 0.5 + rnd() * 0.25;
          k.ang = (n === 2 ? (i === 0 ? -1 : 1) : (i - 1)) * spread + (rnd() - 0.5) * 0.25;
          node.kids.push(k);
        }
      }
      if (depth >= 3) for (let i = 0; i < 4; i++) node.leaves.push({ t: 0.3 + rnd() * 0.7, a: (rnd() - 0.5) * 2.4, s: 0.7 + rnd() * 0.6, r: rnd() });
      return node;
    };
    const roots = [];
    for (let i = 0; i < 7; i++) roots.push({ a: -1.2 + i * 0.4 + (rnd() - 0.5) * 0.2, l: 0.5 + rnd() * 0.5, bend: (rnd() - 0.5) * 0.8, sub: rnd() });
    return { root: build(0, 7), roots };
  })();

  /**
   * Draw the tree. p: 0..1 progress; t: seconds (sway); opts.glow: 0..1 light
   */
  V.drawTree = (ctx, W, H, p, t, opts = {}) => {
    const cx = W / 2, groundY = H * (opts.groundY || 0.78);
    const S = Math.min(W, H * 1.1);
    const hrs = p * 58;
    // ground
    const gg = ctx.createLinearGradient(0, groundY, 0, H);
    gg.addColorStop(0, rgba(C.accent, 0.08)); gg.addColorStop(1, rgba(C.accent, 0));
    ctx.fillStyle = gg; ctx.fillRect(0, groundY, W, H - groundY);
    ctx.strokeStyle = rgba(C.text, 0.14); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W * 0.1, groundY); ctx.lineTo(W * 0.9, groundY); ctx.stroke();

    // glow behind tree (completion light)
    const glow = (opts.glow || 0) + smooth(0.9, 1, p) * 0.5;
    if (glow > 0) {
      const rg = ctx.createRadialGradient(cx, groundY - S * 0.35, 0, cx, groundY - S * 0.35, S * 0.7);
      rg.addColorStop(0, rgba(C.accent, 0.28 * glow)); rg.addColorStop(1, rgba(C.accent, 0));
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    }

    // roots (below ground)
    const rootGrow = smooth(1, 14, hrs);
    if (rootGrow > 0) {
      ctx.lineCap = 'round';
      TREE.roots.forEach((r, i) => {
        const L = S * 0.2 * r.l * rootGrow;
        ctx.strokeStyle = rgba(C.bark, 0.35); ctx.lineWidth = Math.max(0.6, 2.2 * rootGrow * (1 - i % 2 * 0.4));
        ctx.beginPath(); ctx.moveTo(cx, groundY + 2);
        const ex = cx + Math.sin(r.a) * L, ey = groundY + Math.cos(r.a) * L * 0.8;
        ctx.quadraticCurveTo(cx + Math.sin(r.a + r.bend) * L * 0.5, groundY + L * 0.35, ex, ey);
        ctx.stroke();
      });
    }

    // seed
    const sprout = smooth(0.4, 5, hrs);
    if (hrs < 12) {
      const a = 1 - smooth(8, 12, hrs);
      const k = U.clamp(S / 260, 0.8, 2.2);
      ctx.save(); ctx.translate(cx, groundY + 3); ctx.rotate(-0.3 + sprout * 0.3); ctx.scale(k, k);
      ctx.fillStyle = rgba(C.accent, 0.9 * a);
      ctx.beginPath(); ctx.ellipse(0, 0, 7, 4.5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(C.bg, 0.6 * a * sprout); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.stroke();
      ctx.restore();
      // soft pulse
      if (hrs < 1) { const pr = 10 + (Math.sin(t * 1.5) + 1) * 4; ctx.strokeStyle = rgba(C.accent, 0.25); ctx.beginPath(); ctx.arc(cx, groundY + 3, pr, 0, TAU); ctx.stroke(); }
    }

    // sprout / tree
    const g = Math.pow(U.clamp((hrs - 0.4) / 57.6, 0, 1), 0.72); // overall growth
    const maxDepth = 7;
    const depthReach = 0.6 + g * (maxDepth + 0.4);
    const trunkLen = S * (0.04 + 0.2 * Math.pow(g, 0.8));
    const leafAmt = smooth(8, 40, hrs);
    const fruitAmt = smooth(44, 54, hrs);
    const bloomAmt = smooth(54, 58, hrs);
    if (sprout <= 0) return;
    ctx.lineCap = 'round';
    const drawNode = (node, x, y, ang, len, width) => {
      const vis = U.clamp(depthReach - node.depth, 0, 1);
      if (vis <= 0) return;
      const sway = Math.sin(t * 0.8 + node.depth * 0.7) * 0.012 * node.depth;
      const a = ang + node.ang + sway;
      const L = len * node.len * vis;
      const x2 = x + Math.sin(a) * L, y2 = y - Math.cos(a) * L;
      ctx.strokeStyle = node.depth < 2 ? rgba(C.bark, 0.95) : rgba(C.bark, 0.8);
      ctx.lineWidth = Math.max(0.6, width);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
      // leaves
      if (node.leaves.length && leafAmt > 0 && vis > 0.6) {
        node.leaves.forEach((lf, i) => {
          if (lf.r > leafAmt) return;
          const lx = x + (x2 - x) * lf.t, ly = y + (y2 - y) * lf.t;
          const la = a + lf.a + Math.sin(t * 1.3 + i) * 0.08;
          ctx.save(); ctx.translate(lx, ly); ctx.rotate(la);
          ctx.fillStyle = rgba(C.leaf, 0.55 + 0.3 * lf.r);
          ctx.beginPath(); ctx.ellipse(0, -3.2 * lf.s, 1.9 * lf.s, 3.6 * lf.s, 0, 0, TAU); ctx.fill();
          ctx.restore();
        });
      }
      // fruit + bloom
      if (node.depth >= 5 && node.fruit && fruitAmt > node.bloom * 0.9) {
        ctx.fillStyle = rgba(C.accent, 0.95);
        ctx.beginPath(); ctx.arc(x2, y2 + 3, 2.6 + fruitAmt, 0, TAU); ctx.fill();
        ctx.fillStyle = rgba(C.accent, 0.18); ctx.beginPath(); ctx.arc(x2, y2 + 3, 7 + fruitAmt * 2, 0, TAU); ctx.fill();
      }
      if (node.depth >= 6 && bloomAmt > node.bloom) {
        ctx.fillStyle = rgba(C.text, 0.85); ctx.beginPath(); ctx.arc(x2, y2, 1.8, 0, TAU); ctx.fill();
      }
      node.kids.forEach((k) => drawNode(k, x2, y2, a, L / Math.max(0.01, vis) * 0.78, width * 0.66));
    };
    if (hrs < 5) {
      // germinating sprout: two cotyledons
      const k = U.clamp(S / 260, 0.8, 2.2);
      const h = (4 + sprout * 18) * k;
      ctx.strokeStyle = rgba(C.leaf, 0.95); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(cx, groundY); ctx.quadraticCurveTo(cx - 3, groundY - h * 0.6, cx, groundY - h); ctx.stroke();
      ctx.fillStyle = rgba(C.leaf, 0.9);
      [-1, 1].forEach((s) => { ctx.save(); ctx.translate(cx, groundY - h); ctx.rotate(s * 0.9 + Math.sin(t) * 0.05); ctx.scale(k, k); ctx.beginPath(); ctx.ellipse(0, -4 * sprout, 2.4 * sprout + 0.5, 4.5 * sprout + 0.5, 0, 0, TAU); ctx.fill(); ctx.restore(); });
    } else {
      drawNode(TREE.root, cx, groundY, 0, trunkLen, 2 + 9 * g);
    }
  };

  /** Mount an animated tree in a canvas */
  V.mountTree = (cv, getP, opts) => V.animate(cv, (ctx, W, H, t) => { ctx.clearRect(0, 0, W, H); V.drawTree(ctx, W, H, typeof getP === 'function' ? getP() : getP, t, opts); });

  /* =========================================================================
     FLAT WORLD MAP — "The Flow" faith visualization
     ========================================================================= */
  const NODES = [
    { r: 'Africa', lon: 3.4, lat: 6.5 }, { r: 'Africa', lon: 36.8, lat: -1.3 }, { r: 'Africa', lon: 28, lat: -26 },
    { r: 'Europe', lon: 2.35, lat: 48.9 }, { r: 'Europe', lon: 13.4, lat: 52.5 }, { r: 'Europe', lon: -0.1, lat: 51.5 },
    { r: 'North America', lon: -74, lat: 40.7 }, { r: 'North America', lon: -118, lat: 34 }, { r: 'North America', lon: -79.4, lat: 43.7 },
    { r: 'South America', lon: -46.6, lat: -23.5 }, { r: 'South America', lon: -74, lat: 4.7 },
    { r: 'Asia', lon: 139.7, lat: 35.7 }, { r: 'Asia', lon: 77, lat: 28.6 }, { r: 'Asia', lon: 103.8, lat: 1.35 },
    { r: 'Middle East', lon: 55.3, lat: 25.2 }, { r: 'Middle East', lon: 46.7, lat: 24.7 },
    { r: 'Oceania', lon: 151, lat: -33.9 }
  ];
  const CENTER = { lon: 11.5, lat: 3.87 };
  const KINDS = ['Opportunity', 'Provision', 'Partnership', 'Client', 'Royalty', 'Business', 'Impact', 'Ideas', 'Products', 'Systems', 'Organizations', 'Generosity', 'Investments'];
  V.KINDS = KINDS;
  const REGIONS = ['Africa', 'Europe', 'North America', 'South America', 'Asia', 'Middle East', 'Oceania'];
  V.REGIONS = REGIONS;

  let LAND = null;
  function land() {
    if (LAND) return LAND;
    const Wd = M.WORLD; LAND = [];
    Wd.rows.forEach((hex, j) => {
      let bits = '';
      for (const ch of hex) bits += parseInt(ch, 16).toString(2).padStart(4, '0');
      for (let i = 0; i < Wd.w; i++) if (bits[i] === '1') LAND.push({ lon: -180 + (i + 0.5) * Wd.step, lat: Wd.lat0 - (j + 0.5) * Wd.step });
    });
    return LAND;
  }

  V.mountFlowMap = (cv, getIntensity) => {
    let dotLayer = null, dotKey = '';
    return V.animate(cv, (ctx, W, H, t) => {
      const I = U.clamp(typeof getIntensity === 'function' ? getIntensity() : 0.5, 0, 1);
      const px = (lon) => (lon + 180) / 360 * W;
      const py = (lat) => (84 - lat) / 156 * H;
      const key = W + 'x' + H + C.text;
      if (key !== dotKey) {
        dotKey = key; dotLayer = document.createElement('canvas');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        dotLayer.width = W * dpr; dotLayer.height = H * dpr;
        const d = dotLayer.getContext('2d'); d.scale(dpr, dpr);
        d.fillStyle = rgba(C.text, 0.2);
        const r = Math.max(0.7, W / 180 * 0.3);
        land().forEach((p) => { d.beginPath(); d.arc(px(p.lon), py(p.lat), r, 0, TAU); d.fill(); });
      }
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(dotLayer, 0, 0, W, H);
      const cx = px(CENTER.lon), cy = py(CENTER.lat);
      ctx.globalCompositeOperation = 'lighter';
      NODES.forEach((n, i) => {
        const x0 = px(n.lon), y0 = py(n.lat);
        const mx = (x0 + cx) / 2, my = (y0 + cy) / 2 - Math.hypot(cx - x0, cy - y0) * 0.28;
        const bez = (s) => [(1 - s) * (1 - s) * x0 + 2 * (1 - s) * s * mx + s * s * cx, (1 - s) * (1 - s) * y0 + 2 * (1 - s) * s * my + s * s * cy];
        // stream
        const gr = ctx.createLinearGradient(x0, y0, cx, cy);
        gr.addColorStop(0, rgba(C.accent, 0.05)); gr.addColorStop(1, rgba(C.accent, 0.15 + 0.35 * I));
        ctx.strokeStyle = gr; ctx.lineWidth = 0.8 + I * 1.4;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, cx, cy); ctx.stroke();
        // particles
        const count = 2 + Math.round(I * 5);
        for (let k = 0; k < count; k++) {
          const s = ((t * (0.05 + (i % 5) * 0.006)) + k / count + i * 0.13) % 1;
          const [x, y] = bez(s);
          const a = Math.sin(s * Math.PI) * (0.35 + 0.6 * I);
          ctx.fillStyle = rgba(C.accent, a * 0.25); ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
          ctx.fillStyle = rgba(C.accent, a); ctx.beginPath(); ctx.arc(x, y, 1.5, 0, TAU); ctx.fill();
        }
        // node
        const pulse = (Math.sin(t * 1.2 + i) + 1) / 2;
        ctx.fillStyle = rgba(C.accent, 0.5 + 0.4 * pulse * I); ctx.beginPath(); ctx.arc(x0, y0, 2.2, 0, TAU); ctx.fill();
      });
      // center
      const pr = 6 + (Math.sin(t * 1.4) + 1) * 4;
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40 + I * 40);
      rg.addColorStop(0, rgba(C.accent, 0.45 * (0.4 + I))); rg.addColorStop(1, rgba(C.accent, 0));
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, 40 + I * 40, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = rgba(C.accent, 0.7); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, pr, 0, TAU); ctx.stroke();
      ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, TAU); ctx.fill();
      // floating amounts: money from each region, in its own currency
      const fs = W < 520 ? 9 : 11;
      ctx.textAlign = 'center';
      const Vs = M.Vision;
      REGIONS.forEach((r, i) => {
        const cycle = Math.floor(t / 4 + i * 0.37), phase = (t / 4 + i * 0.37) % 1;
        const srcs = Vs ? Vs.SOURCES.filter((x) => x.region === r) : [];
        const src = srcs.length ? srcs[(cycle + i) % srcs.length] : null;
        const n = src ? { lon: src.lon, lat: src.lat } : NODES.find((x) => x.r === r);
        let label = KINDS[(cycle + i * 3) % KINDS.length].toUpperCase();
        if (src && Vs.rate() > 0) {
          const rr = U.rng(cycle * 31 + i * 7 + 1)();
          label = '+ ' + Vs.fmt(Vs.convert(Vs.rate() * 5 * 60000 * (0.4 + rr * 2), Vs.home(), src.cur), src.cur, true);
        }
        const a = Math.sin(phase * Math.PI) * 0.95;
        const x = px(n.lon), y = py(n.lat) - 8 - phase * 12;
        ctx.font = '700 ' + fs + 'px ' + uiFont();
        const w = ctx.measureText(label).width + 10;
        ctx.fillStyle = rgba(C.bg, a * 0.6); ctx.fillRect(x - w / 2, y - fs, w, fs + 5);
        ctx.fillStyle = rgba(C.accent, a); ctx.fillText(label, x, y);
        if (src && W > 520) { ctx.fillStyle = rgba(C.text, a * 0.7); ctx.font = '600 ' + (fs - 2) + 'px ' + uiFont(); ctx.fillText(src.city.toUpperCase(), x, y + fs + 2); }
      });
    });
  };

  /* =========================================================================
     RIVER — "Provision & Opportunity" flowing water visual
     ========================================================================= */
  const BRANCHES = ['Business', 'Clients', 'Ideas', 'Partnerships', 'Products', 'Systems', 'Investments', 'Opportunities', 'Impact', 'Generosity'];
  V.mountRiver = (cv, getIntensity) => {
    const parts = [];
    for (let i = 0; i < 160; i++) parts.push({ u: Math.random(), o: Math.random() * 2 - 1, b: Math.floor(Math.random() * BRANCHES.length), s: 0.03 + Math.random() * 0.04 });
    let lastT = 0;
    return V.animate(cv, (ctx, W, H, t) => {
      const I = U.clamp(typeof getIntensity === 'function' ? getIntensity() : 0.5, 0, 1);
      const dt = Math.min(0.1, Math.max(0, t - lastT)); lastT = t;
      ctx.clearRect(0, 0, W, H);
      const top = H * 0.1, split = H * 0.52, bottom = H * 0.84;
      const midX = (y) => W / 2 + Math.sin(y / H * 5.5) * W * 0.035;
      const width = (y) => 2 + (y - top) / (split - top) * W * 0.07;
      // horizon glow
      const hg = ctx.createRadialGradient(W / 2, top, 0, W / 2, top, W * 0.45);
      hg.addColorStop(0, rgba(C.accent, 0.35 + 0.35 * I)); hg.addColorStop(1, rgba(C.accent, 0));
      ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H * 0.6);
      ctx.strokeStyle = rgba(C.text, 0.12); ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(W, top); ctx.stroke();
      // river body
      ctx.beginPath();
      for (let y = top; y <= split; y += 4) ctx.lineTo(midX(y) - width(y), y);
      for (let y = split; y >= top; y -= 4) ctx.lineTo(midX(y) + width(y), y);
      const rb = ctx.createLinearGradient(0, top, 0, split);
      rb.addColorStop(0, rgba(C.accent, 0.5 * (0.4 + I))); rb.addColorStop(1, rgba(C.accent, 0.12 + 0.18 * I));
      ctx.fillStyle = rb; ctx.fill();
      // branches
      const sx = midX(split);
      const ends = BRANCHES.map((b, i) => ({ x: W * (0.06 + 0.88 * i / (BRANCHES.length - 1)), y: bottom }));
      const bez = (e, s) => {
        const cx1 = sx, cy1 = split + (bottom - split) * 0.55;
        return [(1 - s) * (1 - s) * sx + 2 * (1 - s) * s * cx1 + s * s * e.x, (1 - s) * (1 - s) * split + 2 * (1 - s) * s * cy1 + s * s * e.y];
      };
      ends.forEach((e) => {
        ctx.strokeStyle = rgba(C.accent, 0.12 + 0.3 * I); ctx.lineWidth = 1 + I * 2.2;
        ctx.beginPath(); ctx.moveTo(sx, split); ctx.quadraticCurveTo(sx, split + (bottom - split) * 0.55, e.x, e.y); ctx.stroke();
        ctx.fillStyle = rgba(C.accent, 0.5 + 0.5 * I); ctx.beginPath(); ctx.arc(e.x, e.y, 2.5, 0, TAU); ctx.fill();
      });
      // particles
      ctx.globalCompositeOperation = 'lighter';
      const n = Math.round(40 + I * 120);
      for (let i = 0; i < n; i++) {
        const p = parts[i];
        p.u += p.s * dt * (0.6 + I);
        if (p.u > 1) { p.u = 0; p.b = Math.floor(Math.random() * BRANCHES.length); p.o = Math.random() * 2 - 1; }
        let x, y;
        if (p.u < 0.55) { const s = p.u / 0.55; y = top + (split - top) * s; x = midX(y) + p.o * width(y) * 0.8; }
        else { const s = (p.u - 0.55) / 0.45; [x, y] = bez(ends[p.b], s); }
        const a = (0.3 + 0.7 * I) * Math.min(1, p.u * 8, (1 - p.u) * 6);
        ctx.fillStyle = rgba(C.accent, a * 0.2); ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill();
        ctx.fillStyle = rgba(C.text, a * 0.9); ctx.beginPath(); ctx.arc(x, y, 1.1, 0, TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      // labels
      const narrow = W < 640;
      ctx.font = '600 ' + (narrow ? 8.5 : 10.5) + 'px ' + uiFont();
      ctx.textAlign = 'center'; ctx.fillStyle = rgba(C.text, 0.8);
      ends.forEach((e, i) => ctx.fillText(BRANCHES[i].toUpperCase(), e.x, e.y + (narrow && i % 2 ? 30 : 18)));
    });
  };

  /* =========================================================================
     GLOBE — immersive global flow (full screen)
     ========================================================================= */
  function vec(lon, lat) { const a = lon * Math.PI / 180, b = lat * Math.PI / 180; return [Math.cos(b) * Math.cos(a), Math.cos(b) * Math.sin(a), Math.sin(b)]; }
  function toLL(v) { return [Math.atan2(v[1], v[0]) * 180 / Math.PI, Math.asin(U.clamp(v[2], -1, 1)) * 180 / Math.PI]; }
  function slerp(a, b, t) {
    const d = U.clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1); const om = Math.acos(d);
    if (om < 1e-4) return a;
    const s1 = Math.sin((1 - t) * om) / Math.sin(om), s2 = Math.sin(t * om) / Math.sin(om);
    return [a[0] * s1 + b[0] * s2, a[1] * s1 + b[1] * s2, a[2] * s1 + b[2] * s2];
  }
  V.drawGlobe = (ctx, W, H, t, I) => {
    ctx.fillStyle = '#04060c'; ctx.fillRect(0, 0, W, H);
    const R = Math.min(W, H) * 0.34, cx = W / 2, cy = H * 0.46;
    const lon0 = CENTER.lon + Math.sin(t * 0.06) * 55, lat0 = 12 * Math.PI / 180;
    const proj = (lon, lat, alt = 0) => {
      const l = (lon - lon0) * Math.PI / 180, b = lat * Math.PI / 180;
      const cosc = Math.sin(lat0) * Math.sin(b) + Math.cos(lat0) * Math.cos(b) * Math.cos(l);
      const r = R * (1 + alt);
      return { x: cx + r * Math.cos(b) * Math.sin(l), y: cy - r * (Math.cos(lat0) * Math.sin(b) - Math.sin(lat0) * Math.cos(b) * Math.cos(l)), z: cosc };
    };
    // atmosphere
    const at = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.5);
    at.addColorStop(0, rgba(C.accent, 0.18 + 0.12 * I)); at.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = at; ctx.beginPath(); ctx.arc(cx, cy, R * 1.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#070b16'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    // land dots
    land().forEach((p) => { const q = proj(p.lon, p.lat); if (q.z <= 0) return; ctx.fillStyle = 'rgba(210,220,240,' + (0.08 + q.z * 0.35) + ')'; ctx.fillRect(q.x - 0.9, q.y - 0.9, 1.8, 1.8); });
    // arcs
    const cv = vec(CENTER.lon, CENTER.lat);
    ctx.globalCompositeOperation = 'lighter';
    NODES.forEach((n, i) => {
      const a = vec(n.lon, n.lat);
      ctx.strokeStyle = rgba(C.accent, 0.12 + 0.25 * I); ctx.lineWidth = 1;
      ctx.beginPath(); let started = false;
      for (let k = 0; k <= 40; k++) {
        const s = k / 40; const ll = toLL(slerp(a, cv, s)); const q = proj(ll[0], ll[1], Math.sin(s * Math.PI) * 0.18);
        if (q.z > -0.15) { if (!started) { ctx.moveTo(q.x, q.y); started = true; } else ctx.lineTo(q.x, q.y); } else started = false;
      }
      ctx.stroke();
      for (let k = 0; k < 3; k++) {
        const s = ((t * 0.07 + k / 3 + i * 0.11) % 1);
        const ll = toLL(slerp(a, cv, s)); const q = proj(ll[0], ll[1], Math.sin(s * Math.PI) * 0.18);
        if (q.z < -0.15) continue;
        const al = Math.sin(s * Math.PI);
        ctx.fillStyle = rgba(C.accent, 0.25 * al); ctx.beginPath(); ctx.arc(q.x, q.y, 6, 0, TAU); ctx.fill();
        ctx.fillStyle = rgba('#ffffff', 0.9 * al); ctx.beginPath(); ctx.arc(q.x, q.y, 1.4, 0, TAU); ctx.fill();
      }
    });
    const c = proj(CENTER.lon, CENTER.lat);
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 50);
    g.addColorStop(0, rgba(C.accent, 0.8)); g.addColorStop(1, rgba(C.accent, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, 50, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // drifting motes
    for (let i = 0; i < 60; i++) {
      const x = (i * 97.3 + t * (4 + i % 5)) % W, y = (i * 53.7 + Math.sin(t * 0.2 + i) * 20 + H) % H;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.05 + (i % 7) * 0.02) + ')'; ctx.fillRect(x, y, 1.2, 1.2);
    }
  };

  /* ---------------- fullscreen helpers ---------------- */
  function overlay(cls, html) {
    const el = document.createElement('div');
    el.className = 'cinema ' + cls;
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = html;
    document.body.appendChild(el);
    document.body.classList.add('cinema-open');
    requestAnimationFrame(() => el.classList.add('in'));
    const close = () => { el.classList.remove('in'); document.body.classList.remove('cinema-open'); setTimeout(() => el.remove(), 500); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
    el._close = close;
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    return el;
  }
  V.requestFullscreen = (el) => { try { if (el.requestFullscreen) el.requestFullscreen().catch(() => {}); } catch (e) { /* optional */ } };

  /* ---------------- Global Flow (text sequence over globe) ---------------- */
  const FLOW_LINES = ['I am not chasing money.', 'I am pursuing God.', 'I am seeking wisdom.', 'I am walking in purpose.', 'I trust God for provision.', 'I have time for what matters.'];
  V.openGlobalFlow = () => {
    const I = M.Goals.progress().pct;
    const el = overlay('globe-mode', `<canvas class="cinema-canvas" aria-hidden="true"></canvas>
      <p class="cinema-badge">Vision account</p>
      <div class="globe-va"><p class="globe-va-amt tnum" data-vision-total>${U.esc(M.Vision.fmt(M.Vision.value(), M.Vision.home()))}</p><div class="va-live" aria-live="off"></div></div>
      <div class="cinema-lines" aria-live="polite"></div>
      <div class="cinema-bar"><button class="btn ghost light" data-fs>${U.icon('expand')} Full screen</button><button class="btn ghost light" data-x>${U.icon('x')} Close</button></div>`);
    V.animate(el.querySelector('canvas'), (ctx, W, H, t) => V.drawGlobe(ctx, W, H, t, 0.35 + I * 0.65));
    const lines = el.querySelector('.cinema-lines');
    let i = 0; const rm = U.reducedMotion();
    const step = () => {
      if (!el.isConnected) return;
      if (rm) { lines.innerHTML = FLOW_LINES.map((l) => `<p class="cinema-line on">${l}</p>`).join(''); return; }
      lines.innerHTML = `<p class="cinema-line">${FLOW_LINES[i % FLOW_LINES.length]}</p>`;
      requestAnimationFrame(() => requestAnimationFrame(() => { const p = lines.firstChild; if (p) p.classList.add('on'); }));
      i++; setTimeout(step, 4200);
    };
    step();
    el.querySelector('[data-x]').onclick = el._close;
    el.querySelector('[data-fs]').onclick = () => V.requestFullscreen(el);
    el.tabIndex = -1; el.focus();
  };

  /* ---------------- Vision Mode ---------------- */
  const SCENES = [
    { icon: 'pray', msg: 'Imagine having time to seek God without constantly watching the clock.' },
    { icon: 'seed', msg: 'Imagine building what you were called to build.' },
    { icon: 'moon', msg: 'Imagine having systems that continue working while you sleep.' },
    { icon: 'sparkle', msg: 'Imagine creating impact without being enslaved to money.' },
    { icon: 'family', msg: 'Imagine having time for family.' },
    { icon: 'book', msg: 'Imagine having time for prayer.' },
    { icon: 'journal', msg: 'Imagine having time to teach.' },
    { icon: 'edit', msg: 'Imagine having time to create.' },
    { icon: 'hands', msg: 'Imagine having time to serve.' },
    { icon: 'sun', msg: 'Imagine having time to rest.' }
  ];
  V.openVision = () => {
    const el = overlay('vision-mode', `<canvas class="cinema-canvas" aria-hidden="true"></canvas>
      <p class="cinema-badge">Vision mode</p>
      <div class="vision-stage" aria-live="polite"></div>
      <div class="vision-dots" role="tablist" aria-label="Scenes">${SCENES.map((s, i) => `<button class="vdot" data-v="${i}" aria-label="Scene ${i + 1}"></button>`).join('')}</div>
      <div class="cinema-bar">
        <button class="icon-btn light" data-prev aria-label="Previous">${U.icon('left')}</button>
        <button class="icon-btn light" data-pause aria-label="Pause">${U.icon('pause')}</button>
        <button class="icon-btn light" data-next aria-label="Next">${U.icon('right')}</button>
        <button class="btn ghost light" data-fs>${U.icon('expand')} Full screen</button>
        <button class="btn ghost light" data-x>${U.icon('x')} Close</button></div>`);
    let i = 0, paused = false, timer = null;
    V.animate(el.querySelector('canvas'), (ctx, W, H, t) => {
      const g = ctx.createLinearGradient(0, 0, W, H);
      const hue = (i * 23) % 360;
      g.addColorStop(0, 'hsl(' + (220 + hue * 0.1) + ',45%,6%)'); g.addColorStop(1, 'hsl(' + (240 + hue * 0.15) + ',40%,11%)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const rg = ctx.createRadialGradient(W / 2, H * 0.38, 0, W / 2, H * 0.38, Math.max(W, H) * 0.5);
      rg.addColorStop(0, rgba(C.accent, 0.22 + Math.sin(t * 0.5) * 0.04)); rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      for (let k = 0; k < 70; k++) {
        const x = (k * 131.7 + Math.sin(t * 0.1 + k) * 30) % W, y = (H - ((t * (6 + k % 6) + k * 71) % (H + 20)));
        ctx.fillStyle = rgba(C.accent, 0.1 + (k % 5) * 0.05); ctx.beginPath(); ctx.arc(x, y, 0.8 + (k % 3) * 0.6, 0, TAU); ctx.fill();
      }
    });
    const stage = el.querySelector('.vision-stage');
    const show = (n) => {
      i = (n + SCENES.length) % SCENES.length;
      const s = SCENES[i];
      stage.innerHTML = `<div class="vision-scene"><div class="vision-icon">${U.icon(s.icon, 'draw')}</div><p class="vision-msg">${s.msg}</p></div>`;
      requestAnimationFrame(() => requestAnimationFrame(() => stage.firstChild && stage.firstChild.classList.add('on')));
      el.querySelectorAll('.vdot').forEach((d, j) => d.classList.toggle('on', i === j));
      clearTimeout(timer); if (!paused) timer = setTimeout(() => show(i + 1), 7000);
    };
    show(0);
    el.querySelector('[data-prev]').onclick = () => show(i - 1);
    el.querySelector('[data-next]').onclick = () => show(i + 1);
    el.querySelector('[data-pause]').onclick = (e) => { paused = !paused; e.currentTarget.innerHTML = U.icon(paused ? 'play' : 'pause'); e.currentTarget.setAttribute('aria-label', paused ? 'Play' : 'Pause'); show(i); };
    el.querySelectorAll('.vdot').forEach((d) => d.onclick = () => show(+d.dataset.v));
    el.querySelector('[data-x]').onclick = () => { clearTimeout(timer); el._close(); };
    el.querySelector('[data-fs]').onclick = () => V.requestFullscreen(el);
    el.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') show(i + 1); if (e.key === 'ArrowLeft') show(i - 1); });
    el.tabIndex = -1; el.focus();
  };

  /* ---------------- Milestone celebration ---------------- */
  V.celebrate = (label, message, pct) => {
    const el = overlay('celebrate', `<canvas class="cinema-canvas" aria-hidden="true"></canvas>
      <div class="celebrate-card">
        <p class="kind">Milestone</p>
        <p class="celebrate-num">${U.esc(label)}</p>
        <p class="celebrate-msg">${U.esc(message)}</p>
        <canvas class="celebrate-tree" aria-label="Your faith journey tree"></canvas>
        <p class="muted small">${U.esc(V.stage(pct).name)} · your faith journey</p>
        <button class="btn primary" data-x>Continue</button>
      </div>`);
    V.animate(el.querySelector('.cinema-canvas'), (ctx, W, H, t) => {
      ctx.clearRect(0, 0, W, H);
      for (let k = 0; k < 90; k++) {
        const x = (k * 77.7) % W + Math.sin(t + k) * 8, y = H - ((t * (20 + k % 9 * 6) + k * 37) % (H + 40));
        ctx.fillStyle = rgba(C.accent, 0.15 + (k % 4) * 0.12); ctx.beginPath(); ctx.arc(x, y, 1 + (k % 3), 0, TAU); ctx.fill();
      }
    });
    const tc = el.querySelector('.celebrate-tree');
    const t0 = performance.now();
    V.animate(tc, (ctx, W, H, t) => { ctx.clearRect(0, 0, W, H); const k = Math.min(1, (performance.now() - t0) / 2500); V.drawTree(ctx, W, H, pct * (0.85 + 0.15 * ease(k)), t, { glow: 0.3 }); });
    el.querySelector('[data-x]').onclick = el._close;
    setTimeout(() => el.querySelector('[data-x]').focus(), 50);
  };

  /* ---------------- 58-hour completion experience ---------------- */
  V.completion = (goal) => {
    const hrs = goal && goal.unit === 'hours' ? goal.target : null;
    const el = overlay('completion', `<canvas class="cinema-canvas" aria-hidden="true"></canvas>
      <div class="completion-text" aria-live="polite">
        <p class="completion-big" data-c="1">${hrs ? hrs + ' HOURS' : U.esc(goal ? goal.name : 'Journey')}</p>
        <p class="completion-sown" data-c="2">SOWN.</p>
        <p class="completion-line" data-c="3">You stayed with the journey.</p>
        <p class="completion-line" data-c="4">The goal was never merely the number.</p>
        <ul class="completion-list">
          ${['Seek God.', 'Receive wisdom.', 'Walk in purpose.', 'Do what He tells you.', 'Build what you are called to build.', 'Let your life become fruitful.'].map((l, i) => `<li data-c="${5 + i}">${l}</li>`).join('')}
        </ul>
        <button class="btn primary lg" data-c="11" data-continue>Continue the journey</button>
      </div>
      <button class="btn ghost light cinema-skip" data-skip>Skip</button>`);
    const t0 = performance.now();
    const rm = U.reducedMotion();
    const DUR = 9000;
    V.animate(el.querySelector('canvas'), (ctx, W, H) => {
      const e = rm ? 99999 : performance.now() - t0;
      ctx.fillStyle = '#03050a'; ctx.fillRect(0, 0, W, H);
      const p = ease(U.clamp((e - 800) / DUR, 0, 1));
      const light = U.clamp((e - DUR) / 2500, 0, 1);
      // rays
      if (light > 0) {
        ctx.save(); ctx.translate(W / 2, H * 0.4); ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 14; k++) {
          ctx.rotate(TAU / 14 + e / 90000);
          const g = ctx.createLinearGradient(0, 0, 0, -Math.max(W, H));
          g.addColorStop(0, rgba(C.accent, 0.08 * light)); g.addColorStop(1, rgba(C.accent, 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-60, -Math.max(W, H)); ctx.lineTo(60, -Math.max(W, H)); ctx.lineTo(8, 0); ctx.fill();
        }
        ctx.restore();
      }
      const th = Math.min(H * 0.62, W * 0.9);
      ctx.save(); ctx.translate(0, H * 0.02);
      V.drawTree(ctx, W, th, Math.max(0.0001, p), e / 1000, { glow: light, groundY: 0.86 });
      ctx.restore();
      // water flowing around the base
      const water = U.clamp((e - DUR - 1000) / 3000, 0, 1);
      if (water > 0) {
        const gy = th * 0.86 + H * 0.02;
        for (let k = 0; k < 5; k++) {
          const ph = ((e / 4000) + k / 5) % 1;
          ctx.strokeStyle = rgba(C.accent, (1 - ph) * 0.5 * water); ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.ellipse(W / 2, gy + 4, 20 + ph * W * 0.35, 3 + ph * 16, 0, 0, TAU); ctx.stroke();
        }
      }
    });
    const times = rm ? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] : [11500, 12600, 14500, 16800, 19200, 20600, 22000, 23400, 24800, 26200, 28000];
    const tids = times.map((ms, i) => setTimeout(() => { const n = el.querySelector('[data-c="' + (i + 1) + '"]'); if (n) n.classList.add('on'); }, ms));
    const finish = () => { tids.forEach(clearTimeout); el.querySelectorAll('[data-c]').forEach((n) => n.classList.add('on')); };
    el.querySelector('[data-skip]').onclick = () => { finish(); };
    el.querySelector('[data-continue]').onclick = () => { el._close(); M.App.go('goals'); setTimeout(() => M.Goals.editor({ name: '100 Hours of Prayer', unit: 'hours', target: 100, dailyTargetMin: 120, theme: 'Prayer' }, true), 350); };
    el.tabIndex = -1; el.focus();
  };

  M.Viz = V;
})(window.MDT = window.MDT || {});
