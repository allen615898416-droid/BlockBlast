/**
 * AnalyticsService — 埋点统一出口（BlockBlast）
 *
 * 本地 localStorage 留存最近事件（调试面板用）+ 调用 Firebase 真实上报通道。
 * 任一通道失败/环境不支持都静默降级，绝不影响游戏主流程。
 * 移植自 stack-cocos (assets/scripts/services/AnalyticsService.ts)，去掉友盟通道。
 */

import { sys } from 'cc';
import { FirebaseManager } from '../core/FirebaseManager';
import { getPlayerId } from '../core/PlayerIdentityRuntime';

const EVENT_LOG_KEY = 'blockblast_events_v1';
const MAX_EVENTS = 80;

interface LogItem {
    type: string;
    timestamp: number;
    data?: unknown;
}

export class AnalyticsService {
    track(event: string, params?: Record<string, unknown>): void {
        try {
            const list = this.readAll();
            list.push({ type: event, timestamp: Date.now(), data: params });
            if (list.length > MAX_EVENTS) list.splice(0, list.length - MAX_EVENTS);
            sys.localStorage.setItem(EVENT_LOG_KEY, JSON.stringify(list));
        } catch { /* ignore */ }
        // 开发期同时打印，便于调试
        console.log(`[Analytics] ${event}`, params ?? '');

        // 自动附加 player_id(游客身份 UUID v4), 每个事件都带用户标识, 供后台跨事件关联
        const flatParams = this.toFlatParams(params);
        const withPlayer: Record<string, string | number | boolean> = {
            player_id: getPlayerId(),
            ...flatParams,
        };
        FirebaseManager.trackEvent(event, withPlayer);
    }

    setUserProperty(key: string, value: string | number): void {
        FirebaseManager.setUserProperty(key, value);
    }

    recent(limit = 20): LogItem[] {
        const list = this.readAll();
        return list.slice(-limit).reverse();
    }

    private readAll(): LogItem[] {
        try {
            const raw = sys.localStorage.getItem(EVENT_LOG_KEY);
            if (raw) return JSON.parse(raw);
        } catch { /* ignore */ }
        return [];
    }

    /** 埋点参数只允许 string/number/boolean 扁平值，过滤掉其他类型避免 JSON 传递到 Java 侧出错 */
    private toFlatParams(params?: Record<string, unknown>): Record<string, string | number | boolean> {
        const out: Record<string, string | number | boolean> = {};
        if (!params) return out;
        for (const key of Object.keys(params)) {
            const v = params[key];
            if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
                out[key] = v;
            } else if (v !== undefined && v !== null) {
                out[key] = String(v);
            }
        }
        return out;
    }
}

/** 全局单例：模块加载即可用，业务代码直接 import 使用。 */
export const Analytics = new AnalyticsService();
