import { native, sys } from 'cc';

type PredefinedEffect = 'TICK' | 'CLICK' | 'HEAVY_CLICK' | 'DOUBLE_CLICK';

interface NavigatorVibrate {
    vibrate?: (pattern: number | number[]) => boolean;
}

const ANDROID_HAPTICS_CLASS = 'com/cocos/game/HapticsBridge';
const SIG_STRING = '(Ljava/lang/String;)V';

function isAndroidNative(): boolean {
    return sys.isNative && sys.os === sys.OS.ANDROID;
}

class HapticsServiceClass {
    public previewSwitch(): void {
        this.vibratePredefined('CLICK');
    }

    public clearablePreview(): void {
        this.vibratePredefined('DOUBLE_CLICK');
    }

    public placed(): void {
        this.vibratePredefined('TICK');
    }

    public rejected(): void {
        this.vibratePredefined('HEAVY_CLICK');
    }

    public cleared(): void {
        this.vibrateWaveform([50, 50, 50, 50, 50], [51, 102, 153, 204, 255]);
    }

    private vibratePredefined(effect: PredefinedEffect): void {
        if (isAndroidNative()) {
            this.callAndroid('vibratePredefined', effect);
            return;
        }
        if (sys.isBrowser) this.vibrateWeb(effect === 'DOUBLE_CLICK' ? [15, 35, 15] : 15);
    }

    private vibrateWaveform(timings: number[], amplitudes?: number[]): void {
        if (isAndroidNative()) {
            this.callAndroid('vibrateWaveform', JSON.stringify({ t: timings, a: amplitudes ?? null, r: -1 }));
            return;
        }
        if (sys.isBrowser) this.vibrateWeb(timings);
    }

    private callAndroid(method: string, arg: string): void {
        try {
            native.reflection.callStaticMethod(ANDROID_HAPTICS_CLASS, method, SIG_STRING, arg);
        } catch {
            // Native bridge failure should not affect game flow.
        }
    }

    private vibrateWeb(pattern: number | number[]): void {
        try {
            (globalThis as unknown as { navigator?: NavigatorVibrate }).navigator?.vibrate?.(pattern);
        } catch {
            // Browser may not support vibration or user disabled it.
        }
    }
}

export const HapticsService = new HapticsServiceClass();
