// ===========================
// 📜 HistoryManager
// ===========================

import { GameHistory } from '../models/GameHistory.js';

export class HistoryManager {
    /**
     * @param {number} [maxItems=50] - จำนวนรายการสูงสุด
     */
    constructor(maxItems = 50) {
        /** @type {GameHistory[]} */
        this.items = [];
        this.maxItems = maxItems;
    }

    /** @returns {number} จำนวนรายการ */
    get count() {
        return this.items.length;
    }

    /** @returns {boolean} ไม่มีประวัติ */
    get isEmpty() {
        return this.items.length === 0;
    }

    /**
     * เพิ่มประวัติใหม่ (แทรกด้านบน)
     * @param {string} courtName
     * @param {string[]} players
     * @param {number} duration
     */
    add(courtName, winnerPlayers, loserPlayers, duration) {
        const record = new GameHistory(courtName, winnerPlayers, loserPlayers, duration);
        this.items.unshift(record);

        // จำกัดจำนวน
        if (this.items.length > this.maxItems) {
            this.items = this.items.slice(0, this.maxItems);
        }
    }

    /** ล้างประวัติทั้งหมด */
    clear() {
        this.items = [];
    }

    removeAt(index) {
        if (!Number.isInteger(index) || index < 0 || index >= this.items.length) {
            return null;
        }

        const [removedItem] = this.items.splice(index, 1);
        return removedItem || null;
    }

    renamePlayer(oldName, newName) {
        const source = oldName.toLowerCase();
        const replaceName = (players = []) => players.map(player =>
            player.toLowerCase() === source ? newName : player
        );

        this.items.forEach(item => {
            item.winnerPlayers = replaceName(item.winnerPlayers || []);
            item.loserPlayers = replaceName(item.loserPlayers || []);
            item.players = replaceName(item.players || []);

            if (item.winnerPlayers.length > 0 || item.loserPlayers.length > 0) {
                item.players = [...item.winnerPlayers, ...item.loserPlayers];
            }
        });
    }

    /**
     * โหลดจากข้อมูล (จาก localStorage)
     * @param {Object[]} data
     */
    loadFromData(data) {
        this.items = (data || []).map(d => GameHistory.fromJSON(d));
    }

    /**
     * แปลงเป็น array สำหรับ serialize
     * @returns {Object[]}
     */
    toJSON() {
        return this.items.map(item => item.toJSON());
    }
}
