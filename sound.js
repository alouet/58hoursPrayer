/* ==========================================================================
   sound.js — optional ambient sound, synthesized with Web Audio (no files,
   works offline). Never autoplays: only starts from a user action.
   ========================================================================== */
(function (M) {
  'use strict';
  let ctx = null, master = null, nodes = [], timers = [], current = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function noise(type) {
    const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else if (type === 'pink') { last = 0.97 * last + 0.03 * w; d[i] = last * 4 + w * 0.08; }
      else d[i] = w;
    }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; return src;
  }
  function filt(type, f, q = 0.7) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  function gain(v) { const g = ctx.createGain(); g.gain.value = v; return g; }
  function chain(...n) { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n; }
  function track(...n) { nodes.push(...n); }
  function every(ms, fn) { const id = setInterval(fn, ms); timers.push(id); }

  const RECIPES = {
    rain() {
      const n = noise('white'); const f = filt('bandpass', 1800, 0.4); const g = gain(0.22);
      chain(n, f, g, master); n.start(); track(n, f, g);
      const n2 = noise('pink'); const f2 = filt('lowpass', 500); const g2 = gain(0.25);
      chain(n2, f2, g2, master); n2.start(); track(n2, f2, g2);
    },
    ocean() {
      const n = noise('pink'); const f = filt('lowpass', 700); const g = gain(0.1);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09; const lg = gain(0.25);
      lfo.connect(lg); lg.connect(g.gain); chain(n, f, g, master); n.start(); lfo.start(); track(n, f, g, lfo, lg);
    },
    fireplace() {
      const n = noise('brown'); const f = filt('lowpass', 400); const g = gain(0.35);
      chain(n, f, g, master); n.start(); track(n, f, g);
      every(90, () => {
        if (Math.random() > 0.35) return;
        const o = noise('white'); const bf = filt('highpass', 1500 + Math.random() * 2500); const eg = gain(0);
        chain(o, bf, eg, master); const t = ctx.currentTime;
        eg.gain.setValueAtTime(0.0, t); eg.gain.linearRampToValueAtTime(0.25 * Math.random(), t + 0.004); eg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        o.start(t); o.stop(t + 0.06);
      });
    },
    forest() {
      const n = noise('pink'); const f = filt('bandpass', 900, 0.3); const g = gain(0.06);
      chain(n, f, g, master); n.start(); track(n, f, g);
      every(1400, () => {
        if (Math.random() > 0.45) return;
        const t = ctx.currentTime; const o = ctx.createOscillator(); const eg = gain(0);
        const base = 2200 + Math.random() * 1800; o.frequency.setValueAtTime(base, t); o.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.4), t + 0.12);
        chain(o, eg, master); eg.gain.linearRampToValueAtTime(0.035, t + 0.02); eg.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        o.start(t); o.stop(t + 0.2);
      });
    },
    ambience() {
      [110, 164.8, 220, 277.2].forEach((fq, i) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fq; o.detune.value = (i - 1.5) * 4;
        const g = gain(0.05 / (i + 1)); const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + i * 0.03; const lg = gain(0.02 / (i + 1));
        lfo.connect(lg); lg.connect(g.gain); chain(o, g, master); o.start(); lfo.start(); track(o, g, lfo, lg);
      });
    }
  };

  const Sound = {
    OPTIONS: [['silent', 'Silent'], ['rain', 'Rain'], ['ocean', 'Ocean'], ['fireplace', 'Fireplace'], ['forest', 'Forest'], ['ambience', 'Soft ambience']],
    get playing() { return !!current; },
    get current() { return current; },
    play(kind) {
      if (!kind || kind === 'silent' || !RECIPES[kind]) { Sound.stop(); return; }
      if (!ensure()) return;
      Sound.stop(true);
      RECIPES[kind](); current = kind;
      const v = M.state ? M.state.settings.volume : 0.5;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(v, ctx.currentTime + 1.5);
    },
    stop(immediate) {
      timers.forEach(clearInterval); timers = [];
      if (!ctx) { current = null; return; }
      const old = nodes; nodes = [];
      const t = ctx.currentTime;
      if (!immediate) { master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + 0.8); }
      else master.gain.value = 0;
      setTimeout(() => old.forEach((n) => { try { n.stop && n.stop(); } catch (e) { /* already stopped */ } try { n.disconnect(); } catch (e) { /* ignore */ } }), immediate ? 0 : 900);
      current = null;
    },
    setVolume(v) { if (ctx && current) master.gain.setTargetAtTime(v, ctx.currentTime, 0.2); },
    /** soft two-note chime (meditation complete) */
    chime() {
      if (!ensure()) return;
      [659.25, 987.77].forEach((f, i) => {
        const t = ctx.currentTime + i * 0.35; const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
        o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 2.3);
      });
    }
  };

  M.Sound = Sound;
})(window.MDT = window.MDT || {});
