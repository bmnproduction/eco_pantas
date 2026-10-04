(() => {
  const SESSION_KEY = 'ecoGameSession_v5';
  const TOTAL_TIME = 7 * 60;
  const TOTAL_CHALLENGES = 4;
  let timerHandle = null;
  let visibilityBound = false;

  function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function makeDefaultSession() {
    return {
      version: 5,
      started: false,
      status: 'ready',
      timeRemaining: TOTAL_TIME,
      lastUpdatedAt: Date.now(),
      currentChallenge: 1,
      highestUnlocked: 1,
      score: 0,
      totalCorrect: 0,
      totalWrong: 0,
      challengeVisits: [0, 0, 0, 0],
      challengeStatus: ['pending', 'locked', 'locked', 'locked'],
      challenge1: { currentIndex: 0, order: [], items: {} },
      challenge2: { currentIndex: 0, order: [], items: {} },
      challenge3: { currentRound: 0, rounds: [] },
      challenge4: { currentArea: 0, areas: [] }
    };
  }

  function saveSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 5) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function getOrCreateSession() {
    let session = loadSession();
    if (!session) {
      session = makeDefaultSession();
      saveSession(session);
    }
    return session;
  }

  function resetSession() {
    stopGlobalTimer();
    localStorage.removeItem(SESSION_KEY);
    location.href = 'index.html';
  }

  function syncTime(session) {
    if (!session || session.status !== 'playing') return false;
    const now = Date.now();
    const elapsed = Math.floor((now - session.lastUpdatedAt) / 1000);
    if (elapsed <= 0) return false;
    session.timeRemaining = Math.max(0, session.timeRemaining - elapsed);
    session.lastUpdatedAt = now;
    if (session.timeRemaining <= 0) {
      session.timeRemaining = 0;
      session.status = 'timeup';
      saveSession(session);
      return true;
    }
    saveSession(session);
    return false;
  }

  function startGlobalTimer(session, onTick, onTimeUp) {
    stopGlobalTimer();
    syncTime(session);
    onTick?.(session);
    timerHandle = setInterval(() => {
      const timeUp = syncTime(session);
      onTick?.(session);
      if (timeUp) {
        stopGlobalTimer();
        onTimeUp?.(session);
      }
    }, 250);

    if (!visibilityBound) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          const current = loadSession();
          if (!current) return;
          const timeUp = syncTime(current);
          onTick?.(current);
          if (timeUp) onTimeUp?.(current);
        } else {
          const current = loadSession();
          if (current && current.status === 'playing') {
            current.lastUpdatedAt = Date.now();
            saveSession(current);
          }
        }
      });
      visibilityBound = true;
    }
  }

  function stopGlobalTimer() {
    if (timerHandle) {
      clearInterval(timerHandle);
      timerHandle = null;
    }
  }

  function markTimerPaused(session) {
    if (!session || session.status !== 'playing') return;
    syncTime(session);
    session.status = 'paused';
    session.lastUpdatedAt = Date.now();
    saveSession(session);
    stopGlobalTimer();
  }

  function resumeTimer(session, onTick, onTimeUp) {
    if (!session || session.timeRemaining <= 0) {
      session.status = 'timeup';
      saveSession(session);
      onTimeUp?.(session);
      return;
    }
    session.status = 'playing';
    session.lastUpdatedAt = Date.now();
    saveSession(session);
    startGlobalTimer(session, onTick, onTimeUp);
  }

  function startNewGame() {
    stopGlobalTimer();
    const session = makeDefaultSession();
    session.started = true;
    session.status = 'instruction';
    session.lastUpdatedAt = Date.now();
    saveSession(session);
    location.href = 'challenge1.html';
  }

  function ensureChallengeData(session, challengeNo, dataFactory) {
    if (typeof dataFactory === 'function') dataFactory(session);
    session.challengeVisits[challengeNo - 1] = (session.challengeVisits[challengeNo - 1] || 0) + 1;
    saveSession(session);
  }

  function challengeRoute(no) {
    return `challenge${no}.html`;
  }

  function setCurrentChallenge(session, no) {
    if (no < 1 || no > TOTAL_CHALLENGES) return;
    session.currentChallenge = no;
    saveSession(session);
  }

  function unlockNextChallenge(session) {
    const next = Math.min(TOTAL_CHALLENGES, (session.currentChallenge || 1) + 1);
    session.highestUnlocked = Math.max(session.highestUnlocked || 1, next);
    if (next <= TOTAL_CHALLENGES && session.challengeStatus[next - 1] === 'locked') {
      session.challengeStatus[next - 1] = 'pending';
    }
    saveSession(session);
    return next;
  }

  function getItemStatusLabel(status) {
    if (status === 'completed') return 'Selesai';
    if (status === 'skipped') return 'Dilewati';
    return 'Belum dikerjakan';
  }

  function getChallengeStats(session, no) {
    if (!session) return { done: 0, skipped: 0, pending: 0, total: 0, status: 'locked' };
    if (no === 1) {
      const values = Object.values(session.challenge1?.items || {});
      const total = session.challenge1?.order?.length || values.length;
      const done = values.filter(v => v === 'completed').length;
      const skipped = values.filter(v => v === 'skipped').length;
      return { done, skipped, pending: Math.max(0, total - done - skipped), total, status: session.challengeStatus[0] };
    }
    if (no === 2) {
      const values = Object.values(session.challenge2?.items || {});
      const total = session.challenge2?.order?.length || values.length;
      const done = values.filter(v => v === 'completed').length;
      const skipped = values.filter(v => v === 'skipped').length;
      return { done, skipped, pending: Math.max(0, total - done - skipped), total, status: session.challengeStatus[1] };
    }
    if (no === 3) {
      const rounds = session.challenge3?.rounds || [];
      const done = rounds.filter(r => r.status === 'completed').length;
      const skipped = rounds.filter(r => r.status === 'skipped').length;
      return { done, skipped, pending: Math.max(0, rounds.length - done - skipped), total: rounds.length, status: session.challengeStatus[2] };
    }
    const areas = session.challenge4?.areas || [];
    const done = areas.filter(r => r.status === 'completed').length;
    const skipped = areas.filter(r => r.status === 'skipped').length;
    return { done, skipped, pending: Math.max(0, areas.length - done - skipped), total: areas.length, status: session.challengeStatus[3] };
  }

  function renderChallengeNav(container, session, currentNo, labels = ['Pilah Sampah', 'Quiz Ekologi', 'Puzzle Bumi', 'Eksplorasi']) {
    if (!container) return;
    container.innerHTML = '';
    for (let i = 1; i <= TOTAL_CHALLENGES; i++) {
      const stats = getChallengeStats(session, i);
      const locked = i > session.highestUnlocked;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `challenge-nav-card${i === currentNo ? ' active' : ''}${locked ? ' locked' : ''}`;
      button.disabled = locked;
      button.setAttribute('aria-label', locked ? `Challenge ${i} terkunci` : `Buka ${labels[i - 1]}`);
      const icon = ['🗑️', '🌱', '🧩', '🔍'][i - 1];
      const statusIcon = stats.pending === 0 ? (stats.skipped > 0 ? '⏭️' : '✅') : '•';
      button.innerHTML = `<span class="challenge-nav-icon">${locked ? '🔒' : icon}</span><span class="challenge-nav-text"><strong>${i}. ${labels[i - 1]}</strong><small>${statusIcon} ${stats.done}/${stats.total}${stats.skipped ? ` · ${stats.skipped} dilewati` : ''}</small></span>`;
      if (!locked) button.addEventListener('click', () => goToChallenge(i));
      container.appendChild(button);
    }
  }

  function goToChallenge(no) {
    const session = loadSession();
    if (!session || no < 1 || no > TOTAL_CHALLENGES || no > session.highestUnlocked) return;
    if (session.status === 'playing') syncTime(session);
    session.status = 'instruction';
    session.currentChallenge = no;
    session.lastUpdatedAt = Date.now();
    saveSession(session);
    location.href = challengeRoute(no);
  }

  function markChallengeSkipped(session, no, itemStatusSetter) {
    itemStatusSetter?.(session);
    session.challengeStatus[no - 1] = 'skipped';
    if (no < TOTAL_CHALLENGES) unlockNextChallenge(session);
    saveSession(session);
  }

  function maybeMarkChallengeComplete(session, no, allResolved) {
    if (!allResolved) return false;
    const stats = getChallengeStats(session, no);
    const allCompleted = stats.total > 0 && stats.done === stats.total;
    session.challengeStatus[no - 1] = allCompleted ? 'completed' : 'skipped';
    if (no < TOTAL_CHALLENGES) {
      session.highestUnlocked = Math.max(session.highestUnlocked, no + 1);
      session.challengeStatus[no] = session.challengeStatus[no] === 'locked' ? 'pending' : session.challengeStatus[no];
    }
    saveSession(session);
    return true;
  }

  function unresolvedChallengeIndexes(session) {
    return [1,2,3,4].filter(no => getChallengeStats(session, no).pending > 0);
  }

  function skippedChallengeIndexes(session) {
    return [1,2,3,4].filter(no => getChallengeStats(session, no).skipped > 0);
  }

  function formatTime(seconds) {
    const sec = Math.max(0, Number(seconds) || 0);
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  }

  function updateTimerText(el, seconds) {
    if (!el) return;
    el.textContent = formatTime(seconds);
    el.classList.toggle('timer-warning', seconds <= 60 && seconds > 30);
    el.classList.toggle('timer-danger', seconds <= 30);
  }

  function setInstructionState(session) {
    if (!session.started) return;
    if (session.status === 'paused') return;
    session.status = 'instruction';
    session.lastUpdatedAt = Date.now();
    saveSession(session);
    stopGlobalTimer();
  }

  function continueFromInstruction(session, onTick, onTimeUp) {
    if (session.timeRemaining <= 0) {
      session.status = 'timeup';
      saveSession(session);
      onTimeUp?.(session);
      return;
    }
    session.status = 'playing';
    session.started = true;
    session.lastUpdatedAt = Date.now();
    saveSession(session);
    startGlobalTimer(session, onTick, onTimeUp);
  }

  function completeWholeGame(session) {
    session.status = 'completed';
    session.currentChallenge = 4;
    session.challengeStatus[3] = session.challengeStatus[3] === 'pending' ? 'completed' : session.challengeStatus[3];
    syncTime(session);
    saveSession(session);
    stopGlobalTimer();
  }

  function calculateScore(session) {
    const completionScore = [1,2,3,4].reduce((sum, no) => {
      const stats = getChallengeStats(session, no);
      return sum + stats.done * 20;
    }, 0);
    const challengeBonus = [1,2,3,4].filter(no => session.challengeStatus[no - 1] === 'completed').length * 100;
    const timeBonus = session.status === 'completed' ? Math.floor(Math.max(0, session.timeRemaining) / 5) : 0;
    return session.score + completionScore + challengeBonus + timeBonus;
  }

  window.GameCore = {
    SESSION_KEY, TOTAL_TIME, TOTAL_CHALLENGES,
    shuffle, makeDefaultSession, saveSession, loadSession, getOrCreateSession, resetSession,
    syncTime, startGlobalTimer, stopGlobalTimer, markTimerPaused, resumeTimer, startNewGame,
    ensureChallengeData, challengeRoute, setCurrentChallenge, unlockNextChallenge,
    getItemStatusLabel, getChallengeStats, renderChallengeNav, goToChallenge,
    markChallengeSkipped, maybeMarkChallengeComplete, unresolvedChallengeIndexes, skippedChallengeIndexes,
    formatTime, updateTimerText, setInstructionState, continueFromInstruction, completeWholeGame, calculateScore
  };
})();
