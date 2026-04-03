export class ShareWebModal {
    constructor(toast, defaultUrl) {
        this.toast = toast;
        this.defaultUrl = defaultUrl;
        this.currentUrl = defaultUrl;

        this.overlay = document.getElementById('shareWebOverlay');
        this.messageEl = document.getElementById('shareWebMessage');
        this.canvasEl = document.getElementById('shareWebQrCanvas');
        this.imageEl = document.getElementById('shareWebQrImage');
        this.fallbackEl = document.getElementById('shareWebQrFallback');
        this.urlEl = document.getElementById('shareWebUrl');
        this.closeBtn = document.getElementById('shareWebCloseBtn');
        this.copyBtn = document.getElementById('shareWebCopyBtn');

        this._bindEvents();
    }

    show(url = this.defaultUrl) {
        this.currentUrl = url || this.defaultUrl;
        this.messageEl.textContent = 'ให้เพื่อนสแกน QR นี้เพื่อเปิดเว็บดูคิวได้ทันที';
        this.urlEl.textContent = this.currentUrl;
        this.urlEl.href = this.currentUrl;
        this._renderQrCode();
        this.overlay.classList.add('active');

        requestAnimationFrame(() => {
            this.copyBtn?.focus();
        });
    }

    close() {
        this.overlay.classList.remove('active');
    }

    async copyLink() {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(this.currentUrl);
            } else {
                this._copyWithFallback(this.currentUrl);
            }

            this.toast?.success('คัดลอกลิงก์แชร์แล้ว', '🔗');
        } catch (error) {
            try {
                this._copyWithFallback(this.currentUrl);
                this.toast?.success('คัดลอกลิงก์แชร์แล้ว', '🔗');
            } catch {
                this.toast?.error('คัดลอกลิงก์ไม่สำเร็จ', '⚠️');
            }
        }
    }

    _renderQrCode() {
        if (!this.canvasEl) return;

        this.canvasEl.style.display = 'block';
        if (this.imageEl) {
            this.imageEl.style.display = 'none';
            this.imageEl.removeAttribute('src');
        }
        if (this.fallbackEl) {
            this.fallbackEl.style.display = 'none';
        }

        if (!window.QRCode?.toCanvas) {
            this._renderQrImageFallback();
            return;
        }

        window.QRCode.toCanvas(
            this.canvasEl,
            this.currentUrl,
            {
                width: 220,
                margin: 1,
                color: {
                    dark: '#f8fafc',
                    light: '#00000000'
                }
            },
            (error) => {
                if (error) {
                    this._renderQrImageFallback();
                }
            }
        );
    }

    _renderQrImageFallback() {
        if (!this.imageEl) {
            this._showQrFallback();
            return;
        }

        if (this.canvasEl) {
            this.canvasEl.style.display = 'none';
        }

        const qrUrl = this._buildQrImageUrl(this.currentUrl);
        this.imageEl.onload = () => {
            this.imageEl.style.display = 'block';
            if (this.fallbackEl) {
                this.fallbackEl.style.display = 'none';
            }
        };
        this.imageEl.onerror = () => {
            this.imageEl.style.display = 'none';
            this._showQrFallback();
        };
        this.imageEl.src = qrUrl;
    }

    _showQrFallback() {
        if (this.canvasEl) {
            this.canvasEl.style.display = 'none';
        }

        if (this.imageEl) {
            this.imageEl.style.display = 'none';
        }

        if (this.fallbackEl) {
            this.fallbackEl.style.display = 'block';
        }
    }

    _buildQrImageUrl(text) {
        return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(text)}`;
    }

    _copyWithFallback(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }

    _bindEvents() {
        this.closeBtn?.addEventListener('click', () => this.close());
        this.copyBtn?.addEventListener('click', () => this.copyLink());

        this.overlay?.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay?.classList.contains('active')) {
                this.close();
            }
        });
    }
}
