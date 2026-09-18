/* ============================================================
   BOOM!! — Motor de Som (Web Audio API)
   Gera todos os efeitos por síntese. Sem MP3s!
   ============================================================ */
(function () {
  const Sound = {
    ctx: null,
    masterGain: null,
    enabled: true,
    volume: 0.7,
    fuseNode: null,
    fuseGain: null,
    _initialized: false,

    init() {
      if (this._initialized) return;
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new Ctx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.enabled ? this.volume : 0;
        this.masterGain.connect(this.ctx.destination);
        this._initialized = true;
      } catch (e) { console.warn('Web Audio não suportado:', e); }
    },

    // Desbloqueia o áudio em navegadores que exigem interação (iOS/Safari)
    unlock() {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    setVolume(v) {
      this.volume = Math.max(0, Math.min(1, v));
      if (this.masterGain) this.masterGain.gain.value = this.enabled ? this.volume : 0;
    },
    setEnabled(on) {
      this.enabled = !!on;
      if (this.masterGain) this.masterGain.gain.value = this.enabled ? this.volume : 0;
    },

    _noiseBuffer(duration = 1) {
      const sr = this.ctx.sampleRate;
      const len = Math.floor(sr * duration);
      const buf = this.ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      return buf;
    },

    /* ---------- Clique do isqueiro (curto, "tssk") ---------- */
    lighterClick() {
      if (!this.enabled) return;
      this.init();
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this._noiseBuffer(0.08);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2400;
      filter.Q.value = 1.4;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.55, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      src.connect(filter).connect(g).connect(this.masterGain);
      src.start(t); src.stop(t + 0.1);
    },

    /* ---------- Pavio queimando (loop) ---------- */
    startFuse() {
      if (!this.enabled) return;
      this.init();
      if (this.fuseNode) return;
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this._noiseBuffer(2);
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1600;
      const filter2 = this.ctx.createBiquadFilter();
      filter2.type = 'bandpass';
      filter2.frequency.value = 3200;
      filter2.Q.value = 0.9;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.2);
      src.connect(filter).connect(filter2).connect(g).connect(this.masterGain);
      src.start(t);
      this.fuseNode = src;
      this.fuseGain = g;

      // "Estalos" esporádicos para dar textura de pavio real
      this._crackleTimer = setInterval(() => {
        if (!this.fuseNode) return;
        const tc = this.ctx.currentTime;
        const cr = this.ctx.createBufferSource();
        cr.buffer = this._noiseBuffer(0.03);
        const f = this.ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 1800 + Math.random() * 2200;
        const gg = this.ctx.createGain();
        gg.gain.setValueAtTime(0.28, tc);
        gg.gain.exponentialRampToValueAtTime(0.0001, tc + 0.03);
        cr.connect(f).connect(gg).connect(this.masterGain);
        cr.start(tc); cr.stop(tc + 0.04);
      }, 110 + Math.random() * 90);
    },

    stopFuse() {
      if (this._crackleTimer) { clearInterval(this._crackleTimer); this._crackleTimer = null; }
      if (this.fuseNode) {
        try {
          const t = this.ctx.currentTime;
          this.fuseGain.gain.cancelScheduledValues(t);
          this.fuseGain.gain.setValueAtTime(this.fuseGain.gain.value, t);
          this.fuseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
          this.fuseNode.stop(t + 0.15);
        } catch(e){}
        this.fuseNode = null; this.fuseGain = null;
      }
    },

    /* ---------- Explosão de bomba 💥 ---------- */
    explosion() {
      if (!this.enabled) return;
      this.init();
      const t = this.ctx.currentTime;

      // 1) Boom grave (sub-bass)
      const boom = this.ctx.createOscillator();
      boom.type = 'sine';
      boom.frequency.setValueAtTime(90, t);
      boom.frequency.exponentialRampToValueAtTime(28, t + 0.55);
      const boomGain = this.ctx.createGain();
      boomGain.gain.setValueAtTime(0.0001, t);
      boomGain.gain.exponentialRampToValueAtTime(1.1, t + 0.02);
      boomGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      boom.connect(boomGain).connect(this.masterGain);
      boom.start(t); boom.stop(t + 1);

      // 2) Estalo médio (thump)
      const thump = this.ctx.createOscillator();
      thump.type = 'triangle';
      thump.frequency.setValueAtTime(180, t);
      thump.frequency.exponentialRampToValueAtTime(60, t + 0.25);
      const tG = this.ctx.createGain();
      tG.gain.setValueAtTime(0.0001, t);
      tG.gain.exponentialRampToValueAtTime(0.55, t + 0.01);
      tG.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      thump.connect(tG).connect(this.masterGain);
      thump.start(t); thump.stop(t + 0.4);

      // 3) Ruído de impacto (blasto)
      const noise = this.ctx.createBufferSource();
      noise.buffer = this._noiseBuffer(1.6);
      const nf = this.ctx.createBiquadFilter();
      nf.type = 'lowpass';
      nf.frequency.setValueAtTime(4200, t);
      nf.frequency.exponentialRampToValueAtTime(180, t + 1.3);
      const nG = this.ctx.createGain();
      nG.gain.setValueAtTime(0.0001, t);
      nG.gain.exponentialRampToValueAtTime(0.9, t + 0.02);
      nG.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      noise.connect(nf).connect(nG).connect(this.masterGain);
      noise.start(t); noise.stop(t + 1.6);

      // 4) Estilhaços (tinkle agudo descendo)
      const shard = this.ctx.createBufferSource();
      shard.buffer = this._noiseBuffer(0.6);
      const sf = this.ctx.createBiquadFilter();
      sf.type = 'highpass';
      sf.frequency.setValueAtTime(2500, t + 0.05);
      sf.frequency.exponentialRampToValueAtTime(600, t + 0.5);
      const sG = this.ctx.createGain();
      sG.gain.setValueAtTime(0.0001, t + 0.05);
      sG.gain.exponentialRampToValueAtTime(0.28, t + 0.1);
      sG.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
      shard.connect(sf).connect(sG).connect(this.masterGain);
      shard.start(t + 0.05); shard.stop(t + 0.7);
    },

    /* ---------- Acerto (chime ascendente) ---------- */
    correct() {
      if (!this.enabled) return;
      this.init();
      const t = this.ctx.currentTime;
      const notes = [660, 880, 1320];
      notes.forEach((freq, i) => {
        const o = this.ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = freq;
        const g = this.ctx.createGain();
        const start = t + i * 0.09;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
        o.connect(g).connect(this.masterGain);
        o.start(start); o.stop(start + 0.4);
      });
    },

    /* ---------- Erro (buzz descendente) ---------- */
    error() {
      if (!this.enabled) return;
      this.init();
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(240, t);
      o.frequency.exponentialRampToValueAtTime(110, t + 0.35);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(this.masterGain);
      o.start(t); o.stop(t + 0.55);
    },

    /* ---------- Tique do cronômetro ---------- */
    tick(urgent = false) {
      if (!this.enabled) return;
      this.init();
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = urgent ? 1600 : 1000;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(urgent ? 0.18 : 0.08, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      o.connect(g).connect(this.masterGain);
      o.start(t); o.stop(t + 0.08);
    },

    /* ---------- Vitória (fanfarra simples) ---------- */
    victory() {
      if (!this.enabled) return;
      this.init();
      const t = this.ctx.currentTime;
      const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        const o = this.ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = freq;
        const g = this.ctx.createGain();
        const start = t + i * 0.14;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);
        o.connect(g).connect(this.masterGain);
        o.start(start); o.stop(start + 0.6);
      });
    },

    /* ---------- Derrota (notas descendentes) ---------- */
    defeat() {
      if (!this.enabled) return;
      this.init();
      const t = this.ctx.currentTime;
      const notes = [440, 370, 294, 220];
      notes.forEach((freq, i) => {
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = freq;
        const g = this.ctx.createGain();
        const start = t + i * 0.16;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.3, start + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
        o.connect(g).connect(this.masterGain);
        o.start(start); o.stop(start + 0.45);
      });
    }
  };

  window.BoomSound = Sound;
})();