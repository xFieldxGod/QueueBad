// ===========================
// 📋 QueueSlot Model
// ===========================

export class QueueSlot {
    /**
     * @param {number} id - รหัส slot
     * @param {string[]} players - รายชื่อผู้เล่น (1 = เดี่ยว, 2 = คู่)
     * @param {number} [joinedAt] - เวลาเข้าคิว
     */
    constructor(id, players, joinedAt = Date.now()) {
        this.id = id !== null && id !== undefined ? Number(id) : undefined;
        this.players = [...players];
        this.joinedAt = joinedAt;
    }

    /** @returns {boolean} จับคู่แล้วหรือยัง */
    get isPaired() {
        return this.players.length === 2;
    }

    /** @returns {boolean} ยังเป็นเดี่ยว */
    get isSolo() {
        return this.players.length === 1;
    }

    /** @returns {string} ชื่อแสดงผล เช่น "A, B" */
    get displayName() {
        return this.players.join(', ');
    }

    /**
     * จับคู่กับผู้เล่นอีกคน
     * @param {string} partnerName
     */
    pairWith(partnerName) {
        if (this.isPaired) throw new Error('จับคู่แล้ว');
        this.players.push(partnerName);
    }

    /**
     * แยกคู่ — คืนชื่อผู้เล่นคนที่ 2
     * @returns {string}
     */
    unpair() {
        if (this.isSolo) throw new Error('ไม่ได้จับคู่');
        return this.players.pop();
    }

    /**
     * ตรวจสอบว่ามีผู้เล่นชื่อนี้หรือไม่
     * @param {string} name
     * @returns {boolean}
     */
    hasPlayer(name) {
        return this.players.some(p => p.toLowerCase() === name.toLowerCase());
    }

    /**
     * หาผู้เล่นที่ซ้ำกับ slot อื่น
     * @param {QueueSlot} otherSlot
     * @returns {string[]} ชื่อที่ซ้ำ
     */
    findConflicts(otherSlot) {
        return this.players.filter(p =>
            otherSlot.players.some(op => op.toLowerCase() === p.toLowerCase())
        );
    }

    static fromJSON(data) {
        return new QueueSlot(data.id, data.players, data.joinedAt);
    }

    toJSON() {
        return {
            id: this.id,
            players: [...this.players],
            joinedAt: this.joinedAt,
        };
    }
}
