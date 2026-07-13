// Block Blast v0.1.0 - 纯色块占位，核心玩法

import { _decorator, Component, Node, Graphics, UITransform, Vec3, Color, Label, view, ResolutionPolicy, sys, EventTouch } from 'cc';
import { GameLogic } from './core/GameLogic';
import { Shape } from './core/Types';
import { GRID_SIZE, CELL_SIZE, CELL_GAP, TRAY_COUNT, TRAY_CELL_SIZE, SHAPE_COLORS, BG_COLOR, GRID_BG_COLOR, EMPTY_CELL_COLOR } from './core/Constants';

const { ccclass } = _decorator;

@ccclass('GameApp')
export class GameApp extends Component {
    // 游戏逻辑
    private gameLogic: GameLogic;

    // 网格渲染
    private gridNode: Node;
    private gridBg: Graphics;
    private gridCells: Graphics;
    private gridPreview: Graphics;

    // 托盘渲染
    private trayNode: Node;
    private traySlots: Graphics[] = [];

    // 拖拽
    private dragNode: Graphics;
    private dragShapeIndex: number = -1;

    // 分数
    private scoreLabel: Label;
    private bestLabel: Label;

    // 游戏结束
    private gameOverNode: Node;
    private gameOverScoreLabel: Label;

    // 布局
    private readonly GRID_Y = 80;
    private readonly TRAY_Y = -430;
    private readonly SCORE_Y = 540;
    private readonly CELL_RENDER = CELL_SIZE - CELL_GAP * 2;
    private readonly TRAY_CELL_RENDER = TRAY_CELL_SIZE - 4;

    // ========== 生命周期 ==========

    start() {
        view.setDesignResolutionSize(720, 1280, ResolutionPolicy.FIXED_HEIGHT);

        this.gameLogic = new GameLogic();
        this.gameLogic.bestScore = parseInt(sys.localStorage.getItem('block_blast_best') || '0', 10);

        this.createBackground();
        this.createScoreLabel();
        this.createGrid();
        this.createTray();
        this.createDragNode();
        this.createGameOverNode();

        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);

        this.updateView();
    }

    // ========== 创建节点 ==========

    private createBackground() {
        const node = new Node('Background');
        this.node.addChild(node);
        node.addComponent(UITransform).setContentSize(720, 1280);
        const g = node.addComponent(Graphics);
        g.fillColor = new Color(BG_COLOR[0], BG_COLOR[1], BG_COLOR[2], 255);
        g.roundRect(-360, -640, 720, 1280, 0);
        g.fill();
    }

    private createScoreLabel() {
        const node = new Node('ScoreLabel');
        this.node.addChild(node);
        node.setPosition(0, this.SCORE_Y, 0);
        node.addComponent(UITransform).setContentSize(400, 80);
        this.scoreLabel = node.addComponent(Label);
        this.scoreLabel.string = '0';
        this.scoreLabel.fontSize = 56;
        this.scoreLabel.lineHeight = 70;
        this.scoreLabel.color = new Color(255, 255, 255, 255);
        this.scoreLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.scoreLabel.verticalAlign = Label.VerticalAlign.CENTER;

        const bestNode = new Node('BestLabel');
        this.node.addChild(bestNode);
        bestNode.setPosition(0, this.SCORE_Y - 55, 0);
        bestNode.addComponent(UITransform).setContentSize(300, 30);
        this.bestLabel = bestNode.addComponent(Label);
        this.bestLabel.string = `Best: ${this.gameLogic.bestScore}`;
        this.bestLabel.fontSize = 24;
        this.bestLabel.lineHeight = 30;
        this.bestLabel.color = new Color(180, 180, 200, 200);
        this.bestLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
    }

    private createGrid() {
        this.gridNode = new Node('Grid');
        this.node.addChild(this.gridNode);
        this.gridNode.setPosition(0, this.GRID_Y, 0);
        const gridSize = GRID_SIZE * CELL_SIZE;
        this.gridNode.addComponent(UITransform).setContentSize(gridSize, gridSize);

        // 背景层
        const bgNode = new Node('GridBg');
        this.gridNode.addChild(bgNode);
        bgNode.addComponent(UITransform);
        this.gridBg = bgNode.addComponent(Graphics);

        // 方块层
        const cellsNode = new Node('GridCells');
        this.gridNode.addChild(cellsNode);
        cellsNode.addComponent(UITransform);
        this.gridCells = cellsNode.addComponent(Graphics);

        // 预览层
        const previewNode = new Node('GridPreview');
        this.gridNode.addChild(previewNode);
        previewNode.addComponent(UITransform);
        this.gridPreview = previewNode.addComponent(Graphics);
    }

    private createTray() {
        this.trayNode = new Node('Tray');
        this.node.addChild(this.trayNode);
        this.trayNode.setPosition(0, this.TRAY_Y, 0);
        this.trayNode.addComponent(UITransform).setContentSize(720, 140);

        const slotWidth = 200;
        const startX = -(TRAY_COUNT - 1) / 2 * slotWidth;

        for (let i = 0; i < TRAY_COUNT; i++) {
            const slotNode = new Node(`TraySlot_${i}`);
            this.trayNode.addChild(slotNode);
            slotNode.setPosition(startX + i * slotWidth, 0, 0);
            slotNode.addComponent(UITransform).setContentSize(slotWidth, 140);
            this.traySlots.push(slotNode.addComponent(Graphics));
        }
    }

    private createDragNode() {
        const node = new Node('DragShape');
        this.node.addChild(node);
        node.addComponent(UITransform);
        this.dragNode = node.addComponent(Graphics);
        // 初始位置设在屏幕外，避免误渲染
        node.setPosition(-2000, -2000, 0);
    }

    private createGameOverNode() {
        this.gameOverNode = new Node('GameOver');
        this.node.addChild(this.gameOverNode);
        this.gameOverNode.addComponent(UITransform).setContentSize(720, 1280);

        // 半透明遮罩
        const bgNode = new Node('GOBg');
        this.gameOverNode.addChild(bgNode);
        bgNode.addComponent(UITransform).setContentSize(720, 1280);
        const bg = bgNode.addComponent(Graphics);
        bg.fillColor = new Color(0, 0, 0, 180);
        bg.roundRect(-360, -640, 720, 1280, 0);
        bg.fill();

        // Game Over 文字
        const labelNode = new Node('GOLabel');
        this.gameOverNode.addChild(labelNode);
        labelNode.setPosition(0, 80, 0);
        labelNode.addComponent(UITransform).setContentSize(500, 80);
        const goLabel = labelNode.addComponent(Label);
        goLabel.string = 'Game Over';
        goLabel.fontSize = 64;
        goLabel.lineHeight = 80;
        goLabel.color = new Color(255, 107, 107, 255);
        goLabel.horizontalAlign = Label.HorizontalAlign.CENTER;

        // 分数
        const scoreNode = new Node('GOScore');
        this.gameOverNode.addChild(scoreNode);
        scoreNode.setPosition(0, 0, 0);
        scoreNode.addComponent(UITransform).setContentSize(500, 60);
        this.gameOverScoreLabel = scoreNode.addComponent(Label);
        this.gameOverScoreLabel.string = 'Score: 0';
        this.gameOverScoreLabel.fontSize = 40;
        this.gameOverScoreLabel.lineHeight = 60;
        this.gameOverScoreLabel.color = new Color(255, 255, 255, 255);
        this.gameOverScoreLabel.horizontalAlign = Label.HorizontalAlign.CENTER;

        // 重启提示
        const restartNode = new Node('GORestart');
        this.gameOverNode.addChild(restartNode);
        restartNode.setPosition(0, -100, 0);
        restartNode.addComponent(UITransform).setContentSize(500, 40);
        const restartLabel = restartNode.addComponent(Label);
        restartLabel.string = 'Tap to Restart';
        restartLabel.fontSize = 28;
        restartLabel.lineHeight = 40;
        restartLabel.color = new Color(180, 180, 200, 200);
        restartLabel.horizontalAlign = Label.HorizontalAlign.CENTER;

        this.gameOverNode.active = false;
    }

    // ========== 渲染 ==========

    private updateView() {
        this.drawGridBg();
        this.drawGridCells();
        this.drawTray();
        this.scoreLabel.string = this.gameLogic.score.toString();
        this.bestLabel.string = `Best: ${this.gameLogic.bestScore}`;
        this.gridPreview.clear();
        this.dragNode.clear();
    }

    private drawGridBg() {
        const g = this.gridBg;
        g.clear();

        const gridTotal = GRID_SIZE * CELL_SIZE;

        // 网格底板
        g.fillColor = new Color(GRID_BG_COLOR[0], GRID_BG_COLOR[1], GRID_BG_COLOR[2], 255);
        g.roundRect(-gridTotal / 2 - 12, -gridTotal / 2 - 12, gridTotal + 24, gridTotal + 24, 16);
        g.fill();

        // 空格
        const rs = this.CELL_RENDER;
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const x = (col - GRID_SIZE / 2 + 0.5) * CELL_SIZE;
                const y = (GRID_SIZE / 2 - row - 0.5) * CELL_SIZE;
                g.fillColor = new Color(EMPTY_CELL_COLOR[0], EMPTY_CELL_COLOR[1], EMPTY_CELL_COLOR[2], 255);
                g.roundRect(x - rs / 2, y - rs / 2, rs, rs, 8);
                g.fill();
            }
        }
    }

    private drawGridCells() {
        const g = this.gridCells;
        g.clear();

        const rs = this.CELL_RENDER;
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const v = this.gameLogic.grid.getCell(row, col);
                if (v > 0) {
                    const c = SHAPE_COLORS[v - 1];
                    const x = (col - GRID_SIZE / 2 + 0.5) * CELL_SIZE;
                    const y = (GRID_SIZE / 2 - row - 0.5) * CELL_SIZE;
                    g.fillColor = new Color(c[0], c[1], c[2], 255);
                    g.roundRect(x - rs / 2, y - rs / 2, rs, rs, 8);
                    g.fill();
                }
            }
        }
    }

    private drawTray() {
        for (let i = 0; i < TRAY_COUNT; i++) {
            const g = this.traySlots[i];
            g.clear();

            const shape = this.gameLogic.tray[i];
            if (!shape) continue;

            const cr = this.TRAY_CELL_RENDER;
            const offsetX = -(shape.width * TRAY_CELL_SIZE) / 2 + TRAY_CELL_SIZE / 2;
            const offsetY = (shape.height * TRAY_CELL_SIZE) / 2 - TRAY_CELL_SIZE / 2;
            const c = SHAPE_COLORS[shape.color];
            g.fillColor = new Color(c[0], c[1], c[2], 255);

            for (const cell of shape.cells) {
                const x = offsetX + cell.col * TRAY_CELL_SIZE;
                const y = offsetY - cell.row * TRAY_CELL_SIZE;
                g.roundRect(x - cr / 2, y - cr / 2, cr, cr, 4);
                g.fill();
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

        // 手指在 grid 内时，dragNode 节点中心 = shape 视觉中心 in GameApp 局部（与 gridPreview 完全重合）
        // 手指在 grid 外时，跟随手指
        const cellPos = this.getGridCellFromTouch(touchPos);
        if (cellPos) {
            const shapeCenterRow = cellPos.row - Math.floor((shape.height - 1) / 2) + avgRow;
            const shapeCenterCol = cellPos.col - Math.floor((shape.width - 1) / 2) + avgCol;
            const gridPos = this.gridNode.position;
            const centerX = (shapeCenterCol - GRID_SIZE / 2 + 0.5) * CELL_SIZE + gridPos.x;
            const centerY = (GRID_SIZE / 2 - shapeCenterRow - 0.5) * CELL_SIZE + gridPos.y;
            this.dragNode.node.setPosition(centerX, centerY, 0);
        } else {
            const parentTransform = this.node.getComponent(UITransform);
            const localPos = parentTransform.convertToNodeSpaceAR(touchPos);
            this.dragNode.node.setPosition(localPos.x, localPos.y, 0);
        }

        const cr = this.CELL_RENDER;
        const c = SHAPE_COLORS[shape.color];
        g.fillColor = new Color(c[0], c[1], c[2], 200);

        for (const cell of shape.cells) {
            const x = offsetX + cell.col * CELL_SIZE;
            const y = offsetY - cell.row * CELL_SIZE;
            g.roundRect(x - cr / 2, y - cr / 2, cr, cr, 8);
            g.fill();
        }
    }

    private updatePlacementPreview(touchPos: Vec3) {
        const g = this.gridPreview;
        g.clear();

        const shape = this.gameLogic.tray[this.dragShapeIndex];
        if (!shape) return;

        const cellPos = this.getGridCellFromTouch(touchPos);
        if (!cellPos) return;

        const placeRow = cellPos.row - Math.floor((shape.height - 1) / 2);
        const placeCol = cellPos.col - Math.floor((shape.width - 1) / 2);

        const canPlace = this.gameLogic.grid.canPlace(shape, placeRow, placeCol);
        const c = canPlace ? [100, 255, 100] : [255, 100, 100];
        g.fillColor = new Color(c[0], c[1], c[2], 120);

        const rs = this.CELL_RENDER;
        for (const cell of shape.cells) {
            const r = placeRow + cell.row;
            const col = placeCol + cell.col;
            if (r >= 0 && r < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
                const x = (col - GRID_SIZE / 2 + 0.5) * CELL_SIZE;
                const y = (GRID_SIZE / 2 - r - 0.5) * CELL_SIZE;
                g.roundRect(x - rs / 2, y - rs / 2, rs, rs, 8);
                g.fill();
            }
        }
    }

    // ========== 触摸交互 ==========

    private onTouchStart(event: EventTouch) {
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
            const halfW = (shape.width * TRAY_CELL_SIZE) / 2 + padding;
            const halfH = (shape.height * TRAY_CELL_SIZE) / 2 + padding;

            if (Math.abs(localPos.x) <= halfW && Math.abs(localPos.y) <= halfH) {
                this.dragShapeIndex = i;
                this.drawDragShape(pos);
                // 清空对应槽位的渲染，避免拖拽过程中原位残留形成"双影"
                this.traySlots[i].clear();
                return;
            }
        }
    }

    private onTouchMove(event: EventTouch) {
        if (this.dragShapeIndex < 0) return;

        const uiPos = event.getUILocation();
        const pos = new Vec3(uiPos.x, uiPos.y, 0);

        this.drawDragShape(pos);
        this.updatePlacementPreview(pos);
    }

    private onTouchEnd(event: EventTouch) {
        if (this.dragShapeIndex < 0) return;

        const uiPos = event.getUILocation();
        const pos = new Vec3(uiPos.x, uiPos.y, 0);

        const shape = this.gameLogic.tray[this.dragShapeIndex];
        if (shape) {
            const cellPos = this.getGridCellFromTouch(pos);
            if (cellPos) {
                const placeRow = cellPos.row - Math.floor((shape.height - 1) / 2);
                const placeCol = cellPos.col - Math.floor((shape.width - 1) / 2);

                const result = this.gameLogic.placeShape(this.dragShapeIndex, placeRow, placeCol);
                if (result.success) {
                    if (this.gameLogic.score > this.gameLogic.bestScore) {
                        this.gameLogic.bestScore = this.gameLogic.score;
                        sys.localStorage.setItem('block_blast_best', this.gameLogic.bestScore.toString());
                    }
                    this.updateView();
                    if (result.gameOver) {
                        this.showGameOver();
                    }
                }
            }
        }

        this.dragShapeIndex = -1;
        this.dragNode.clear();
        this.dragNode.node.setPosition(-2000, -2000, 0);
        this.gridPreview.clear();
        // 放置失败时 tray 数组未变，需把原槽位方块画回来；放置成功时 updateView 已重绘，重复调用无副作用
        this.drawTray();
    }

    private getGridCellFromTouch(touchPos: Vec3): { row: number; col: number } | null {
        const gridTransform = this.gridNode.getComponent(UITransform);
        const localPos = gridTransform.convertToNodeSpaceAR(touchPos);

        const col = Math.floor((localPos.x + GRID_SIZE / 2 * CELL_SIZE) / CELL_SIZE);
        const row = Math.floor((GRID_SIZE / 2 * CELL_SIZE - localPos.y) / CELL_SIZE);

        if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
        return { row, col };
    }

    // ========== 游戏结束 ==========

    private showGameOver() {
        this.gameOverScoreLabel.string = `Score: ${this.gameLogic.score}`;
        this.gameOverNode.active = true;
    }

    private restart() {
        this.gameLogic.restart();
        this.gameOverNode.active = false;
        this.updateView();
    }
}
