// ===========================
// ðŸ¸ Badminton Queue App (Rewrite for Pair System)
// ===========================

import { QueueManager } from './managers/QueueManager.js';
import { CourtManager } from './managers/CourtManager.js';
import { HistoryManager } from './managers/HistoryManager.js';
import { StorageManager } from './managers/StorageManager.js';
import { AdminManager } from './managers/AdminManager.js';
import { MatchManager } from './managers/MatchManager.js';
import { QueueActionManager } from './managers/QueueActionManager.js';
import { Toast } from './ui/Toast.js';
import { Modal } from './ui/Modal.js';
import { Renderer } from './ui/Renderer.js';
import { PlayerPickerModal } from './ui/PlayerPickerModal.js';
import { PlayerRenameModal } from './ui/PlayerRenameModal.js';
import { CourtSwapModal } from './ui/CourtSwapModal.js';
import { ShareWebModal } from './ui/ShareWebModal.js';

export class App {
    constructor() {
        this.queue = new QueueManager();
        this.courts = new CourtManager(3);
        this.history = new HistoryManager(50);
        this.storage = new StorageManager();

        this.toast = new Toast();
        this.modal = new Modal();
        this.renderer = new Renderer();
        this.playerPicker = new PlayerPickerModal();
        this.playerRenameModal = new PlayerRenameModal();
        this.courtSwapModal = new CourtSwapModal();
        this.shareWebUrl = window.location.origin + window.location.pathname;
        this.shareWebModal = new ShareWebModal(this.toast, this.shareWebUrl);

        this.admin = new AdminManager(this);
        this.match = new MatchManager(this);
        this.queueAction = new QueueActionManager(this);
        this.storage.onSyncStatusChange((status) => this.renderer.updateSyncStatus(status));
        this.storage.onPresenceChange((presence) => this.renderer.updatePresenceStatus(presence));

        // --- Selection State ---
        /** @type {number|null} slotId à¸—à¸µà¹ˆà¹€à¸¥à¸·à¸­à¸à¹€à¸›à¹‡à¸™à¸—à¸µà¸¡ A */
        this.selectedA = null;
        /** @type {number|null} slotId à¸—à¸µà¹ˆà¹€à¸¥à¸·à¸­à¸à¹€à¸›à¹‡à¸™à¸—à¸µà¸¡ B */
        this.selectedB = null;

        this.playerNameInput = document.getElementById('playerNameInput');
        this.playerSkillInput = document.getElementById('playerSkillInput');
        this.playerRosterList = document.getElementById('playerRosterList');
        this.playerRosterSearchInput = document.getElementById('playerRosterSearchInput');
        this.playerRosterSearchBtn = document.getElementById('playerRosterSearchBtn');
        this.mainAppView = document.getElementById('mainAppView');
        this.historyPageSection = document.getElementById('historyPageSection');
        this.historyList = document.getElementById('historyList');
        this.backupImportInput = document.getElementById('backupImportInput');
        this.currentView = 'main';

        this.playerRoster = [];
        this.nextPlayerId = 1;
        this.todayAttendance = {};
        this.rosterSearchQuery = '';
        this.activeAdminMobileTab = 'queue';
        this.adminMobileMediaQuery = window.matchMedia('(max-width: 768px)');
        this.adminMobileTabs = document.getElementById('adminMobileTabs');
        this.adminMobileTabButtons = Array.from(document.querySelectorAll('[data-admin-mobile-tab]'));
        this.adminMobilePanels = Array.from(document.querySelectorAll('[data-admin-mobile-panel]'));
        this.adminMobileQueueHeader = document.querySelector('[data-admin-mobile-queue-header]');
        this.adminMobileToolsHeader = document.querySelector('[data-admin-mobile-tools-header]');
        this.adminMobileQueueSection = document.querySelector('.queue-section');
    }

    // =============================
    // Initialization
    // =============================

    async init() {
        await this._loadState();
        this.admin.init(); // Initialize Admin system
        this._render();
        this.showMainPage();
        this._resumeTimers();
        this._bindEvents();
        this._startAutoRefresh();
        this._initAdminMobileTabs();

        this._initSortable();

        // à¸£à¸±à¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸­à¸±à¸›à¹€à¸”à¸•à¹à¸šà¸šà¹€à¸£à¸µà¸¢à¸¥à¹„à¸—à¸¡à¹Œ (à¹€à¸¡à¸·à¹ˆà¸­à¹€à¸žà¸·à¹ˆà¸­à¸™/à¹€à¸„à¸£à¸·à¹ˆà¸­à¸‡à¸­à¸·à¹ˆà¸™à¹à¸à¹‰à¹„à¸‚à¸­à¸°à¹„à¸£)
        this.storage.onRemoteChange((payload) => {
            this._handleRemoteUpdate(payload);
        });
    }

    _initSortable() {
        const queueListEl = document.getElementById('queueList');
        if (!queueListEl) return;

        // Initialize SortableJS
        if (typeof Sortable !== 'undefined') {
            new Sortable(queueListEl, {
                handle: '.drag-handle', // Allows dragging only when clicking the handle
                animation: 150, // Smooth slide animation
                ghostClass: 'sortable-ghost',
                dragClass: 'sortable-drag',
                forceFallback: true, // Force the use of built-in HTML5 DND fallback for consistent styling
                fallbackClass: 'sortable-drag', // Class name for the cloned DOM Element when using forceFallback
                fallbackOnBody: true, // Appends the cloned DOM Element into the Document's Body
                fallbackTolerance: 3, // Delay before dragging starts (in pixels)
                delay: 0,
                delayOnTouchOnly: true,
                onEnd: (evt) => {
                    // Update internal data model
                    if (evt.oldIndex !== undefined && evt.newIndex !== undefined && evt.oldIndex !== evt.newIndex) {
                        this.queue.reorderSlot(evt.oldIndex, evt.newIndex);
                        this._saveState();
                        this._renderQueue(); // Re-render to ensure numbers and state are fresh
                        
                        const slot = this.queue.slots[evt.newIndex];
                        if (slot) {
                            this.toast.info(`ย้ายคิว "${slot.displayName}" เรียบร้อย`, '↕️');
                        }
                    }
                }
            });
        }
    }

    _handleRemoteUpdate(payload) {
        const newState = payload?.state || payload;
        const updatedByCurrentViewer = payload?.meta?.updatedBy === this.storage.viewerId;
        if (!newState) return;

        const previousHistoryCount = this.history.count;
        const previousQueueCount = this.queue.playerCount;

        this._clearCourtTimers();
        this.queue.loadFromData(newState.queue);
        this.courts.loadFromData(newState.courts, newState.courtIdCounter);
        this.history.loadFromData(newState.history);
        this._loadRosterState(newState);
        this._render();
        this._resumeTimers();

        if (!updatedByCurrentViewer) {
            this.toast.info('มีการอัปเดตจากอุปกรณ์อื่น', '🔄');
            this.renderer.highlightQueueCount('info');
        }

        if (this.history.count > previousHistoryCount) {
            this.renderer.highlightHistoryItem(0, 'info');
        }

        if (this.queue.playerCount !== previousQueueCount) {
            this.renderer.highlightSendButton('info');
        }
    }

    _bindEvents() {
        this.playerNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.queueAction.addPlayer();
        });
        document.getElementById('addPlayerBtn').addEventListener('click', () => this.queueAction.addPlayer());
        document.getElementById('sendToCourtBtn').addEventListener('click', () => this.match.sendToCourt());
        document.getElementById('addCourtBtn').addEventListener('click', () => this.addCourt());
        document.getElementById('clearHistoryBtn').addEventListener('click', () => this.clearHistory());
        document.getElementById('historyBackBtn')?.addEventListener('click', () => this.showMainPage());
        document.getElementById('menuExportBackup')?.addEventListener('click', () => this.exportBackup());
        document.getElementById('menuImportBackup')?.addEventListener('click', () => this.openImportBackup());
        this.playerRosterSearchBtn?.addEventListener('click', () => this.applyRosterSearch());
        this.playerRosterSearchInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.applyRosterSearch();
            }
        });
        this.playerRosterSearchInput?.addEventListener('input', () => {
            this.applyRosterSearch();
        });
        this.historyList?.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('[data-action="remove-history"]');
            if (!deleteBtn) return;

            const index = parseInt(deleteBtn.dataset.historyIndex, 10);
            if (Number.isNaN(index)) return;

            e.preventDefault();
            this.removeHistoryItem(index);
        });

        // à¸›à¸¸à¹ˆà¸¡à¸¢à¸à¹€à¸¥à¸´à¸à¹€à¸¥à¸·à¸­à¸
        const clearSelBtn = document.getElementById('clearSelectionBtn');
        if (clearSelBtn) {
            clearSelBtn.addEventListener('click', () => this.queueAction.clearSelection());
        }

        this.playerRosterList?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-roster-action]');
            if (!btn) return;

            const playerId = parseInt(btn.dataset.playerId, 10);
            if (Number.isNaN(playerId)) return;

            const action = btn.dataset.rosterAction;
            if (action === 'add-to-queue') {
                this.addRosterPlayerToQueue(playerId);
            } else if (action === 'rename-player') {
                this.openRosterRename(playerId);
            } else if (action === 'remove-player') {
                this.removeRosterPlayer(playerId);
            }
        });

        this.backupImportInput?.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            await this.importBackupFile(file);
            e.target.value = '';
        });

        this.adminMobileTabs?.addEventListener('click', (e) => {
            const button = e.target.closest('[data-admin-mobile-tab]');
            if (!button) return;

            this.setActiveAdminMobileTab(button.dataset.adminMobileTab);
        });
    }

    showHistoryPage() {
        this.currentView = 'history';
        if (this.mainAppView) this.mainAppView.style.display = 'none';
        if (this.historyPageSection) this.historyPageSection.style.display = 'block';
        document.body.classList.add('history-view');
        this.syncAdminMobileTabs();
        window.scrollTo({ top: 0, behavior: 'auto' });
    }

    showMainPage() {
        this.currentView = 'main';
        if (this.mainAppView) this.mainAppView.style.display = '';
        if (this.historyPageSection) this.historyPageSection.style.display = 'none';
        document.body.classList.remove('history-view');
        this.syncAdminMobileTabs();
        window.scrollTo({ top: 0, behavior: 'auto' });
    }

    _initAdminMobileTabs() {
        const syncTabs = () => this.syncAdminMobileTabs();

        if (typeof this.adminMobileMediaQuery.addEventListener === 'function') {
            this.adminMobileMediaQuery.addEventListener('change', syncTabs);
        } else if (typeof this.adminMobileMediaQuery.addListener === 'function') {
            this.adminMobileMediaQuery.addListener(syncTabs);
        }

        this.syncAdminMobileTabs();
    }

    isAdminMobileTabsActive() {
        return Boolean(
            this.admin?.isAdmin
            && this.currentView === 'main'
            && this.adminMobileMediaQuery.matches
        );
    }

    resetAdminMobileTab() {
        this.activeAdminMobileTab = 'queue';
        this.syncAdminMobileTabs();
    }

    setActiveAdminMobileTab(tab) {
        if (!['courts', 'queue', 'tools'].includes(tab)) return;

        this.activeAdminMobileTab = tab;
        this.syncAdminMobileTabs();
    }

    syncAdminMobileTabs() {
        const isActive = this.isAdminMobileTabsActive();
        const activeTab = ['courts', 'queue', 'tools'].includes(this.activeAdminMobileTab)
            ? this.activeAdminMobileTab
            : 'queue';

        document.body.classList.toggle('admin-mobile-tabs-active', isActive);

        this.adminMobileTabButtons.forEach((button) => {
            const isSelected = isActive && button.dataset.adminMobileTab === activeTab;
            button.classList.toggle('is-active', isSelected);
            button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        });

        if (!isActive) {
            this.adminMobilePanels.forEach((panel) => {
                panel.hidden = false;
            });

            if (this.adminMobileQueueHeader) {
                this.adminMobileQueueHeader.hidden = false;
            }

            if (this.adminMobileToolsHeader) {
                this.adminMobileToolsHeader.hidden = true;
            }

            if (this.adminMobileQueueSection) {
                this.adminMobileQueueSection.hidden = false;
            }

            return;
        }

        this.adminMobilePanels.forEach((panel) => {
            panel.hidden = panel.dataset.adminMobilePanel !== activeTab;
        });

        if (this.adminMobileQueueHeader) {
            this.adminMobileQueueHeader.hidden = activeTab !== 'queue';
        }

        if (this.adminMobileToolsHeader) {
            this.adminMobileToolsHeader.hidden = activeTab !== 'tools';
        }

        if (this.adminMobileQueueSection) {
            this.adminMobileQueueSection.hidden = activeTab === 'courts';
        }
    }

    _resumeTimers() {
        this.courts.courts.forEach(court => {
            if (court.isActive) {
                court.startTimer(() => this._updateTimersOnly());
            }
        });
    }

    _clearCourtTimers() {
        this.courts.courts.forEach(court => {
            if (court?.clearTimer) {
                court.clearTimer();
            }
        });
    }

    _startAutoRefresh() {
        setInterval(() => {
            if (!this.queue.isEmpty) {
                this.renderer.refreshQueueTimes(this.queue.slots);
            }
        }, 30000);
    }

    // =============================
    // Court Adding / Removing Logic
    // =============================

    /** à¹€à¸žà¸´à¹ˆà¸¡à¸ªà¸™à¸²à¸¡ */
    addCourt() {
        const court = this.courts.addCourt();
        this._renderCourts();
        this._updateStats();
        this._saveState();
        if (court) {
            this.renderer.highlightCourt(court.id, 'success');
        }
        this.toast.success('เพิ่มสนามใหม่แล้ว', '🏟️');
    }

    /** à¸¥à¸šà¸ªà¸™à¸²à¸¡ */
    removeCourt(courtId) {
        const court = this.courts.findById(courtId);
        if (!court) return;

        if (court.isActive || court.isWaiting) {
            this.toast.error('ไม่สามารถลบสนามที่กำลังใช้งาน');
            return;
        }

        this.modal.show('ลบสนาม', `ต้องการลบ "${court.name}" ใช่ไหม?`, () => {
            this.courts.removeCourt(courtId);
            this._renderCourts();
            this._updateStats();
            this._saveState();
            this.renderer.highlightQueueCount('warning');
            this.toast.info(`ลบ "${court.name}" แล้ว`, '🗑️');
        });
    }

    /** à¸¥à¹‰à¸²à¸‡à¸›à¸£à¸°à¸§à¸±à¸•à¸´ */
    clearHistory() {
        this.modal.show('ล้างประวัติ', 'ต้องการล้างประวัติการเล่นทั้งหมดใช่ไหม?', () => {
            this.history.clear();
            this._renderHistory();
            this._saveState();
            this.renderer.highlightQueueCount('warning');
            this.toast.info('ล้างประวัติแล้ว', '🗑️');
        });
    }

    removeHistoryItem(index) {
        const item = this.history.items[index];
        if (!item) return;

        const label = item.court ? `ของ ${item.court}` : 'รายการนี้';
        this.modal.show('ลบประวัติ', `ต้องการลบประวัติ${label}ใช่ไหม?`, () => {
            const removedItem = this.history.removeAt(index);
            if (!removedItem) return;

            this._renderHistory();
            this._saveState();
            if (this.history.count > 0) {
                this.renderer.highlightHistoryItem(Math.min(index, this.history.count - 1), 'warning');
            }
            this.toast.info('ลบประวัติรายการแล้ว', '🗑️');
        });
    }

    openRenamePlayer(oldName, contextLabel = 'ผู้เล่น') {
        if (!oldName) return;

        this.playerRenameModal.show(
            '✏️ แก้ไขผู้เล่น',
            `เปลี่ยนชื่อ ${contextLabel} จาก "${oldName}"`,
            oldName,
            (newName) => this.renamePlayer(oldName, newName),
            {
                confirmText: 'บันทึกชื่อ',
            }
        );
    }

    renamePlayer(oldName, newName) {
        const trimmedName = (newName || '').trim();

        if (!trimmedName) {
            return 'กรุณาพิมพ์ชื่อผู้เล่น';
        }

        if (trimmedName === oldName) {
            return 'ชื่อใหม่ต้องไม่ซ้ำชื่อเดิม';
        }

        if (this._hasPlayerNameConflict(trimmedName, oldName)) {
            return `"${trimmedName}" ถูกใช้งานอยู่แล้ว`;
        }

        this.queue.renamePlayer(oldName, trimmedName);
        this.courts.renamePlayer(oldName, trimmedName);
        this.history.renamePlayer(oldName, trimmedName);
        this.playerRoster = this.playerRoster.map(player => {
            if (player.name.toLowerCase() !== oldName.toLowerCase()) return player;
            return { ...player, name: trimmedName };
        });

        this._render();
        this._saveState();
        this.toast.success(`เปลี่ยนชื่อ "${oldName}" เป็น "${trimmedName}" แล้ว`, '✏️');
        return true;
    }

    openShareWeb() {
        this.shareWebUrl = window.location.origin + window.location.pathname;
        this.shareWebModal.show(this.shareWebUrl);
    }

    promptSendToCourtConfirmation() {
        const slotA = this.selectedA ? this.queue.findById(this.selectedA) : null;
        const slotB = this.selectedB ? this.queue.findById(this.selectedB) : null;

        if (!slotA || !slotB || !this.courts.hasIdleCourt) {
            return;
        }

        this.modal.show(
            'ส่งลงสนาม',
            `ส่ง "${slotA.displayName}" พบกับ "${slotB.displayName}" ลงสนามว่างตอนนี้ใช่หรือไม่?`,
            () => this.match.sendToCourt(),
            {
                confirmText: 'ส่งลงสนาม',
                cancelText: 'ยกเลิก',
                overlayClass: 'send-to-court-overlay',
                modalClass: 'send-to-court-modal',
            }
        );
    }

    _hasPlayerNameConflict(newName, oldName) {
        const target = newName.toLowerCase();
        const source = oldName.toLowerCase();

        const queueConflict = this.queue.slots.some(slot =>
            slot.players.some(player => {
                const normalized = player.toLowerCase();
                return normalized === target && normalized !== source;
            })
        );

        if (queueConflict) return true;

        const rosterConflict = this.playerRoster.some(player => {
            const normalized = player.name.toLowerCase();
            return normalized === target && normalized !== source;
        });

        if (rosterConflict) return true;

        return this.courts.courts.some(court => {
            const allPlayers = [];

            if (court.teamA) {
                allPlayers.push(...(court.teamA.original || []), ...(court.teamA.playing || []));
            }

            if (court.teamB) {
                allPlayers.push(...(court.teamB.original || []), ...(court.teamB.playing || []));
            }

            return allPlayers.some(player => {
                const normalized = player.toLowerCase();
                return normalized === target && normalized !== source;
            });
        });
    }

    _closeSlideMenu() {
        document.getElementById('slideMenu')?.classList.remove('show');
        document.getElementById('slideMenuOverlay')?.classList.remove('show');
        document.body.classList.remove('slide-menu-open');
    }

    _createStateSnapshot() {
        return {
            queue: this.queue.toJSON(),
            courts: this.courts.toJSON(),
            history: this.history.toJSON(),
            courtIdCounter: this.courts.nextId,
            roster: this._getRosterState(),
        };
    }

    exportBackup() {
        this._closeSlideMenu();

        const backup = {
            version: 1,
            exportedAt: new Date().toISOString(),
            source: window.location.href,
            state: this._createStateSnapshot(),
        };

        const fileDate = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `badminton-queue-backup-${fileDate}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);

        this.toast.success('ดาวน์โหลดไฟล์สำรองข้อมูลแล้ว', '💾');
    }

    openImportBackup() {
        this._closeSlideMenu();
        this.backupImportInput?.click();
    }

    async importBackupFile(file) {
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const nextState = this._normalizeBackupState(parsed);

            if (!nextState) {
                this.toast.error('ไฟล์สำรองข้อมูลไม่ถูกต้อง');
                return;
            }

            this.modal.show(
                'กู้คืนข้อมูล',
                `ต้องการกู้คืนข้อมูลจากไฟล์ "${file.name}" ใช่ไหม? ข้อมูลปัจจุบันจะถูกแทนที่ทั้งหมด`,
                () => {
                    this._clearCourtTimers();
                    this.queue.loadFromData(nextState.queue);
                    this.courts.loadFromData(nextState.courts, nextState.courtIdCounter);
                    this.history.loadFromData(nextState.history);
                    this._loadRosterState(nextState);
                    this.selectedA = null;
                    this.selectedB = null;
                    this._render();
                    this._resumeTimers();
                    this._saveState();
                    this.toast.success('กู้คืนข้อมูลสำเร็จ', '📂');
                }
            );
        } catch (error) {
            this.toast.error('อ่านไฟล์สำรองข้อมูลไม่สำเร็จ');
        }
    }

    _normalizeBackupState(payload) {
        const candidate = payload?.state ?? payload;
        if (!candidate || typeof candidate !== 'object') {
            return null;
        }

        if (!Array.isArray(candidate.queue) || !Array.isArray(candidate.courts) || !Array.isArray(candidate.history)) {
            return null;
        }

        return {
            queue: candidate.queue,
            courts: candidate.courts,
            history: candidate.history,
            courtIdCounter: Number.isInteger(candidate.courtIdCounter) ? candidate.courtIdCounter : 1,
            roster: candidate.roster && typeof candidate.roster === 'object'
                ? candidate.roster
                : { players: [], nextPlayerId: 1, todayAttendance: {} },
        };
    }

    // =============================
    // State Management
    // =============================

    _saveState() {
        this.storage.save(this._createStateSnapshot());
    }

    async _loadState() {
        const state = await this.storage.load();
        if (state) {
            this._clearCourtTimers();
            this.queue.loadFromData(state.queue);
            this.courts.loadFromData(state.courts, state.courtIdCounter);
            this.history.loadFromData(state.history);
            this._loadRosterState(state);
        }
    }

    _getTodayKey() {
        return new Date().toISOString().slice(0, 10);
    }

    _getRosterState() {
        return {
            players: this.playerRoster,
            nextPlayerId: this.nextPlayerId,
            todayAttendance: this.todayAttendance,
        };
    }

    _loadRosterState(state) {
        const roster = state?.roster || {};
        this.playerRoster = Array.isArray(roster.players) ? roster.players : [];
        this.nextPlayerId = Number.isInteger(roster.nextPlayerId) ? roster.nextPlayerId : 1;
        this.todayAttendance = roster.todayAttendance && typeof roster.todayAttendance === 'object'
            ? roster.todayAttendance
            : {};

        const maxId = this.playerRoster.reduce((max, player) => Math.max(max, Number(player.id) || 0), 0);
        if (maxId >= this.nextPlayerId) {
            this.nextPlayerId = maxId + 1;
        }
    }

    addPlayerToRoster() {
        const name = this.playerNameInput.value.trim();
        const skillLevel = this.playerSkillInput?.value || 'N';

        if (!name) {
            this.toast.error('กรุณาพิมพ์ชื่อนักกีฬา');
            this.playerNameInput.focus();
            return;
        }

        const exists = this.playerRoster.some(player => player.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            this.toast.error(`"${name}" อยู่ในรายชื่อแล้ว`);
            this.playerNameInput.focus();
            return;
        }

        this.playerRoster.push({
            id: this.nextPlayerId++,
            name,
            skillLevel,
            createdAt: Date.now(),
        });

        this.playerNameInput.value = '';
        this.playerNameInput.focus();
        this._renderRoster();
        this._saveState();
        this.toast.success(`เพิ่ม "${name}" ลงรายชื่อนักกีฬาแล้ว`);
    }

    applyRosterSearch(query = null) {
        const nextQuery = query ?? this.playerRosterSearchInput?.value ?? '';
        this.rosterSearchQuery = nextQuery.trim().toLowerCase();
        this._renderRoster();
    }

    addRosterPlayerToQueue(playerId) {
        const player = this.playerRoster.find(item => item.id === playerId);
        if (!player) return;

        if (this.queue.isNameInQueue(player.name)) {
            this.toast.error(`"${player.name}" อยู่ในคิวแล้ว`);
            return;
        }

        if (this.courts.isPlayerPlaying(player.name)) {
            this.toast.error(`"${player.name}" กำลังเล่นอยู่`);
            return;
        }

        const slot = this.queue.addPlayer(player.name);
        this._renderRoster();
        this._renderQueue();
        this._updateStats();
        this._saveState();
        this.renderer.highlightQueueSlot(slot.id, 'success');
        this.renderer.highlightQueueCount('success');
        this.toast.success(`เพิ่ม "${player.name}" เข้าคิววันนี้แล้ว`);
    }

    openRosterRename(playerId) {
        const player = this.playerRoster.find(item => item.id === playerId);
        if (!player) return;
        this.playerRenameModal.show(
            '✏️ แก้ไขสมาชิก',
            `แก้ชื่อและระดับฝีมือของ "${player.name}"`,
            player.name,
            (payload) => this.editRosterPlayer(playerId, payload),
            {
                showSkillLevel: true,
                initialSkillLevel: player.skillLevel || 'N',
                confirmText: 'บันทึกข้อมูล',
            }
        );
    }

    removeRosterPlayer(playerId) {
        const player = this.playerRoster.find(item => item.id === playerId);
        if (!player) return;

        if (this.queue.isNameInQueue(player.name)) {
            this.toast.error(`"${player.name}" ยังอยู่ในคิว`);
            return;
        }

        if (this.courts.isPlayerPlaying(player.name)) {
            this.toast.error(`"${player.name}" กำลังเล่นอยู่`);
            return;
        }

        this.modal.show(
            'ลบสมาชิก',
            `ต้องการลบ "${player.name}" ออกจากรายชื่อสมาชิกใช่ไหม?`,
            () => {
                this.playerRoster = this.playerRoster.filter((item) => item.id !== playerId);
                this._renderRoster();
                this._saveState();
                this.toast.info(`ลบ "${player.name}" ออกจากรายชื่อแล้ว`, '🗑️');
            }
        );
    }

    editRosterPlayer(playerId, payload) {
        const player = this.playerRoster.find(item => item.id === playerId);
        if (!player) return false;

        const trimmedName = (payload?.name || '').trim();
        const nextSkillLevel = payload?.skillLevel || 'N';

        if (!trimmedName) {
            return 'กรุณาพิมพ์ชื่อนักกีฬา';
        }

        const hasNameChanged = trimmedName !== player.name;
        const hasSkillChanged = nextSkillLevel !== (player.skillLevel || 'N');

        if (!hasNameChanged && !hasSkillChanged) {
            return 'ยังไม่มีข้อมูลที่เปลี่ยนแปลง';
        }

        if (hasNameChanged && this._hasPlayerNameConflict(trimmedName, player.name)) {
            return `"${trimmedName}" ถูกใช้งานอยู่แล้ว`;
        }

        if (hasNameChanged) {
            this.queue.renamePlayer(player.name, trimmedName);
            this.courts.renamePlayer(player.name, trimmedName);
            this.history.renamePlayer(player.name, trimmedName);
        }

        this.playerRoster = this.playerRoster.map((item) => {
            if (item.id !== playerId) return item;
            return {
                ...item,
                name: trimmedName,
                skillLevel: nextSkillLevel,
            };
        });

        this._render();
        this._saveState();

        const changedFields = [];
        if (hasNameChanged) changedFields.push('ชื่อ');
        if (hasSkillChanged) changedFields.push('ระดับฝีมือ');
        this.toast.success(`อัปเดต${changedFields.join('และ')}ของ "${trimmedName}" แล้ว`, '✏️');
        return true;
    }

    _renderRoster() {
        if (!this.playerRosterList) return;

        if (this.playerRoster.length === 0) {
            this.playerRosterList.innerHTML = `
                <div class="empty-state compact">
                    <p>ยังไม่มีรายชื่อนักกีฬา</p>
                </div>
            `;
            return;
        }

        const skillLabelMap = {
            BG: 'มือ BG',
            N: 'มือ N',
            S: 'มือ S',
            P: 'มือ P',
        };

        const filteredPlayers = this.playerRoster
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, 'th'))
            .filter((player) => {
                if (!this.rosterSearchQuery) return true;
                const skillLabel = skillLabelMap[player.skillLevel] || 'มือ N';
                const searchable = `${player.name} ${player.skillLevel} ${skillLabel}`.toLowerCase();
                return searchable.includes(this.rosterSearchQuery);
            });

        if (filteredPlayers.length === 0) {
            this.playerRosterList.innerHTML = `
                <div class="empty-state compact">
                    <p>ไม่พบนักกีฬาที่ค้นหา</p>
                </div>
            `;
            return;
        }

        this.playerRosterList.innerHTML = filteredPlayers
            .map((player) => {
                const isQueued = this.queue.isNameInQueue(player.name);
                const queueButtonClass = isQueued ? 'is-queued' : 'is-available';
                const queueButtonLabel = isQueued ? 'อยู่ในคิวแล้ว' : 'เข้าคิววันนี้';
                const queueButtonIcon = isQueued ? '✅' : '➕';
                return `
                    <div class="roster-item ${isQueued ? 'present' : ''}">
                        <div class="roster-main">
                            <div class="roster-name">${player.name}</div>
                            <div class="roster-meta">${skillLabelMap[player.skillLevel] || 'มือ N'}</div>
                        </div>
                        <div class="roster-actions">
                            <button class="btn-action btn-rename" data-roster-action="rename-player" data-player-id="${player.id}" aria-label="แก้ไขสมาชิก" title="แก้ไขสมาชิก">
                                ✏️ แก้ไข
                            </button>
                            <button class="btn-action btn-remove" data-roster-action="remove-player" data-player-id="${player.id}">
                                🗑️ ลบสมาชิก
                            </button>
                            <button class="btn-action btn-roster-queue ${queueButtonClass}" data-roster-action="add-to-queue" data-player-id="${player.id}" aria-label="${queueButtonLabel}" title="${queueButtonLabel}" data-queue-icon="${queueButtonIcon}">
                                ➕ เข้าคิววันนี้
                            </button>
                        </div>
                    </div>
                `;
            })
            .join('');
    }

    // =============================
    // Rendering
    // =============================

    _render() {
        this._renderQueue();
        this._renderCourts();
        this._renderHistory();
        this._updateStats();
        this.syncAdminMobileTabs();
    }

    _renderQueue() {
        this._renderRoster();
        this.renderer.renderQueue(
            this.queue.slots,
            this.selectedA,
            this.selectedB,
            {
                onRemove: (id) => this.queueAction.removeSlot(id),
                onPair: (id) => this.queueAction.openPairPicker(id),
                onUnpair: (id) => this.queueAction.unpairSlot(id),
                onSelect: (id) => this.queueAction.toggleSelection(id),
            }
        );

        const slotA = this.selectedA ? this.queue.findById(this.selectedA) : null;
        const slotB = this.selectedB ? this.queue.findById(this.selectedB) : null;

        // à¸–à¹‰à¸² slot à¸—à¸µà¹ˆà¹€à¸¥à¸·à¸­à¸à¸–à¸¹à¸à¸¥à¸š â†’ reset
        if (this.selectedA && !slotA) this.selectedA = null;
        if (this.selectedB && !slotB) this.selectedB = null;

        this.renderer.updateSendButton(
            this.selectedA, this.selectedB,
            this.courts.hasIdleCourt,
            slotA, slotB
        );

        // Show/hide clear selection button
        const clearSelBtn = document.getElementById('clearSelectionBtn');
        if (clearSelBtn) {
            clearSelBtn.style.display = (this.selectedA !== null) ? 'inline-flex' : 'none';
        }
    }

    _renderCourts() {
        this.renderer.renderCourts(this.courts.courts, {
            onCancelMatch: (id) => this.match.cancelMatch(id),
            onDeclareWinner: (id, winner) => this.match.declareWinner(id, winner),
            onPickChallenger: (id) => this.match.pickChallenger(id),
            onRenamePlayer: (id) => this.match.openRenamePlayer(id),
            onRequeueDefender: (id) => this.match.requeueDefender(id),
            onSwapPlayers: (id) => this.match.openSwapPlayers(id),
            onRemoveCourt: (id) => this.removeCourt(id),
        });
    }

    _renderHistory() {
        this.renderer.renderHistory(this.history.items);
    }

    _updateStats() {
        this.renderer.updateStats(
            this.queue.playerCount,
            this.courts.totalPlayingCount
        );
    }

    _updateTimersOnly() {
        this.renderer.updateCourtTimers(this.courts.courts);
    }
}

