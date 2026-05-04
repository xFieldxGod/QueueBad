// ===========================
// QueueActionManager
// ===========================

export class QueueActionManager {
    constructor(app) {
        this.app = app;
    }

    addPlayer() {
        this.app.addPlayerToRoster();
    }

    removeSlot(slotId) {
        const slot = this.app.queue.findById(slotId);
        if (!slot) return;

        const name = slot.displayName;
        this.app.queue.removeSlot(slotId);

        if (this.app.selectedA === slotId) this.app.selectedA = null;
        if (this.app.selectedB === slotId) this.app.selectedB = null;

        this.app._renderQueue();
        this.app._updateStats();
        this.app._saveState();
        this.app.renderer.highlightQueueCount('warning');
        this.app.renderer.highlightSendButton('warning');
        this.app.toast.info(`นำ "${name}" ออกจากคิว`, '👋');
    }

    openPairPicker(slotId) {
        const slot = this.app.queue.findById(slotId);
        if (!slot || slot.isPaired) return;

        const playerName = slot.players[0];
        const available = this.app.queue.getEligiblePartnerNames(slotId);

        if (available.length === 0) {
            this.app.toast.error('ไม่มีผู้เล่นให้เลือกจับคู่');
            return;
        }

        this.app.playerPicker.show(
            '👫 จับคู่',
            `เลือกคู่ให้ "${playerName}"`,
            available,
            (partnerName) => {
                try {
                    const updatedSlot = this.app.queue.pairSlot(slotId, partnerName);
                    this.app._renderQueue();
                    this.app._saveState();
                    this.app.renderer.highlightQueueSlot(updatedSlot.id, 'success');
                    this.app.renderer.highlightQueueCount('success');
                    this.app.renderer.highlightSendButton('info');
                    this.app.toast.success(`จับคู่ "${playerName}" กับ "${partnerName}" แล้ว`, '👫');
                } catch (error) {
                    this.app.toast.error(error.message);
                }
            }
        );
    }

    openRenamePlayer(slotId) {
        const slot = this.app.queue.findById(slotId);
        if (!slot) return;

        if (slot.players.length === 1) {
            this.app.openRenamePlayer(slot.players[0], 'ผู้เล่นในคิว');
            return;
        }

        this.app.playerPicker.show(
            '✏️ เลือกผู้เล่นที่ต้องการแก้ชื่อ',
            `เลือกคนจากคู่ "${slot.displayName}"`,
            [...slot.players],
            (selectedName) => {
                this.app.openRenamePlayer(selectedName, 'ผู้เล่นในคิว');
            }
        );
    }

    unpairSlot(slotId) {
        const slot = this.app.queue.findById(slotId);
        if (!slot || slot.isSolo) return;

        const name = slot.displayName;

        if (this.app.selectedA === slotId) this.app.selectedA = null;
        if (this.app.selectedB === slotId) this.app.selectedB = null;

        const result = this.app.queue.unpairSlot(slotId);

        this.app._renderQueue();
        this.app._saveState();
        this.app.renderer.highlightQueueSlot(result.originalSlot.id, 'info');
        if (result.newSlot) {
            this.app.renderer.highlightQueueSlot(result.newSlot.id, 'info');
        }
        this.app.renderer.highlightQueueCount('info');
        this.app.toast.info(`แยกคู่ "${name}" แล้ว`, '✂️');
    }

    toggleSelection(slotId) {
        const slot = this.app.queue.findById(slotId);
        if (!slot || slot.isSolo) return;

        if (this.app.selectedA === slotId) {
            this.app.selectedA = this.app.selectedB;
            this.app.selectedB = null;
        } else if (this.app.selectedB === slotId) {
            this.app.selectedB = null;
        } else if (this.app.selectedA === null) {
            this.app.selectedA = slotId;
        } else if (this.app.selectedB === null) {
            this.app.selectedB = slotId;
        } else {
            this.app.selectedB = slotId;
        }

        this.app._renderQueue();
        if (this.app.selectedA !== null) {
            this.app.renderer.highlightQueueSlot(this.app.selectedA, 'info');
        }
        if (this.app.selectedB !== null) {
            this.app.renderer.highlightQueueSlot(this.app.selectedB, 'info');
        }
        this.app.renderer.highlightSendButton('info');

        if (this.app.selectedA !== null && this.app.selectedB !== null && this.app.courts.hasIdleCourt) {
            this.app.promptSendToCourtConfirmation();
        }
    }

    clearSelection() {
        this.app.selectedA = null;
        this.app.selectedB = null;
        this.app._renderQueue();
        this.app.renderer.highlightSendButton('warning');
    }
}
