import { escapeHtml, formatTime } from '../utils.js';

export class CourtRenderer {
    constructor() {
        this.courtsGrid = document.getElementById('courtsGrid');
    }

    render(courts, handlers) {
        if (courts.length === 0) {
            this.courtsGrid.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🏟️</span>
                    <p>ยังไม่มีสนาม</p>
                    <p class="empty-sub admin-only">กดปุ่ม "+ เพิ่มสนาม" เพื่อสร้างสนามใหม่</p>
                </div>
            `;
            return;
        }

        this.courtsGrid.innerHTML = courts.map(court => {
            if (court.isActive) {
                return this._renderActiveCourt(court);
            }

            if (court.isWaiting) {
                return this._renderWaitingCourt(court);
            }

            return this._renderIdleCourt(court);
        }).join('');

        this.courtsGrid.querySelectorAll('[data-action="cancel-match"]').forEach(btn => {
            btn.addEventListener('click', () => handlers.onCancelMatch(parseInt(btn.dataset.courtId, 10)));
        });
        this.courtsGrid.querySelectorAll('[data-action="win"]').forEach(btn => {
            btn.addEventListener('click', () => handlers.onDeclareWinner(parseInt(btn.dataset.courtId, 10), btn.dataset.winner));
        });
        this.courtsGrid.querySelectorAll('[data-action="swap-players"]').forEach(btn => {
            btn.addEventListener('click', () => handlers.onSwapPlayers(parseInt(btn.dataset.courtId, 10)));
        });
        this.courtsGrid.querySelectorAll('[data-action="pick-challenger"]').forEach(btn => {
            btn.addEventListener('click', () => handlers.onPickChallenger(parseInt(btn.dataset.courtId, 10)));
        });
        this.courtsGrid.querySelectorAll('[data-action="rename-player"]').forEach(btn => {
            btn.addEventListener('click', () => handlers.onRenamePlayer(parseInt(btn.dataset.courtId, 10)));
        });
        this.courtsGrid.querySelectorAll('[data-action="requeue-defender"]').forEach(btn => {
            btn.addEventListener('click', () => handlers.onRequeueDefender(parseInt(btn.dataset.courtId, 10)));
        });
        this.courtsGrid.querySelectorAll('[data-action="remove-court"]').forEach(btn => {
            btn.addEventListener('click', () => handlers.onRemoveCourt(parseInt(btn.dataset.courtId, 10)));
        });
    }

    _renderActiveCourt(court) {
        const winsA = court.defendingWins > 0 ? `<span class="win-badge">🏆 ชนะต่อเนื่อง ${court.defendingWins}</span>` : '';

        return `
            <div class="court-card active" id="court-${court.id}">
                <div class="court-header">
                    <div class="court-title">
                        <div class="court-icon">🏸</div>
                        <div class="court-title-copy">
                            <div class="court-name-row">
                                <div class="court-name">${escapeHtml(court.name)}</div>
                                <span class="court-state-chip active">กำลังเล่น</span>
                            </div>
                            <div class="court-status">กำลังแข่งอยู่ตอนนี้</div>
                        </div>
                    </div>
                    <div class="court-side-meta">
                        ${winsA}
                        <div class="court-timer">${formatTime(court.elapsedTime)}</div>
                    </div>
                </div>
                <div class="court-body active">
                    <div class="court-team-column team-a-column">
                        <div class="court-team-label">ทีม A</div>
                        <div class="court-team-stack">
                            ${court.teamA.playing.map(player => `<span class="player-tag team-a-tag">${escapeHtml(player)}</span>`).join('')}
                        </div>
                    </div>
                    <div class="court-vs-pill">VS</div>
                    <div class="court-team-column team-b-column">
                        <div class="court-team-label">ทีม B</div>
                        <div class="court-team-stack">
                            ${court.teamB.playing.map(player => `<span class="player-tag team-b-tag">${escapeHtml(player)}</span>`).join('')}
                        </div>
                    </div>
                </div>
                <div class="court-footer">
                    <div class="court-actions">
                        <button class="btn btn-win btn-win-a" data-action="win" data-court-id="${court.id}" data-winner="A">
                            ทีม A ชนะ
                        </button>
                        <button class="btn btn-win btn-win-b" data-action="win" data-court-id="${court.id}" data-winner="B">
                            ทีม B ชนะ
                        </button>
                        <button class="btn btn-swap-players" data-action="swap-players" data-court-id="${court.id}">
                            สลับตัว
                        </button>
                        <button class="btn btn-cancel-match" data-action="cancel-match" data-court-id="${court.id}">
                            ยกเลิก
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    _renderWaitingCourt(court) {
        return `
            <div class="court-card waiting" id="court-${court.id}">
                <div class="court-header">
                    <div class="court-title">
                        <div class="court-icon">⏳</div>
                        <div class="court-title-copy">
                            <div class="court-name-row">
                                <div class="court-name">${escapeHtml(court.name)}</div>
                                <span class="court-state-chip waiting">รอคู่ต่อสู้</span>
                            </div>
                            <div class="court-status waiting-status">รอเลือกทีมท้าชิง</div>
                        </div>
                    </div>
                    <div class="court-side-meta">
                        <div class="court-timer win-count">🏆 ×${court.defendingWins}</div>
                    </div>
                </div>
                <div class="court-body waiting">
                    <div class="court-team-column team-a-column">
                        <div class="court-team-label">ทีมปัจจุบัน</div>
                        <div class="court-team-stack">
                            ${court.teamA.playing.map(player => `<span class="player-tag team-a-tag">${escapeHtml(player)}</span>`).join('')}
                        </div>
                    </div>
                    <div class="court-vs-pill">VS</div>
                    <div class="court-team-column pending">
                        <div class="court-team-label">คู่ต่อไป</div>
                        <div class="waiting-slot">
                            <span>❓</span>
                            <span>รอเลือกคู่</span>
                        </div>
                    </div>
                </div>
                <div class="court-footer">
                    <div class="court-actions">
                        <button class="btn btn-pick-challenger" data-action="pick-challenger" data-court-id="${court.id}">
                            เลือกทีมท้าชิง
                        </button>
                        <button class="btn btn-requeue-defender" data-action="requeue-defender" data-court-id="${court.id}">
                            ส่งกลับคิว
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    _renderIdleCourt(court) {
        return `
            <div class="court-card idle" id="court-${court.id}">
                <div class="court-header">
                    <div class="court-title">
                        <div class="court-icon">🏟️</div>
                        <div class="court-title-copy">
                            <div class="court-name-row">
                                <div class="court-name">${escapeHtml(court.name)}</div>
                                <span class="court-state-chip idle">ว่าง</span>
                            </div>
                            <div class="court-status">พร้อมเริ่มแมตช์ใหม่</div>
                        </div>
                    </div>
                    <div class="court-side-meta">
                        <div class="court-timer">พร้อมใช้งาน</div>
                    </div>
                </div>
                <div class="court-body idle">
                    <div class="court-idle-copy">
                        <span class="court-idle-icon">✨</span>
                        <span>สนามนี้ยังว่าง พร้อมเริ่มเกมใหม่</span>
                    </div>
                </div>
                <div class="court-footer">
                    <div class="court-actions">
                        <button class="btn btn-remove-court" data-action="remove-court" data-court-id="${court.id}">
                            ลบสนาม
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    updateTimers(courts) {
        courts.forEach(court => {
            if (court.isActive) {
                const timerEl = document.querySelector(`#court-${court.id} .court-timer`);
                if (timerEl) {
                    timerEl.textContent = formatTime(court.elapsedTime);
                }
            }
        });
    }
}
