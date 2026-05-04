// ===========================
// 🔔 Toast UI Component
// ===========================

export class Toast {
    /**
     * @param {string} containerId - ID ของ container element
     * @param {number} [duration=3000] - ระยะเวลาแสดง (ms)
     */
    constructor(containerId = 'toastContainer', duration = 1500) {
        this.container = document.getElementById(containerId);
        this.duration = duration;
        this.maxVisible = 2;
    }

    /**
     * แสดง toast notification
     * @param {string} message - ข้อความ
     * @param {'info'|'success'|'error'} [type='info'] - ประเภท
     * @param {string} [icon='ℹ️'] - ไอคอน
     */
    show(message, type = 'info', icon = 'ℹ️', options = {}) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const iconEl = document.createElement('span');
        iconEl.className = 'toast-icon';
        iconEl.textContent = icon;

        const contentEl = document.createElement('div');
        contentEl.className = 'toast-content';

        const messageEl = document.createElement('span');
        messageEl.className = 'toast-message';
        messageEl.textContent = message;
        contentEl.appendChild(messageEl);

        let timeoutId = null;
        let intervalId = null;
        let isClosing = false;
        const duration = options.duration ?? this.duration;
        const startTime = Date.now();

        const metaEl = document.createElement('div');
        metaEl.className = 'toast-meta';

        let progressBarEl = null;
        let expiryTextEl = null;

        const close = () => {
            if (isClosing) return;
            isClosing = true;
            if (timeoutId) clearTimeout(timeoutId);
            if (intervalId) clearInterval(intervalId);
            toast.style.animation = 'toastOut 0.4s ease-in forwards';
            setTimeout(() => toast.remove(), 400);
        };

        if (options.actionLabel && options.onAction) {
            const actionBtn = document.createElement('button');
            actionBtn.className = 'toast-action';
            actionBtn.type = 'button';
            actionBtn.textContent = options.actionLabel;
            actionBtn.addEventListener('click', () => {
                options.onAction();
                close();
            });
            metaEl.appendChild(actionBtn);
        }

        if (duration > 0) {
            const timingEl = document.createElement('div');
            timingEl.className = 'toast-timing';

            expiryTextEl = document.createElement('span');
            expiryTextEl.className = 'toast-expiry-text';

            const progressTrackEl = document.createElement('div');
            progressTrackEl.className = 'toast-progress-track';

            progressBarEl = document.createElement('div');
            progressBarEl.className = 'toast-progress-bar';

            progressTrackEl.appendChild(progressBarEl);
            timingEl.appendChild(expiryTextEl);
            timingEl.appendChild(progressTrackEl);
            metaEl.appendChild(timingEl);

            const updateTiming = () => {
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, duration - elapsed);
                const seconds = Math.max(1, Math.ceil(remaining / 1000));
                expiryTextEl.textContent = `จางหายใน ${seconds} วิ`;
                progressBarEl.style.width = `${(remaining / duration) * 100}%`;
            };

            updateTiming();
            intervalId = setInterval(updateTiming, 100);
        }

        toast.appendChild(iconEl);
        if (metaEl.childElementCount > 0) {
            contentEl.appendChild(metaEl);
        }
        toast.appendChild(contentEl);

        while (this.container.children.length >= this.maxVisible) {
            const oldestToast = this.container.firstElementChild;
            if (!oldestToast) break;
            oldestToast.remove();
        }

        this.container.appendChild(toast);

        if (duration > 0) {
            timeoutId = setTimeout(() => close(), duration);
        }

        return { close, element: toast };
    }

    /** แสดง toast สำเร็จ */
    success(message, icon = '✅') {
        this.show(message, 'success', icon);
    }

    /** แสดง toast ผิดพลาด */
    error(message, icon = '⚠️') {
        this.show(message, 'error', icon);
    }

    /** แสดง toast ข้อมูล */
    info(message, icon = 'ℹ️') {
        this.show(message, 'info', icon);
    }
}
