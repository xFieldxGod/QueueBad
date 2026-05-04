// ===========================
// 🏟️ CourtManager (Updated)
// ===========================

import { Court } from '../models/Court.js';

export class CourtManager {
    constructor(initialCount = 3) {
        /** @type {Court[]} */
        this.courts = [];
        this.nextId = 1;

        for (let i = 0; i < initialCount; i++) {
            this.addCourt();
        }
    }

    get count() {
        return this.courts.length;
    }

    findIdleCourt() {
        return this.courts.find(c => c.isIdle);
    }

    findById(id) {
        return this.courts.find(c => c.id === id);
    }

    get hasIdleCourt() {
        return this.courts.some(c => c.isIdle);
    }

    /** @returns {number} จำนวนผู้เล่นที่กำลังเล่นทั้งหมด */
    get totalPlayingCount() {
        return this.courts.reduce((sum, c) => sum + c.allPlayingPlayers.length, 0);
    }

    /**
     * ตรวจสอบว่ามีผู้เล่นชื่อนี้กำลังเล่นอยู่หรือไม่
     * @param {string} name
     * @returns {boolean}
     */
    isPlayerPlaying(name) {
        return this.courts.some(c => c.hasPlayer(name));
    }

    /**
     * ดึงรายชื่อผู้เล่นทั้งหมดที่กำลังเล่น
     * @returns {string[]}
     */
    getAllPlayingNames() {
        const names = [];
        this.courts.forEach(c => {
            if (c.isActive || c.isWaiting) {
                names.push(...c.allPlayingPlayers);
            }
        });
        return names;
    }

    renamePlayer(oldName, newName) {
        const source = oldName.toLowerCase();
        const replaceName = (players = []) => players.map(player =>
            player.toLowerCase() === source ? newName : player
        );

        this.courts.forEach(court => {
            if (court.teamA) {
                court.teamA.original = replaceName(court.teamA.original || []);
                court.teamA.playing = replaceName(court.teamA.playing || []);
            }

            if (court.teamB) {
                court.teamB.original = replaceName(court.teamB.original || []);
                court.teamB.playing = replaceName(court.teamB.playing || []);
            }
        });
    }

    recalculateNames() {
        this.courts.forEach((court, index) => {
            court.name = `สนาม ${index + 1}`;
        });
    }

    addCourt() {
        const court = new Court(this.nextId, `สนาม ${this.nextId}`);
        this.courts.push(court);
        this.nextId++;
        this.recalculateNames();
        return court;
    }

    removeCourt(courtId) {
        const court = this.findById(courtId);
        if (!court) throw new Error('ไม่พบสนาม');
        if (court.isActive || court.isWaiting) throw new Error('ไม่สามารถลบสนามที่กำลังใช้งาน');
        this.courts = this.courts.filter(c => c.id !== courtId);
        this.recalculateNames();
    }

    loadFromData(data, nextId) {
        this.courts = (data || []).map(d => Court.fromJSON(d));
        this.nextId = nextId || (this.courts.length + 1);
        this.recalculateNames();
    }

    toJSON() {
        return this.courts.map(c => c.toJSON());
    }
}
