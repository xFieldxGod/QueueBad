// ===========================
// 🎨 Renderer UI Component (Rewrite for Pair System)
// ===========================

import { escapeHtml, formatTime, getTimeAgo, formatTimestamp } from '../utils.js';
import { CourtRenderer } from './CourtRenderer.js';

export class Renderer {
    constructor() {
        this.queueList = document.getElementById('queueList');
        this.queueCount = document.getElementById('queueCount');
        this.queueActions = document.getElementById('queueActions');
        this.courtsGrid = document.getElementById('courtsGrid');
        this.historyList = document.getElementById('historyList');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        this.menuHistoryCount = document.getElementById('menuHistoryCount');
        this.statWaiting = document.getElementById('statWaiting');
        this.statPlaying = document.getElementById('statPlaying');
        this.sendToCourtBtn = document.getElementById('sendToCourtBtn');
        this.viewerPresenceBadge = document.getElementById('viewerPresenceBadge');
        this.syncStatusBadge = document.getElementById('syncStatusBadge');

        this.courtRenderer = new CourtRenderer();
    }

    updatePresenceStatus(presence) {
        if (!this.viewerPresenceBadge || !presence) return;

        let stateClass = 'local';
        let label = 'คนกำลังดู';
        let detail = 'เฉพาะเครื่องนี้';

        if (presence.available && presence.state === 'online') {
            stateClass = 'online';
            label = `${presence.count ?? 0} คนกำลังดู`;
            detail = (presence.count ?? 0) <= 1 ? 'ตอนนี้คุณกำลังดูอยู่' : 'กำลังดูคิวแบบเรียลไทม์';
        } else if (presence.state === 'offline') {
            stateClass = 'offline';
            label = 'คนกำลังดู';
            detail = 'ออฟไลน์อยู่ชั่วคราว';
        }

        this.viewerPresenceBadge.className = `presence-status-badge ${stateClass}`;

        const labelEl = this.viewerPresenceBadge.querySelector('.presence-status-label');
        const detailEl = this.viewerPresenceBadge.querySelector('.presence-status-detail');

        if (labelEl) {
            labelEl.textContent = label;
        }

        if (detailEl) {
            detailEl.textContent = detail;
        }

        this.viewerPresenceBadge.classList.remove('is-pulsing');
        void this.viewerPresenceBadge.offsetWidth;
        this.viewerPresenceBadge.classList.add('is-pulsing');

        clearTimeout(this.viewerPresenceBadge.__pulseTimeout);
        this.viewerPresenceBadge.__pulseTimeout = setTimeout(() => {
            this.viewerPresenceBadge?.classList.remove('is-pulsing');
        }, 850);
    }

    updateSyncStatus(status) {
        if (!this.syncStatusBadge || !status) return;

        this.syncStatusBadge.className = `sync-status-badge ${status.state}`;

        const labelEl = this.syncStatusBadge.querySelector('.sync-status-label');
        const detailEl = this.syncStatusBadge.querySelector('.sync-status-detail');

        if (labelEl) {
            labelEl.textContent = status.label;
        }

        if (detailEl) {
            detailEl.textContent = status.detail;
        }

        this.pulseSyncStatus();
    }

    highlightQueueSlot(slotId, variant = 'success') {
        this._highlightElement(document.getElementById(`queue-slot-${slotId}`), variant);
    }

    highlightCourt(courtId, variant = 'success') {
        this._highlightElement(document.getElementById(`court-${courtId}`), variant);
    }

    highlightHistoryItem(index = 0, variant = 'info') {
        this._highlightElement(document.getElementById(`history-${index}`), variant);
    }

    highlightQueueCount(variant = 'info') {
        this._highlightElement(this.queueCount, variant);
    }

    highlightSendButton(variant = 'info') {
        this._highlightElement(this.sendToCourtBtn, variant);
    }

    pulseSyncStatus() {
        if (!this.syncStatusBadge) return;

        this.syncStatusBadge.classList.remove('is-pulsing');
        void this.syncStatusBadge.offsetWidth;
        this.syncStatusBadge.classList.add('is-pulsing');

        clearTimeout(this.syncStatusBadge.__pulseTimeout);
        this.syncStatusBadge.__pulseTimeout = setTimeout(() => {
            this.syncStatusBadge?.classList.remove('is-pulsing');
        }, 850);
    }

    _highlightElement(element, variant = 'success') {
        if (!element) return;

        element.classList.remove('is-feedback', 'feedback-success', 'feedback-info', 'feedback-warning', 'feedback-danger');
        void element.offsetWidth;
        element.classList.add('is-feedback', `feedback-${variant}`);

        clearTimeout(element.__feedbackTimeout);
        element.__feedbackTimeout = setTimeout(() => {
            element.classList.remove('is-feedback', 'feedback-success', 'feedback-info', 'feedback-warning', 'feedback-danger');
        }, 1500);
    }

    // =============================
    // Queue Rendering
    // =============================

    /**
     * render คิว (รองรับ solo/pair + selection)
     * @param {import('../models/QueueSlot.js').QueueSlot[]} slots
     * @param {number|null} selectedA - slotId ที่เลือกเป็นทีม A
     * @param {number|null} selectedB - slotId ที่เลือกเป็นทีม B
     * @param {Object} handlers - { onRemove, onPair, onRename, onUnpair, onSelect }
     */
    renderQueue(slots, selectedA, selectedB, handlers) {
        if (slots.length === 0) {
            this.queueList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🎯</span>
                    <p>ยังไม่มีคนในคิว</p>
                    <p class="empty-sub user-only">รอแอดมินเพิ่มผู้เล่นเข้าคิว...</p>
                    <p class="empty-sub admin-only">เพิ่มรายชื่อนักกีฬา แล้วเลือกคนที่มาเข้าคิววันนี้</p>
                </div>`;
            this.queueActions.style.display = 'none';
        } else {
            this.queueList.innerHTML = slots.map((slot, index) => {
                let selectionClass = '';
                let selectionBadge = '';

                if (slot.id === selectedA) {
                    selectionClass = 'selected-a';
                    selectionBadge = '<span class="team-badge team-a-badge">ทีม A</span>';
                } else if (slot.id === selectedB) {
                    selectionClass = 'selected-b';
                    selectionBadge = '<span class="team-badge team-b-badge">ทีม B</span>';
                }

                const typeClass = slot.isPaired ? 'paired' : 'solo';
                const clickable = slot.isPaired ? 'clickable' : '';
                return `
                    <div class="queue-item ${typeClass} ${selectionClass} ${clickable}"
                         id="queue-slot-${slot.id}"
                         data-slot-id="${slot.id}">
                        <div class="queue-item-shell">
                            <div class="queue-main">
                                <div class="queue-topline">
                                    <div class="drag-handle admin-only" title="ลากเพื่อสลับคิว"><div class="drag-icon"></div></div>
                                    <span class="queue-number">${index + 1}</span>
                                    <span class="queue-name">${escapeHtml(slot.displayName)}</span>
                                    ${selectionBadge}
                                    <span class="queue-meta">
                                        <span class="queue-time">${getTimeAgo(slot.joinedAt)}</span>
                                    </span>
                                </div>
                            </div>
                            <div class="queue-item-actions">
                                ${slot.isSolo ? `
                                    <button class="btn-action btn-pair" data-action="pair" data-slot-id="${slot.id}" title="จับคู่">
                                        👫 จับคู่
                                    </button>
                                    <button class="btn-action btn-remove" data-action="remove" data-slot-id="${slot.id}" title="นำออก">
                                        🗑️ ลบ
                                    </button>
                                ` : `
                                    <button class="btn-action btn-unpair" data-action="unpair" data-slot-id="${slot.id}" title="แยกคู่">
                                        ✂️ แยกคู่
                                    </button>
                                `}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // Hide actions container entirely if not an admin. We manage this via CSS class admin-only
            // but for safety, we also apply display flex only if it has elements to show.
            this.queueActions.style.display = slots.some(s => s.isPaired) ? 'flex' : 'none';

            // Bind events
            this.queueList.querySelectorAll('[data-action="remove"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handlers.onRemove(parseInt(btn.dataset.slotId));
                });
            });
            this.queueList.querySelectorAll('[data-action="pair"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handlers.onPair(parseInt(btn.dataset.slotId));
                });
            });
            this.queueList.querySelectorAll('[data-action="unpair"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handlers.onUnpair(parseInt(btn.dataset.slotId));
                });
            });

            // Click on paired slot to select for court (admin only)
            this.queueList.querySelectorAll('.queue-item.paired.clickable').forEach(item => {
                item.addEventListener('click', () => {
                    // ถ้าอยู่ในโหมด user ห้ามเลือกทีม A/B
                    if (document.body.classList.contains('user-mode')) return;
                    handlers.onSelect(parseInt(item.dataset.slotId));
                });
            });
        }

        const totalPlayers = slots.reduce((s, sl) => s + sl.players.length, 0);
        const pairCount = slots.filter(sl => sl.isPaired).length;
        const soloCount = slots.filter(sl => sl.isSolo).length;

        if (this.queueCount) {
            this.queueCount.innerHTML = `
                <span class="queue-count-title">ในคิวตอนนี้</span>
                <span class="queue-count-main">${totalPlayers} คน</span>
                <span class="queue-count-chip queue-count-chip-pair">${pairCount} คู่</span>
                <span class="queue-count-chip queue-count-chip-solo">${soloCount} เดี่ยว</span>
            `;
        }
    }

    // =============================
    // Courts Rendering
    // =============================

    /**
     * render สนาม (updated for team system)
     * @param {import('../models/Court.js').Court[]} courts
     * @param {Object} handlers
     */
    renderCourts(courts, handlers) {
        this.courtRenderer.render(courts, handlers);
    }

    // =============================
    // History Rendering
    // =============================

    renderHistory(items) {
        const markup = items.length === 0
            ? `
                <div class="empty-state">
                    <span class="empty-icon">📝</span>
                    <p>ยังไม่มีประวัติการเล่น</p>
                </div>`
            : items.map((item, index) => this._createHistoryItemMarkup(item, index)).join('');

        if (items.length === 0) {
            this.historyList.innerHTML = markup;
            this.clearHistoryBtn.style.display = 'none';
        } else {
            this.historyList.innerHTML = markup;
            this.clearHistoryBtn.style.display = 'inline-flex';
        }

        if (this.menuHistoryCount) {
            this.menuHistoryCount.textContent = `${items.length}`;
        }
    }

    _createHistoryItemMarkup(item, index) {
        const hasExplicitResult = item.winnerPlayers && item.winnerPlayers.length > 0 && item.loserPlayers && item.loserPlayers.length > 0;
        const playersDisplay = (item.players || []).map(p => escapeHtml(p)).join(' VS ');
        const deleteButton = `
            <button class="history-item-delete admin-only" data-action="remove-history" data-history-index="${index}" title="ลบประวัติรายการนี้">
                🗑️
            </button>
        `;

        if (!hasExplicitResult) {
            return `
                <div class="history-item" id="history-${index}">
                    <div class="history-header-row">
                        <div class="history-header-meta">
                            <div class="history-court">${escapeHtml(item.court)}</div>
                            <div class="history-duration">⏱️ ${formatTime(item.duration)}</div>
                        </div>
                        ${deleteButton}
                    </div>
                    <div class="history-result-row legacy">
                        <span class="history-result-badge legacy">เดิม</span>
                        <div class="history-result-players">${playersDisplay || 'ไม่มีรายละเอียดผู้เล่น'}</div>
                    </div>
                    <div class="history-time">${formatTimestamp(item.endedAt)}</div>
                </div>
            `;
        }

        const winnerPlayers = item.winnerPlayers;
        const loserPlayers = item.loserPlayers;

        return `
            <div class="history-item" id="history-${index}">
                <div class="history-header-row">
                    <div class="history-header-meta">
                        <div class="history-court">${escapeHtml(item.court)}</div>
                        <div class="history-duration">⏱️ ${formatTime(item.duration)}</div>
                    </div>
                    ${deleteButton}
                </div>
                <div class="history-result-row winner">
                    <span class="history-result-badge winner">ชนะ</span>
                    <div class="history-result-players">${winnerPlayers.map(p => escapeHtml(p)).join(', ')}</div>
                </div>
                <div class="history-result-row loser">
                    <span class="history-result-badge loser">แพ้</span>
                    <div class="history-result-players">${loserPlayers.map(p => escapeHtml(p)).join(', ')}</div>
                </div>
                <div class="history-time">${formatTimestamp(item.endedAt)}</div>
            </div>
        `;
    }

    // =============================
    // Stats & Buttons
    // =============================

    updateStats(waitingCount, playingCount) {
        this.statWaiting?.querySelector('.stat-number')?.replaceChildren(document.createTextNode(String(waitingCount)));
        this.statPlaying?.querySelector('.stat-number')?.replaceChildren(document.createTextNode(String(playingCount)));
    }

    /**
     * อัปเดตสถานะปุ่มส่งลงสนาม
     * @param {number|null} selectedA
     * @param {number|null} selectedB
     * @param {boolean} hasIdleCourt
     * @param {import('../models/QueueSlot.js').QueueSlot|null} slotA
     * @param {import('../models/QueueSlot.js').QueueSlot|null} slotB
     */
    updateSendButton(selectedA, selectedB, hasIdleCourt, slotA, slotB) {
        const hasBothTeams = selectedA !== null && selectedB !== null;

        if (!hasIdleCourt) {
            this.sendToCourtBtn.disabled = true;
            this.sendToCourtBtn.innerHTML = `<span class="btn-icon">🚫</span><span>ไม่มีสนามว่าง</span>`;
        } else if (!hasBothTeams && selectedA === null) {
            this.sendToCourtBtn.disabled = true;
            this.sendToCourtBtn.innerHTML = `<span class="btn-icon">👆</span><span>คลิกเลือก 2 คู่เพื่อส่งลงสนาม</span>`;
        } else if (!hasBothTeams) {
            this.sendToCourtBtn.disabled = true;
            this.sendToCourtBtn.innerHTML = `<span class="btn-icon">👆</span><span>เลือกคู่อีก 1 คู่</span>`;
        } else {
            this.sendToCourtBtn.disabled = false;
            const preview = `${slotA.displayName} vs ${slotB.displayName}`;
            this.sendToCourtBtn.innerHTML = `<span class="btn-icon">🚀</span><span>ส่งลงสนาม: ${escapeHtml(preview)}</span>`;
        }
    }

    updateCourtTimers(courts) {
        this.courtRenderer.updateTimers(courts);
    }

    refreshQueueTimes(slots) {
        slots.forEach((slot) => {
            const el = document.querySelector(`#queue-slot-${slot.id} .queue-time`);
            if (el) {
                el.textContent = getTimeAgo(slot.joinedAt);
            }
        });
    }
}
