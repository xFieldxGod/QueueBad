// ===========================
// 💾 StorageManager (Supabase Realtime + LocalStorage Fallback)
// ===========================

// ⚡ จุดตั้งค่า Supabase
const SUPABASE_URL = "https://qxaeaanesrhpbjnmlddg.supabase.co"; // <--- นำค่าจากหน้า Settings > API > Project URL มาใส่ที่นี่
const SUPABASE_KEY = "sb_publishable_u9o4KNuwui78Ul-LhKwL4A_FBMqEBdy"; 
const REMOTE_SYNC_ENABLED = true;
const IS_LOCAL_DEVELOPMENT = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export class StorageManager {
    constructor(key = 'badmintonQueueState') {
        this.key = key;
        this.viewerStorageKey = `${key}:viewerId`;
        this.supabase = null;
        this.realtimeChannel = null;
        this.onRemoteChangeCallback = null;
        this.onSyncStatusChangeCallback = null;
        this.onPresenceChangeCallback = null;
        this.isProcessingRemote = false;
        this.isDisablingRemoteSync = false;
        this.hasReportedSupabaseIssue = false;
        this.viewerId = this._createViewerId();
        this.presenceInfo = {
            count: null,
            available: false,
            state: 'local',
        };
        this.remoteSyncConfigured = Boolean(
            REMOTE_SYNC_ENABLED &&
            window.supabase &&
            SUPABASE_URL &&
            SUPABASE_URL.includes('[กรุณาใส่') === false
        );
        this.syncStatus = {
            state: 'local',
            label: 'บันทึกในเครื่อง',
            detail: 'อุปกรณ์นี้เท่านั้น',
        };

        // เชื่อมต่อ Supabase
        if (IS_LOCAL_DEVELOPMENT) {
            this._setSyncStatus('local', 'บันทึกในเครื่อง', 'โหมดพัฒนาในเครื่อง');
            this._setPresenceInfo(null, false, 'local');
            console.info('[Supabase] โหมดพัฒนาในเครื่อง: ใช้ LocalStorage อย่างเดียว');
        } else if (this.remoteSyncConfigured) {
            this._setSyncStatus('connecting', 'กำลังเชื่อมต่อ', 'กำลังเตรียมซิงก์ข้อมูล');
            try {
                this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
                this._subscribeToChanges();
            } catch (e) {
                this._setSyncStatus('offline', 'ออฟไลน์', 'เชื่อมต่อ Supabase ไม่สำเร็จ');
                this._setPresenceInfo(null, false, 'offline');
                console.warn('[Supabase] createClient failed:', e);
                this.supabase = null;
            }
        } else if (!REMOTE_SYNC_ENABLED) {
            this._setSyncStatus('local', 'บันทึกในเครื่อง', 'โหมดออฟไลน์เท่านั้น');
            this._setPresenceInfo(null, false, 'local');
        } else {
            this._setSyncStatus('local', 'บันทึกในเครื่อง', 'ยังไม่ได้ตั้งค่าออนไลน์');
            this._setPresenceInfo(null, false, 'local');
            console.warn("[Supabase] ยังไม่ได้ใส่ Project URL ระบบจะทำงานแบบออฟไลน์ (ดูได้เฉพาะเครื่องนี้) ผ่าน LocalStorage ไปก่อน");
        }
    }

    /**
     * บันทึกข้อมูลลงทั้ง LocalStorage (สำรอง) และ Supabase (หลัก)
     */
    async save(state) {
        // ออฟไลน์ 
        try {
            localStorage.setItem(this.key, JSON.stringify(state));
            if (!this.supabase && !this.isProcessingRemote) {
                this._setSyncStatus('local', 'บันทึกในเครื่อง', 'บันทึกล่าสุดแล้ว');
            }
        } catch(e) {
            console.error('Failed to reserve state locally:', e);
        }

        // ออนไลน์
        if (this.supabase && !this.isProcessingRemote) {
            this._setSyncStatus('syncing', 'กำลังซิงก์', 'กำลังบันทึกข้อมูลล่าสุด');
            try {
                const { error } = await this.supabase
                    .from('gamestate')
                    .update({ state_data: state })
                    .eq('id', 1);
                
                if (error) throw error;
                this._setSyncStatus('online', 'ซิงก์ออนไลน์', 'ข้อมูลล่าสุดถูกบันทึกแล้ว');
            } catch (e) {
                this._disableRemoteSync('บันทึกข้อมูลออนไลน์ไม่สำเร็จ ระบบจะกลับไปใช้ LocalStorage อย่างเดียว', e);
            }
        }
    }

    /**
     * ดึงข้อมูลตอนเปิดเว็บครั้งแรก โหลดจาก Supabase ก่อน
     */
    async load() {
        if (this.supabase) {
            this._setSyncStatus('syncing', 'กำลังซิงก์', 'กำลังโหลดข้อมูลล่าสุด');
            try {
                const { data, error } = await this.supabase
                    .from('gamestate')
                    .select('state_data')
                    .eq('id', 1)
                    .single();
                
                if (data && data.state_data) {
                    // แบคอัพออฟไลน์
                    localStorage.setItem(this.key, JSON.stringify(data.state_data));
                    this._setSyncStatus('online', 'ซิงก์ออนไลน์', 'พร้อมใช้งานหลายอุปกรณ์');
                    return data.state_data;
                }

                this._setSyncStatus('online', 'ซิงก์ออนไลน์', 'พร้อมใช้งานหลายอุปกรณ์');
            } catch (e) {
                this._disableRemoteSync('โหลดข้อมูลออนไลน์ไม่สำเร็จ ระบบจะใช้ข้อมูล LocalStorage แทน', e);
            }
        }

        // ดึงจาก LocalStorage กรณีเน็ตหลุด / ไม่ได้ใช้ Supabase
        try {
            const saved = localStorage.getItem(this.key);
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    }

    /** ล้าง state */
    clear() {
        localStorage.removeItem(this.key);
        // Supabase ก็ให้เซฟค่าว่างเปล่าทับ
        this.save({ queue: [], courts: [], history: [], courtIdCounter: 1 });
    }

    /** 
     * ฟังก์ชั่นสำหรับตั้งค่าสิ่งที่จะทำเมื่อมีอัปเดตจากคนอื่นหลุดเข้ามา
     */
    onRemoteChange(callback) {
        this.onRemoteChangeCallback = callback;
    }

    onSyncStatusChange(callback) {
        this.onSyncStatusChangeCallback = callback;

        if (callback) {
            callback({ ...this.syncStatus });
        }
    }

    onPresenceChange(callback) {
        this.onPresenceChangeCallback = callback;

        if (callback) {
            callback({ ...this.presenceInfo });
        }
    }

    /** สมัครรับข้อมูลอัปเดตล่าสุดจากคนอื่นๆ แบบเรียลไทม์ระดับเสี้ยววินาที */
    _subscribeToChanges() {
        if (!this.supabase) return;

        this.realtimeChannel = this.supabase.channel('supabase_realtime', {
            config: {
                presence: {
                    key: this.viewerId,
                },
            },
        });

        this.realtimeChannel
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'gamestate', filter: 'id=eq.1' },
                (payload) => {
                    const newState = payload.new.state_data;
                    if (this.onRemoteChangeCallback && newState) {
                        this._setSyncStatus('online', 'ซิงก์ออนไลน์', 'รับอัปเดตจากอุปกรณ์อื่นแล้ว');
                        // ป้องกันการเซฟวนลูประหว่างเครื่อง (เราดึงของเค้ามา แล้วดันเซฟทับกลับไป)
                        this.isProcessingRemote = true; 
                        
                        this.onRemoteChangeCallback(newState);
                        
                        // ปลดล็อกให้เซฟได้ปกติหลังอัปเดต UI ของเราเสร็จ
                        setTimeout(() => { this.isProcessingRemote = false; }, 500); 
                    }
                }
            )
            .on('presence', { event: 'sync' }, () => {
                this._updatePresenceCount();
            })
            .on('presence', { event: 'join' }, () => {
                this._updatePresenceCount();
            })
            .on('presence', { event: 'leave' }, () => {
                this._updatePresenceCount();
            })
            .subscribe((status) => {
                if(status === 'SUBSCRIBED') {
                    this._setSyncStatus('online', 'ซิงก์ออนไลน์', 'พร้อมใช้งานหลายอุปกรณ์');
                    this._trackPresence();
                    console.log("🟢 Supabase Realtime Connected!");
                    return;
                }

                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    this._setSyncStatus('offline', 'ออฟไลน์', 'เชื่อมต่อออนไลน์ไม่สำเร็จ');
                    this._setPresenceInfo(null, false, 'offline');
                }

                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                    this._disableRemoteSync('เชื่อมต่อ Supabase Realtime ไม่สำเร็จ ระบบจะทำงานแบบออฟไลน์แทน');
                }
            });
    }

    async _trackPresence() {
        if (!this.realtimeChannel?.track) {
            return;
        }

        try {
            await this.realtimeChannel.track({
                online_at: new Date().toISOString(),
            });
            this._updatePresenceCount();
        } catch {
            this._setPresenceInfo(null, false, 'offline');
        }
    }

    _updatePresenceCount() {
        if (!this.realtimeChannel?.presenceState) {
            this._setPresenceInfo(null, false, 'offline');
            return;
        }

        const presenceState = this.realtimeChannel.presenceState();
        const count = Object.keys(presenceState).length;

        this._setPresenceInfo(count, true, 'online');
    }

    _createViewerId() {
        try {
            const existingViewerId = localStorage.getItem(this.viewerStorageKey);
            if (existingViewerId) {
                return existingViewerId;
            }
        } catch {
        }

        let nextViewerId;

        if (window.crypto?.randomUUID) {
            nextViewerId = window.crypto.randomUUID();
        } else {
            nextViewerId = `viewer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        }

        try {
            localStorage.setItem(this.viewerStorageKey, nextViewerId);
        } catch {
        }

        return nextViewerId;
    }

    _setPresenceInfo(count, available, state) {
        const normalizedCount = Number.isFinite(count) ? count : null;

        if (
            this.presenceInfo.count === normalizedCount &&
            this.presenceInfo.available === available &&
            this.presenceInfo.state === state
        ) {
            return;
        }

        this.presenceInfo = {
            count: normalizedCount,
            available,
            state,
        };

        if (this.onPresenceChangeCallback) {
            this.onPresenceChangeCallback({ ...this.presenceInfo });
        }
    }

    _setSyncStatus(state, label, detail) {
        if (
            this.syncStatus.state === state &&
            this.syncStatus.label === label &&
            this.syncStatus.detail === detail
        ) {
            return;
        }

        this.syncStatus = { state, label, detail };

        if (this.onSyncStatusChangeCallback) {
            this.onSyncStatusChangeCallback({ ...this.syncStatus });
        }
    }

    _disableRemoteSync(message, error = null) {
        if (this.isDisablingRemoteSync) {
            return;
        }

        this.isDisablingRemoteSync = true;
        this.remoteSyncConfigured = false;

        const channel = this.realtimeChannel;
        const supabase = this.supabase;

        this.realtimeChannel = null;
        this.supabase = null;

        if (channel) {
            try {
                channel.unsubscribe();
            } catch {
            }

            if (supabase?.removeChannel) {
                try {
                    supabase.removeChannel(channel);
                } catch {
                }
            }
        }
        this._setSyncStatus('offline', 'ออฟไลน์', 'ใช้ LocalStorage ชั่วคราว');
        this._setPresenceInfo(null, false, 'offline');

        if (!this.hasReportedSupabaseIssue) {
            this.hasReportedSupabaseIssue = true;
            console.warn(`[Supabase] ${message}`);
            if (error) {
                console.warn(error);
            }
        }

        this.isDisablingRemoteSync = false;
    }
}
