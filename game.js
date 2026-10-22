/* =============================================================
   game.js — ALL game logic. No content lives here — everything
   content-shaped (photos, questions, answers, text) comes from
   content.js via the global GAME_CONTENT object.
   ============================================================= */
(function () {
  'use strict';

  const C = window.GAME_CONTENT;
  const STORAGE_KEY = 'birthdayGame_v1';

  /* -----------------------------------------------------------
     STATE
  ----------------------------------------------------------- */
  function freshState() {
    return {
      v: 1,
      unlocked: false,
      passcodeWrongCount: 0,
      screen: 'gate',
      level1: { roundIndex: 0, wrongCounts: [0, 0, 0], done: [false, false, false] },
      level2: { qIndex: 0, wrongCounts: [0, 0, 0, 0, 0], done: [false, false, false, false, false], chosenIndex: [null, null, null, null, null] },
      level3: { roundIndex: 0, wrongCounts: [0, 0, 0], done: [false, false, false] },
      level4: { collectedIds: [] },
      level5: { placements: {} },
      piecesEarnedOrder: [],
      muted: true,
    };
  }

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return freshState();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== 1) return freshState();
      return Object.assign(freshState(), parsed);
    } catch (e) {
      return freshState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* storage unavailable — game still works, just won't resume */
    }
  }

  function resetProgress() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    // A full page reload (not just an in-memory reset) clears any stuck
    // timers/animations/audio from a finished playthrough and guarantees a
    // genuinely clean restart from the gate screen.
    window.location.reload();
  }

  /* -----------------------------------------------------------
     DOM REFS
  ----------------------------------------------------------- */
  const $ = (id) => document.getElementById(id);
  const globalUI = $('global-ui');
  const progressPill = $('progress-pill');
  const piecesTray = $('pieces-tray');
  const muteBtn = $('mute-toggle');
  const fxLayer = $('fx-layer');

  const screens = {};
  document.querySelectorAll('[data-screen]').forEach((el) => { screens[el.id] = el; });

  function showScreenEl(id) {
    Object.values(screens).forEach((el) => { el.hidden = el.id !== id; });
    window.scrollTo(0, 0);
  }

  const PROGRESS_LABEL = {
    gate: null,
    'screen-intro': null, // set dynamically
    'screen-level1': 'Level 1 of 5',
    'screen-slideshow': 'Level 1 of 5',
    'screen-level2': 'Level 2 of 5',
    'screen-l2-recap': 'Level 2 of 5',
    'screen-level3': 'Level 3 of 5',
    'screen-level4': 'Level 4 of 5',
    'screen-level5': 'Level 5 of 5',
    'screen-finale': 'All done 💕',
    'screen-rewatch': 'All done 💕',
  };

  /* -----------------------------------------------------------
     UTILITIES
  ----------------------------------------------------------- */
  function vibrate(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function shuffled(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const WRONG_MESSAGES = [
    "Ooh, so close! Try again 😅",
    "Not quite — have another go!",
    "Hmm, are you sure about that? 😏",
    "Nice guess, but no cigar.",
    "Getting warmer... maybe. Try again!",
  ];

  let audioCtx = null;
  function playTone(freq, dur) {
    if (state.muted) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.08;
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      osc.stop(audioCtx.currentTime + dur);
    } catch (e) {}
  }
  const sfxCorrect = () => playTone(880, 0.35);
  const sfxPop = () => playTone(520, 0.18);
  const sfxWrong = () => playTone(220, 0.22);

  function spawnConfetti(count) {
    count = count || 60;
    const colors = ['#b76e79', '#e3b4b0', '#d9a95f', '#fdf3ec', '#3c1a3b'];
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.left = Math.random() * 100 + 'vw';
      el.style.background = pick(colors);
      el.style.setProperty('--drift', (Math.random() * 160 - 80) + 'px');
      el.style.setProperty('--spin', (Math.random() * 720 - 360) + 'deg');
      el.style.animationDuration = (1800 + Math.random() * 1600) + 'ms';
      el.style.animationDelay = (Math.random() * 400) + 'ms';
      fxLayer.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
      setTimeout(() => { if (el.parentNode) el.remove(); }, 5000);
    }
  }

  function spawnSparkles(x, y, count) {
    count = count || 8;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'sparkle-pop';
      el.textContent = pick(['✨', '💖', '⭐']);
      el.style.left = (x + (Math.random() * 60 - 30)) + 'px';
      el.style.top = (y + (Math.random() * 60 - 30)) + 'px';
      el.style.animationDelay = (Math.random() * 150) + 'ms';
      fxLayer.appendChild(el);
      setTimeout(() => { if (el.parentNode) el.remove(); }, 1200);
    }
  }

  function initSparkleField() {
    const field = document.querySelector('.sparkle-field');
    if (!field) return;
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('span');
      s.textContent = pick(['✨', '💗', '⭐', '💕']);
      s.style.left = Math.random() * 100 + '%';
      s.style.top = Math.random() * 100 + '%';
      s.style.animationDelay = (Math.random() * 4) + 's';
      s.style.fontSize = (0.7 + Math.random() * 0.9) + 'rem';
      field.appendChild(s);
    }
  }

  /* -----------------------------------------------------------
     GLOBAL UI RENDER
  ----------------------------------------------------------- */
  function renderGlobalUI(screenId) {
    if (!state.unlocked) { globalUI.hidden = true; return; }
    globalUI.hidden = false;
    const label = PROGRESS_LABEL[screenId];
    progressPill.textContent = label || progressPill.textContent;

    const slots = piecesTray.querySelectorAll('.piece-slot');
    slots.forEach((slot, i) => {
      slot.classList.toggle('filled', i < state.piecesEarnedOrder.length);
    });

    muteBtn.textContent = state.muted ? '🔇' : '🔈';
  }

  muteBtn.addEventListener('click', () => {
    state.muted = !state.muted;
    saveState();
    renderGlobalUI(currentScreenId());
  });

  function currentScreenId() {
    return Object.values(screens).find((el) => !el.hidden)?.id || 'screen-gate';
  }

  /* -----------------------------------------------------------
     PIECE AWARD ANIMATION (flies into the pieces tray)
  ----------------------------------------------------------- */
  function awardPiece(fromRect) {
    const slotIndex = state.piecesEarnedOrder.length;
    state.piecesEarnedOrder.push({ slot: slotIndex, at: Date.now() });

    const targetSlot = piecesTray.querySelectorAll('.piece-slot')[slotIndex];
    if (targetSlot && fromRect) {
      const flying = document.createElement('div');
      flying.textContent = '🧩';
      flying.style.position = 'fixed';
      flying.style.left = fromRect.x + 'px';
      flying.style.top = fromRect.y + 'px';
      flying.style.fontSize = '1.6rem';
      flying.style.zIndex = 65;
      flying.style.transition = 'transform 700ms cubic-bezier(.3,.9,.3,1.1), opacity 700ms ease';
      document.body.appendChild(flying);
      const targetRect = targetSlot.getBoundingClientRect();
      requestAnimationFrame(() => {
        const dx = targetRect.x + targetRect.width / 2 - fromRect.x;
        const dy = targetRect.y + targetRect.height / 2 - fromRect.y;
        flying.style.transform = `translate(${dx}px, ${dy}px) scale(0.3)`;
        flying.style.opacity = '0.3';
      });
      setTimeout(() => {
        flying.remove();
        targetSlot.classList.add('filled');
      }, 700);
    } else if (targetSlot) {
      targetSlot.classList.add('filled');
    }
    saveState();
  }

  /* -----------------------------------------------------------
     NAVIGATION
  ----------------------------------------------------------- */
  function navigateTo(screenId) {
    state.screen = screenId;
    saveState();
    render();
  }

  function showIntro(eyebrow, title, sub, continueFn) {
    $('intro-eyebrow').textContent = eyebrow;
    $('intro-title').textContent = title;
    $('intro-sub').textContent = sub;
    showScreenEl('screen-intro');
    renderGlobalUI('screen-intro');
    progressPill.textContent = eyebrow.includes('5') ? 'Level 5 of 5'
      : eyebrow.includes('4') ? 'Level 4 of 5'
      : eyebrow.includes('3') ? 'Level 3 of 5'
      : eyebrow.includes('2') ? 'Level 2 of 5'
      : 'Level 1 of 5';
    const btn = $('intro-continue-btn');
    btn.onclick = continueFn;
  }

  /* =============================================================
     GATE
  ============================================================= */
  function initGate() {
    $('her-name').textContent = C.herName || 'You';
    const form = $('gate-form');
    const input = $('gate-input');
    const message = $('gate-message');
    const hintEl = $('gate-hint');

    function refreshHints() {
      const hints = [];
      if (state.passcodeWrongCount >= 2 && C.passcodeHints[0]) hints.push(C.passcodeHints[0]);
      if (state.passcodeWrongCount >= 4 && C.passcodeHints[1]) hints.push(C.passcodeHints[1]);
      if (hints.length) {
        hintEl.hidden = false;
        hintEl.innerHTML = hints.map((h) => `<div>${h}</div>`).join('');
      }
    }
    refreshHints();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input.value;
      if (window.GameHash.simpleHash(val) === C.passcodeHash) {
        message.style.color = 'var(--color-success)';
        message.textContent = 'Yes! Unlocking something special...';
        state.unlocked = true;
        saveState();
        setTimeout(() => goToLevel(1), 900);
      } else {
        state.passcodeWrongCount++;
        saveState();
        input.classList.remove('shake');
        requestAnimationFrame(() => input.classList.add('shake'));
        message.style.color = 'var(--color-rose-gold)';
        message.textContent = pick([
          'Not quite, love. One more try?',
          'Ooh, so close (okay, not really). Try again!',
          "Nope — but I admire the confidence.",
          'Hmm, that is a bold guess. Try again!',
        ]);
        refreshHints();
        vibrate(40);
      }
    });

    let resetArmed = false;
    $('reset-progress-btn').addEventListener('click', () => {
      if (!resetArmed) {
        resetArmed = true;
        const btn = $('reset-progress-btn');
        btn.textContent = 'tap again to confirm';
        setTimeout(() => { resetArmed = false; btn.textContent = 'reset'; }, 3000);
        return;
      }
      resetProgress();
    });

    initSparkleField();
  }

  /* =============================================================
     LEVEL 1 — Guess the place
  ============================================================= */
  function goToLevel(n) {
    navigateTo('intro-' + n);
  }

  const INTRO_COPY = {
    1: ['Level 1', 'Where in the world?', "Let's see how well you remember our travels."],
    2: ['Level 2', 'Favourite things', 'Five questions. I bet you ace all of them.'],
    3: ['Level 3', 'What are you wearing?', 'A little style memory quiz, just for fun.'],
    4: ['Level 4', 'Reasons I love you', 'Pop the balloons and bloom the flowers to collect them all.'],
    5: ['Level 5', 'The puzzle', 'One last thing — put us back together.'],
  };

  function showLevelIntro(n) {
    const [eyebrow, title, sub] = INTRO_COPY[n];
    showIntro(eyebrow, title, sub, () => navigateTo('screen-level' + n));
  }

  function renderLevel1() {
    const round = C.level1.rounds[state.level1.roundIndex];
    $('l1-round-num').textContent = state.level1.roundIndex + 1;
    const img = $('l1-photo');
    img.src = round.photo;
    img.alt = 'Guess this place';

    const optionsWrap = $('l1-options');
    optionsWrap.innerHTML = '';
    const feedback = $('l1-feedback');
    feedback.textContent = '';

    round.options.forEach((label, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.textContent = label;
      btn.addEventListener('click', () => handleLevel1Choice(idx, btn, round));
      optionsWrap.appendChild(btn);
    });
  }

  function handleLevel1Choice(idx, btn, round) {
    const progress = state.level1;
    if (idx === round.answerIndex) {
      btn.classList.add('correct');
      $('l1-options').querySelectorAll('.option-btn').forEach((b) => { b.disabled = true; });
      $('l1-feedback').textContent = 'Yes! Exactly right 💕';
      sfxCorrect();
      vibrate(25);
      progress.done[progress.roundIndex] = true;
      saveState();
      const rect = btn.getBoundingClientRect();
      setTimeout(() => {
        awardPiece({ x: rect.x + rect.width / 2, y: rect.y });
        runLevel1Slideshow(round);
      }, 500);
    } else {
      progress.wrongCounts[progress.roundIndex]++;
      saveState();
      btn.classList.add('wrong');
      sfxWrong();
      vibrate(30);
      if (progress.wrongCounts[progress.roundIndex] >= 3) {
        const correctBtn = $('l1-options').querySelectorAll('.option-btn')[round.answerIndex];
        correctBtn.classList.add('revealed');
        $('l1-options').querySelectorAll('.option-btn').forEach((b) => { b.disabled = true; });
        $('l1-feedback').textContent = `Okay okay, I'll tell you — it was ${round.options[round.answerIndex]}! 😄`;
        progress.done[progress.roundIndex] = true;
        saveState();
        const rect = correctBtn.getBoundingClientRect();
        setTimeout(() => {
          awardPiece({ x: rect.x + rect.width / 2, y: rect.y });
          runLevel1Slideshow(round);
        }, 1400);
      } else {
        $('l1-feedback').textContent = pick(WRONG_MESSAGES);
      }
    }
  }

  function runLevel1Slideshow(round) {
    // NOTE: intentionally does not call navigateTo() (which would call
    // render() -> back into this function -> infinite recursion via the
    // 'screen-slideshow' switch case). We set the checkpoint directly.
    state.screen = 'screen-slideshow';
    saveState();
    showScreenEl('screen-slideshow');
    renderGlobalUI('screen-slideshow');
    runSlideshow(round.slideshow, {
      imgEl: $('slideshow-photo'),
      captionEl: $('slideshow-caption'),
      dotsEl: $('slideshow-dots'),
      nextBtn: $('slideshow-next-btn'),
      skipBtn: $('slideshow-skip-btn'),
      onDone: () => {
        const progress = state.level1;
        if (progress.roundIndex < C.level1.rounds.length - 1) {
          progress.roundIndex++;
          saveState();
          navigateTo('screen-level1');
        } else {
          goToLevel(2);
        }
      },
    });
  }

  /* Generic reusable slideshow: auto-advances, supports Next + Skip */
  function runSlideshow(photos, opts) {
    let i = 0;
    let timer = null;

    opts.dotsEl.innerHTML = photos.map(() => '<span></span>').join('');
    const dots = opts.dotsEl.querySelectorAll('span');

    function show(idx) {
      i = idx;
      opts.imgEl.src = photos[i].src;
      opts.imgEl.alt = photos[i].caption || 'Memory photo';
      opts.captionEl.textContent = photos[i].caption || '';
      dots.forEach((d, di) => d.classList.toggle('active', di === i));
      clearTimeout(timer);
      if (i < photos.length - 1) {
        timer = setTimeout(() => show(i + 1), 3200);
      } else {
        timer = setTimeout(() => finish(), 3200);
      }
    }

    function finish() {
      clearTimeout(timer);
      opts.nextBtn.onclick = null;
      opts.skipBtn.onclick = null;
      opts.onDone();
    }

    opts.nextBtn.onclick = () => {
      if (i < photos.length - 1) show(i + 1); else finish();
    };
    opts.skipBtn.onclick = finish;

    show(0);
  }

  /* =============================================================
     LEVEL 2 — Favourite things
  ============================================================= */
  function renderLevel2() {
    const q = C.level2.questions[state.level2.qIndex];
    $('l2-q-num').textContent = state.level2.qIndex + 1;
    $('l2-question').textContent = q.question;

    const wrap = $('l2-options');
    wrap.innerHTML = '';
    $('l2-feedback').textContent = '';

    q.options.forEach((label, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.textContent = label;
      btn.addEventListener('click', () => handleLevel2Choice(idx, btn, q));
      wrap.appendChild(btn);
    });
  }

  function handleLevel2Choice(idx, btn, q) {
    const progress = state.level2;
    // anyCorrect questions (e.g. "whatever she picks is right") accept every option.
    if (q.anyCorrect || idx === q.answerIndex) {
      btn.classList.add('correct');
      $('l2-options').querySelectorAll('.option-btn').forEach((b) => { b.disabled = true; });
      $('l2-feedback').textContent = pick(['Of course you know! 💖', 'Correct, obviously.', 'Like I had any doubt 😌']);
      sfxCorrect();
      const rect = btn.getBoundingClientRect();
      spawnSparkles(rect.x + rect.width / 2, rect.y);
      progress.done[progress.qIndex] = true;
      progress.chosenIndex[progress.qIndex] = idx;
      saveState();
      setTimeout(() => advanceLevel2(), 1100);
    } else {
      progress.wrongCounts[progress.qIndex]++;
      saveState();
      btn.classList.add('wrong');
      sfxWrong();
      vibrate(30);
      if (progress.wrongCounts[progress.qIndex] >= 3) {
        const correctBtn = $('l2-options').querySelectorAll('.option-btn')[q.answerIndex];
        correctBtn.classList.add('revealed');
        $('l2-options').querySelectorAll('.option-btn').forEach((b) => { b.disabled = true; });
        $('l2-feedback').textContent = `It's ${q.options[q.answerIndex]} — I'll let you off this time 😉`;
        progress.done[progress.qIndex] = true;
        progress.chosenIndex[progress.qIndex] = q.answerIndex;
        saveState();
        setTimeout(() => advanceLevel2(), 1500);
      } else {
        $('l2-feedback').textContent = 'Hmm, are you sure? 🤔 Try again!';
      }
    }
  }

  function advanceLevel2() {
    const progress = state.level2;
    if (progress.qIndex < C.level2.questions.length - 1) {
      progress.qIndex++;
      saveState();
      navigateTo('screen-level2');
    } else {
      renderLevel2Recap();
      navigateTo('screen-l2-recap');
    }
  }

  function renderLevel2Recap() {
    const list = $('l2-recap-list');
    list.innerHTML = C.level2.questions.map((q, i) => {
      const chosen = state.level2.chosenIndex[i];
      const answerText = q.options[chosen !== null && chosen !== undefined ? chosen : q.answerIndex];
      return `<li><strong>${q.question}</strong><br>${answerText}</li>`;
    }).join('');
    $('l2-recap-continue-btn').onclick = () => goToLevel(3);
  }

  /* =============================================================
     LEVEL 3 — What are you wearing?
  ============================================================= */
  function renderLevel3() {
    const round = C.level3.rounds[state.level3.roundIndex];
    $('l3-round-num').textContent = state.level3.roundIndex + 1;
    const img = $('l3-photo');
    img.src = round.photo;
    img.alt = 'What are you wearing?';
    img.classList.remove('revealed');

    $('l3-caption').hidden = true;
    $('l3-feedback').textContent = '';

    const wrap = $('l3-options');
    wrap.innerHTML = '';
    round.options.forEach((swatch, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'swatch-btn';
      btn.innerHTML = `<span class="swatch-chip" style="background:${swatch.hex}"></span><span class="swatch-label">${swatch.name}</span>`;
      btn.addEventListener('click', () => handleLevel3Choice(idx, btn, round));
      wrap.appendChild(btn);
    });
  }

  function handleLevel3Choice(idx, btn, round) {
    const progress = state.level3;
    if (idx === round.answerIndex) {
      btn.classList.add('correct');
      $('l3-options').querySelectorAll('.swatch-btn').forEach((b) => { b.disabled = true; b.style.pointerEvents = 'none'; });
      $('l3-feedback').textContent = 'Yes! Spot on 💅';
      sfxCorrect();
      vibrate(25);
      const img = $('l3-photo');
      img.classList.add('revealed');
      const rect = img.getBoundingClientRect();
      spawnSparkles(rect.x + rect.width / 2, rect.y + rect.height / 2, 14);
      if (round.caption) {
        $('l3-caption').hidden = false;
        $('l3-caption').textContent = round.caption;
      }
      progress.done[progress.roundIndex] = true;
      saveState();
      setTimeout(() => {
        awardPiece({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
        advanceLevel3();
      }, 1600);
    } else {
      progress.wrongCounts[progress.roundIndex]++;
      saveState();
      btn.classList.add('wrong');
      sfxWrong();
      vibrate(30);
      if (progress.wrongCounts[progress.roundIndex] >= 3) {
        const buttons = $('l3-options').querySelectorAll('.swatch-btn');
        buttons[round.answerIndex].classList.add('revealed');
        buttons.forEach((b) => { b.disabled = true; b.style.pointerEvents = 'none'; });
        $('l3-feedback').textContent = `It was ${round.options[round.answerIndex].name}! Sneaky, I know 😄`;
        const img = $('l3-photo');
        img.classList.add('revealed');
        if (round.caption) {
          $('l3-caption').hidden = false;
          $('l3-caption').textContent = round.caption;
        }
        progress.done[progress.roundIndex] = true;
        saveState();
        const rect = img.getBoundingClientRect();
        setTimeout(() => {
          awardPiece({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
          advanceLevel3();
        }, 1800);
      } else {
        $('l3-feedback').textContent = pick(WRONG_MESSAGES);
      }
    }
  }

  function advanceLevel3() {
    const progress = state.level3;
    if (progress.roundIndex < C.level3.rounds.length - 1) {
      progress.roundIndex++;
      saveState();
      navigateTo('screen-level3');
    } else {
      goToLevel(4);
    }
  }

  /* =============================================================
     LEVEL 4 — Reasons I love you
  ============================================================= */
  let level4Runtime = null;

  function renderLevel4() {
    const target = Math.min(C.reasonsToCollect || 15, C.reasons.length);
    $('l4-target').textContent = target;
    $('l4-count').textContent = state.level4.collectedIds.length;
    updateJarFill();

    const playfield = $('l4-playfield');
    playfield.innerHTML = '';
    $('l4-continue-btn').hidden = true;

    // Every reason already collected stays on the board behind the balloons.
    $('l4-board').innerHTML = '';
    level4Slots = makeLevel4Slots(target);
    state.level4.collectedIds.forEach((i) => addReasonNote(C.reasons[i], false));

    stopLevel4();

    const remainingIndices = shuffled(
      C.reasons.map((_, i) => i).filter((i) => state.level4.collectedIds.indexOf(i) === -1)
    ).slice(0, Math.max(0, target - state.level4.collectedIds.length));

    level4Runtime = {
      playfield,
      queue: remainingIndices,
      active: [],
      target,
      rafId: null,
      spawnTimer: null,
      lastSpawn: 0,
    };

    if (state.level4.collectedIds.length >= target) {
      finishLevel4();
      return;
    }

    startLevel4Loop();
  }

  function stopLevel4() {
    if (level4Runtime) {
      if (level4Runtime.rafId) cancelAnimationFrame(level4Runtime.rafId);
      if (level4Runtime.spawnTimer) clearInterval(level4Runtime.spawnTimer);
    }
  }

  const LEVEL4_MAX_CONCURRENT = 8;

  function startLevel4Loop() {
    const rt = level4Runtime;
    const emojis = ['🎈', '🎈', '🎈', '🌸', '🌺', '🌷'];

    function spawnOne() {
      if (rt.queue.length === 0) return;
      if (rt.active.length >= LEVEL4_MAX_CONCURRENT) return;
      const reasonIndex = rt.queue.shift();
      const el = document.createElement('div');
      el.className = 'float-item';
      el.textContent = pick(emojis);
      const fieldWidth = rt.playfield.clientWidth || 300;
      const item = {
        el,
        reasonIndex,
        x: 20 + Math.random() * Math.max(10, fieldWidth - 80),
        y: -30,
        speed: 55 + Math.random() * 35,
        driftAmp: 10 + Math.random() * 20,
        driftFreq: 0.5 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        popped: false,
        scale: 0.85 + Math.random() * 0.5,
      };
      el.style.transform = `translate(${item.x}px, 0) scale(${item.scale})`;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        popItem(item);
      }, { passive: false });
      rt.playfield.appendChild(el);
      rt.active.push(item);
    }

    rt.spawnTimer = setInterval(() => {
      if (rt.active.length < LEVEL4_MAX_CONCURRENT) spawnOne();
    }, 800);
    // A second, slightly offset spawn so the field fills up fast at the start
    // rather than trickling in one at a time.
    setTimeout(() => { if (rt.active.length < LEVEL4_MAX_CONCURRENT) spawnOne(); }, 400);
    spawnOne();

    let lastT = performance.now();
    function tick(t) {
      const dt = Math.min(0.05, (t - lastT) / 1000);
      lastT = t;
      const fieldHeight = rt.playfield.clientHeight || 400;
      rt.active.forEach((item) => {
        if (item.popped) return;
        item.y += item.speed * dt;
        const driftX = Math.sin(t / 1000 * item.driftFreq + item.phase) * item.driftAmp;
        item.el.style.transform = `translate(${item.x + driftX}px, ${-item.y}px) scale(${item.scale})`;
        if (item.y > fieldHeight + 100) {
          // recycle — nothing is ever truly missed
          item.y = -90;
        }
      });
      rt.rafId = requestAnimationFrame(tick);
    }
    rt.rafId = requestAnimationFrame(tick);
  }

  function popItem(item) {
    if (item.popped) return;
    item.popped = true;
    const rt = level4Runtime;
    item.el.classList.add('popping');
    vibrate(18);
    sfxPop();
    const rect = item.el.getBoundingClientRect();
    spawnSparkles(rect.x + rect.width / 2, rect.y + rect.height / 2, 6);

    const reasonText = C.reasons[item.reasonIndex];
    showFlyingReason(reasonText, rect, addReasonNote(reasonText, true));

    setTimeout(() => {
      item.el.remove();
      rt.active = rt.active.filter((a) => a !== item);
    }, 450);

    state.level4.collectedIds.push(item.reasonIndex);
    saveState();
    $('l4-count').textContent = state.level4.collectedIds.length;
    updateJarFill();

    if (state.level4.collectedIds.length >= rt.target) {
      setTimeout(() => finishLevel4(), 2400);
    }
  }

  // Adds a reason to the board that sits behind the balloons. A fresh note
  // stays invisible until the flying card lands on it.
  function addReasonNote(text, fresh) {
    const board = $('l4-board');
    const note = document.createElement('div');
    note.className = 'reason-note' + (fresh ? ' reason-note-pending' : '');
    note.textContent = text;
    const slot = level4Slots[board.children.length % level4Slots.length];
    note.style.left = slot.left + '%';
    note.style.top = slot.top + '%';
    note.style.width = slot.width + '%';
    note.style.setProperty('--rot', slot.rot + 'deg');
    board.appendChild(note);
    return note;
  }

  // Splits the board into a grid with one cell per reason, then shuffles
  // the cells so reasons land scattered all over the screen (with a little
  // jitter and tilt) instead of filling in from one corner.
  let level4Slots = [];
  function makeLevel4Slots(count) {
    const width = $('l4-board').clientWidth || window.innerWidth;
    const cols = Math.max(2, Math.min(5, Math.floor(width / 210)));
    const rows = Math.ceil(count / cols);
    const cellW = 100 / cols;
    const cellH = 100 / rows;
    const slots = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        slots.push({
          left: c * cellW + Math.random() * cellW * 0.1,
          top: r * cellH + Math.random() * cellH * 0.15,
          width: cellW * 0.9,
          rot: (Math.random() * 8 - 4).toFixed(1),
        });
      }
    }
    return shuffled(slots);
  }

  function showFlyingReason(text, fromRect, note) {
    const card = document.createElement('div');
    card.className = 'reason-card';
    card.textContent = text;
    // Clamp so the card never flies off-screen for balloons popped near
    // the left/right edges — it used to just position at fromRect.x - 110
    // unclamped, which could render it entirely off-screen and invisible.
    const cardWidth = 270;
    const margin = 10;
    const left = Math.max(
      margin,
      Math.min(window.innerWidth - cardWidth - margin, fromRect.x - 110)
    );
    const top = Math.max(margin, fromRect.y - 20);
    card.style.left = left + 'px';
    card.style.top = top + 'px';
    document.body.appendChild(card);

    // Hold the card large & fully readable for a moment, then fly it onto
    // its note on the board, where the reason stays for good.
    const HOLD_MS = 1400;
    setTimeout(() => {
      const cardRect = card.getBoundingClientRect();
      const noteRect = note.getBoundingClientRect();
      const dx = noteRect.x + noteRect.width / 2 - (cardRect.x + cardRect.width / 2);
      const dy = noteRect.y + noteRect.height / 2 - (cardRect.y + cardRect.height / 2);
      card.style.transform = `translate(${dx}px, ${dy}px) scale(0.5)`;
      card.style.opacity = '0';
    }, HOLD_MS);
    setTimeout(() => {
      card.remove();
      note.classList.remove('reason-note-pending');
    }, HOLD_MS + 700);
  }

  function updateJarFill() {
    const target = Math.min(C.reasonsToCollect || 15, C.reasons.length);
    const pct = Math.min(100, (state.level4.collectedIds.length / target) * 100);
    $('l4-jar-fill').style.height = pct + '%';
  }

  $('l4-jar').addEventListener('click', () => {
    if (!state.level4.collectedIds.length) return;
    openReasonModal(
      '<div style="text-align:left; max-height:50vh; overflow:auto; display:flex; flex-direction:column; gap:8px;">' +
        state.level4.collectedIds.map((i) => `<div>💗 ${C.reasons[i]}</div>`).join('') +
      '</div>'
    );
  });

  function openReasonModal(html) {
    $('reason-modal-text').innerHTML = html;
    $('reason-modal').hidden = false;
  }
  $('reason-modal-close').addEventListener('click', () => { $('reason-modal').hidden = true; });

  // No auto-advance: she gets to read the full board, then taps Continue.
  function finishLevel4() {
    stopLevel4();
    spawnConfetti(80);
    $('l4-continue-btn').hidden = false;
  }
  $('l4-continue-btn').addEventListener('click', () => goToLevel(5));

  /* =============================================================
     LEVEL 5 — The puzzle
  ============================================================= */
  function renderLevel5() {
    const cfg = C.puzzle;
    const cols = cfg.gridCols || 3;
    const rows = cfg.gridRows || 2;
    const total = cols * rows;
    const prePlacedCount = Math.min(cfg.prePlacedCount || 0, total);
    const draggableCount = total - prePlacedCount;

    const board = $('puzzle-board');
    const tray = $('puzzle-tray');
    board.innerHTML = '';
    tray.innerHTML = '';
    board.classList.remove('sealed');

    const preplacedIndices = [];
    const draggableIndices = [];
    for (let i = 0; i < total; i++) {
      if (i < prePlacedCount) preplacedIndices.push(i); else draggableIndices.push(i);
    }

    function cellStyle(index) {
      const col = index % cols;
      const row = Math.floor(index / cols);
      return {
        left: (col / cols) * 100 + '%',
        top: (row / rows) * 100 + '%',
        width: (100 / cols) + '%',
        height: (100 / rows) + '%',
        col, row,
      };
    }

    function applySlice(el, col, row) {
      el.style.backgroundImage = `url(${cfg.photo})`;
      el.style.backgroundSize = `${cols * 100}% ${rows * 100}%`;
      const px = cols > 1 ? (col / (cols - 1)) * 100 : 0;
      const py = rows > 1 ? (row / (rows - 1)) * 100 : 0;
      el.style.backgroundPosition = `${px}% ${py}%`;
    }

    // pre-placed filled cells
    preplacedIndices.forEach((idx) => {
      const s = cellStyle(idx);
      const cell = document.createElement('div');
      cell.className = 'puzzle-cell placed-static';
      cell.style.left = s.left; cell.style.top = s.top;
      cell.style.width = s.width; cell.style.height = s.height;
      applySlice(cell, s.col, s.row);
      board.appendChild(cell);
    });

    // ghost outlines for draggable targets
    const alreadyPlaced = state.level5.placements || {};
    draggableIndices.forEach((idx) => {
      const s = cellStyle(idx);
      const ghost = document.createElement('div');
      ghost.className = 'puzzle-cell ghost';
      ghost.dataset.cellIndex = String(idx);
      ghost.style.left = s.left; ghost.style.top = s.top;
      ghost.style.width = s.width; ghost.style.height = s.height;
      board.appendChild(ghost);
    });

    // figure out which earned pieces map to which draggable cell
    const earnedCount = state.piecesEarnedOrder.length;
    const usableCount = Math.min(earnedCount, draggableIndices.length);
    const piecesToShow = draggableIndices.slice(0, usableCount);

    const trayOrder = shuffled(piecesToShow);
    trayOrder.forEach((cellIdx) => {
      const s = cellStyle(cellIdx);
      const pieceId = 'p' + cellIdx;
      const piece = document.createElement('div');
      piece.className = 'puzzle-piece';
      piece.dataset.targetCell = String(cellIdx);
      piece.dataset.pieceId = pieceId;
      const size = 86;
      piece.style.width = size + 'px';
      piece.style.height = size + 'px';
      applySlice(piece, s.col, s.row);

      if (alreadyPlaced[pieceId] !== undefined) {
        // resume: snap directly into place
        board.appendChild(piece);
        piece.style.position = 'absolute';
        piece.style.left = s.left; piece.style.top = s.top;
        piece.style.width = s.width; piece.style.height = s.height;
        piece.classList.add('placed');
        const ghostEl = board.querySelector(`.ghost[data-cell-index="${cellIdx}"]`);
        if (ghostEl) ghostEl.classList.add('filled');
      } else {
        tray.appendChild(piece);
        attachPieceDrag(piece, board);
      }
    });

    checkPuzzleComplete(false);

    $('puzzle-hint-btn').onclick = () => showPuzzleHint(board, cols, rows);
  }

  function attachPieceDrag(piece, board) {
    piece.addEventListener('pointerdown', (e) => {
      if (piece.classList.contains('placed')) return;
      e.preventDefault();
      piece.setPointerCapture(e.pointerId);
      const rect = piece.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      piece.classList.add('dragging');
      piece.style.position = 'fixed';
      piece.style.width = rect.width + 'px';
      piece.style.height = rect.height + 'px';
      piece.style.left = rect.left + 'px';
      piece.style.top = rect.top + 'px';
      piece.style.margin = '0';

      function onMove(ev) {
        piece.style.left = (ev.clientX - offsetX) + 'px';
        piece.style.top = (ev.clientY - offsetY) + 'px';
      }
      function onUp(ev) {
        piece.removeEventListener('pointermove', onMove);
        piece.removeEventListener('pointerup', onUp);
        piece.removeEventListener('pointercancel', onUp);
        piece.classList.remove('dragging');
        try { piece.releasePointerCapture(ev.pointerId); } catch (err) {}
        evaluateDrop(piece, board);
      }
      piece.addEventListener('pointermove', onMove);
      piece.addEventListener('pointerup', onUp);
      piece.addEventListener('pointercancel', onUp);
    });
  }

  function evaluateDrop(piece, board) {
    const pieceRect = piece.getBoundingClientRect();
    const cx = pieceRect.left + pieceRect.width / 2;
    const cy = pieceRect.top + pieceRect.height / 2;

    const ghosts = board.querySelectorAll('.puzzle-cell.ghost:not(.filled)');
    let best = null, bestDist = Infinity;
    ghosts.forEach((g) => {
      const r = g.getBoundingClientRect();
      const gx = r.left + r.width / 2, gy = r.top + r.height / 2;
      const d = Math.hypot(gx - cx, gy - cy);
      const threshold = Math.max(r.width, r.height) * 0.65;
      if (d < threshold && d < bestDist) { bestDist = d; best = g; }
    });

    if (!best) { returnPieceToTray(piece); return; }

    if (best.dataset.cellIndex === piece.dataset.targetCell) {
      snapPieceToCell(piece, best, board);
    } else {
      piece.classList.add('shake');
      vibrate(20);
      setTimeout(() => piece.classList.remove('shake'), 450);
      returnPieceToTray(piece);
    }
  }

  function snapPieceToCell(piece, cell, board) {
    piece.style.position = 'absolute';
    board.appendChild(piece);
    piece.style.left = cell.style.left;
    piece.style.top = cell.style.top;
    piece.style.width = cell.style.width;
    piece.style.height = cell.style.height;
    piece.classList.add('placed');
    cell.classList.add('filled');
    vibrate(20);
    sfxCorrect();
    const r = cell.getBoundingClientRect();
    spawnSparkles(r.left + r.width / 2, r.top + r.height / 2, 6);

    state.level5.placements[piece.dataset.pieceId] = cell.dataset.cellIndex;
    saveState();
    checkPuzzleComplete(true);
  }

  function returnPieceToTray(piece) {
    piece.style.position = '';
    piece.style.left = '';
    piece.style.top = '';
    piece.style.margin = '';
    $('puzzle-tray').appendChild(piece);
  }

  function checkPuzzleComplete(animate) {
    const board = $('puzzle-board');
    const ghosts = board.querySelectorAll('.puzzle-cell.ghost');
    const filled = board.querySelectorAll('.puzzle-cell.ghost.filled');
    if (ghosts.length > 0 && filled.length === ghosts.length) {
      board.classList.add('sealed');
      if (animate) {
        spawnConfetti(90);
        // A generous, repeated burst of sparkles across the whole heart.
        const burstSparkles = () => {
          const r = board.getBoundingClientRect();
          spawnSparkles(r.x + Math.random() * r.width, r.y + Math.random() * r.height, 12);
        };
        burstSparkles();
        for (let i = 1; i <= 5; i++) {
          setTimeout(burstSparkles, i * 350);
        }
        setTimeout(() => navigateTo('screen-finale'), 2400);
      }
    }
  }

  function showPuzzleHint(board, cols, rows) {
    const ghosts = board.querySelectorAll('.puzzle-cell.ghost:not(.filled)');
    ghosts.forEach((g) => {
      const idx = parseInt(g.dataset.cellIndex, 10);
      const col = idx % cols, row = Math.floor(idx / cols);
      g.style.backgroundImage = `url(${C.puzzle.photo})`;
      g.style.backgroundSize = `${cols * 100}% ${rows * 100}%`;
      const px = cols > 1 ? (col / (cols - 1)) * 100 : 0;
      const py = rows > 1 ? (row / (rows - 1)) * 100 : 0;
      g.style.backgroundPosition = `${px}% ${py}%`;
      g.style.opacity = '0.55';
    });
    setTimeout(() => {
      ghosts.forEach((g) => {
        g.style.backgroundImage = '';
        g.style.opacity = '1';
      });
    }, 2500);
  }

  /* =============================================================
     FINALE
  ============================================================= */
  function renderFinale() {
    $('finale-message').textContent = C.finalMessage;
    $('gift-clue').textContent = C.giftClue;
    $('gift-hint').textContent = C.giftHint;
    $('gift-hint').hidden = true;
    spawnConfetti(100);

    $('gift-hint-btn').onclick = () => { $('gift-hint').hidden = false; };

    $('play-again-btn').onclick = () => {
      resetProgress();
    };

    $('replay-btn').onclick = () => {
      // Rewatching is a transient bonus view from the finale — it does NOT
      // change the persisted checkpoint (state.screen stays 'screen-finale'),
      // so a refresh mid-rewatch simply lands back on the finale screen.
      const allPhotos = [];
      C.level1.rounds.forEach((r) => allPhotos.push(...r.slideshow));
      C.level3.rounds.forEach((r) => allPhotos.push({ src: r.photo, caption: r.caption || '' }));
      showScreenEl('screen-rewatch');
      renderGlobalUI('screen-rewatch');
      runSlideshow(allPhotos, {
        imgEl: $('rewatch-photo'),
        captionEl: $('rewatch-caption'),
        dotsEl: $('rewatch-dots'),
        nextBtn: $('rewatch-next-btn'),
        skipBtn: $('rewatch-close-btn'),
        onDone: () => navigateTo('screen-finale'),
      });
      $('rewatch-close-btn').onclick = () => navigateTo('screen-finale');
    };
  }

  /* =============================================================
     MASTER RENDER (drives resume-from-localStorage too)
  ============================================================= */
  function render() {
    if (!state.unlocked) {
      showScreenEl('screen-gate');
      renderGlobalUI('screen-gate');
      return;
    }

    switch (state.screen) {
      case 'intro-1':
      case 'intro-2':
      case 'intro-3':
      case 'intro-4':
      case 'intro-5':
        showLevelIntro(parseInt(state.screen.slice(-1), 10));
        break;
      case 'screen-level1':
        renderLevel1();
        showScreenEl('screen-level1');
        renderGlobalUI('screen-level1');
        break;
      case 'screen-slideshow': {
        // Refreshing mid-slideshow just replays the current round's slideshow.
        const round = C.level1.rounds[state.level1.roundIndex];
        runLevel1Slideshow(round);
        break;
      }
      case 'screen-level2':
        renderLevel2();
        showScreenEl('screen-level2');
        renderGlobalUI('screen-level2');
        break;
      case 'screen-l2-recap':
        renderLevel2Recap();
        showScreenEl('screen-l2-recap');
        renderGlobalUI('screen-l2-recap');
        break;
      case 'screen-level3':
        renderLevel3();
        showScreenEl('screen-level3');
        renderGlobalUI('screen-level3');
        break;
      case 'screen-level4':
        renderLevel4();
        showScreenEl('screen-level4');
        renderGlobalUI('screen-level4');
        break;
      case 'screen-level5':
        renderLevel5();
        showScreenEl('screen-level5');
        renderGlobalUI('screen-level5');
        break;
      case 'screen-rewatch':
      case 'screen-finale':
        state.screen = 'screen-finale';
        renderFinale();
        showScreenEl('screen-finale');
        renderGlobalUI('screen-finale');
        break;
      default:
        // Unknown/legacy checkpoint — safest resumable spot once unlocked.
        state.screen = 'screen-level1';
        renderLevel1();
        showScreenEl('screen-level1');
        renderGlobalUI('screen-level1');
    }
  }

  /* =============================================================
     INIT
  ============================================================= */
  document.addEventListener('DOMContentLoaded', () => {
    initGate();
    render();
  });
})();
