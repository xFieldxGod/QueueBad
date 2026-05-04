// ===========================
// 🎯 PlayerPickerModal
// ===========================

import { escapeHtml } from '../utils.js';

export class PlayerPickerModal {
    constructor() {
        this.overlay = document.getElementById('playerPickerOverlay');
        this.titleEl = document.getElementById('pickerTitle');
        this.messageEl = document.getElementById('pickerMessage');
        this.listEl = document.getElementById('pickerList');
        this.searchInput = document.getElementById('pickerSearchInput');
        this.cancelBtn = document.getElementById('pickerCancelBtn');

        /** @type {Function|null} */
        this._onSelect = null;
        /** @type {string[]} */
        this._allPlayers = [];

        this._bindEvents();
    }

    /**
     * แสดง modal เลือกผู้เล่น
     * @param {string} title - หัวข้อ
     * @param {string} message - ข้อความอธิบาย
     * @param {string[]} playerNames - รายชื่อที่เลือกได้
     * @param {Function} onSelect - callback(selectedName) เมื่อเลือก
     */
    show(title, message, playerNames, onSelect) {
        this.titleEl.textContent = title;
        this.messageEl.textContent = message;
        this._onSelect = onSelect;
        this._allPlayers = playerNames || [];

        if (this.searchInput) {
            this.searchInput.value = '';
        }

        this._renderList(this._allPlayers);

        this.overlay.classList.add('active');

        if (this.searchInput) {
            this.searchInput.focus();
        }
    }

    _renderList(playerNames) {
        // Render player buttons ตามรายการที่ส่งเข้ามา
        if (!playerNames || playerNames.length === 0) {
            this.listEl.innerHTML = `
                <div class="picker-empty">
                    <p>ไม่มีผู้เล่นที่พร้อม</p>
                </div>`;
        } else {
            this.listEl.innerHTML = playerNames
                .map(name => `<button class="picker-player-btn" data-name="${this._escapeAttr(name)}">${escapeHtml(name)}</button>`)
                .join('');

            // Bind click on each button
            this.listEl.querySelectorAll('.picker-player-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (this._onSelect) {
                        this._onSelect(btn.dataset.name);
                    }
                    this.close();
                });
            });
        }
    }

    /** ปิด modal */
    close() {
        this.overlay.classList.remove('active');
        this._onSelect = null;
    }

    _bindEvents() {
        this.cancelBtn.addEventListener('click', () => this.close());

        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => {
                const keyword = this.searchInput.value.trim().toLowerCase();
                if (!keyword) {
                    this._renderList(this._allPlayers);
                    return;
                }
                const filtered = this._allPlayers.filter(name =>
                    name.toLowerCase().includes(keyword)
                );
                this._renderList(filtered);
            });
        }

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.classList.contains('active')) {
                this.close();
            }
        });
    }

    _escapeAttr(str) {
        return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
}
