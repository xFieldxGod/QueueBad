// ===========================
// 🏸 Badminton Queue System
// ===========================

// --- State ---
let queue = [];
let courts = [
    { id: 1, name: 'สนาม 1', players: [], startTime: null, timerInterval: null },
    { id: 2, name: 'สนาม 2', players: [], startTime: null, timerInterval: null },
    { id: 3, name: 'สนาม 3', players: [], startTime: null, timerInterval: null },
];
let history = [];
let gameMode = 4; // 4 = doubles (2v2)
let courtIdCounter = 4;
let modalCallback = null;

// --- DOM Refs ---
const playerNameInput = document.getElementById('playerNameInput');
const queueList = document.getElementById('queueList');
const emptyQueue = document.getElementById('emptyQueue');
const queueCount = document.getElementById('queueCount');
const queueActions = document.getElementById('queueActions');
const courtsGrid = document.getElementById('courtsGrid');
const historyList = document.getElementById('historyList');
const emptyHistory = document.getElementById('emptyHistory');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const statWaiting = document.getElementById('statWaiting');
const statPlaying = document.getElementById('statPlaying');
const toastContainer = document.getElementById('toastContainer');
const modalOverlay = document.getElementById('modalOverlay');
const sendToCourtBtn = document.getElementById('sendToCourtBtn');

// --- Init ---
function init() {
    loadState();
    renderQueue();
    renderCourts();
    renderHistory();
    updateStats();

    // Resume court timers
    courts.forEach(court => {
        if (court.startTime) {
            court.timerInterval = setInterval(() => renderCourts(), 1000);
        }
    });

    // Enter key to add player
    playerNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addPlayer();
    });
}

// --- Save/Load State with localStorage ---
function saveState() {
    const state = {
        queue,
        courts: courts.map(c => ({
            id: c.id,
            name: c.name,
            players: c.players,
            startTime: c.startTime,
        })),
        history,
        courtIdCounter,
    };
    localStorage.setItem('badmintonQueueState', JSON.stringify(state));
}

function loadState() {
    try {
        const saved = localStorage.getItem('badmintonQueueState');
        if (saved) {
            const state = JSON.parse(saved);
            queue = state.queue || [];
            history = state.history || [];
            courtIdCounter = state.courtIdCounter || 4;

            if (state.courts) {
                courts = state.courts.map(c => ({
                    ...c,
                    timerInterval: null,
                }));
            }
        }
    } catch (e) {
        console.error('Failed to load state:', e);
    }
}


// --- Add Player ---
function addPlayer() {
    const name = playerNameInput.value.trim();

    if (!name) {
        showToast('กรุณาพิมพ์ชื่อผู้เล่น', 'error', '⚠️');
        playerNameInput.focus();
        return;
    }

    // Check duplicate in queue
    if (queue.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        showToast(`"${name}" อยู่ในคิวแล้ว`, 'error', '⚠️');
        playerNameInput.focus();
        return;
    }

    // Check if playing
    const isPlaying = courts.some(c => c.players.some(p => p.toLowerCase() === name.toLowerCase()));
    if (isPlaying) {
        showToast(`"${name}" กำลังเล่นอยู่`, 'error', '⚠️');
        playerNameInput.focus();
        return;
    }

    queue.push({
        name,
        joinedAt: Date.now(),
    });

    playerNameInput.value = '';
    playerNameInput.focus();

    renderQueue();
    updateStats();
    saveState();
    showToast(`เพิ่ม "${name}" เข้าคิวแล้ว`, 'success', '✅');
}

// --- Remove from Queue ---
function removeFromQueue(index) {
    const player = queue[index];
    queue.splice(index, 1);
    renderQueue();
    updateStats();
    saveState();
    showToast(`นำ "${player.name}" ออกจากคิว`, 'info', '👋');
}

// --- Shuffle Queue ---
function shuffleQueue() {
    if (queue.length < 2) return;

    for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
    }

    renderQueue();
    saveState();
    showToast('สุ่มลำดับคิวแล้ว!', 'success', '🔀');
}

// --- Send to Court ---
function sendToCourt() {
    if (queue.length < gameMode) {
        showToast(`ต้องมีผู้เล่นอย่างน้อย ${gameMode} คน`, 'error', '⚠️');
        return;
    }

    // Find idle court
    const idleCourt = courts.find(c => c.players.length === 0);
    if (!idleCourt) {
        showToast('ไม่มีสนามว่าง!', 'error', '🚫');
        return;
    }

    // Take players from queue
    const players = queue.splice(0, gameMode).map(p => p.name);
    idleCourt.players = players;
    idleCourt.startTime = Date.now();

    // Start timer
    idleCourt.timerInterval = setInterval(() => renderCourts(), 1000);

    renderQueue();
    renderCourts();
    updateStats();
    saveState();

    const playerNames = players.join(', ');
    showToast(`${playerNames} ลง${idleCourt.name}แล้ว!`, 'success', '🚀');
}

// --- End Game ---
function endGame(courtId) {
    const court = courts.find(c => c.id === courtId);
    if (!court || court.players.length === 0) return;

    const players = [...court.players];
    const duration = court.startTime ? Date.now() - court.startTime : 0;

    // Add to history
    history.unshift({
        court: court.name,
        players,
        duration,
        endedAt: Date.now(),
    });

    // Keep only last 50 history items
    if (history.length > 50) history = history.slice(0, 50);

    // Reset court
    clearInterval(court.timerInterval);
    court.players = [];
    court.startTime = null;
    court.timerInterval = null;

    renderCourts();
    renderHistory();
    updateStats();
    saveState();

    showToast(`จบเกม ${court.name} แล้ว!`, 'info', '🏁');
}

// --- End Game & Re-queue ---
function endGameAndRequeue(courtId) {
    const court = courts.find(c => c.id === courtId);
    if (!court || court.players.length === 0) return;

    const players = [...court.players];
    const duration = court.startTime ? Date.now() - court.startTime : 0;

    // Add to history
    history.unshift({
        court: court.name,
        players,
        duration,
        endedAt: Date.now(),
    });

    if (history.length > 50) history = history.slice(0, 50);

    // Reset court
    clearInterval(court.timerInterval);
    court.players = [];
    court.startTime = null;
    court.timerInterval = null;

    // Re-add players to queue
    players.forEach(name => {
        queue.push({
            name,
            joinedAt: Date.now(),
        });
    });

    renderQueue();
    renderCourts();
    renderHistory();
    updateStats();
    saveState();

    showToast(`จบเกม ${court.name} & ต่อคิวใหม่!`, 'success', '🔄');
}

// --- Add Court ---
function addCourt() {
    courts.push({
        id: courtIdCounter,
        name: `สนาม ${courtIdCounter}`,
        players: [],
        startTime: null,
        timerInterval: null,
    });
    courtIdCounter++;
    renderCourts();
    updateStats();
    saveState();
    showToast('เพิ่มสนามใหม่แล้ว', 'success', '🏟️');
}

// --- Remove Court ---
function removeCourt(courtId) {
    const court = courts.find(c => c.id === courtId);
    if (!court) return;

    if (court.players.length > 0) {
        showToast('ไม่สามารถลบสนามที่กำลังใช้งาน', 'error', '⚠️');
        return;
    }

    if (courts.length <= 1) {
        showToast('ต้องมีสนามอย่างน้อย 1 สนาม', 'error', '⚠️');
        return;
    }

    showConfirmModal(
        'ลบสนาม',
        `ต้องการลบ "${court.name}" ใช่ไหม?`,
        () => {
            courts = courts.filter(c => c.id !== courtId);
            renderCourts();
            updateStats();
            saveState();
            showToast(`ลบ "${court.name}" แล้ว`, 'info', '🗑️');
        }
    );
}

// --- Clear History ---
function clearHistory() {
    showConfirmModal(
        'ล้างประวัติ',
        'ต้องการล้างประวัติการเล่นทั้งหมดใช่ไหม?',
        () => {
            history = [];
            renderHistory();
            saveState();
            showToast('ล้างประวัติแล้ว', 'info', '🗑️');
        }
    );
}

// --- Render Queue ---
function renderQueue() {
    if (queue.length === 0) {
        queueList.innerHTML = `
            <div class="empty-state" id="emptyQueue">
                <span class="empty-icon">🎯</span>
                <p>ยังไม่มีคนในคิว</p>
                <p class="empty-sub">เพิ่มชื่อผู้เล่นด้านบนเพื่อเข้าคิว</p>
            </div>`;
        queueActions.style.display = 'none';
    } else {
        queueList.innerHTML = queue.map((player, index) => `
            <div class="queue-item" id="queue-item-${index}">
                <div class="queue-number">${index + 1}</div>
                <div class="queue-name">${escapeHtml(player.name)}</div>
                <div class="queue-time">${getTimeAgo(player.joinedAt)}</div>
                <button class="queue-remove" onclick="removeFromQueue(${index})" title="นำออกจากคิว">✕</button>
            </div>
        `).join('');
        queueActions.style.display = 'flex';
    }

    queueCount.textContent = `${queue.length} คน`;
    updateSendButton();
}

// --- Render Courts ---
function renderCourts() {
    courtsGrid.innerHTML = courts.map(court => {
        const isActive = court.players.length > 0;
        const elapsed = court.startTime ? formatTime(Date.now() - court.startTime) : '';
        const halfCount = Math.ceil(court.players.length / 2);

        const team1 = court.players.slice(0, halfCount);
        const team2 = court.players.slice(halfCount);

        return `
            <div class="court-card ${isActive ? 'active' : 'idle'}" id="court-${court.id}">
                <div class="court-header">
                    <div class="court-title">
                        <div class="court-icon">${isActive ? '🏸' : '🏟️'}</div>
                        <div>
                            <div class="court-name">${escapeHtml(court.name)}</div>
                            <div class="court-status">${isActive ? 'กำลังเล่น' : 'ว่าง'}</div>
                        </div>
                    </div>
                    <div class="court-timer">${isActive ? elapsed : 'พร้อมใช้งาน'}</div>
                </div>
                ${isActive ? `
                    <div class="court-players">
                        ${team1.map(p => `<span class="player-tag">${escapeHtml(p)}</span>`).join('')}
                        ${team2.length > 0 ? `<span class="vs-divider">VS</span>` : ''}
                        ${team2.map(p => `<span class="player-tag">${escapeHtml(p)}</span>`).join('')}
                    </div>
                    <div class="court-actions">
                        <button class="btn btn-end-game" onclick="endGameAndRequeue(${court.id})">
                            🔄 จบ & ต่อคิว
                        </button>
                        <button class="btn btn-end-game" onclick="endGame(${court.id})">
                            🏁 จบเกม
                        </button>
                    </div>
                ` : `
                    <div class="court-actions">
                        <button class="btn btn-remove-court" onclick="removeCourt(${court.id})">
                            🗑️ ลบสนาม
                        </button>
                    </div>
                `}
            </div>
        `;
    }).join('');
}

// --- Render History ---
function renderHistory() {
    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state" id="emptyHistory">
                <span class="empty-icon">📝</span>
                <p>ยังไม่มีประวัติการเล่น</p>
            </div>`;
        clearHistoryBtn.style.display = 'none';
    } else {
        historyList.innerHTML = history.map((item, index) => `
            <div class="history-item" id="history-${index}">
                <div class="history-court">${escapeHtml(item.court)}</div>
                <div class="history-players">${item.players.map(p => escapeHtml(p)).join(' vs ')}</div>
                <div class="history-duration">⏱️ ${formatTime(item.duration)}</div>
                <div class="history-time">${formatTimestamp(item.endedAt)}</div>
            </div>
        `).join('');
        clearHistoryBtn.style.display = 'inline-flex';
    }
}

// --- Update Stats ---
function updateStats() {
    const waitingCount = queue.length;
    const playingCount = courts.reduce((sum, c) => sum + c.players.length, 0);

    statWaiting.querySelector('.stat-number').textContent = waitingCount;
    statPlaying.querySelector('.stat-number').textContent = playingCount;
}

// --- Update Send Button ---
function updateSendButton() {
    const hasEnoughPlayers = queue.length >= gameMode;
    const hasIdleCourt = courts.some(c => c.players.length === 0);
    sendToCourtBtn.disabled = !(hasEnoughPlayers && hasIdleCourt);

    if (!hasIdleCourt && queue.length > 0) {
        sendToCourtBtn.innerHTML = `<span class="btn-icon">🚫</span><span>ไม่มีสนามว่าง</span>`;
    } else if (!hasEnoughPlayers && queue.length > 0) {
        sendToCourtBtn.innerHTML = `<span class="btn-icon">⏳</span><span>รอผู้เล่นเพิ่ม (ต้องการ ${gameMode} คน)</span>`;
    } else {
        sendToCourtBtn.innerHTML = `<span class="btn-icon">🚀</span><span>ส่งลงสนาม</span>`;
    }
}

// --- Toast Notification ---
function showToast(message, type = 'info', icon = 'ℹ️') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.4s ease-in forwards';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// --- Confirmation Modal ---
function showConfirmModal(title, message, callback) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    modalOverlay.classList.add('active');
    modalCallback = callback;
}

function confirmModal() {
    if (modalCallback) modalCallback();
    closeModal();
}

function closeModal() {
    modalOverlay.classList.remove('active');
    modalCallback = null;
}

// Close modal on overlay click
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// --- Utility Functions ---
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getTimeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'เมื่อกี้';
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    const hours = Math.floor(minutes / 60);
    return `${hours} ชม.ที่แล้ว`;
}

function formatTimestamp(timestamp) {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

// --- Auto-refresh queue time display ---
setInterval(() => {
    if (queue.length > 0) {
        const timeElements = document.querySelectorAll('.queue-time');
        timeElements.forEach((el, index) => {
            if (queue[index]) {
                el.textContent = getTimeAgo(queue[index].joinedAt);
            }
        });
    }
}, 30000);

// --- Initialize ---
init();
