// ===========================
// AdminManager
// ===========================

export class AdminManager {
    constructor(app) {
        this.app = app;
        this.isAdmin = false;
        this.isLocalDevelopment = ['localhost', '127.0.0.1'].includes(window.location.hostname);
        this.devPasswordHash = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';
        this.isAdminAvailable = true;
        this.adminPasswordHash = this._getConfiguredPasswordHash();
    }

    init() {
        this._updateAdminUI();
        this._bindAdminEvents();
    }

    _bindAdminEvents() {
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const slideMenu = document.getElementById('slideMenu');
        const slideMenuOverlay = document.getElementById('slideMenuOverlay');
        const slideMenuClose = document.getElementById('slideMenuClose');
        const menuHistoryToggle = document.getElementById('menuHistoryToggle');
        const menuShareWeb = document.getElementById('menuShareWeb');
        const menuAdminLogin = document.getElementById('menuAdminLogin');
        const menuAdminLogout = document.getElementById('menuAdminLogout');

        const adminPasswordOverlay = document.getElementById('adminPasswordOverlay');
        const adminPasswordInput = document.getElementById('adminPasswordInput');
        const adminPasswordCancel = document.getElementById('adminPasswordCancel');
        const adminPasswordConfirm = document.getElementById('adminPasswordConfirm');
        const passwordError = document.getElementById('passwordError');

        const closeMenu = () => {
            slideMenu.classList.remove('show');
            slideMenuOverlay.classList.remove('show');
            document.body.classList.remove('slide-menu-open');
        };

        const showPasswordError = (message) => {
            passwordError.textContent = message;
            passwordError.style.display = 'block';
        };

        const hidePasswordError = () => {
            passwordError.textContent = '❌ รหัสไม่ถูกต้อง';
            passwordError.style.display = 'none';
        };

        const closePasswordModal = () => {
            adminPasswordOverlay.classList.remove('active');
            adminPasswordInput.value = '';
            hidePasswordError();
        };

        if (hamburgerBtn) {
            hamburgerBtn.addEventListener('click', () => {
                slideMenu.classList.add('show');
                slideMenuOverlay.classList.add('show');
                document.body.classList.add('slide-menu-open');
            });
        }

        if (slideMenuClose) slideMenuClose.addEventListener('click', closeMenu);
        if (slideMenuOverlay) slideMenuOverlay.addEventListener('click', closeMenu);

        if (menuHistoryToggle) {
            menuHistoryToggle.addEventListener('click', () => {
                closeMenu();
                this.app.showHistoryPage();
            });
        }

        if (menuShareWeb) {
            menuShareWeb.addEventListener('click', () => {
                closeMenu();
                this.app.openShareWeb();
            });
        }

        if (menuAdminLogin) {
            menuAdminLogin.addEventListener('click', () => {
                closeMenu();

                if (false && !this.isAdminAvailable) {
                    this.app.toast.error('ปิดโหมด Admin บนเว็บสาธารณะแล้ว ให้ใช้งานผ่าน localhost หรือย้ายระบบยืนยันตัวตนไปฝั่งเซิร์ฟเวอร์', '🔒');
                    return;
                }

                hidePasswordError();
                adminPasswordOverlay.classList.add('active');
                adminPasswordInput.focus();
            });
        }

        const authenticate = async () => {
            const password = adminPasswordInput.value || '';

            if (!password) {
                showPasswordError('กรุณาใส่รหัส');
                adminPasswordInput.focus();
                return;
            }

            if (!this.adminPasswordHash) {
                showPasswordError('Admin ยังไม่ได้ตั้งค่ารหัสผ่านสำหรับเว็บนี้');
                return;
            }

            if (!window.crypto?.subtle) {
                showPasswordError('เบราว์เซอร์ไม่รองรับการตรวจสอบรหัสผ่าน');
                return;
            }

            const passwordHash = await this._hashPassword(password);
            if (passwordHash === this.adminPasswordHash) {
                this.isAdmin = true;
                this._updateAdminUI();
                closePasswordModal();

                const loginMessage = this.isLocalDevelopment && this.adminPasswordHash === this.devPasswordHash
                    ? 'เข้าสู่ระบบแอดมินเรียบร้อย (dev password)'
                    : 'เข้าสู่ระบบแอดมินเรียบร้อย';

                this.app.toast.success(loginMessage, '🔐');
                return;
            }

            showPasswordError('❌ รหัสไม่ถูกต้อง');
            adminPasswordInput.focus();
            adminPasswordInput.select();
        };

        if (adminPasswordConfirm) {
            adminPasswordConfirm.addEventListener('click', () => {
                authenticate();
            });
        }

        if (adminPasswordInput) {
            adminPasswordInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    authenticate();
                }
            });
        }

        if (adminPasswordCancel) {
            adminPasswordCancel.addEventListener('click', closePasswordModal);
        }

        if (menuAdminLogout) {
            menuAdminLogout.addEventListener('click', () => {
                this.isAdmin = false;
                this._updateAdminUI();
                closeMenu();
                this.app.toast.info('คุณอยู่ในโหมดผู้ใช้', '👁️');
            });
        }
    }

    _updateAdminUI() {
        const menuAdminLogin = document.getElementById('menuAdminLogin');
        const modeBadge = document.getElementById('modeBadge');

        if (menuAdminLogin) {
            menuAdminLogin.hidden = !this.isAdminAvailable || this.isAdmin;
        }

        if (modeBadge) {
            modeBadge.hidden = !this.isAdmin;
        }

        if (this.isAdmin) {
            document.body.classList.remove('user-mode');
            this.app.resetAdminMobileTab?.();
        } else {
            document.body.classList.add('user-mode');
            this.app.syncAdminMobileTabs?.();
        }
    }

    _getConfiguredPasswordHash() {
        return this.devPasswordHash;
    }

    async _hashPassword(value) {
        const encoded = new TextEncoder().encode(value);
        const digest = await window.crypto.subtle.digest('SHA-256', encoded);

        return Array.from(new Uint8Array(digest))
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
    }
}
