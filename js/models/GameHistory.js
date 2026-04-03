// ===========================
// 📜 GameHistory Model
// ===========================

export class GameHistory {
    /**
     * @param {string} courtName - ชื่อสนาม
     * @param {string[]} winnerPlayers - รายชื่อผู้เล่นฝ่ายชนะ
     * @param {string[]} loserPlayers - รายชื่อผู้เล่นฝ่ายแพ้
     * @param {number} duration - ระยะเวลาเล่น (ms)
     * @param {number} [endedAt] - เวลาที่จบ (timestamp)
     */
    constructor(courtName, winnerPlayers, loserPlayers, duration, endedAt = Date.now()) {
        this.court = courtName;
        this.winnerPlayers = winnerPlayers || [];
        this.loserPlayers = loserPlayers || [];
        this.players = [...this.winnerPlayers, ...this.loserPlayers];
        this.duration = duration;
        this.endedAt = endedAt;
    }

    /**
     * สร้าง GameHistory จาก plain object
     * @param {Object} data
     * @returns {GameHistory}
     */
    static fromJSON(data) {
        if (data.winnerPlayers || data.loserPlayers) {
            return new GameHistory(
                data.court,
                data.winnerPlayers || [],
                data.loserPlayers || [],
                data.duration,
                data.endedAt
            );
        }

        const record = new GameHistory(
            data.court,
            [],
            [],
            data.duration,
            data.endedAt
        );
        record.players = data.players || [];
        return record;
    }

    /**
     * แปลงเป็น plain object สำหรับ serialize
     * @returns {Object}
     */
    toJSON() {
        return {
            court: this.court,
            players: this.players,
            winnerPlayers: this.winnerPlayers,
            loserPlayers: this.loserPlayers,
            duration: this.duration,
            endedAt: this.endedAt,
        };
    }
}
