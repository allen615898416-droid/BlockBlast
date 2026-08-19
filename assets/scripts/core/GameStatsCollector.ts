/**
 * GameStatsCollector — BlockBlast 局内统计收集器(收口方案)
 *
 * 策略: 局内所有动态信息【只计数、不单独上报】, 结算时随 game_over 一次性带出。
 *  - 模块级静态单例, 不依赖 cc 组件生命周期 → 计数不丢失。
 *  - 新局 startGame() 时 reset(), 结算 game_over 时 dump() 展开为扁平字段并入事件参数。
 *  - 对局级仅保留 game_start(开局) + game_over(结算) 两个事件, 局内行为全部收口进 game_over。
 *  - 会话级聚合(games_played/total_score 等)持久化到 localStorage, 跨局累计。
 * 移植自 stack-cocos (assets/scripts/core/GameStatsCollector.ts) 的收口设计。
 */

import { sys } from 'cc';

/** 统计字段类型: 绝大多数为数量(number), 明细(直方图)为 JSON 字符串 */
export type CountMap = Record<string, number | string>;

interface SessionStats {
    gamesPlayed: number;
    totalScore: number;
    totalDurationSec: number;
    bestScore: number;
}

const SESSION_KEY = 'blockblast_session_stats_v1';
const DEFAULT_SESSION: SessionStats = Object.freeze({
    gamesPlayed: 0,
    totalScore: 0,
    totalDurationSec: 0,
    bestScore: 0,
});

class GameStatsCollectorImpl {
    // ===== 会话级(持久化, 跨局累计) =====
    private session: SessionStats;

    // ===== 局内计时 =====
    private startTs = 0;

    // ===== 局内计数(每次 startGame 清零) =====
    pickups = 0;            // 从托盘拿起方块的次数
    dragMoves = 0;          // 拖动过程中的移动事件数
    previewsValid = 0;      // 预览命中可放置位置次数
    previewsInvalid = 0;    // 预览命中不可放置位置次数
    attempts = 0;           // 松手落子尝试总次数
    placeSuccess = 0;       // 成功放置次数
    placeRejected = 0;      // 放置失败次数(位置无效)
    clearStreakMax = 0;     // 连续消行最大段数(由 GameLogic 回填)

    constructor() {
        this.session = this.loadSession();
    }

    get sessionStats(): SessionStats {
        return { ...this.session };
    }

    /** 新局清零局内计数 + 记录开局时间 */
    startGame(): void {
        this.pickups = 0;
        this.dragMoves = 0;
        this.previewsValid = 0;
        this.previewsInvalid = 0;
        this.attempts = 0;
        this.placeSuccess = 0;
        this.placeRejected = 0;
        this.clearStreakMax = 0;
        this.startTs = Date.now();
    }

    // ===== 局内行为钩子(由 GameApp 调用) =====
    onPickup(): void { this.pickups++; }
    onDragMove(): void { this.dragMoves++; }
    onPreview(valid: boolean): void {
        if (valid) this.previewsValid++; else this.previewsInvalid++;
    }
    onPlaceAttempt(placed: boolean): void {
        this.attempts++;
        if (placed) this.placeSuccess++; else this.placeRejected++;
    }

    // ===== 结算 =====
    /**
     * 结算时一次性收口: 合并 GameLogic 侧计数 + 会话聚合, 展开为扁平字段。
     * @param logic 从 GameLogic 读取的局内计数(由调用方传入, 本类不依赖 GameLogic)
     * @param endGrid 结算时棋盘信息 { emptyCells, fillRate }
     */
    dump(
        logic: {
            totalPlacedCells: number;
            totalLinesCleared: number;
            maxLinesOnce: number;
            clearStreakMax: number;
            comboBonusClears: number;
            turns: number;
            refills: number;
            rescues: number;
            clearsByLines: Record<number, number>;
            shapeCellsHistogram: Record<number, number>;
        },
        endGrid: { score: number; emptyCells: number; fillRate: number },
    ): { params: CountMap; isNewBest: boolean } {
        const durationSec = Math.max(0, Math.round((Date.now() - this.startTs) / 1000));

        // 更新会话聚合(仅结算时写一次)
        const gamesPlayed = this.session.gamesPlayed + 1;
        const totalScore = this.session.totalScore + endGrid.score;
        const bestScore = Math.max(this.session.bestScore, endGrid.score);
        const totalDurationSec = this.session.totalDurationSec + durationSec;
        const isNewBest = endGrid.score > this.session.bestScore;
        this.session = { gamesPlayed, totalScore, totalDurationSec, bestScore };
        this.saveSession();

        const avgScore = gamesPlayed > 0 ? Math.round(totalScore / gamesPlayed) : 0;
        const avgDuration = gamesPlayed > 0 ? Math.round(totalDurationSec / gamesPlayed) : 0;

        const params: CountMap = {
            // 对局结果
            score: endGrid.score,
            best_score: bestScore,
            is_new_best: isNewBest ? 1 : 0,
            duration_sec: durationSec,
            // 会话聚合
            games_played: gamesPlayed,
            session_avg_score: avgScore,
            session_avg_duration: avgDuration,
            // 交互行为
            pickups: this.pickups,
            drag_moves: this.dragMoves,
            previews_valid: this.previewsValid,
            previews_invalid: this.previewsInvalid,
            attempts: this.attempts,
            place_success: this.placeSuccess,
            place_rejected: this.placeRejected,
            // 放置/消行
            cells_placed: logic.totalPlacedCells,
            lines_cleared: logic.totalLinesCleared,
            clears_1line: logic.clearsByLines[1] ?? 0,
            clears_2line: logic.clearsByLines[2] ?? 0,
            clears_3line: logic.clearsByLines[3] ?? 0,
            clears_4line: logic.clearsByLines[4] ?? 0,
            max_lines_once: logic.maxLinesOnce,
            clear_streak_max: Math.max(this.clearStreakMax, logic.clearStreakMax),
            combo_bonus_clears: logic.comboBonusClears,
            // 节奏
            turns: logic.turns,
            tray_refills: logic.refills,
            rescues: logic.rescues,
            shape_size_hist: JSON.stringify(logic.shapeCellsHistogram),
            // 终局棋盘
            end_empty_cells: endGrid.emptyCells,
            end_fill_rate: Math.round(endGrid.fillRate * 1000) / 10,
        };
        return { params, isNewBest };
    }

    /** 结算后写入 Firebase User Property(单设备聚合值) */
    userProperties(): Record<string, string | number> {
        const s = this.session;
        return {
            up_best_score: s.bestScore,
            up_games_played: s.gamesPlayed,
            up_total_score: s.totalScore,
            up_avg_score: s.gamesPlayed > 0 ? Math.round(s.totalScore / s.gamesPlayed) : 0,
            up_avg_duration: s.gamesPlayed > 0 ? Math.round(s.totalDurationSec / s.gamesPlayed) : 0,
        };
    }

    // ===== 会话持久化 =====
    private loadSession(): SessionStats {
        try {
            const raw = sys.localStorage.getItem(SESSION_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as Partial<SessionStats>;
                return {
                    gamesPlayed: typeof parsed.gamesPlayed === 'number' ? parsed.gamesPlayed : 0,
                    totalScore: typeof parsed.totalScore === 'number' ? parsed.totalScore : 0,
                    totalDurationSec: typeof parsed.totalDurationSec === 'number' ? parsed.totalDurationSec : 0,
                    bestScore: typeof parsed.bestScore === 'number' ? parsed.bestScore : 0,
                };
            }
        } catch { /* ignore */ }
        return { ...DEFAULT_SESSION };
    }

    private saveSession(): void {
        try {
            sys.localStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
        } catch { /* ignore */ }
    }
}

export const GameStatsCollector = new GameStatsCollectorImpl();
