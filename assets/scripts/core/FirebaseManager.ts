import { native, sys } from 'cc';
import { NATIVE } from 'cc/env';

// ─────────────────────────────────────────────────────────────────
// FirebaseManager — Firebase Analytics 事件 + 用户属性上报入口
//
// 设计要点（与 stack-cocos 同模式）:
//  - Android Native：Firebase Android SDK 在 AppActivity.java onCreate 用
//    FirebaseOptions 手动初始化（无需 google-services 插件/json 文件），
//    这里通过 native.reflection 调用 Java 静态桥方法：
//      firebaseOnEvent(eventId, paramsJson)       — 自定义事件（任意扁平字段）
//      firebaseSetUserProperty(key, value)        — 用户属性（单设备聚合值）
//  - Web/H5：本项目当前未接 Firebase Web SDK，静默降级只打日志（不影响主流程）。
//  - 上报失败/环境不支持时静默，绝不影响游戏主流程。
//
// Firebase 控制台「事件」里无需手动注册——事件上报后自动出现。
// ─────────────────────────────────────────────────────────────────

export type TrackEventParams = Record<string, string | number | boolean>;

class FirebaseManagerImpl {
    /** 通用埋点入口：eventId + 任意字段集合。 */
    trackEvent(eventId: string, params: TrackEventParams = {}): void {
        try {
            if (NATIVE) {
                this.sendNativeEvent(eventId, params);
            } else {
                console.log(`[Firebase] (web noop) ${eventId}`, params);
            }
        } catch (e) {
            console.error('[Firebase] trackEvent failed', e);
        }
    }

    /** 用户属性：Firebase 后台按单个用户查看/筛选用（best/avg/games 等） */
    setUserProperty(key: string, value: string | number): void {
        try {
            if (NATIVE) {
                this.sendNativeUserProperty(key, value);
            } else {
                console.log(`[Firebase] (web noop) setUserProperty ${key}=${value}`);
            }
        } catch (e) {
            console.error('[Firebase] setUserProperty failed', e);
        }
    }

    private sendNativeEvent(eventId: string, params: TrackEventParams): void {
        // 目前只接了 Android；iOS 原生工程尚未在本项目中生成，暂不下发。
        if (sys.os !== sys.OS.ANDROID) return;
        const reflection = native?.reflection;
        if (!reflection || typeof reflection.callStaticMethod !== 'function') return;

        let paramsJson = '{}';
        try {
            paramsJson = JSON.stringify(params ?? {});
        } catch (e) {
            console.error('[Firebase] params JSON.stringify failed', e);
        }

        reflection.callStaticMethod(
            'com/cocos/game/AppActivity',
            'firebaseOnEvent',
            '(Ljava/lang/String;Ljava/lang/String;)V',
            eventId, paramsJson,
        );
    }

    private sendNativeUserProperty(key: string, value: string | number): void {
        if (sys.os !== sys.OS.ANDROID) return;
        const reflection = native?.reflection;
        if (!reflection || typeof reflection.callStaticMethod !== 'function') return;

        reflection.callStaticMethod(
            'com/cocos/game/AppActivity',
            'firebaseSetUserProperty',
            '(Ljava/lang/String;Ljava/lang/String;)V',
            key, String(value),
        );
    }
}

export const FirebaseManager = new FirebaseManagerImpl();
