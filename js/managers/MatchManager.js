// ===========================
// MatchManager
// ===========================

export class MatchManager {
    constructor(app) {
        this.app = app;
    }

    sendToCourt() {
        if (this.app.selectedA === null || this.app.selectedB === null) {
            this.app.toast.error('กรุณาเลือก 2 คู่ก่อน');
            return;
        }

        const court = this.app.courts.findIdleCourt();
        if (!court) {
            this.app.toast.error('ไม่มีสนามว่าง!', '🚫');
            return;
        }

        const slotA = this.app.queue.findById(this.app.selectedA);
        const slotB = this.app.queue.findById(this.app.selectedB);
        if (!slotA || !slotB) return;

        const conflicts = slotA.findConflicts(slotB);
        if (conflicts.length > 0) {
            this._handleConflict(court, slotA, slotB, conflicts);
            return;
        }

        try {
            this._executeCourtAssignment({
                court,
                slotA,
                slotB,
                teamAOriginal: [...slotA.players],
                teamAPlaying: [...slotA.players],
                teamBOriginal: [...slotB.players],
                teamBPlaying: [...slotB.players],
            });
        } catch (error) {
            this.app.toast.error(error.message);
        }
    }

    _handleConflict(court, slotA, slotB, conflicts) {
        if (conflicts.length > 1) {
            this.app.toast.error(`ผู้เล่นซ้ำ ${conflicts.length} คน (${conflicts.join(', ')}) กรุณาแก้คู่ก่อนส่งลงสนาม`);
            return;
        }

        const conflictName = conflicts[0];
        const playingNames = this.app.courts.getAllPlayingNames();
        const available = this.app.queue.getAvailableSoloPlayerNames({
            excludeNames: [...slotA.players, ...slotB.players, ...playingNames],
            excludeSlotIds: [slotA.id, slotB.id],
        });

        if (available.length === 0) {
            this.app.toast.error('ไม่มีผู้เล่นเดี่ยวสำรองในคิว กรุณาแก้คู่ก่อน');
            return;
        }

        this.app.playerPicker.show(
            '⚠️ ผู้เล่นซ้ำ',
            `"${conflictName}" อยู่ทั้ง 2 ทีม เลือกคนมาแทนในทีมที่สอง`,
            available,
            (substituteName) => {
                const latestSlotA = this.app.queue.findById(slotA.id);
                const latestSlotB = this.app.queue.findById(slotB.id);

                if (!latestSlotA || !latestSlotB) {
                    this.app.toast.error('คิวมีการเปลี่ยนแปลง กรุณาเลือกคู่ใหม่');
                    return;
                }

                const resolvedTeamB = latestSlotB.players.map(player =>
                    player.toLowerCase() === conflictName.toLowerCase() ? substituteName : player
                );

                try {
                    this._executeCourtAssignment({
                        court,
                        slotA: latestSlotA,
                        slotB: latestSlotB,
                        teamAOriginal: [...latestSlotA.players],
                        teamAPlaying: [...latestSlotA.players],
                        teamBOriginal: resolvedTeamB,
                        teamBPlaying: resolvedTeamB,
                        substituteName,
                        substituteExcludedSlotIds: [latestSlotA.id, latestSlotB.id],
                    });
                    this.app.toast.info(`"${substituteName}" ลงแทน "${conflictName}"`, '🔄');
                } catch (error) {
                    this.app.toast.error(error.message);
                }
            }
        );
    }

    _executeCourtAssignment({
        court,
        slotA,
        slotB,
        teamAOriginal,
        teamAPlaying,
        teamBOriginal,
        teamBPlaying,
        substituteName = null,
        substituteExcludedSlotIds = [],
    }) {
        const activeCourt = this.app.courts.findById(court.id);
        if (!activeCourt || !activeCourt.isIdle) {
            throw new Error('สนามมีการเปลี่ยนแปลง กรุณาลองใหม่');
        }

        let reservedSubstitute = null;

        try {
            if (substituteName) {
                reservedSubstitute = this.app.queue.takeSoloPlayer(substituteName, {
                    excludeSlotIds: substituteExcludedSlotIds,
                });
            }

            const indexA = this.app.queue.slots.indexOf(slotA);
            const indexB = this.app.queue.slots.indexOf(slotB);
            if (indexA === -1 || indexB === -1) {
                throw new Error('คิวมีการเปลี่ยนแปลง กรุณาเลือกคู่ใหม่');
            }

            const teamA = {
                original: [...teamAOriginal],
                playing: [...teamAPlaying],
                originalSlotId: slotA.id,
                originalJoinedAt: slotA.joinedAt,
                originalQueueIndex: indexA,
            };
            const teamB = {
                original: [...teamBOriginal],
                playing: [...teamBPlaying],
                originalSlotId: slotB.id,
                originalJoinedAt: slotB.joinedAt,
                originalQueueIndex: indexB,
            };

            this.app.queue.removeSlot(slotA.id);
            this.app.queue.removeSlot(slotB.id);

            activeCourt.startGame(teamA, teamB);
            activeCourt.startTimer(() => this.app._updateTimersOnly());

            this.app.selectedA = null;
            this.app.selectedB = null;

            this.app._render();
            this.app._saveState();
            this.app.renderer.highlightCourt(activeCourt.id, 'success');
            this.app.renderer.highlightQueueCount('info');
            this.app.toast.success(`${teamA.playing.join(', ')} vs ${teamB.playing.join(', ')} ลง${activeCourt.name}แล้ว!`, '🚀');
        } catch (error) {
            if (reservedSubstitute) {
                this._restoreSubstituteSlot(reservedSubstitute);
            }
            throw error;
        }
    }

    _restoreSubstituteSlot(reservedSubstitute) {
        this.app.queue.insertSlotAt(
            reservedSubstitute.index,
            reservedSubstitute.slot.id,
            [...reservedSubstitute.slot.players],
            reservedSubstitute.slot.joinedAt
        );
    }

    _restoreTeamsToQueue(teams) {
        teams
            .filter(Boolean)
            .sort((a, b) => {
                const indexA = Number.isInteger(a.originalQueueIndex) ? a.originalQueueIndex : Number.MAX_SAFE_INTEGER;
                const indexB = Number.isInteger(b.originalQueueIndex) ? b.originalQueueIndex : Number.MAX_SAFE_INTEGER;
                return indexA - indexB;
            })
            .forEach((team) => {
                const targetIndex = Number.isInteger(team.originalQueueIndex)
                    ? team.originalQueueIndex
                    : this.app.queue.slots.length;

                this.app.queue.insertSlotAt(
                    targetIndex,
                    team.originalSlotId,
                    team.original,
                    team.originalJoinedAt || Date.now()
                );
            });
    }

    declareWinner(courtId, winner) {
        const court = this.app.courts.findById(courtId);
        if (!court || !court.isActive) return;

        const winningTeam = winner === 'A' ? court.teamA.playing.join(', ') : court.teamB.playing.join(', ');

        this.app.modal.show(
            '🏆 ยืนยันผลการแข่งขัน',
            `ยืนยันว่า "${winningTeam}" เป็นฝ่ายชนะใช่หรือไม่?`,
            () => {
                const result = court.declareWinner(winner);

                this.app.history.add(court.name, [...result.winner.playing], [...result.loser.playing], result.duration);
                this.app.queue.requeuePair(result.loser.original);

                if (result.type === 'champion_out') {
                    this.app.queue.requeuePair(result.winner.original);
                    this.app.toast.success(
                        `🏆 ${result.winner.playing.join(', ')} ชนะครบ 2 รอบ! ทั้ง 2 ทีมไปต่อคิว`,
                        '🏆'
                    );
                } else {
                    this.app.toast.success(
                        `${result.winner.playing.join(', ')} ชนะ! (🏆 ×${court.defendingWins}) - ${result.loser.playing.join(', ')} ไปต่อคิว`,
                        '🏆'
                    );
                }

                this.app._render();
                this.app._saveState();
                this.app.renderer.highlightHistoryItem(0, 'success');
                this.app.renderer.highlightQueueCount(result.type === 'champion_out' ? 'warning' : 'info');
                this.app.renderer.highlightCourt(courtId, result.type === 'champion_out' ? 'warning' : 'success');
            }
        );
    }

    openSwapPlayers(courtId) {
        const court = this.app.courts.findById(courtId);
        if (!court || !court.isActive) return;

        this.app.courtSwapModal.show(court, (teamAIndex, teamBIndex) => {
            this.swapPlayers(courtId, teamAIndex, teamBIndex);
        });
    }

    swapPlayers(courtId, teamAIndex, teamBIndex) {
        const court = this.app.courts.findById(courtId);
        if (!court || !court.isActive) return;
        if (!Number.isInteger(teamAIndex) || !Number.isInteger(teamBIndex)) return;
        if (!court.teamA?.playing?.[teamAIndex] || !court.teamB?.playing?.[teamBIndex]) return;

        const playerA = court.teamA.playing[teamAIndex];
        const playerB = court.teamB.playing[teamBIndex];

        court.teamA.playing[teamAIndex] = playerB;
        court.teamB.playing[teamBIndex] = playerA;

        this.app._render();
        this.app._saveState();
        this.app.renderer.highlightCourt(courtId, 'info');
        this.app.toast.success(`สลับ "${playerA}" กับ "${playerB}" แล้ว`, '🔀');
    }

    openRenamePlayer(courtId) {
        const court = this.app.courts.findById(courtId);
        if (!court || court.isIdle) return;

        const players = [...new Set([
            ...(court.teamA?.playing || []),
            ...(court.teamB?.playing || []),
        ])];

        if (players.length === 0) return;

        if (players.length === 1) {
            this.app.openRenamePlayer(players[0], `ผู้เล่นใน ${court.name}`);
            return;
        }

        this.app.playerPicker.show(
            '✏️ เลือกผู้เล่นที่ต้องการแก้ชื่อ',
            `เลือกผู้เล่นใน ${court.name}`,
            players,
            (selectedName) => {
                this.app.openRenamePlayer(selectedName, `ผู้เล่นใน ${court.name}`);
            }
        );
    }

    pickChallenger(courtId) {
        const court = this.app.courts.findById(courtId);
        if (!court || !court.isWaiting) return;

        const pairedSlots = this.app.queue.pairedSlots;
        if (pairedSlots.length === 0) {
            this.app.toast.error('ไม่มีคู่ในคิว กรุณาจับคู่ก่อน');
            return;
        }

        const defendingPlayers = court.teamA.playing;
        const playerNames = pairedSlots.map(slot => slot.displayName);

        this.app.playerPicker.show(
            '👆 เลือกคู่ต่อสู้',
            `เลือกคู่มาเจอ ${defendingPlayers.join(', ')}`,
            playerNames,
            (selectedName) => {
                const selectedSlot = pairedSlots.find(slot => slot.displayName === selectedName);
                if (!selectedSlot) return;

                const conflicts = selectedSlot.players.filter(player =>
                    defendingPlayers.some(defender => defender.toLowerCase() === player.toLowerCase())
                );

                if (conflicts.length > 0) {
                    this._handleChallengerConflict(courtId, court, selectedSlot, conflicts);
                    return;
                }

                this._confirmChallengerAssignment(courtId, court, selectedSlot, {
                    teamOriginal: [...selectedSlot.players],
                    teamPlaying: [...selectedSlot.players],
                });
            }
        );
    }

    _handleChallengerConflict(courtId, court, selectedSlot, conflicts) {
        if (conflicts.length > 1) {
            this.app.toast.error(`ผู้เล่นซ้ำ ${conflicts.length} คน (${conflicts.join(', ')}) กรุณาเลือกคู่อื่น`);
            return;
        }

        const conflictName = conflicts[0];
        const playingNames = this.app.courts.getAllPlayingNames();
        const available = this.app.queue.getAvailableSoloPlayerNames({
            excludeNames: [...court.teamA.playing, ...selectedSlot.players, ...playingNames],
            excludeSlotIds: [selectedSlot.id],
        });

        if (available.length === 0) {
            this.app.toast.error('ไม่มีผู้เล่นเดี่ยวสำรองในคิว กรุณาเลือกคู่ใหม่');
            return;
        }

        this.app.playerPicker.show(
            '⚠️ ผู้เล่นซ้ำ',
            `"${conflictName}" อยู่ทีมป้องกันแล้ว เลือกคนมาแทน`,
            available,
            (substituteName) => {
                const latestCourt = this.app.courts.findById(courtId);
                const latestSlot = this.app.queue.findById(selectedSlot.id);

                if (!latestCourt || !latestCourt.isWaiting || !latestSlot) {
                    this.app.toast.error('คู่ที่รอมีการเปลี่ยนแปลง กรุณาเลือกใหม่');
                    return;
                }

                const resolvedTeam = latestSlot.players.map(player =>
                    player.toLowerCase() === conflictName.toLowerCase() ? substituteName : player
                );

                this._confirmChallengerAssignment(courtId, latestCourt, latestSlot, {
                    teamOriginal: resolvedTeam,
                    teamPlaying: resolvedTeam,
                    substituteName,
                });
            }
        );
    }

    _confirmChallengerAssignment(courtId, court, slot, teamConfig) {
        const defenderNames = court.teamA.playing.join(', ');
        const challengerNames = teamConfig.teamPlaying.join(', ');

        this.app.modal.show(
            '⚔️ ยืนยันคู่ต่อสู้',
            `ส่ง "${challengerNames}" ขึ้นท้าชิง ${court.name} เจอกับ "${defenderNames}" ใช่หรือไม่?`,
            () => this._executeChallengerAssignment(courtId, slot.id, teamConfig),
            {
                confirmText: 'ยืนยัน',
                cancelText: 'เลือกใหม่',
                onCancel: () => this.pickChallenger(courtId),
            }
        );
    }

    _executeChallengerAssignment(courtId, slotId, teamConfig) {
        const court = this.app.courts.findById(courtId);
        const slot = this.app.queue.findById(slotId);
        if (!court || !court.isWaiting || !slot) {
            this.app.toast.error('ไม่สามารถส่งคู่ต่อสู้ได้ กรุณาเลือกใหม่');
            return;
        }

        let reservedSubstitute = null;

        try {
            if (teamConfig.substituteName) {
                reservedSubstitute = this.app.queue.takeSoloPlayer(teamConfig.substituteName, {
                    excludeSlotIds: [slot.id],
                });
            }

            const index = this.app.queue.slots.indexOf(slot);
            if (index === -1) {
                throw new Error('คิวมีการเปลี่ยนแปลง กรุณาเลือกใหม่');
            }

            const challengerTeam = {
                original: [...teamConfig.teamOriginal],
                playing: [...teamConfig.teamPlaying],
                originalSlotId: slot.id,
                originalJoinedAt: slot.joinedAt,
                originalQueueIndex: index,
            };

            const undoState = {
                courtId: court.id,
                challengerTeam: {
                    original: [...challengerTeam.original],
                    playing: [...challengerTeam.playing],
                    originalSlotId: challengerTeam.originalSlotId,
                    originalJoinedAt: challengerTeam.originalJoinedAt,
                    originalQueueIndex: challengerTeam.originalQueueIndex,
                },
            };

            this.app.queue.removeSlot(slot.id);
            court.setChallenger(challengerTeam);
            court.startTimer(() => this.app._updateTimersOnly());

            this.app._render();
            this.app._saveState();
            this.app.renderer.highlightCourt(court.id, 'success');
            this.app.renderer.highlightQueueCount('info');
            this.app.toast.show(`${teamConfig.teamPlaying.join(', ')} ขึ้นท้าชิง ${court.name}!`, 'success', '⚔️', {
                actionLabel: 'Undo',
                duration: 12000,
                onAction: () => this._undoChallengerAssignment(undoState),
            });
        } catch (error) {
            if (reservedSubstitute) {
                this._restoreSubstituteSlot(reservedSubstitute);
            }
            this.app.toast.error(error.message);
        }
    }

    _undoChallengerAssignment(undoState) {
        const court = this.app.courts.findById(undoState.courtId);
        if (!court || !court.isActive || !court.teamB) {
            this.app.toast.error('Undo ไม่สำเร็จ สถานะสนามเปลี่ยนไปแล้ว');
            return;
        }

        if (court.teamB.originalSlotId !== undoState.challengerTeam.originalSlotId) {
            this.app.toast.error('Undo ไม่สำเร็จ คู่บนสนามไม่ตรงกับรายการล่าสุด');
            return;
        }

        court.clearTimer();
        court.teamB = null;
        court.startTime = null;

        this.app.queue.insertSlotAt(
            undoState.challengerTeam.originalQueueIndex,
            undoState.challengerTeam.originalSlotId,
            undoState.challengerTeam.original,
            undoState.challengerTeam.originalJoinedAt
        );

        this.app._render();
        this.app._saveState();
        this.app.renderer.highlightCourt(undoState.courtId, 'warning');
        this.app.renderer.highlightQueueCount('info');
        this.app.toast.info(`${undoState.challengerTeam.playing.join(', ')} กลับเข้าคิวแล้ว`, '↩️');
    }

    cancelMatch(courtId) {
        const court = this.app.courts.findById(courtId);
        if (!court || !court.isActive) return;

        this.app.modal.show(
            '⚠️ ยืนยันการยกเลิกแมตช์',
            `คุณต้องการยกเลิกแมตช์บน "${court.name}" ใช่หรือไม่? ผู้เล่นจะถูกส่งกลับเข้าคิวเดิม`,
            () => {
                court.clearTimer();

                if (court.defendingWins > 0) {
                    const teamB = court.teamB;
                    court.teamB = null;
                    court.startTime = null;

                    this._restoreTeamsToQueue([teamB]);

                    this.app.toast.info(`ยกเลิกท้าชิง! ${teamB.playing.join(', ')} กลับสู่คิวเดิมแล้ว`, '🔙');
                } else {
                    const teamA = court.teamA;
                    const teamB = court.teamB;

                    court.teamA = null;
                    court.teamB = null;
                    court.startTime = null;
                    court.defendingWins = 0;

                    this._restoreTeamsToQueue([teamA, teamB]);

                    this.app.toast.info('ยกเลิกแมตช์! ทั้งสองทีมกลับสู่คิวเดิมแล้ว', '🔙');
                }

                this.app._render();
                this.app._saveState();
                this.app.renderer.highlightCourt(courtId, 'warning');
                this.app.renderer.highlightQueueCount('info');
            }
        );
    }

    requeueDefender(courtId) {
        const court = this.app.courts.findById(courtId);
        if (!court || !court.isWaiting) return;

        const defender = court.teamA;
        court.clearTimer();
        court.teamA = null;
        court.teamB = null;
        court.startTime = null;
        court.defendingWins = 0;

        this.app.queue.requeuePair(defender.original);

        this.app._render();
        this.app._saveState();
        this.app.renderer.highlightCourt(courtId, 'warning');
        this.app.renderer.highlightQueueCount('info');
        this.app.toast.info(`${defender.playing.join(', ')} กลับเข้าคิวแล้ว`, '🏠');
    }
}
