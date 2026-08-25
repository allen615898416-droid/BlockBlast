// Block Blast - AdMob Rewarded Ad Service
// TS <-> Java bridge via native.reflection (TS->Java) and native.bridge.onNative (Java->TS).

import { native, sys } from 'cc';

export type AdEventType = 'ad_loaded' | 'ad_rewarded' | 'ad_closed' | 'ad_failed';
export type AdEventListener = (arg: string) => void;

const AD_CLASS = 'com/cocos/game/AppActivity';
const SIG_VOID = '()V';

function isAndroidNative(): boolean {
    return sys.isNative && sys.os === sys.OS.ANDROID;
}

class AdServiceClass {
    private listeners = new Map<AdEventType, AdEventListener[]>();
    private bridgeBound = false;
    public isLoaded: boolean = false;

    /** Register listener for ad events. Events only fire on Android native. */
    public on(event: AdEventType, listener: AdEventListener): void {
        const list = this.listeners.get(event) ?? [];
        list.push(listener);
        this.listeners.set(event, list);
        this.ensureBridge();
    }

    public off(event: AdEventType, listener: AdEventListener): void {
        const list = this.listeners.get(event);
        if (!list) return;
        const idx = list.indexOf(listener);
        if (idx >= 0) list.splice(idx, 1);
    }

    /** Preload a rewarded ad. Call at game start so the ad is ready on game over. */
    public preloadRewarded(): void {
        if (!isAndroidNative()) return;
        try {
            native.reflection.callStaticMethod(AD_CLASS, 'preloadRewardedAd', SIG_VOID);
        } catch {
            // Bridge failure should not affect game flow.
        }
    }

    /**
     * Show the preloaded rewarded ad.
     * Resolution:
     *  - ad_rewarded: user finished watching, grant the revive
     *  - ad_closed (without rewarded): user closed early, back to popup
     *  - ad_failed: ad unavailable, caller decides fallback
     */
    public showRewarded(): boolean {
        if (!isAndroidNative()) return false;
        try {
            native.reflection.callStaticMethod(AD_CLASS, 'showRewardedAd', SIG_VOID);
            return true;
        } catch {
            return false;
        }
    }

    private ensureBridge(): void {
        if (this.bridgeBound || !isAndroidNative()) return;
        this.bridgeBound = true;
        try {
            // native.bridge.onNative is a single global callback (property assignment),
            // not a per-event subscribe — dispatch internally by event name.
            native.bridge.onNative = (event: string, data?: string) => {
                this.dispatch(event as AdEventType, data ?? '');
            };
        } catch {
            this.bridgeBound = false;
        }
    }

    private dispatch(event: AdEventType, arg: string): void {
        if (event === 'ad_loaded') this.isLoaded = true;
        if (event === 'ad_failed' || event === 'ad_closed') this.isLoaded = false;
        const list = this.listeners.get(event);
        if (!list) return;
        for (const fn of list) fn(arg);
    }
}

export const AdService = new AdServiceClass();
