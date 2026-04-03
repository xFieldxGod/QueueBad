// ===========================
// 🏃 Player Model
// ===========================

export class Player {
    /**
     * @param {string} name - ชื่อผู้เล่น
     * @param {number} [joinedAt] - เวลาที่เข้าคิว (timestamp)
     */
    constructor(name, joinedAt = Date.now()) {
        this.name = name;
        this.joinedAt = joinedAt;
    }

    /**
     * สร้าง Player จาก plain object (เช่น จาก localStorage)
     * @param {Object} data
     * @returns {Player}
     */
    static fromJSON(data) {
        return new Player(data.name, data.joinedAt);
    }

    /**
     * แปลงเป็น plain object สำหรับ serialize
     * @returns {Object}
     */
    toJSON() {
        return {
            name: this.name,
            joinedAt: this.joinedAt,
        };
    }

    /**
     * เปรียบเทียบชื่อ (case-insensitive)
     * @param {string} otherName
     * @returns {boolean}
     */
    matchesName(otherName) {
        return this.name.toLowerCase() === otherName.toLowerCase();
    }
}
