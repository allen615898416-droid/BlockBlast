// Block Blast v0.1.0 - 移动端竖屏核心玩法与编辑器可配置表现层

import { _decorator, Component, Node, Graphics, UITransform, Vec3, Color, Label, LabelOutline, Font, view, ResolutionPolicy, sys, macro, EventTouch, Sprite, SpriteFrame, Texture2D, resources, tween, Tween, input, Input, gfx } from 'cc';
import { GameLogic } from './core/GameLogic';
import { GridPosition, Shape } from './core/Types';
import { GRID_COLS, GRID_ROWS, CELL_SIZE, CELL_GAP, TRAY_COUNT, TRAY_CELL_SIZE, SHAPE_COLORS, EMPTY_CELL_COLOR } from './core/Constants';
import { SfxService } from './services/SfxService';
import { HapticsService } from './services/HapticsService';

const { ccclass, property } = _decorator;

const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 844;

const CELL_TEXTURE_PATHS: Array<string | null> = [
    'blockblast/cell/redcell',
    'blockblast/cell/bluecell',
    'blockblast/cell/greencell',
    'blockblast/cell/purplecell',
    'blockblast/cell/yellowcell',
    'blockblast/cell/orangecell',
    null,
];

const FONT_PATHS = {
    medium: 'blockblast/fonts/AlibabaPuHuiTi-3-65-Medium',
    bold: 'blockblast/fonts/AlibabaPuHuiTi-3-85-Bold',
    heavy: 'blockblast/fonts/AlibabaPuHuiTi-3-105-Heavy',
};

const VFX_PATHS = {
    softGlowBar: 'blockblast/vfx/soft_glow_bar',
    stars: [
        'blockblast/vfx/board/star_smallest',
        'blockblast/vfx/board/star_small',
        'blockblast/vfx/board/star_medium',
        'blockblast/vfx/board/star_big',
        'blockblast/vfx/board/star_biggest',
    ],
};

const VALID_PREVIEW_TINT = new Color(145, 145, 145, 205);
const INVALID_PREVIEW_TINT = new Color(145, 82, 82, 205);
const BOTTOM_SAFE_GUARD = 30;
const TOP_SAFE_GUARD = 30;
const OFFSET_TRANSITION_RANGE = 150;
const DRAG_INITIAL_OFFSET = Object.freeze({ x: 0, y: 58 });
const HIGHLIGHT_BORDER_WIDTH = 2;
const HIGHLIGHT_GLOW_PADDING = 12;
const HIGHLIGHT_GLOW_OPACITY = 180;
const GLOW_SPARKLE_DENSITY = 0.0035;
const GLOW_SPARKLE_SIZE_MIN = 8;
const GLOW_SPARKLE_SIZE_MAX = 10;
const GLOW_SPARKLE_DRIFT_MIN = 15;
const GLOW_SPARKLE_DRIFT_MAX = 22;
const GLOW_SPARKLE_ALPHA_MIN = 165;
const GLOW_SPARKLE_ALPHA_MAX = 255;
const GLOW_SPARKLE_CYCLE = 1.05;
const GLOW_SPARKLE_CYCLE_JITTER = 0.25;
const CLEAR_BURST_SPARKLE_DENSITY = 8;
const CLEAR_BURST_SPARKLE_SIZE_MAX = 4;
const CLEAR_BURST_SPARKLE_ALPHA_MIN = 160;
const CLEAR_BURST_SPARKLE_ALPHA_MAX = 255;
const CLEAR_BURST_SPARKLE_SCATTER_MIN = 30;
const CLEAR_BURST_SPARKLE_SCATTER_MAX = 75;
const CLEAR_BURST_SPARKLE_DURATION = 0.6;
const PLACEMENT_CONFETTI_DENSITY = 10;
const PLACEMENT_CONFETTI_SIZE_MAX = 3;
const PLACEMENT_CONFETTI_SCATTER_MIN = 40;
const PLACEMENT_CONFETTI_SCATTER_MAX = 80;
const PLACEMENT_CONFETTI_DURATION = 0.5;
const SPARKLE_COLORS = [
    new Color(255, 89, 94),
    new Color(255, 165, 89),
    new Color(255, 214, 102),
    new Color(87, 204, 153),
    new Color(77, 150, 255),
    new Color(199, 125, 255),
    new Color(255, 255, 255),
];

@ccclass('GameApp')
export class GameApp extends Component {
    @property({ type: Node, tooltip: '编辑器可见的棋盘根节点。为空时自动查找 BoardRoot。' })
    public boardRoot: Node | null = null;

    @property({ type: Node, tooltip: '编辑器可见的托盘根节点。为空时自动查找 TrayRoot。' })
    public trayRoot: Node | null = null;

    @property({ type: Node, tooltip: '编辑器可见的 UI 根节点。为空时自动查找 UIRoot。' })
    public uiRoot: Node | null = null;

    @property({ type: Node, tooltip: '编辑器可见的拖拽方块层。为空时自动查找 DragShape。' })
    public dragRoot: Node | null = null;

    @property({ type: Node, tooltip: '编辑器可见的特效层。为空时自动查找 EffectLayer。' })
    public effectRoot: Node | null = null;

    @property({ type: [SpriteFrame], tooltip: 'UI_v4.0/block 六个 cell：红、蓝、绿、紫、黄、橙。为空时走 resources 回退加载。' })
    public cellFrameAssets: SpriteFrame[] = [];

    @property({ type: Font, tooltip: 'roblock HUD/正文用字重：Alibaba PuHuiTi Medium。为空时走 resources 回退加载。' })
    public hudFont: Font | null = null;

    @property({ type: Font, tooltip: 'roblock 标题/数字用字重：Alibaba PuHuiTi Bold。为空时走 resources 回退加载。' })
    public titleFont: Font | null = null;

    @property({ type: Font, tooltip: 'roblock 强按钮/弹窗标题用字重：Alibaba PuHuiTi Heavy。为空时走 resources 回退加载。' })
    public heavyFont: Font | null = null;

    @property({ type: SpriteFrame, tooltip: 'roblock 消除高亮条形柔光 soft_glow_bar。为空时走 resources 回退加载。' })
    public softGlowBarFrame: SpriteFrame | null = null;

    @property({ type: [SpriteFrame], tooltip: 'roblock 星点贴图 smallest/small/medium/big/biggest。为空时走 resources 回退加载。' })
    public starFrames: SpriteFrame[] = [];

    @property({ tooltip: '是否启用消除星点扩散特效。' })
    public enableClearBurstSparkles = true;

    @property({ tooltip: '是否启用放置礼花特效。' })
    public enablePlacementConfetti = true;

    @property({ tooltip: '是否启用消除预览柔光和呼吸星点。' })
    public enableClearPreviewGlow = true;

    // 游戏逻辑
    private gameLogic: GameLogic;

    // 网格渲染
    private gridNode: Node;
    private gridBg: Graphics;
    private gridCells: Graphics;
    private gridPreview: Graphics;
    private clearHighlight: Graphics;
    private highlightGlowLayer: Node;
    private highlightSparkleLayer: Node;
    private effectLayer: Node;

    // 托盘渲染
    private trayNode: Node;
    private traySlots: Graphics[] = [];

    // 资源与反馈
    private cellFrames: (SpriteFrame | null)[] = [];
    private fontAssets: { medium: Font | null; bold: Font | null; heavy: Font | null } = { medium: null, bold: null, heavy: null };
    private loadedSoftGlowBarFrame: SpriteFrame | null = null;
    private loadedStarFrames: SpriteFrame[] = [];
    private sfx: SfxService;
    private lastPreviewCode: 'valid' | 'invalid' | null = null;
    private lastClearPreviewKey = '';
    private lastPreviewPlacement: { row: number; col: number; canPlace: boolean } | null = null;
    private sparkleTweens: Node[] = [];

    // 拖拽
    private dragNode: Graphics;
    private dragShapeIndex: number = -1;
    private currentTouchPos: Vec3 | null = null;

    // 分数
    private scoreLabel: Label;
    private bestLabel: Label;
    private levelLabel: Label;
    private targetLabel: Label;

    // 游戏结束
    private gameOverNode: Node;
    private gameOverScoreLabel: Label;

    // 关卡完成
    private levelCompleteNode: Node;
    private levelCompleteSubLabel: Label;

    // 移动端竖屏布局（390×844，参考 roblock 项目）
    private GRID_Y = -8;
    private TRAY_Y = -336;
    private SCORE_Y = 356;
    private readonly CELL_RENDER = CELL_SIZE - CELL_GAP;
    private readonly TRAY_PREVIEW_MAX_WIDTH = 108;
    private readonly TRAY_PREVIEW_MAX_HEIGHT = 92;

    // ========== 生命周期 ==========

    start() {
        view.setDesignResolutionSize(DESIGN_WIDTH, DESIGN_HEIGHT, ResolutionPolicy.FIXED_HEIGHT);

        // 移动端专用：锁定竖屏渲染方向（设备方向锁定在 AndroidManifest 中配置）
        view.setOrientation(macro.ORIENTATION_PORTRAIT);

        // APK 端安全区适配（刘海屏/状态栏/导航栏），只围绕 390×844 移动端布局微调。
        if (sys.isNative) {
            const safeArea = sys.getSafeAreaRect();
            if (safeArea.width > 0 && safeArea.height > 0) {
                const halfHeight = DESIGN_HEIGHT / 2;
                const safeTop = safeArea.y + safeArea.height - halfHeight;
                const safeBottom = safeArea.y - halfHeight;
                this.SCORE_Y = Math.min(356, safeTop - 42);
                this.TRAY_Y = Math.max(-336, safeBottom + 72);
                this.GRID_Y = Math.max(-18, Math.min(8, (this.SCORE_Y + this.TRAY_Y) * 0.08));
            }
        }

        // 确保 GameApp 节点有 full-screen UITransform（触摸事件全屏触发）
        const transform = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
        transform.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);

        const startLevel = parseInt(sys.localStorage.getItem('block_blast_level') || '1', 10);
        this.gameLogic = new GameLogic(startLevel);
        this.gameLogic.bestScore = parseInt(sys.localStorage.getItem('block_blast_best') || '0', 10);
        this.sfx = new SfxService(this.node);
        this.initializeFonts();
        this.hideEditorOnlyNodes();

        this.createBackground();
        this.createScoreLabel();
        this.createTopButtons();
        this.createGrid();
        this.createTray();
        this.createDragNode();
        this.createEffectLayer();
        this.createGameOverNode();
        this.createLevelCompleteNode();
        this.loadCellFrames();
        this.loadVfxFrames();

        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        // 节点事件 + 全局 input 双保险：桌面预览/移动端/拖拽目标被清理后都能继续收到拖动。
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);

        this.updateView();
    }

    protected onDestroy() {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    // ========== 创建节点 ==========

    private getOrCreateChild(parent: Node, name: string): { node: Node; created: boolean } {
        const existing = parent.getChildByName(name);
        if (existing) return { node: existing, created: false };
        const node = new Node(name);
        parent.addChild(node);
        return { node, created: true };
    }

    private ensureTransform(node: Node, width = 0, height = 0): UITransform {
        const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        if (width > 0 || height > 0) transform.setContentSize(width, height);
        return transform;
    }

    private ensureGraphics(node: Node): Graphics {
        return node.getComponent(Graphics) ?? node.addComponent(Graphics);
    }

    private ensureLabel(node: Node): Label {
        return node.getComponent(Label) ?? node.addComponent(Label);
    }

    private hideEditorOnlyNodes() {
        const palette = this.node.getChildByName('ArtPalette_CellSamples');
        if (palette) palette.active = false;
    }

    private initializeFonts() {
        this.fontAssets = {
            medium: this.hudFont,
            bold: this.titleFont,
            heavy: this.heavyFont,
        };

        const loadFont = (key: keyof typeof FONT_PATHS) => {
            if (this.fontAssets[key]) return;
            resources.load(FONT_PATHS[key], Font, (err, font) => {
                if (err || !font) {
                    console.warn(`[BlockBlast] font load failed: ${FONT_PATHS[key]}`, err);
                    return;
                }
                this.fontAssets[key] = font;
                this.applyAllLabelStyles();
            });
        };
        loadFont('medium');
        loadFont('bold');
        loadFont('heavy');
    }

    private applyLabelStyle(label: Label, fontKey: keyof typeof FONT_PATHS, fontSize: number, lineHeight: number, color: Color, outlineWidth = 0, outlineColor = new Color(0, 0, 0, 0)) {
        label.font = this.fontAssets[fontKey] ?? label.font;
        label.fontSize = fontSize;
        label.lineHeight = lineHeight;
        label.color = color;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;

        const outline = label.node.getComponent(LabelOutline) ?? label.node.addComponent(LabelOutline);
        outline.enabled = outlineWidth > 0;
        outline.width = outlineWidth;
        outline.color = outlineColor;
    }

    private applyAllLabelStyles() {
        // 顶部 ScoreLabel / BestLabel 完全沿用场景与 Inspector 样式，运行时只更新数字。
        if (this.gameOverScoreLabel) this.applyLabelStyle(this.gameOverScoreLabel, 'bold', 22, 26, new Color(255, 255, 255, 255), 1, new Color(0, 0, 0, 210));
        if (this.levelCompleteSubLabel) this.applyLabelStyle(this.levelCompleteSubLabel, 'bold', 20, 24, new Color(255, 255, 255, 255), 1, new Color(0, 0, 0, 210));
    }

    private createBackground() {
        const { node } = this.getOrCreateChild(this.node, 'Background');
        this.ensureTransform(node, DESIGN_WIDTH, DESIGN_HEIGHT);
        const g = this.ensureGraphics(node);
        g.clear();

        const top = new Color(78, 105, 177, 255);
        const bottom = new Color(47, 73, 133, 255);
        const steps = 36;
        const stripH = DESIGN_HEIGHT / steps + 1;
        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);
            const r = Math.round(top.r + (bottom.r - top.r) * t);
            const gg = Math.round(top.g + (bottom.g - top.g) * t);
            const b = Math.round(top.b + (bottom.b - top.b) * t);
            g.fillColor = new Color(r, gg, b, 255);
            g.rect(-DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 - (i + 1) * stripH, DESIGN_WIDTH, stripH + 1);
            g.fill();
        }
    }

    private createTopButtons() {
        if (!this.uiRoot) this.uiRoot = this.node.getChildByName('UIRoot');
        if (!this.uiRoot) {
            console.error('[BlockBlast] Missing editor node: UIRoot');
            return;
        }

        // 顶部图标只复用编辑器节点，不创建、不改位置、不改尺寸、不改 Sprite。
        const settingsNode = this.uiRoot.getChildByName('settings');
        if (settingsNode) {
            settingsNode.off(Node.EventType.TOUCH_START);
            settingsNode.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
                event.propagationStopped = true;
                this.sfx?.play('ui_tap');
            }, this);
        }
    }

    private createScoreLabel() {
        if (!this.uiRoot) this.uiRoot = this.node.getChildByName('UIRoot');
        if (!this.uiRoot) {
            console.error('[BlockBlast] Missing editor node: UIRoot');
            return;
        }

        // HUD 必须来自 Main.scene；运行时只持有引用和更新文本，不创建额外 Label。
        const scoreLabel = this.uiRoot.getChildByName('ScoreLabel')?.getComponent(Label);
        const bestLabel = this.uiRoot.getChildByName('BestLabel')?.getComponent(Label);
        if (!scoreLabel || !bestLabel) {
            throw new Error('[BlockBlast] Missing editor Label: ScoreLabel or BestLabel');
        }
        this.scoreLabel = scoreLabel;
        this.bestLabel = bestLabel;
    }

    private createGrid() {
        const rootInfo = this.boardRoot ? { node: this.boardRoot, created: false } : this.getOrCreateChild(this.node, 'BoardRoot');
        this.gridNode = rootInfo.node;
        this.boardRoot = this.gridNode;
        if (rootInfo.created) this.gridNode.setPosition(0, this.GRID_Y, 0);
        this.ensureTransform(this.gridNode, GRID_COLS * CELL_SIZE, GRID_ROWS * CELL_SIZE);

        const bgInfo = this.getOrCreateChild(this.gridNode, 'GridBg');
        this.ensureTransform(bgInfo.node);
        this.gridBg = this.ensureGraphics(bgInfo.node);

        const cellsInfo = this.getOrCreateChild(this.gridNode, 'GridCells');
        this.ensureTransform(cellsInfo.node);
        this.gridCells = this.ensureGraphics(cellsInfo.node);

        const glowInfo = this.getOrCreateChild(this.gridNode, 'ClearHighlightGlow');
        this.ensureTransform(glowInfo.node);
        this.highlightGlowLayer = glowInfo.node;

        const sparkleInfo = this.getOrCreateChild(this.gridNode, 'ClearHighlightSparkles');
        this.ensureTransform(sparkleInfo.node);
        this.highlightSparkleLayer = sparkleInfo.node;

        const highlightInfo = this.getOrCreateChild(this.gridNode, 'ClearHighlight');
        this.ensureTransform(highlightInfo.node);
        this.clearHighlight = this.ensureGraphics(highlightInfo.node);

        const previewInfo = this.getOrCreateChild(this.gridNode, 'GridPreview');
        this.ensureTransform(previewInfo.node);
        this.gridPreview = this.ensureGraphics(previewInfo.node);

        // 明确分层：柔光在 cell 后方，只让边缘溢出；预览、彩边与星光在 cell 上方。
        bgInfo.node.setSiblingIndex(0);
        glowInfo.node.setSiblingIndex(1);
        cellsInfo.node.setSiblingIndex(2);
        previewInfo.node.setSiblingIndex(3);
        highlightInfo.node.setSiblingIndex(4);
        sparkleInfo.node.setSiblingIndex(5);
    }

    private createTray() {
        const rootInfo = this.trayRoot ? { node: this.trayRoot, created: false } : this.getOrCreateChild(this.node, 'TrayRoot');
        this.trayNode = rootInfo.node;
        this.trayRoot = this.trayNode;
        if (rootInfo.created) this.trayNode.setPosition(0, this.TRAY_Y, 0);
        this.ensureTransform(this.trayNode, DESIGN_WIDTH, 104);

        const slotWidth = 118;
        const startX = -(TRAY_COUNT - 1) / 2 * slotWidth;
        this.traySlots.length = 0;

        for (let i = 0; i < TRAY_COUNT; i++) {
            const slotInfo = this.getOrCreateChild(this.trayNode, `TraySlot_${i}`);
            if (slotInfo.created) slotInfo.node.setPosition(startX + i * slotWidth, 0, 0);
            this.ensureTransform(slotInfo.node, slotWidth, 104);
            this.traySlots.push(this.ensureGraphics(slotInfo.node));
        }
    }

    private createDragNode() {
        const rootInfo = this.dragRoot ? { node: this.dragRoot, created: false } : this.getOrCreateChild(this.node, 'DragShape');
        this.dragRoot = rootInfo.node;
        this.ensureTransform(this.dragRoot);
        this.dragNode = this.ensureGraphics(this.dragRoot);
        if (rootInfo.created) this.dragRoot.setPosition(-2000, -2000, 0);
    }

    private createEffectLayer() {
        const rootInfo = this.effectRoot ? { node: this.effectRoot, created: false } : this.getOrCreateChild(this.node, 'EffectLayer');
        this.effectLayer = rootInfo.node;
        this.effectRoot = this.effectLayer;
        this.ensureTransform(this.effectLayer, DESIGN_WIDTH, DESIGN_HEIGHT);
    }

    private loadCellFrames() {
        this.cellFrames = new Array(CELL_TEXTURE_PATHS.length).fill(null);
        for (let i = 0; i < this.cellFrameAssets.length && i < this.cellFrames.length; i++) {
            if (this.cellFrameAssets[i]) this.cellFrames[i] = this.cellFrameAssets[i];
        }
        if (this.cellFrames.every(frame => frame !== null)) return;

        CELL_TEXTURE_PATHS.forEach((path, index) => {
            if (this.cellFrames[index] || !path) return;
            this.loadSpriteFrame(path, (frame) => {
                this.cellFrames[index] = frame;
                this.updateView();
            }, 'cell texture');
        });
    }

    private loadVfxFrames() {
        this.loadedSoftGlowBarFrame = this.softGlowBarFrame;
        if (!this.loadedSoftGlowBarFrame) {
            this.loadSpriteFrame(VFX_PATHS.softGlowBar, (frame) => {
                this.loadedSoftGlowBarFrame = frame;
            }, 'soft glow bar');
        }

        this.loadedStarFrames = this.starFrames.filter(Boolean);
        if (this.loadedStarFrames.length >= VFX_PATHS.stars.length) return;
        VFX_PATHS.stars.forEach((path) => {
            this.loadSpriteFrame(path, (frame) => {
                this.loadedStarFrames.push(frame);
            }, 'star texture');
        });
    }

    private loadSpriteFrame(path: string, onLoaded: (frame: SpriteFrame) => void, label: string) {
        resources.load(`${path}/spriteFrame`, SpriteFrame, (spriteErr, spriteFrame) => {
            if (!spriteErr && spriteFrame) {
                onLoaded(spriteFrame);
                return;
            }
            resources.load(path, Texture2D, (textureErr, texture) => {
                if (textureErr || !texture) {
                    console.warn(`[BlockBlast] ${label} load failed: ${path}`, textureErr ?? spriteErr);
                    return;
                }
                const frame = new SpriteFrame();
                frame.texture = texture;
                onLoaded(frame);
            });
        });
    }

    private createGameOverNode() {
        const rootInfo = this.getOrCreateChild(this.node, 'GameOver');
        this.gameOverNode = rootInfo.node;
        this.ensureTransform(this.gameOverNode, DESIGN_WIDTH, DESIGN_HEIGHT);

        const bgInfo = this.getOrCreateChild(this.gameOverNode, 'GOBg');
        this.ensureTransform(bgInfo.node, DESIGN_WIDTH, DESIGN_HEIGHT);
        const bg = this.ensureGraphics(bgInfo.node);
        bg.clear();
        bg.fillColor = new Color(0, 0, 0, 180);
        bg.roundRect(-DESIGN_WIDTH / 2, -DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT, 0);
        bg.fill();

        const labelInfo = this.getOrCreateChild(this.gameOverNode, 'GOLabel');
        if (labelInfo.created) labelInfo.node.setPosition(0, 54, 0);
        this.ensureTransform(labelInfo.node, 300, 54);
        const goLabel = this.ensureLabel(labelInfo.node);
        goLabel.string = 'Game Over';
        this.applyLabelStyle(goLabel, 'heavy', 36, 40, new Color(255, 107, 107, 255), 1, new Color(0, 0, 0, 210));

        const scoreInfo = this.getOrCreateChild(this.gameOverNode, 'GOScore');
        if (scoreInfo.created) scoreInfo.node.setPosition(0, 0, 0);
        this.ensureTransform(scoreInfo.node, 260, 34);
        this.gameOverScoreLabel = this.ensureLabel(scoreInfo.node);
        this.gameOverScoreLabel.string = 'Score: 0';
        this.applyLabelStyle(this.gameOverScoreLabel, 'bold', 22, 26, new Color(255, 255, 255, 255), 1, new Color(0, 0, 0, 210));

        const restartInfo = this.getOrCreateChild(this.gameOverNode, 'GORestart');
        if (restartInfo.created) restartInfo.node.setPosition(0, -72, 0);
        this.ensureTransform(restartInfo.node, 260, 28);
        const restartLabel = this.ensureLabel(restartInfo.node);
        restartLabel.string = 'Tap to Restart';
        this.applyLabelStyle(restartLabel, 'medium', 17, 20, new Color(214, 218, 235, 220));

        this.gameOverNode.active = false;
    }

    private createLevelCompleteNode() {
        const rootInfo = this.getOrCreateChild(this.node, 'LevelComplete');
        this.levelCompleteNode = rootInfo.node;
        this.ensureTransform(this.levelCompleteNode, DESIGN_WIDTH, DESIGN_HEIGHT);

        const bgInfo = this.getOrCreateChild(this.levelCompleteNode, 'LCBg');
        this.ensureTransform(bgInfo.node, DESIGN_WIDTH, DESIGN_HEIGHT);
        const bg = this.ensureGraphics(bgInfo.node);
        bg.clear();
        bg.fillColor = new Color(0, 0, 0, 180);
        bg.roundRect(-DESIGN_WIDTH / 2, -DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT, 0);
        bg.fill();

        const labelInfo = this.getOrCreateChild(this.levelCompleteNode, 'LCLabel');
        if (labelInfo.created) labelInfo.node.setPosition(0, 54, 0);
        this.ensureTransform(labelInfo.node, 320, 54);
        const lcLabel = this.ensureLabel(labelInfo.node);
        lcLabel.string = 'Level Complete!';
        this.applyLabelStyle(lcLabel, 'heavy', 32, 38, new Color(107, 203, 119, 255), 1, new Color(0, 0, 0, 210));

        const subInfo = this.getOrCreateChild(this.levelCompleteNode, 'LCSub');
        if (subInfo.created) subInfo.node.setPosition(0, 0, 0);
        this.ensureTransform(subInfo.node, 260, 34);
        this.levelCompleteSubLabel = this.ensureLabel(subInfo.node);
        this.levelCompleteSubLabel.string = 'Level 1';
        this.applyLabelStyle(this.levelCompleteSubLabel, 'bold', 20, 24, new Color(255, 255, 255, 255), 1, new Color(0, 0, 0, 210));

        const nextInfo = this.getOrCreateChild(this.levelCompleteNode, 'LCNext');
        if (nextInfo.created) nextInfo.node.setPosition(0, -72, 0);
        this.ensureTransform(nextInfo.node, 260, 28);
        const nextLabel = this.ensureLabel(nextInfo.node);
        nextLabel.string = 'Tap to Next';
        this.applyLabelStyle(nextLabel, 'medium', 17, 20, new Color(214, 218, 235, 220));

        this.levelCompleteNode.active = false;
    }

    // ========== 渲染 ==========

    private updateView() {
        this.drawGridBg();
        this.drawGridCells();
        this.drawTray();
        this.scoreLabel.string = Math.max(0, Math.floor(this.gameLogic.score)).toString();
        this.bestLabel.string = Math.max(0, Math.floor(this.gameLogic.bestScore)).toString();
        this.gridPreview.clear();
        this.clearChildren(this.gridPreview.node);
        this.clearHighlightEffects();
        this.dragNode.clear();
        this.clearChildren(this.dragNode.node);
    }

    private drawGridBg() {
        const g = this.gridBg;
        g.clear();

        const gridWidth = GRID_COLS * CELL_SIZE;
        const gridHeight = GRID_ROWS * CELL_SIZE;

        // 棋盘外围采用贴近背景的分层蓝边：外层柔亮、主体中蓝、底/右侧稍深，模拟原版烘焙渐变。
        const frameX = -gridWidth / 2 - 4;
        const frameY = -gridHeight / 2 - 4;
        const frameW = gridWidth + 8;
        const frameH = gridHeight + 8;
        g.fillColor = new Color(38, 55, 112, 255);
        g.roundRect(frameX, frameY, frameW, frameH, 7);
        g.fill();
        g.strokeColor = new Color(74, 101, 174, 165);
        g.lineWidth = 2;
        g.roundRect(frameX - 1, frameY - 1, frameW + 2, frameH + 2, 8);
        g.stroke();
        g.strokeColor = new Color(55, 78, 150, 235);
        g.lineWidth = 2;
        g.roundRect(frameX + 1, frameY + 1, frameW - 2, frameH - 2, 6);
        g.stroke();
        // 上边与左边更亮，底边与右边更深，避免整圈像纯黑描边。
        g.strokeColor = new Color(89, 118, 191, 185);
        g.lineWidth = 1.5;
        g.moveTo(frameX + 7, frameY + frameH - 1);
        g.lineTo(frameX + frameW - 7, frameY + frameH - 1);
        g.moveTo(frameX + 1, frameY + 7);
        g.lineTo(frameX + 1, frameY + frameH - 7);
        g.stroke();
        g.strokeColor = new Color(31, 47, 103, 190);
        g.moveTo(frameX + 7, frameY + 1);
        g.lineTo(frameX + frameW - 7, frameY + 1);
        g.moveTo(frameX + frameW - 1, frameY + 7);
        g.lineTo(frameX + frameW - 1, frameY + frameH - 7);
        g.stroke();

        // 空格保持 1px 间距；低圆角减少四角过度露黑。
        const rs = this.CELL_RENDER;
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = (col - GRID_COLS / 2 + 0.5) * CELL_SIZE;
                const y = (GRID_ROWS / 2 - row - 0.5) * CELL_SIZE;
                g.fillColor = new Color(EMPTY_CELL_COLOR[0], EMPTY_CELL_COLOR[1], EMPTY_CELL_COLOR[2], 255);
                g.roundRect(x - rs / 2, y - rs / 2, rs, rs, 1);
                g.fill();
            }
        }

        // 参考原版使用低对比度深蓝格线，保留格子识别但避免线条过实。
        g.strokeColor = new Color(14, 22, 54, 125);
        g.lineWidth = 1;
        for (let col = 1; col < GRID_COLS; col++) {
            const x = -gridWidth / 2 + col * CELL_SIZE;
            g.moveTo(x, -gridHeight / 2);
            g.lineTo(x, gridHeight / 2);
        }
        for (let row = 1; row < GRID_ROWS; row++) {
            const y = -gridHeight / 2 + row * CELL_SIZE;
            g.moveTo(-gridWidth / 2, y);
            g.lineTo(gridWidth / 2, y);
        }
        g.stroke();
    }

    private clearChildren(node: Node) {
        const children = node.children.slice();
        for (const child of children) {
            child.removeFromParent();
            child.destroy();
        }
    }

    private drawSpriteCell(parent: Node, x: number, y: number, size: number, colorIndex: number, alpha = 255, name = 'Cell', tintColor: Color | null = null) {
        const frame = this.cellFrames[colorIndex] ?? null;
        const cellNode = new Node(name);
        parent.addChild(cellNode);
        cellNode.setPosition(x, y, 0);
        const transform = cellNode.addComponent(UITransform);

        if (frame) {
            const sprite = cellNode.addComponent(Sprite);
            sprite.type = Sprite.Type.SIMPLE;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.spriteFrame = frame;
            sprite.color = tintColor ? new Color(tintColor.r, tintColor.g, tintColor.b, tintColor.a) : new Color(255, 255, 255, alpha);
            // SpriteFrame 赋值后再设置尺寸，避免 Sprite 按原图尺寸覆盖 UITransform，导致方块比棋盘格大。
            transform.setContentSize(size, size);
            return;
        }

        transform.setContentSize(size, size);
        const baseColor = SHAPE_COLORS[colorIndex];
        const c = tintColor
            ? [
                Math.round(baseColor[0] * tintColor.r / 255),
                Math.round(baseColor[1] * tintColor.g / 255),
                Math.round(baseColor[2] * tintColor.b / 255),
            ]
            : baseColor;
        const a = tintColor ? tintColor.a : alpha;
        if (parent === this.gridPreview.node) {
            const previewG = this.gridPreview;
            previewG.fillColor = new Color(c[0], c[1], c[2], a);
            previewG.roundRect(x - size / 2, y - size / 2, size, size, Math.max(4, size * 0.15));
            previewG.fill();
            cellNode.removeFromParent();
            cellNode.destroy();
            return;
        }

        const g = cellNode.addComponent(Graphics);
        g.fillColor = new Color(c[0], c[1], c[2], a);
        g.roundRect(-size / 2, -size / 2, size, size, Math.max(2, size * 0.08));
        g.fill();
    }

    private drawGridCells() {
        const g = this.gridCells;
        g.clear();
        this.clearChildren(g.node);

        const rs = this.CELL_RENDER;
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const v = this.gameLogic.grid.getCell(row, col);
                if (v > 0) {
                    const x = (col - GRID_COLS / 2 + 0.5) * CELL_SIZE;
                    const y = (GRID_ROWS / 2 - row - 0.5) * CELL_SIZE;
                    this.drawSpriteCell(g.node, x, y, rs, v - 1, 255, 'PlacedCell');
                }
            }
        }
    }

    private getTrayPreviewCellSize(shape: Shape): number {
        return Math.min(
            TRAY_CELL_SIZE,
            this.TRAY_PREVIEW_MAX_WIDTH / shape.width,
            this.TRAY_PREVIEW_MAX_HEIGHT / shape.height,
        );
    }

    private drawTray() {
        for (let i = 0; i < TRAY_COUNT; i++) {
            const g = this.traySlots[i];
            g.clear();
            this.clearChildren(g.node);

            const shape = this.gameLogic.tray[i];
            if (!shape) continue;

            const previewCellSize = this.getTrayPreviewCellSize(shape);
            const cr = previewCellSize - CELL_GAP;
            const offsetX = -(shape.width * previewCellSize) / 2 + previewCellSize / 2;
            const offsetY = (shape.height * previewCellSize) / 2 - previewCellSize / 2;

            // 候选区投影：保持轻微右下偏移，避免与小尺寸候选块脱节。
            g.fillColor = new Color(18, 28, 66, 95);
            for (const cell of shape.cells) {
                const x = offsetX + cell.col * previewCellSize + 3;
                const y = offsetY - cell.row * previewCellSize - 4;
                g.roundRect(x - cr / 2, y - cr / 2, cr, cr, 3);
                g.fill();
            }

            for (const cell of shape.cells) {
                const x = offsetX + cell.col * previewCellSize;
                const y = offsetY - cell.row * previewCellSize;
                this.drawSpriteCell(g.node, x, y, cr, shape.color, 255, 'TrayCell');
            }
        }
    }

    private drawDragShape(touchPos: Vec3) {
        const g = this.dragNode;
        g.clear();

        const shape = this.gameLogic.tray[this.dragShapeIndex];
        if (!shape) return;

        // shape 视觉中心 (cells 平均)
        let sumRow = 0, sumCol = 0;
        for (const cell of shape.cells) {
            sumRow += cell.row;
            sumCol += cell.col;
        }
        const avgRow = sumRow / shape.cells.length;
        const avgCol = sumCol / shape.cells.length;

        // offsetX/offsetY 让 shape 视觉中心精确对齐到 dragNode 节点中心（不对称形状也成立）
        const offsetX = -avgCol * CELL_SIZE;
        const offsetY = avgRow * CELL_SIZE;

        // 拖拽实体始终跟随手指偏移位置；棋盘落点由 GridPreview 单独吸附，避免实体吸附后看起来“消失”。
        const adjustedPos = this.getAdjustedDragPos(touchPos);
        const parentTransform = this.node.getComponent(UITransform);
        const localPos = parentTransform.convertToNodeSpaceAR(adjustedPos);
        this.dragNode.node.setPosition(this.constrainDragCenter(new Vec3(localPos.x, localPos.y, 0), shape));

        const cr = this.CELL_RENDER;
        this.clearChildren(g.node);
        for (const cell of shape.cells) {
            const x = offsetX + cell.col * CELL_SIZE;
            const y = offsetY - cell.row * CELL_SIZE;
            this.drawSpriteCell(g.node, x, y, cr, shape.color, 210, 'DragCell');
        }
    }

    private updatePlacementPreview(touchPos: Vec3) {
        const g = this.gridPreview;
        g.clear();
        this.clearChildren(g.node);

        const shape = this.gameLogic.tray[this.dragShapeIndex];
        if (!shape) return;

        const adjustedPos = this.getAdjustedDragPos(touchPos);
        const cellPos = this.getGridCellFromTouch(adjustedPos);
        if (!cellPos) {
            this.lastPreviewCode = null;
            if (this.lastClearPreviewKey) this.clearHighlightEffects();
            this.lastClearPreviewKey = '';
            this.lastPreviewPlacement = null;
            return;
        }

        const placeRow = cellPos.row - Math.floor((shape.height - 1) / 2);
        const placeCol = cellPos.col - Math.floor((shape.width - 1) / 2);

        const canPlace = this.gameLogic.grid.canPlace(shape, placeRow, placeCol);
        this.lastPreviewPlacement = { row: placeRow, col: placeCol, canPlace };
        const previewCode = canPlace ? 'valid' : 'invalid';
        if (this.lastPreviewCode !== previewCode) {
            HapticsService.previewSwitch();
            this.lastPreviewCode = previewCode;
        }

        const previewTint = canPlace ? VALID_PREVIEW_TINT : INVALID_PREVIEW_TINT;
        const rs = this.CELL_RENDER;
        for (const cell of shape.cells) {
            const r = placeRow + cell.row;
            const col = placeCol + cell.col;
            if (r >= 0 && r < GRID_ROWS && col >= 0 && col < GRID_COLS) {
                const x = (col - GRID_COLS / 2 + 0.5) * CELL_SIZE;
                const y = (GRID_ROWS / 2 - r - 0.5) * CELL_SIZE;
                this.drawSpriteCell(g.node, x, y, rs, shape.color, previewTint.a, 'PreviewCell', previewTint);
            }
        }

        if (canPlace) {
            const { rows, cols } = this.gameLogic.grid.checkLinesWithShape(shape, placeRow, placeCol);
            const clearKey = `${rows.join(',')}|${cols.join(',')}|${placeRow}:${placeCol}:${shape.color}`;
            if (rows.length > 0 || cols.length > 0) {
                if (clearKey !== this.lastClearPreviewKey) {
                    HapticsService.clearablePreview();
                    this.drawClearHighlight(rows, cols, shape, placeRow, placeCol);
                }
            } else if (this.lastClearPreviewKey) {
                this.clearHighlightEffects();
            }
            this.lastClearPreviewKey = rows.length > 0 || cols.length > 0 ? clearKey : '';
        } else {
            if (this.lastClearPreviewKey) this.clearHighlightEffects();
            this.lastClearPreviewKey = '';
        }
    }

    private drawClearHighlight(rows: number[], cols: number[], shape: Shape, placeRow: number, placeCol: number) {
        const g = this.clearHighlight;
        g.clear();
        this.clearChildren(this.highlightGlowLayer);
        this.clearGlowSparkles();
        if (rows.length === 0 && cols.length === 0) return;

        const virtualColors = new Map<string, number>();
        for (const cell of shape.cells) {
            virtualColors.set(`${placeRow + cell.row}:${placeCol + cell.col}`, shape.color);
        }
        const getColorIndex = (row: number, col: number) => {
            const virtual = virtualColors.get(`${row}:${col}`);
            if (virtual !== undefined) return virtual;
            return Math.max(0, this.gameLogic.grid.getCell(row, col) - 1);
        };
        const edgeColor = (colorIndex: number) => {
            const base = SHAPE_COLORS[colorIndex % SHAPE_COLORS.length];
            return new Color(
                Math.round(base[0] + (255 - base[0]) * 0.28),
                Math.round(base[1] + (255 - base[1]) * 0.28),
                Math.round(base[2] + (255 - base[2]) * 0.28),
                255,
            );
        };
        const addGlow = (x: number, y: number, w: number, h: number, color: Color) => {
            if (!this.enableClearPreviewGlow) return;
            if (this.loadedSoftGlowBarFrame) {
                const glowNode = new Node('ClearPreviewEdgeGlow');
                this.highlightGlowLayer.addChild(glowNode);
                glowNode.setPosition(x + w / 2, y + h / 2, 0);
                glowNode.addComponent(UITransform).setContentSize(w + HIGHLIGHT_GLOW_PADDING * 2, h + HIGHLIGHT_GLOW_PADDING * 2);
                const sprite = glowNode.addComponent(Sprite);
                sprite.type = Sprite.Type.SLICED;
                sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                sprite.spriteFrame = this.loadedSoftGlowBarFrame;
                sprite.color = new Color(color.r, color.g, color.b, HIGHLIGHT_GLOW_OPACITY);
                (sprite as unknown as { _srcBlendFactor: gfx.BlendFactor })._srcBlendFactor = gfx.BlendFactor.SRC_ALPHA;
                (sprite as unknown as { _dstBlendFactor: gfx.BlendFactor })._dstBlendFactor = gfx.BlendFactor.ONE;
            } else {
                g.strokeColor = new Color(color.r, color.g, color.b, 70);
                g.lineWidth = 5;
                g.roundRect(x - 2, y - 2, w + 4, h + 4, 4);
                g.stroke();
            }
        };
        const strokeLine = (x1: number, y1: number, x2: number, y2: number, color: Color) => {
            g.strokeColor = new Color(color.r, color.g, color.b, 235);
            g.lineWidth = HIGHLIGHT_BORDER_WIDTH;
            g.moveTo(x1, y1);
            g.lineTo(x2, y2);
            g.stroke();
        };
        const glowRects: { x: number; y: number; w: number; h: number; palette: Color[] }[] = [];
        const halfW = GRID_COLS * CELL_SIZE / 2;
        const halfH = GRID_ROWS * CELL_SIZE / 2;

        for (const row of rows) {
            const indices = Array.from({ length: GRID_COLS }, (_, col) => getColorIndex(row, col));
            const unique = [...new Set(indices)];
            const y = (GRID_ROWS / 2 - row - 1) * CELL_SIZE;
            const palette = unique.map(edgeColor);
            if (unique.length === 1) {
                const color = palette[0];
                addGlow(-halfW, y, GRID_COLS * CELL_SIZE, CELL_SIZE, color);
                g.strokeColor = new Color(color.r, color.g, color.b, 235);
                g.lineWidth = HIGHLIGHT_BORDER_WIDTH;
                g.roundRect(-halfW, y, GRID_COLS * CELL_SIZE, CELL_SIZE, CELL_SIZE * 0.12);
                g.stroke();
            } else {
                indices.forEach((index, col) => {
                    const color = edgeColor(index);
                    const x = -halfW + col * CELL_SIZE;
                    addGlow(x, y + CELL_SIZE - 1, CELL_SIZE, 2, color);
                    addGlow(x, y - 1, CELL_SIZE, 2, color);
                    strokeLine(x, y + CELL_SIZE, x + CELL_SIZE, y + CELL_SIZE, color);
                    strokeLine(x, y, x + CELL_SIZE, y, color);
                });
                strokeLine(-halfW, y, -halfW, y + CELL_SIZE, edgeColor(indices[0]));
                strokeLine(halfW, y, halfW, y + CELL_SIZE, edgeColor(indices[indices.length - 1]));
            }
            glowRects.push({ x: -halfW, y, w: GRID_COLS * CELL_SIZE, h: CELL_SIZE, palette });
        }

        for (const col of cols) {
            const indices = Array.from({ length: GRID_ROWS }, (_, row) => getColorIndex(row, col));
            const unique = [...new Set(indices)];
            const x = -halfW + col * CELL_SIZE;
            const palette = unique.map(edgeColor);
            if (unique.length === 1) {
                const color = palette[0];
                addGlow(x, -halfH, CELL_SIZE, GRID_ROWS * CELL_SIZE, color);
                g.strokeColor = new Color(color.r, color.g, color.b, 235);
                g.lineWidth = HIGHLIGHT_BORDER_WIDTH;
                g.roundRect(x, -halfH, CELL_SIZE, GRID_ROWS * CELL_SIZE, CELL_SIZE * 0.12);
                g.stroke();
            } else {
                indices.forEach((index, row) => {
                    const color = edgeColor(index);
                    const y = halfH - (row + 1) * CELL_SIZE;
                    addGlow(x - 1, y, 2, CELL_SIZE, color);
                    addGlow(x + CELL_SIZE - 1, y, 2, CELL_SIZE, color);
                    strokeLine(x, y, x, y + CELL_SIZE, color);
                    strokeLine(x + CELL_SIZE, y, x + CELL_SIZE, y + CELL_SIZE, color);
                });
                strokeLine(x, halfH, x + CELL_SIZE, halfH, edgeColor(indices[0]));
                strokeLine(x, -halfH, x + CELL_SIZE, -halfH, edgeColor(indices[indices.length - 1]));
            }
            glowRects.push({ x, y: -halfH, w: CELL_SIZE, h: GRID_ROWS * CELL_SIZE, palette });
        }

        if (this.enableClearPreviewGlow) {
            for (const rect of glowRects) this.spawnGlowSparkles(rect.x, rect.y, rect.w, rect.h, rect.palette);
        }
    }

    private spawnGlowSparkles(x: number, y: number, w: number, h: number, palette: Color[]) {
        const bandArea = (w + h) * HIGHLIGHT_GLOW_PADDING * 2;
        const count = Math.max(8, Math.min(36, Math.floor(bandArea * GLOW_SPARKLE_DENSITY)));
        const alphaRange = GLOW_SPARKLE_ALPHA_MAX - GLOW_SPARKLE_ALPHA_MIN + 1;
        const pickEmission = () => {
            const horizontal = Math.random() < w / (w + h);
            const positive = Math.random() < 0.5;
            const drift = GLOW_SPARKLE_DRIFT_MIN + Math.random() * (GLOW_SPARKLE_DRIFT_MAX - GLOW_SPARKLE_DRIFT_MIN);
            const tangent = (Math.random() - 0.5) * 10;
            if (horizontal) {
                const direction = positive ? 1 : -1;
                const start = new Vec3(x + Math.random() * w, positive ? y + h + 1 : y - 1, 0);
                return { start, target: new Vec3(start.x + tangent, start.y + direction * drift, 0) };
            }
            const direction = positive ? 1 : -1;
            const start = new Vec3(positive ? x + w + 1 : x - 1, y + Math.random() * h, 0);
            return { start, target: new Vec3(start.x + direction * drift, start.y + tangent, 0) };
        };

        for (let i = 0; i < count; i++) {
            const frame = this.loadedStarFrames.length > 0 ? this.loadedStarFrames[Math.floor(Math.random() * this.loadedStarFrames.length)] : null;
            const alpha = GLOW_SPARKLE_ALPHA_MIN + Math.floor(Math.random() * alphaRange);
            const baseSize = GLOW_SPARKLE_SIZE_MIN + Math.random() * (GLOW_SPARKLE_SIZE_MAX - GLOW_SPARKLE_SIZE_MIN);
            const node = new Node('ClearPreviewDriftingShard');
            this.highlightSparkleLayer.addChild(node);
            node.addComponent(UITransform).setContentSize(baseSize, baseSize);
            node.setScale(0, 0, 1);
            const pickColor = () => {
                const source = palette[Math.floor(Math.random() * palette.length)] ?? Color.WHITE;
                return new Color(source.r, source.g, source.b, alpha);
            };
            const redraw = () => {
                const color = pickColor();
                const sprite = node.getComponent(Sprite);
                if (sprite) {
                    sprite.color = color;
                    return;
                }
                const graphics = node.getComponent(Graphics);
                if (!graphics) return;
                graphics.clear();
                graphics.fillColor = color;
                graphics.rect(-baseSize / 2, -baseSize / 2, baseSize, baseSize);
                graphics.fill();
            };
            if (frame) {
                const sprite = node.addComponent(Sprite);
                sprite.type = Sprite.Type.SIMPLE;
                sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                sprite.spriteFrame = frame;
            } else {
                node.addComponent(Graphics);
            }

            const runCycle = () => {
                if (!node.isValid) return;
                const emission = pickEmission();
                const cycle = GLOW_SPARKLE_CYCLE * (1 - GLOW_SPARKLE_CYCLE_JITTER + Math.random() * GLOW_SPARKLE_CYCLE_JITTER * 2);
                node.setPosition(emission.start);
                node.setScale(0, 0, 1);
                redraw();
                tween(node)
                    .parallel(
                        tween().to(cycle, { position: emission.target }, { easing: 'quadOut' }),
                        tween()
                            .to(cycle * 0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'sineOut' })
                            .to(cycle * 0.7, { scale: new Vec3(0, 0, 1) }, { easing: 'sineIn' }),
                    )
                    .call(runCycle)
                    .start();
            };
            this.scheduleOnce(runCycle, Math.random() * GLOW_SPARKLE_CYCLE);
            this.sparkleTweens.push(node);
        }
    }

    private clearGlowSparkles() {
        for (const node of this.sparkleTweens) {
            if (!node?.isValid) continue;
            Tween.stopAllByTarget(node);
            node.removeFromParent();
            node.destroy();
        }
        this.sparkleTweens.length = 0;
        if (this.highlightSparkleLayer) this.clearChildren(this.highlightSparkleLayer);
    }

    private clearHighlightEffects() {
        this.clearHighlight.clear();
        if (this.highlightGlowLayer) this.clearChildren(this.highlightGlowLayer);
        this.clearGlowSparkles();
    }

    private getAdjustedDragPos(touchPos: Vec3): Vec3 {
        return new Vec3(
            touchPos.x + DRAG_INITIAL_OFFSET.x,
            touchPos.y + this.computeDragOffsetY(touchPos.y),
            0,
        );
    }

    private computeDragOffsetY(touchY: number): number {
        if (touchY < BOTTOM_SAFE_GUARD) return 0;
        const visibleHeight = view.getVisibleSize().height;
        const topGuard = visibleHeight - TOP_SAFE_GUARD;
        if (touchY > topGuard) return 0;
        const t = Math.min(1, (touchY - BOTTOM_SAFE_GUARD) / OFFSET_TRANSITION_RANGE);
        const smoothT = t * t * (3 - 2 * t);
        const desiredOffset = smoothT * DRAG_INITIAL_OFFSET.y;
        const maxAllowedOffset = topGuard - touchY;
        return Math.max(0, Math.min(desiredOffset, maxAllowedOffset));
    }

    private constrainDragCenter(center: Vec3, shape: Shape): Vec3 {
        const halfW = Math.max(CELL_SIZE, shape.width * CELL_SIZE) / 2;
        const halfH = Math.max(CELL_SIZE, shape.height * CELL_SIZE) / 2;
        const minX = -DESIGN_WIDTH / 2 + halfW * 0.35;
        const maxX = DESIGN_WIDTH / 2 - halfW * 0.35;
        const minY = -DESIGN_HEIGHT / 2 + halfH * 0.35;
        const maxY = DESIGN_HEIGHT / 2 - halfH * 0.35;
        return new Vec3(
            Math.max(minX, Math.min(maxX, center.x)),
            Math.max(minY, Math.min(maxY, center.y)),
            center.z,
        );
    }

    // ========== 触摸交互 ==========

    private onTouchStart(event: EventTouch) {
        if (this.gameLogic.isLevelComplete) {
            this.nextLevel();
            return;
        }
        if (this.gameLogic.isGameOver) {
            this.restart();
            return;
        }

        const uiPos = event.getUILocation();
        const pos = new Vec3(uiPos.x, uiPos.y, 0);

        // 检测是否点中了托盘中的形状
        for (let i = 0; i < TRAY_COUNT; i++) {
            const shape = this.gameLogic.tray[i];
            if (!shape) continue;

            const slotNode = this.traySlots[i].node;
            const slotTransform = slotNode.getComponent(UITransform);
            const localPos = slotTransform.convertToNodeSpaceAR(pos);

            const padding = 20;
            const previewCellSize = this.getTrayPreviewCellSize(shape);
            const halfW = (shape.width * previewCellSize) / 2 + padding;
            const halfH = (shape.height * previewCellSize) / 2 + padding;

            if (Math.abs(localPos.x) <= halfW && Math.abs(localPos.y) <= halfH) {
                this.dragShapeIndex = i;
                this.currentTouchPos = pos;
                this.lastPreviewCode = null;
                this.lastClearPreviewKey = '';
                this.lastPreviewPlacement = null;
                this.sfx.play('piece_pickup');
                HapticsService.previewSwitch();
                this.drawDragShape(pos);
                this.updatePlacementPreview(pos);
                // 清空对应槽位的渲染，避免拖拽过程中原位残留形成"双影"
                this.traySlots[i].clear();
                this.clearChildren(this.traySlots[i].node);
                return;
            }
        }
    }

    private onTouchMove(event: EventTouch) {
        if (this.dragShapeIndex < 0) return;

        const uiPos = event.getUILocation();
        const pos = new Vec3(uiPos.x, uiPos.y, 0);
        this.currentTouchPos = pos;

        this.drawDragShape(pos);
        this.updatePlacementPreview(pos);
    }

    private onTouchEnd(event: EventTouch) {
        if (this.dragShapeIndex < 0) return;

        const uiPos = event.getUILocation();
        const pos = new Vec3(uiPos.x, uiPos.y, 0);
        this.currentTouchPos = pos;

        let placed = false;
        const shape = this.gameLogic.tray[this.dragShapeIndex];
        if (shape) {
            if (!this.lastPreviewPlacement) this.updatePlacementPreview(pos);
            const placement = this.lastPreviewPlacement;
            if (placement?.canPlace) {
                const result = this.gameLogic.placeShape(this.dragShapeIndex, placement.row, placement.col);
                if (result.success) {
                    placed = true;
                    this.sfx.play('bb_block_place');
                    HapticsService.placed();
                    this.playPlacementConfetti(result.placedCells);
                    if (result.linesCleared > 0) {
                        HapticsService.cleared();
                    }
                    // GameLogic 已在本次计分后更新 bestScore；这里负责持久化。
                    sys.localStorage.setItem('block_blast_best', this.gameLogic.bestScore.toString());
                    this.promotePreviewCellsToPlaced();
                    if (result.linesCleared > 0) {
                        this.scheduleClearSequence(result);
                    } else {
                        this.scheduleOnce(() => this.updateView(), 0.05);
                        if (result.levelComplete) {
                            this.showLevelComplete();
                        } else if (result.gameOver) {
                            this.showGameOver();
                        }
                    }
                }
            }
        }

        if (!placed) {
            this.sfx.play('piece_reject');
            HapticsService.rejected();
        }

        this.dragShapeIndex = -1;
        this.currentTouchPos = null;
        this.lastPreviewCode = null;
        this.lastClearPreviewKey = '';
        this.lastPreviewPlacement = null;
        this.dragNode.clear();
        this.clearChildren(this.dragNode.node);
        this.dragNode.node.setPosition(-2000, -2000, 0);
        this.gridPreview.clear();
        this.clearChildren(this.gridPreview.node);
        this.clearHighlightEffects();
        // 放置失败时 tray 数组未变，需把原槽位方块画回来；放置成功时 updateView 已重绘，重复调用无副作用
        this.drawTray();
    }

    private promotePreviewCellsToPlaced() {
        const previewChildren = this.gridPreview.node.children.slice();
        for (const child of previewChildren) {
            child.removeFromParent();
            this.gridCells.node.addChild(child);
            const sprite = child.getComponent(Sprite);
            if (sprite) sprite.color = Color.WHITE;
        }
        this.gridPreview.clear();
    }

    private scheduleClearSequence(result: { clearedCells: GridPosition[]; linesCleared: number; levelComplete: boolean; gameOver: boolean }) {
        this.scheduleOnce(() => {
            this.sfx.play('bb_block_clear');
            this.playClearBurstSparkles(result.clearedCells);
            this.updateView();
            if (result.levelComplete) {
                this.showLevelComplete();
            } else if (result.gameOver) {
                this.showGameOver();
            }
        }, 0.12);
    }

    private getGridCellFromTouch(touchPos: Vec3): { row: number; col: number } | null {
        const gridTransform = this.gridNode.getComponent(UITransform);
        const localPos = gridTransform.convertToNodeSpaceAR(touchPos);

        const col = Math.floor((localPos.x + GRID_COLS / 2 * CELL_SIZE) / CELL_SIZE);
        const row = Math.floor((GRID_ROWS / 2 * CELL_SIZE - localPos.y) / CELL_SIZE);

        if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return null;
        return { row, col };
    }

    private gridCellToLocalPosition(cell: GridPosition): Vec3 {
        return new Vec3(
            (cell.col - GRID_COLS / 2 + 0.5) * CELL_SIZE + this.gridNode.position.x,
            (GRID_ROWS / 2 - cell.row - 0.5) * CELL_SIZE + this.gridNode.position.y,
            0,
        );
    }

    private playPlacementConfetti(cells: GridPosition[]) {
        if (!this.enablePlacementConfetti) return;
        if (!this.effectLayer || cells.length === 0) return;
        const scatterRange = PLACEMENT_CONFETTI_SCATTER_MAX - PLACEMENT_CONFETTI_SCATTER_MIN;
        for (const cell of cells) {
            const center = this.gridCellToLocalPosition(cell);
            for (let i = 0; i < PLACEMENT_CONFETTI_DENSITY; i++) {
                const baseColor = SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)];
                const angle = Math.random() * Math.PI * 2;
                const distance = PLACEMENT_CONFETTI_SCATTER_MIN + Math.random() * scatterRange;
                const end = new Vec3(center.x + Math.cos(angle) * distance, center.y + Math.sin(angle) * distance, 0);
                const mid = new Vec3(center.x + (end.x - center.x) * 0.6, center.y + (end.y - center.y) * 0.6, 0);
                const node = this.createParticleNode('PlacementConfetti', center, baseColor, 0);
                const initAngle = Math.random() * 360;
                const totalSpin = (Math.random() - 0.5) * 1440;
                const duration = PLACEMENT_CONFETTI_DURATION * (0.8 + Math.random() * 0.4);
                node.angle = initAngle;
                tween(node)
                    .to(duration * 0.4, { scale: new Vec3(PLACEMENT_CONFETTI_SIZE_MAX, PLACEMENT_CONFETTI_SIZE_MAX, 1), position: mid, angle: initAngle + totalSpin * 0.4 }, { easing: 'sineOut', onUpdate: (_target, ratio) => this.updateParticleAlpha(node, baseColor, Math.round(255 * (ratio ?? 0))) })
                    .to(duration * 0.6, { scale: new Vec3(0, 0, 1), position: end, angle: initAngle + totalSpin }, { easing: 'sineIn', onUpdate: (_target, ratio) => this.updateParticleAlpha(node, baseColor, Math.round(255 * (1 - (ratio ?? 0)))) })
                    .call(() => this.destroyParticle(node))
                    .start();
            }
        }
    }

    private playClearBurstSparkles(cells: GridPosition[]) {
        if (!this.enableClearBurstSparkles) return;
        if (!this.effectLayer || cells.length === 0) return;
        const scatterRange = CLEAR_BURST_SPARKLE_SCATTER_MAX - CLEAR_BURST_SPARKLE_SCATTER_MIN;
        const alphaRange = CLEAR_BURST_SPARKLE_ALPHA_MAX - CLEAR_BURST_SPARKLE_ALPHA_MIN + 1;
        for (const cell of cells) {
            const center = this.gridCellToLocalPosition(cell);
            for (let i = 0; i < CLEAR_BURST_SPARKLE_DENSITY; i++) {
                const baseColor = SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)];
                const alpha = CLEAR_BURST_SPARKLE_ALPHA_MIN + Math.floor(Math.random() * alphaRange);
                const angle = Math.random() * Math.PI * 2;
                const distance = CLEAR_BURST_SPARKLE_SCATTER_MIN + Math.random() * scatterRange;
                const end = new Vec3(center.x + Math.cos(angle) * distance, center.y + Math.sin(angle) * distance, 0);
                const frame = this.loadedStarFrames.length > 0 ? this.loadedStarFrames[Math.floor(Math.random() * this.loadedStarFrames.length)] : null;
                const node = this.createParticleNode('ClearBurstSparkle', center, baseColor, 0, frame);
                const duration = CLEAR_BURST_SPARKLE_DURATION * (0.8 + Math.random() * 0.4);
                tween(node)
                    .to(duration * 0.4, { scale: new Vec3(CLEAR_BURST_SPARKLE_SIZE_MAX, CLEAR_BURST_SPARKLE_SIZE_MAX, 1), position: end }, { easing: 'sineOut', onUpdate: (_target, ratio) => this.updateParticleAlpha(node, baseColor, Math.round(alpha * (ratio ?? 0))) })
                    .to(duration * 0.6, { scale: new Vec3(0, 0, 1) }, { easing: 'sineIn', onUpdate: (_target, ratio) => this.updateParticleAlpha(node, baseColor, Math.round(alpha * (1 - (ratio ?? 0)))) })
                    .call(() => this.destroyParticle(node))
                    .start();
            }
        }
    }

    private createParticleNode(name: string, position: Vec3, color: Color, alpha: number, frame: SpriteFrame | null = null): Node {
        const node = new Node(name);
        this.effectLayer.addChild(node);
        node.addComponent(UITransform).setContentSize(1, 1);
        node.setPosition(position);
        node.setScale(0, 0, 1);
        if (frame) {
            const sprite = node.addComponent(Sprite);
            sprite.type = Sprite.Type.SIMPLE;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.spriteFrame = frame;
            sprite.color = new Color(color.r, color.g, color.b, alpha);
        } else {
            const g = node.addComponent(Graphics);
            g.fillColor = new Color(color.r, color.g, color.b, alpha);
            g.rect(-0.5, -0.5, 1, 1);
            g.fill();
        }
        return node;
    }

    private updateParticleAlpha(node: Node, color: Color, alpha: number) {
        if (!node?.isValid) return;
        const sprite = node.getComponent(Sprite);
        if (sprite) {
            sprite.color = new Color(color.r, color.g, color.b, alpha);
            return;
        }
        const g = node.getComponent(Graphics);
        if (!g) return;
        g.clear();
        g.fillColor = new Color(color.r, color.g, color.b, alpha);
        g.rect(-0.5, -0.5, 1, 1);
        g.fill();
    }

    private destroyParticle(node: Node) {
        if (!node?.isValid) return;
        node.removeFromParent();
        node.destroy();
    }

    // ========== 游戏结束 ==========

    private showGameOver() {
        this.gameOverScoreLabel.string = `Level ${this.gameLogic.level}  Score: ${this.gameLogic.score}`;
        this.gameOverNode.active = true;
    }

    private showLevelComplete() {
        this.sfx.play('bb_block_start');
        this.levelCompleteSubLabel.string = `Level ${this.gameLogic.level}`;
        this.levelCompleteNode.active = true;
    }

    private nextLevel() {
        this.sfx.play('ui_tap');
        this.gameLogic.nextLevel();
        sys.localStorage.setItem('block_blast_level', this.gameLogic.level.toString());
        this.levelCompleteNode.active = false;
        this.updateView();
    }

    private restart() {
        this.sfx.play('ui_tap');
        this.gameLogic.restart();
        this.gameOverNode.active = false;
        this.updateView();
    }
}
