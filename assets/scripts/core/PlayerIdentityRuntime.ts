/**
 * 玩家身份运行时绑定:把系统 localStorage 注入 PlayerIdentityStore。
 * 本文件依赖 cc,仅供游戏运行时导入;逻辑测试请直接 import PlayerIdentity.ts。
 * 移植自 stack-cocos (assets/scripts/core/PlayerIdentityRuntime.ts)。
 */
import { sys } from 'cc';

import { PlayerIdentityStore, type PlayerIdentityStorage } from './PlayerIdentity';

class SystemPlayerIdentityStorage implements PlayerIdentityStorage {
    public getItem(key: string): string | null {
        return sys.localStorage?.getItem(key) ?? null;
    }
    public setItem(key: string, value: string): void {
        sys.localStorage?.setItem(key, value);
    }
}

/** 全局玩家身份单例:进程内唯一,首次取用即固化,此后每次启动复用同一 ID。 */
export const PlayerIdentity = new PlayerIdentityStore(new SystemPlayerIdentityStorage());

// 模块加载即打印(只要场景/脚本 import 此模块就会触发,不再依赖 onLoad)。
// 同时也是身份生成成功的凭据 —— 看到此行 = localStorage 已写入 playerId。
console.log(`[PlayerIdentity] module loaded, playerId=${PlayerIdentity.getId()}`);

export function getPlayerId(): string {
    return PlayerIdentity.getId();
}

/** 调试用:强制更换玩家身份(正常流程勿用)。 */
export function resetPlayerId(): string {
    return PlayerIdentity.reset();
}
