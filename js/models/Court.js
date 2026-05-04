// ===========================
// 🏟️ Court Model (King of the Court System)
// ===========================

export class Court {
    constructor(id, name) {
        this.id = id;
        this.name = name;

        /**
         * @type {{ original: string[], playing: string[] } | null}
         * original = คู่เดิมจากคิว, playing = ผู้เล่นจริงบนสนาม
         */
        this.teamA = null;
        this.teamB = null;

        this.startTime = null;
        this.timerInterval = null;

        /** จำนวนรอบที่ทีมป้องกันชนะติดต่อกัน (ทีมป้องกัน = teamA เสมอ) */
        this.defendingWins = 0;
    }

    static fromJSON(data) {
        const court = new Court(data.id, data.name);
        court.teamA = data.teamA || null;
        court.teamB = data.teamB || null;
        court.startTime = data.startTime || null;
        court.defendingWins = data.defendingWins || 0;
        return court;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            teamA: this.teamA,
            teamB: this.teamB,
            startTime: this.startTime,
            defendingWins: this.defendingWins,
        };
    }

    /** สนามว่าง */
    get isIdle() {
        return this.teamA === null && this.teamB === null;
    }

    /** กำลังเล่น (มีครบ 2 ทีม) */
    get isActive() {
        return this.teamA !== null && this.teamB !== null;
    }

    /** รอคู่ต่อสู้ (ทีมชนะอยู่ รอคู่ใหม่) */
    get isWaiting() {
        return this.teamA !== null && this.teamB === null;
    }

    get elapsedTime() {
        return this.startTime ? Date.now() - this.startTime : 0;
    }

    get allPlayingPlayers() {
        const players = [];
        if (this.teamA) players.push(...this.teamA.playing);
        if (this.teamB) players.push(...this.teamB.playing);
        return players;
    }

    /**
     * เริ่มเกมใหม่ (2 ทีมใหม่)
     */
    startGame(teamA, teamB) {
        this.teamA = teamA;
        this.teamB = teamB;
        this.startTime = Date.now();
        this.defendingWins = 0;
    }

    /**
     * ประกาศทีมชนะ
     * @param {'A'|'B'} winner
     * @returns {{ type: 'winner_stays'|'champion_out', winner: Object, loser: Object, duration: number }}
     */
    declareWinner(winner) {
        const winnerTeam = winner === 'A' ? this.teamA : this.teamB;
        const loserTeam = winner === 'A' ? this.teamB : this.teamA;
        const duration = this.elapsedTime;

        this.clearTimer();

        // นับรอบชนะ
        if (winner === 'A') {
            // ทีมป้องกัน (teamA) ชนะ
            this.defendingWins++;
        } else {
            // ทีมท้าชิง (teamB) ชนะ → เป็นทีมป้องกันใหม่
            this.defendingWins = 1;
        }

        if (this.defendingWins >= 2) {
            // ชนะครบ 2 รอบ → ทั้ง 2 ทีมออก
            this.teamA = null;
            this.teamB = null;
            this.startTime = null;
            this.defendingWins = 0;

            return { type: 'champion_out', winner: winnerTeam, loser: loserTeam, duration };
        } else {
            // ชนะ 1 รอบ → อยู่ต่อ รอคู่ใหม่
            // วาง winner ไว้ที่ teamA (ตำแหน่งป้องกัน) เสมอ
            this.teamA = winnerTeam;
            this.teamB = null;
            this.startTime = null;

            return { type: 'winner_stays', winner: winnerTeam, loser: loserTeam, duration };
        }
    }

    /**
     * เลือกคู่ต่อสู้ (หลังทีมป้องกันชนะ รอคู่ใหม่)
     * @param {{ original: string[], playing: string[] }} challengerTeam
     */
    setChallenger(challengerTeam) {
        this.teamB = challengerTeam;
        this.startTime = Date.now();
    }

    hasPlayer(name) {
        return this.allPlayingPlayers.some(p => p.toLowerCase() === name.toLowerCase());
    }

    startTimer(callback) {
        this.clearTimer();
        this.timerInterval = setInterval(callback, 1000);
    }

    clearTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
}
