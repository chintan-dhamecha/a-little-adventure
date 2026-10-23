/* =============================================================
   lofi.js — a soft, endless lofi loop generated live with the
   Web Audio API (no audio file to download or license).
   Mellow jazzy chords, a round bass, a lazy swung beat and a
   little vinyl crackle, all through a warm low-pass filter.

   game.js drives it through window.Lofi:
     Lofi.start()   — begin / resume (must follow a tap or key press)
     Lofi.pause()   — fade out and suspend
   ============================================================= */
(function () {
  'use strict';

  const BPM = 72;
  const BEAT = 60 / BPM;
  const VOLUME = 0.32;

  // Fmaj7 → Em7 → Dm7 → Cmaj7, one bar each (MIDI note numbers).
  const PROGRESSION = [
    { bass: 41, chord: [57, 60, 64, 65] },
    { bass: 40, chord: [55, 59, 62, 64] },
    { bass: 38, chord: [57, 60, 62, 65] },
    { bass: 36, chord: [55, 59, 60, 64] },
  ];
  const MELODY_SCALE = [72, 74, 76, 79, 81, 84]; // C major pentatonic, up high

  let ctx = null;
  let master = null;
  let noiseBuf = null;
  let crackle = null;
  let timer = null;
  let nextBeatTime = 0;
  let beatIndex = 0;
  let playing = false;

  const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function setup() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    const warmth = ctx.createBiquadFilter();
    warmth.type = 'lowpass';
    warmth.frequency.value = 1700;
    warmth.Q.value = 0.4;

    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(warmth).connect(ctx.destination);

    // One second of white noise, reused for drums and crackle.
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    startCrackle();
  }

  // Vinyl: quiet hiss plus random little pops.
  function startCrackle() {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * 0.012;
      if (Math.random() < 0.0004) d[i] += (Math.random() * 2 - 1) * 0.5;
    }
    crackle = ctx.createBufferSource();
    crackle.buffer = buf;
    crackle.loop = true;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    crackle.connect(g).connect(master);
    crackle.start();
  }

  function note(midi, time, dur, type, vol, attack) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = midiToFreq(midi);
    osc.detune.value = Math.random() * 10 - 5; // slightly "tape-wobbly"
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(vol, time + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g).connect(master);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  function kick(time) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(110, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.18);
    g.gain.setValueAtTime(0.55, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);
    osc.connect(g).connect(master);
    osc.start(time);
    osc.stop(time + 0.4);
  }

  function noiseHit(time, dur, vol, filterType, freq) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(f).connect(g).connect(master);
    src.start(time, Math.random() * 0.5);
    src.stop(time + dur + 0.02);
  }

  function scheduleBeat(i, time) {
    const beatInBar = i % 4;
    const bar = PROGRESSION[Math.floor(i / 4) % PROGRESSION.length];
    const swing = BEAT * 0.58; // lazy, behind-the-beat off-eighth

    if (beatInBar === 0) {
      bar.chord.forEach((m, k) => note(m, time + k * 0.025, BEAT * 3.9, 'triangle', 0.045, 0.08));
      note(bar.bass, time, BEAT * 1.8, 'sine', 0.22, 0.02);
    }
    if (beatInBar === 2) note(bar.bass + 7, time, BEAT * 1.5, 'sine', 0.15, 0.02);

    if (beatInBar === 0 || (beatInBar === 2 && Math.random() < 0.5)) kick(time);
    if (beatInBar === 2 && Math.random() < 0.35) kick(time + swing);
    if (beatInBar === 1 || beatInBar === 3) noiseHit(time, 0.18, 0.12, 'bandpass', 1800);

    noiseHit(time, 0.04, 0.035, 'highpass', 7000);
    noiseHit(time + swing, 0.04, 0.02, 'highpass', 7000);

    // A sparse, wandering melody so the loop never feels identical.
    if (Math.random() < 0.3) {
      const m = MELODY_SCALE[Math.floor(Math.random() * MELODY_SCALE.length)];
      note(m, time + (Math.random() < 0.5 ? 0 : swing), BEAT * 1.6, 'sine', 0.05, 0.03);
    }
  }

  function scheduler() {
    while (nextBeatTime < ctx.currentTime + 0.3) {
      scheduleBeat(beatIndex, nextBeatTime);
      nextBeatTime += BEAT;
      beatIndex++;
    }
  }

  function start() {
    if (playing) return;
    try {
      if (!ctx) setup();
      ctx.resume();
      playing = true;
      nextBeatTime = Math.max(nextBeatTime, ctx.currentTime + 0.1);
      timer = setInterval(scheduler, 100);
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(VOLUME, ctx.currentTime + 2);
    } catch (e) {
      /* Web Audio unavailable — the game simply stays silent */
    }
  }

  function pause() {
    if (!playing) return;
    playing = false;
    clearInterval(timer);
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + 0.6);
    setTimeout(() => { if (!playing) ctx.suspend(); }, 700);
  }

  window.Lofi = { start, pause, isPlaying: () => playing };
})();
