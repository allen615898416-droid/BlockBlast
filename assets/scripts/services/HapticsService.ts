import { native, sys } from 'cc';

type PredefinedEffect = 'TICK' | 'CLICK' | 'HEAVY_CLICK' | 'DOUBLE_CLICK';

interface NavigatorVibrate {
    vibrate?: (pattern: number | number[]) => boolean;
}

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
            // Cocos 3.8.8 使用 native.bridge.sendToNative 而非 native.reflection.callStaticMethod
            native.bridge.sendToNative('haptic_predefined', effect);
            return;
        }
        if (sys.isBrowser) this.vibrateWeb(effect === 'DOUBLE_CLICK' ? [15, 35, 15] : 15);
    }

    private vibrateWaveform(timings: number[], amplitudes?: number[]): void {
        if (isAndroidNative()) {
            native.bridge.sendToNative('haptic_waveform', JSON.stringify({ t: timings, a: amplitudes ?? null, r: -1 }));
            return;
        }
        if (sys.isBrowser) this.vibrateWeb(timings);
    }

    private vibrateWeb(pattern: number | number[]): void {
        try {
            (globalThis as unknown as { navigator?: NavigatorVibrate }).navigator?.vibrate?.(pattern);
        } catch {
            // 浏览器可能不支持或用户禁用震动。
        }
    }
}

export const HapticsService = new HapticsServiceClass();
