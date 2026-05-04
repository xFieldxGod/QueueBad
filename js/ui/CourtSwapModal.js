import { escapeHtml } from '../utils.js';

export class CourtSwapModal {
    constructor() {
        this.overlay = document.getElementById('courtSwapOverlay');
        this.titleEl = document.getElementById('courtSwapTitle');
        this.messageEl = document.getElementById('courtSwapMessage');
        this.teamAListEl = document.getElementById('courtSwapTeamAList');
        this.teamBListEl = document.getElementById('courtSwapTeamBList');
        this.previewEl = document.getElementById('courtSwapPreview');
        this.confirmBtn = document.getElementById('courtSwapConfirmBtn');
        this.cancelBtn = document.getElementById('courtSwapCancelBtn');
        this._court = null;
        this._onConfirm = null;
        this._selectedAIndex = null;
        this._selectedBIndex = null;

        this._bindEvents();
    }

    show(court, onConfirm) {
        this._court = court;
        this._onConfirm = onConfirm;
        this._selectedAIndex = null;
        this._selectedBIndex = null;
        this.titleEl.textContent = `🔀 สลับตัวใน ${court.name}`;
        this.messageEl.textContent = 'เลือก 1 คนจากแต่ละฝั่ง แล้วกดยืนยันเพื่อสลับเฉพาะแมตช์นี้';
        this._render();
        this.overlay.classList.add('active');
    }

    close() {
        this.overlay.classList.remove('active');
        this._court = null;
        this._onConfirm = null;
        this._selectedAIndex = null;
        this._selectedBIndex = null;
        this.teamAListEl.innerHTML = '';
        this.teamBListEl.innerHTML = '';
        this.previewEl.textContent = 'เลือก 1 คนจากแต่ละฝั่ง';
        this.confirmBtn.disabled = true;
    }

    confirm() {
        if (!this._court) return;
        if (!Number.isInteger(this._selectedAIndex) || !Number.isInteger(this._selectedBIndex)) return;

        if (this._onConfirm) {
            this._onConfirm(this._selectedAIndex, this._selectedBIndex);
        }

        this.close();
    }

    _bindEvents() {
        this.cancelBtn.addEventListener('click', () => this.close());
        this.confirmBtn.addEventListener('click', () => this.confirm());

        this.teamAListEl.addEventListener('click', (e) => {
            const button = e.target.closest('[data-index]');
            if (!button) return;
            this._selectedAIndex = parseInt(button.dataset.index);
            this._render();
        });

        this.teamBListEl.addEventListener('click', (e) => {
            const button = e.target.closest('[data-index]');
            if (!button) return;
            this._selectedBIndex = parseInt(button.dataset.index);
            this._render();
        });

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.classList.contains('active')) {
                this.close();
            }
        });
    }

    _render() {
        if (!this._court) return;

        this.teamAListEl.innerHTML = this._court.teamA.playing
            .map((name, index) => `
                <button class="court-swap-player team-a ${this._selectedAIndex === index ? 'selected' : ''}" data-index="${index}">
                    ${escapeHtml(name)}
                </button>
            `)
            .join('');

        this.teamBListEl.innerHTML = this._court.teamB.playing
            .map((name, index) => `
                <button class="court-swap-player team-b ${this._selectedBIndex === index ? 'selected' : ''}" data-index="${index}">
                    ${escapeHtml(name)}
                </button>
            `)
            .join('');

        this._updatePreview();
    }

    _updatePreview() {
        if (!this._court) return;

        const hasSelection = Number.isInteger(this._selectedAIndex) && Number.isInteger(this._selectedBIndex);

        if (!hasSelection) {
            this.previewEl.textContent = 'เลือก 1 คนจากแต่ละฝั่ง';
            this.confirmBtn.disabled = true;
            return;
        }

        const teamAPlayers = [...this._court.teamA.playing];
        const teamBPlayers = [...this._court.teamB.playing];
        const playerA = teamAPlayers[this._selectedAIndex];
        const playerB = teamBPlayers[this._selectedBIndex];

        teamAPlayers[this._selectedAIndex] = playerB;
        teamBPlayers[this._selectedBIndex] = playerA;

        this.previewEl.textContent = `${teamAPlayers.join(' + ')} VS ${teamBPlayers.join(' + ')}`;
        this.confirmBtn.disabled = false;
    }

}
