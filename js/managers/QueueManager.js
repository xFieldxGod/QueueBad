// ===========================
// QueueManager
// ===========================

import { QueueSlot } from '../models/QueueSlot.js';

export class QueueManager {
    constructor() {
        /** @type {QueueSlot[]} */
        this.slots = [];
        this.nextSlotId = 1;
    }

    get count() {
        return this.slots.length;
    }

    get playerCount() {
        return this.slots.reduce((sum, slot) => sum + slot.players.length, 0);
    }

    get isEmpty() {
        return this.slots.length === 0;
    }

    get pairedSlots() {
        return this.slots.filter(slot => slot.isPaired);
    }

    addPlayer(name) {
        if (this.isNameInQueue(name)) {
            throw new Error(`"${name}" อยู่ในคิวแล้ว`);
        }

        const slot = new QueueSlot(this.nextSlotId++, [name]);
        this.slots.push(slot);
        return slot;
    }

    removeSlot(slotId) {
        const index = this.slots.findIndex(slot => slot.id === slotId);
        if (index === -1) throw new Error('ไม่พบ slot');
        return this.slots.splice(index, 1)[0];
    }

    reorderSlot(oldIndex, newIndex) {
        if (oldIndex < 0 || oldIndex >= this.slots.length || newIndex < 0 || newIndex >= this.slots.length) {
            return;
        }

        const item = this.slots.splice(oldIndex, 1)[0];
        this.slots.splice(newIndex, 0, item);
    }

    findSlotsByPlayer(name, options = {}) {
        const excludedSlotIds = new Set(options.excludeSlotIds || []);
        return this.slots.filter(slot =>
            !excludedSlotIds.has(slot.id) && slot.hasPlayer(name)
        );
    }

    pairSlot(slotId, partnerName) {
        const slot = this.findById(slotId);
        if (!slot) throw new Error('ไม่พบ slot');
        if (slot.isPaired) throw new Error('จับคู่แล้ว');

        const playerName = slot.players[0];
        const normalizedPlayer = playerName.toLowerCase();
        const normalizedPartner = partnerName.toLowerCase();

        if (normalizedPlayer === normalizedPartner) {
            throw new Error('ไม่สามารถจับคู่กับตัวเองได้');
        }

        const duplicatePair = this.slots.find(candidate =>
            candidate.isPaired &&
            candidate.hasPlayer(playerName) &&
            candidate.hasPlayer(partnerName)
        );
        if (duplicatePair) {
            throw new Error(`คู่ "${playerName}" กับ "${partnerName}" มีอยู่แล้ว`);
        }

        const partnerSoloSlot = this.slots.find(candidate =>
            candidate.isSolo &&
            candidate.id !== slotId &&
            candidate.hasPlayer(partnerName)
        );
        if (partnerSoloSlot) {
            this.removeSlot(partnerSoloSlot.id);
        }

        slot.pairWith(partnerName);
        return slot;
    }

    unpairSlot(slotId) {
        const slot = this.findById(slotId);
        if (!slot) throw new Error('ไม่พบ slot');
        if (slot.isSolo) throw new Error('ไม่ได้จับคู่');

        const removedName = slot.unpair();
        const existsElsewhere = this.slots.some(candidate =>
            candidate.id !== slotId && candidate.hasPlayer(removedName)
        );

        let newSlot = null;
        if (!existsElsewhere) {
            newSlot = new QueueSlot(this.nextSlotId++, [removedName]);
            const index = this.slots.indexOf(slot);
            this.slots.splice(index + 1, 0, newSlot);
        }

        return { originalSlot: slot, newSlot };
    }

    insertSlotAt(index, id, players, joinedAt) {
        const safeId = id || this.nextSlotId++;
        const slot = new QueueSlot(safeId, players, joinedAt);
        const safeIndex = Math.max(0, Math.min(index, this.slots.length));
        this.slots.splice(safeIndex, 0, slot);

        if (safeId >= this.nextSlotId) {
            this.nextSlotId = safeId + 1;
        }

        return slot;
    }

    requeuePair(players) {
        const slot = new QueueSlot(this.nextSlotId++, players);
        this.slots.push(slot);
        return slot;
    }

    isNameInQueue(name) {
        return this.slots.some(slot => slot.hasPlayer(name));
    }

    getAllPlayerNames() {
        const names = new Set();
        this.slots.forEach(slot => slot.players.forEach(player => names.add(player)));
        return [...names];
    }

    getAvailableSoloPlayerNames(options = {}) {
        const excludedNames = new Set((options.excludeNames || []).map(name => name.toLowerCase()));
        const excludedSlotIds = options.excludeSlotIds || [];

        return this.slots
            .filter(slot => {
                if (!slot.isSolo || excludedSlotIds.includes(slot.id)) {
                    return false;
                }

                const playerName = slot.players[0];
                if (!playerName || excludedNames.has(playerName.toLowerCase())) {
                    return false;
                }

                const matches = this.findSlotsByPlayer(playerName, { excludeSlotIds: excludedSlotIds });
                return matches.length === 1 && matches[0].id === slot.id;
            })
            .map(slot => slot.players[0]);
    }

    getEligiblePartnerNames(slotId) {
        const slot = this.findById(slotId);
        if (!slot || slot.isPaired) {
            return [];
        }

        const playerName = slot.players[0];
        return this.getAllPlayerNames().filter(candidateName => {
            if (candidateName.toLowerCase() === playerName.toLowerCase()) {
                return false;
            }

            const isDuplicatePair = this.slots.some(candidate =>
                candidate.isPaired &&
                candidate.id !== slotId &&
                candidate.hasPlayer(playerName) &&
                candidate.hasPlayer(candidateName)
            );

            return !isDuplicatePair;
        });
    }

    takeSoloPlayer(name, options = {}) {
        const matches = this.findSlotsByPlayer(name, options);

        if (matches.length === 0) {
            throw new Error(`"${name}" ไม่ได้อยู่ในคิวเดี่ยว`);
        }
        if (matches.length > 1) {
            throw new Error(`"${name}" มีชื่อซ้ำในคิว กรุณาแก้คิวก่อน`);
        }

        const [slot] = matches;
        if (!slot.isSolo) {
            throw new Error(`"${name}" ถูกจับคู่อยู่แล้ว`);
        }

        const index = this.slots.findIndex(candidate => candidate.id === slot.id);
        if (index === -1) throw new Error('ไม่พบ slot');

        this.slots.splice(index, 1);
        return { slot, index };
    }

    renamePlayer(oldName, newName) {
        const source = oldName.toLowerCase();

        this.slots.forEach(slot => {
            slot.players = slot.players.map(player =>
                player.toLowerCase() === source ? newName : player
            );
        });
    }

    findById(slotId) {
        return this.slots.find(slot => slot.id === slotId);
    }

    loadFromData(data) {
        if (!data || !data.slots) {
            return;
        }

        this.nextSlotId = data.nextSlotId || 1;
        this.slots = data.slots.map(item => {
            const slot = QueueSlot.fromJSON(item);
            if (slot.id === undefined || slot.id === null || Number.isNaN(slot.id)) {
                slot.id = this.nextSlotId++;
            }
            return slot;
        });

        const maxId = this.slots.reduce((max, slot) => Math.max(max, slot.id), 0);
        if (maxId >= this.nextSlotId) {
            this.nextSlotId = maxId + 1;
        }
    }

    toJSON() {
        return {
            slots: this.slots.map(slot => slot.toJSON()),
            nextSlotId: this.nextSlotId,
        };
    }
}
