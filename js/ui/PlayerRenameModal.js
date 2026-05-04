export class PlayerRenameModal {
    constructor() {
        this.overlay = document.getElementById('playerRenameOverlay');
        this.titleEl = document.getElementById('playerRenameTitle');
        this.messageEl = document.getElementById('playerRenameMessage');
        this.inputEl = document.getElementById('playerRenameInput');
        this.skillGroupEl = document.getElementById('playerRenameSkillGroup');
        this.skillInputEl = document.getElementById('playerRenameSkillInput');
        this.errorEl = document.getElementById('playerRenameError');
        this.cancelBtn = document.getElementById('playerRenameCancelBtn');
        this.confirmBtn = document.getElementById('playerRenameConfirmBtn');
        this.defaultConfirmText = this.confirmBtn?.textContent || 'บันทึกข้อมูล';
        this._onConfirm = null;
        this._showSkillField = false;

        this._bindEvents();
    }

    show(title, message, initialValue, onConfirm, options = {}) {
        const {
            showSkillLevel = false,
            initialSkillLevel = 'N',
            confirmText = this.defaultConfirmText,
        } = options;

        this.titleEl.textContent = title;
        this.messageEl.textContent = message;
        this.inputEl.value = initialValue || '';
        this._onConfirm = onConfirm;
        this._showSkillField = showSkillLevel;

        if (this.skillGroupEl) {
            this.skillGroupEl.hidden = !showSkillLevel;
        }

        if (this.skillInputEl) {
            this.skillInputEl.value = initialSkillLevel || 'N';
        }

        if (this.confirmBtn) {
            this.confirmBtn.textContent = confirmText;
        }

        this._hideError();
        this.overlay.classList.add('active');

        requestAnimationFrame(() => {
            this.inputEl.focus();
            this.inputEl.select();
        });
    }

    close() {
        this.overlay.classList.remove('active');
        this._onConfirm = null;
        this._showSkillField = false;
        this.inputEl.value = '';
        if (this.skillGroupEl) {
            this.skillGroupEl.hidden = true;
        }
        if (this.skillInputEl) {
            this.skillInputEl.value = 'N';
        }
        if (this.confirmBtn) {
            this.confirmBtn.textContent = this.defaultConfirmText;
        }
        this._hideError();
    }

    confirm() {
        if (!this._onConfirm) {
            this.close();
            return;
        }

        const payload = this._showSkillField
            ? {
                name: this.inputEl.value.trim(),
                skillLevel: this.skillInputEl?.value || 'N',
            }
            : this.inputEl.value.trim();

        try {
            const result = this._onConfirm(payload);
            if (typeof result === 'string' && result) {
                this._showError(result);
                return;
            }
            if (result === false) {
                return;
            }
            this.close();
        } catch (error) {
            this._showError(error?.message || 'ไม่สามารถบันทึกข้อมูลได้');
        }
    }

    _showError(message) {
        this.errorEl.textContent = message;
        this.errorEl.style.display = 'block';
    }

    _hideError() {
        this.errorEl.textContent = '';
        this.errorEl.style.display = 'none';
    }

    _bindEvents() {
        this.cancelBtn?.addEventListener('click', () => this.close());
        this.confirmBtn?.addEventListener('click', () => this.confirm());
        this.inputEl?.addEventListener('input', () => this._hideError());
        this.skillInputEl?.addEventListener('change', () => this._hideError());

        this.overlay?.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });

        this.inputEl?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.confirm();
            }
        });

        this.skillInputEl?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.confirm();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay?.classList.contains('active')) {
                this.close();
            }
        });
    }
}
