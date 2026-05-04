// ===========================
// 🪟 Modal UI Component
// ===========================

export class Modal {
    /**
     * @param {string} overlayId - ID ของ modal overlay element
     */
    constructor(overlayId = 'modalOverlay') {
        this.overlay = document.getElementById(overlayId);
        this.titleEl = document.getElementById('modalTitle');
        this.messageEl = document.getElementById('modalMessage');
        this.confirmBtn = document.getElementById('modalConfirmBtn');
        this.cancelBtn = document.getElementById('modalCancelBtn');
        this.defaultConfirmText = this.confirmBtn?.textContent || 'ยืนยัน';
        this.defaultCancelText = this.cancelBtn?.textContent || 'ยกเลิก';
        this.defaultOverlayClass = this.overlay?.className || 'modal-overlay';
        this.defaultModalClass = this.overlay?.querySelector('.modal')?.className || 'modal';
        this.modalEl = this.overlay?.querySelector('.modal') || null;

        /** @type {Function|null} */
        this._callback = null;
        this._cancelCallback = null;

        this._bindEvents();
    }

    /**
     * แสดง confirmation modal
     * @param {string} title - หัวข้อ
     * @param {string} message - ข้อความ
     * @param {Function} onConfirm - callback เมื่อกดยืนยัน
     */
    show(title, message, onConfirm, options = {}) {
        this.titleEl.textContent = title;
        this.messageEl.textContent = message;
        this._callback = onConfirm;
        this._cancelCallback = options.onCancel || null;
        this.confirmBtn.textContent = options.confirmText || this.defaultConfirmText;
        this.cancelBtn.textContent = options.cancelText || this.defaultCancelText;
        if (this.overlay) {
            this.overlay.className = options.overlayClass
                ? `${this.defaultOverlayClass} ${options.overlayClass}`
                : this.defaultOverlayClass;
        }
        if (this.modalEl) {
            this.modalEl.className = options.modalClass
                ? `${this.defaultModalClass} ${options.modalClass}`
                : this.defaultModalClass;
        }
        this.overlay.classList.add('active');
    }

    /** ปิด modal */
    close() {
        this.overlay.classList.remove('active');
        this._callback = null;
        this._cancelCallback = null;
        this.confirmBtn.textContent = this.defaultConfirmText;
        this.cancelBtn.textContent = this.defaultCancelText;
        if (this.overlay) {
            this.overlay.className = this.defaultOverlayClass;
        }
        if (this.modalEl) {
            this.modalEl.className = this.defaultModalClass;
        }
    }

    /** ยืนยัน (เรียก callback แล้วปิด) */
    confirm() {
        if (this._callback) {
            this._callback();
        }
        this.close();
    }

    cancel() {
        const callback = this._cancelCallback;
        this.close();
        if (callback) {
            callback();
        }
    }

    /** ผูก event listeners */
    _bindEvents() {
        // กดปุ่มยืนยัน
        this.confirmBtn.addEventListener('click', () => this.confirm());

        // กดปุ่มยกเลิก (close)
        this.cancelBtn?.addEventListener('click', () => this.cancel());

        // คลิกพื้นหลังเพื่อปิด
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });

        // กด Escape เพื่อปิด
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.classList.contains('active')) this.close();
        });
    }
}
