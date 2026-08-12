import { Color, gfx, Graphics, Node, Sprite, SpriteFrame, tween, UITransform, Vec3 } from 'cc';

const CHARGE_VFX_UNIT = 220 / 6;
const CHARGE_BOLT_DURATION = 0.5;
const TRAIL_TAIL_LEN_MIN = 0.2;
const TRAIL_TAIL_LEN_MAX = 0.5;
const TRAIL_TAIL_GROWTH = 1.5;
const TRAIL_BEAD_DENSITY = 9;
const TRAIL_BEAD_COUNT_MIN = 9;
const TRAIL_BEAD_COUNT_MAX = 36;
const TRAIL_BEAD_R_HEAD = 0.10;
const TRAIL_BEAD_R_TAIL = 0.035;
const TRAIL_BEAD_JITTER = 0.04;
const TRAIL_BEAD_ALPHA = 220;
const TRAIL_OFFSET_BACK = -10;
const TRAIL_BEAD_GLOW_D_MUL = 3.0;
const TRAIL_BEAD_GLOW_ALPHA = 90;
const DEFAULT_BEAD_TINT_PROBABILITY = 0.2;
const DEFAULT_BEAD_TINT_COLOR = new Color(66, 213, 240, 255);
const DEFAULT_TINT_COLOR = Color.WHITE;
const CURVE_BEND_MIN = 0.15;
const CURVE_BEND_MAX = 0.35;
const CURVE_CONTROL_T = 0.5;
const SPARKLE_DIRECTION_OFFSET = -20;

interface SparkleData {
    node: Node;
    sprite: Sprite;
    delay: number;
    baseOffsetX: number;
    baseOffsetY: number;
    spinSpeed: number;
}

interface FireworkBolt {
    container: Node;
    orb: { node: Node; sprite: Sprite };
    trail: {
        node: Node;
        graphics: Graphics;
        initialTailLen: number;
        beadCount: number;
        beadRadii: number[];
        beadJitters: number[];
        glowSlots: { node: Node; sprite: Sprite; tf: UITransform }[];
        beadTinted: boolean[];
    };
    sparkles: {
        node: Node;
        items: SparkleData[];
    };
}

export interface ChargeBoltOptions {
    parentNode: Node;
    startLocal: Vec3;
    targetLocal: Vec3;
    trailFrame: SpriteFrame;
    starFrames: SpriteFrame[];
    glowFrame: SpriteFrame;
    tintColor?: Color;
    beadTintColor?: Color;
    beadTintProbability?: number;
    duration?: number;
    onComplete?: () => void;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function createFireworkBolt(
    tintColor: Color,
    beadTintColor: Color,
    beadTintProbability: number,
    trailFrame: SpriteFrame,
    starFrames: SpriteFrame[],
    glowFrame: SpriteFrame,
    startDirDx: number,
    startDirDy: number,
): FireworkBolt {
    const container = new Node('Firework Bolt');
    const pathLen = Math.hypot(startDirDx, startDirDy) || 1;
    const nx = startDirDx / pathLen;
    const ny = startDirDy / pathLen;
    const perpX = -ny;
    const perpY = nx;
    const flightAngleDeg = Math.atan2(ny, nx) * 180 / Math.PI;

    const orbNode = new Node('Lead Orb');
    orbNode.setParent(container);
    orbNode.setPosition(0, 0, 0);
    const orbTransform = orbNode.addComponent(UITransform);
    orbNode.angle = flightAngleDeg + 105 - 180;
    const orbSprite = orbNode.addComponent(Sprite);
    orbSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    orbSprite.spriteFrame = trailFrame;
    orbSprite.color = new Color(tintColor.r, tintColor.g, tintColor.b, 255);
    orbTransform.setContentSize(21, 44.2);

    const trailNode = new Node('Trail Streak');
    trailNode.setParent(container);
    trailNode.setPosition(0, 0, 0);
    trailNode.addComponent(UITransform).setContentSize(CHARGE_VFX_UNIT, CHARGE_VFX_UNIT * 3);
    const trailGfx = trailNode.addComponent(Graphics);
    const tailLenUnit = TRAIL_TAIL_LEN_MIN + Math.random() * (TRAIL_TAIL_LEN_MAX - TRAIL_TAIL_LEN_MIN);
    const initialTailLen = CHARGE_VFX_UNIT * tailLenUnit;
    const maxTailLenUnit = tailLenUnit + TRAIL_TAIL_GROWTH;
    const beadCount = clamp(Math.round(maxTailLenUnit * TRAIL_BEAD_DENSITY), TRAIL_BEAD_COUNT_MIN, TRAIL_BEAD_COUNT_MAX);
    const beadRadii: number[] = [];
    const beadJitters: number[] = [];
    const beadTinted: boolean[] = [];
    for (let i = 0; i < beadCount; i++) {
        const u = beadCount > 1 ? i / (beadCount - 1) : 0;
        const seed = Math.random();
        const rUnit = TRAIL_BEAD_R_HEAD + (TRAIL_BEAD_R_TAIL - TRAIL_BEAD_R_HEAD) * u;
        beadRadii.push(CHARGE_VFX_UNIT * rUnit * (0.8 + seed * 0.4));
        beadJitters.push((seed - 0.5) * 2 * CHARGE_VFX_UNIT * TRAIL_BEAD_JITTER);
        beadTinted.push(Math.random() < beadTintProbability);
    }

    const glowSlots: { node: Node; sprite: Sprite; tf: UITransform }[] = [];
    for (let i = 0; i < beadCount; i++) {
        const gNode = new Node(`Bead Glow ${i}`);
        gNode.setParent(trailNode);
        gNode.setPosition(0, 0, 0);
        const gtf = gNode.addComponent(UITransform);
        const gSprite = gNode.addComponent(Sprite);
        gSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        gSprite.spriteFrame = glowFrame;
        (gSprite as unknown as { _srcBlendFactor: gfx.BlendFactor })._srcBlendFactor = gfx.BlendFactor.SRC_ALPHA;
        (gSprite as unknown as { _dstBlendFactor: gfx.BlendFactor })._dstBlendFactor = gfx.BlendFactor.ONE;
        const d = beadRadii[i] * 2 * TRAIL_BEAD_GLOW_D_MUL;
        gtf.setContentSize(d, d);
        gSprite.color = new Color(tintColor.r, tintColor.g, tintColor.b, TRAIL_BEAD_GLOW_ALPHA);
        glowSlots.push({ node: gNode, sprite: gSprite, tf: gtf });
    }

    const sparklesNode = new Node('Sparkles');
    sparklesNode.setParent(container);
    sparklesNode.setPosition(0, 0, 0);
    const ELLIPSE_A = CHARGE_VFX_UNIT * 0.6;
    const ELLIPSE_B = CHARGE_VFX_UNIT * 0.3;
    const sparkleCount = 10 + Math.floor(Math.random() * 11);
    const sparkles: SparkleData[] = [];
    for (let s = 0; s < sparkleCount; s++) {
        const starNode = new Node(`Sparkle ${s}`);
        starNode.setParent(sparklesNode);
        starNode.setPosition(0, 0, 0);
        const starTransform = starNode.addComponent(UITransform);
        const starSize = CHARGE_VFX_UNIT * (0.18 + Math.random() * 0.32);
        const starSprite = starNode.addComponent(Sprite);
        const frameIdx = starFrames.length > 0 ? Math.floor(Math.random() * starFrames.length) : 0;
        starSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        starSprite.spriteFrame = starFrames[frameIdx];
        starSprite.color = new Color(tintColor.r, tintColor.g, tintColor.b, 0);
        starTransform.setContentSize(starSize, starSize);

        const paramAngle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random());
        const lx = ELLIPSE_B * r * Math.cos(paramAngle);
        const ly = ELLIPSE_A * r * Math.sin(paramAngle);
        sparkles.push({
            node: starNode,
            sprite: starSprite,
            delay: 0.03 + s * (0.04 + Math.random() * 0.03),
            baseOffsetX: lx * perpX - ly * nx,
            baseOffsetY: lx * perpY - ly * ny,
            spinSpeed: (Math.random() - 0.5) * 600,
        });
    }

    return {
        container,
        orb: { node: orbNode, sprite: orbSprite },
        trail: { node: trailNode, graphics: trailGfx, initialTailLen, beadCount, beadRadii, beadJitters, glowSlots, beadTinted },
        sparkles: { node: sparklesNode, items: sparkles },
    };
}

export function playChargeBolt(options: ChargeBoltOptions): void {
    const {
        parentNode,
        startLocal,
        targetLocal,
        trailFrame,
        starFrames,
        glowFrame,
        tintColor = DEFAULT_TINT_COLOR,
        beadTintColor = DEFAULT_BEAD_TINT_COLOR,
        beadTintProbability = DEFAULT_BEAD_TINT_PROBABILITY,
        duration = CHARGE_BOLT_DURATION,
        onComplete,
    } = options;

    const dx = targetLocal.x - startLocal.x;
    const dy = targetLocal.y - startLocal.y;
    const pathLen = Math.hypot(dx, dy) || 1;
    const perpDirX = -dy / pathLen;
    const perpDirY = dx / pathLen;
    const bend = pathLen * (CURVE_BEND_MIN + Math.random() * (CURVE_BEND_MAX - CURVE_BEND_MIN)) * (Math.random() < 0.5 ? -1 : 1);
    const cpX = startLocal.x + dx * CURVE_CONTROL_T + perpDirX * bend;
    const cpY = startLocal.y + dy * CURVE_CONTROL_T + perpDirY * bend;

    const evalPath = (t: number): Vec3 => {
        const u = 1 - t;
        return new Vec3(u * u * startLocal.x + 2 * u * t * cpX + t * t * targetLocal.x, u * u * startLocal.y + 2 * u * t * cpY + t * t * targetLocal.y, 0);
    };
    const evalTangent = (t: number) => {
        const u = 1 - t;
        const tx = 2 * u * (cpX - startLocal.x) + 2 * t * (targetLocal.x - cpX);
        const ty = 2 * u * (cpY - startLocal.y) + 2 * t * (targetLocal.y - cpY);
        const len = Math.hypot(tx, ty) || 1;
        const nx = tx / len;
        const ny = ty / len;
        return { nx, ny, angleDeg: Math.atan2(ny, nx) * 180 / Math.PI };
    };

    const initialTangent = evalTangent(0);
    const bolt = createFireworkBolt(tintColor, beadTintColor, beadTintProbability, trailFrame, starFrames, glowFrame, cpX - startLocal.x, cpY - startLocal.y);
    bolt.container.setParent(parentNode);
    bolt.container.setPosition(startLocal);

    tween(bolt.container)
        .to(duration, {}, {
            onUpdate: (_target?: Node, ratio?: number) => {
                if (ratio === undefined) return;
                const t = ratio;
                const pos = evalPath(t);
                bolt.container.setPosition(pos);
                const { nx, ny, angleDeg } = evalTangent(t);

                bolt.orb.node.setPosition(0, 0, 0);
                bolt.orb.node.angle = angleDeg + 105 - 180;
                const orbScale = t < 0.1 ? 1.0 + (0.1 - t) * 3 : 1.0 - (t - 0.1) * 0.3;
                bolt.orb.node.setScale(orbScale, orbScale);
                const orbAlpha = t < 0.7 ? 255 : 255 * (1 - (t - 0.7) / 0.3);
                bolt.orb.sprite.color = new Color(tintColor.r, tintColor.g, tintColor.b, Math.round(orbAlpha));

                bolt.trail.node.setPosition(nx * TRAIL_OFFSET_BACK, ny * TRAIL_OFFSET_BACK, 0);
                const gfxTrail = bolt.trail.graphics;
                gfxTrail.clear();
                const tailLen = bolt.trail.initialTailLen + CHARGE_VFX_UNIT * TRAIL_TAIL_GROWTH * t;
                const fade = 1 - t * t;
                const perpX = -ny;
                const perpY = nx;
                const glowAlpha = Math.round(TRAIL_BEAD_GLOW_ALPHA * fade);
                const coreAlpha = Math.round(TRAIL_BEAD_ALPHA * fade);
                const beadPos: { cx: number; cy: number; r: number }[] = [];
                for (let i = 0; i < bolt.trail.beadCount; i++) {
                    const u = bolt.trail.beadCount > 1 ? i / (bolt.trail.beadCount - 1) : 0;
                    const dist = tailLen * u;
                    const r = bolt.trail.beadRadii[i];
                    const jitter = bolt.trail.beadJitters[i];
                    const cx = -nx * dist + perpX * jitter;
                    const cy = -ny * dist + perpY * jitter;
                    beadPos.push({ cx, cy, r });
                    const slot = bolt.trail.glowSlots[i];
                    slot.node.setPosition(cx, cy, 0);
                    const c = bolt.trail.beadTinted[i] ? beadTintColor : tintColor;
                    slot.sprite.color = new Color(c.r, c.g, c.b, glowAlpha);
                }
                gfxTrail.fillColor = new Color(tintColor.r, tintColor.g, tintColor.b, coreAlpha);
                for (let i = 0; i < bolt.trail.beadCount; i++) {
                    if (bolt.trail.beadTinted[i]) continue;
                    const p = beadPos[i];
                    gfxTrail.circle(p.cx, p.cy, p.r);
                }
                gfxTrail.fill();
                gfxTrail.fillColor = new Color(beadTintColor.r, beadTintColor.g, beadTintColor.b, coreAlpha);
                for (let i = 0; i < bolt.trail.beadCount; i++) {
                    if (!bolt.trail.beadTinted[i]) continue;
                    const p = beadPos[i];
                    gfxTrail.circle(p.cx, p.cy, p.r);
                }
                gfxTrail.fill();

                bolt.sparkles.node.setPosition(nx * SPARKLE_DIRECTION_OFFSET, ny * SPARKLE_DIRECTION_OFFSET, 0);
                bolt.sparkles.node.angle = angleDeg - initialTangent.angleDeg;
                const elapsed = t * duration;
                for (const sp of bolt.sparkles.items) {
                    if (elapsed < sp.delay) {
                        sp.node.setPosition(0, 0, 0);
                        sp.sprite.color = new Color(tintColor.r, tintColor.g, tintColor.b, 0);
                        continue;
                    }
                    const spDuration = duration - sp.delay;
                    const spElapsed = elapsed - sp.delay;
                    const spT = Math.min(1, spElapsed / spDuration);
                    const shrink = 1 - spT * 0.4;
                    sp.node.setPosition(sp.baseOffsetX * shrink, sp.baseOffsetY * shrink, 0);
                    sp.node.angle += sp.spinSpeed * (1 / 60);
                    let spAlpha = 0;
                    if (spT < 0.2) spAlpha = 255 * (spT / 0.2);
                    else if (spT < 0.8) spAlpha = 255;
                    else spAlpha = 255 * (1 - (spT - 0.8) / 0.2);
                    sp.sprite.color = new Color(tintColor.r, tintColor.g, tintColor.b, Math.round(spAlpha));
                    const breathe = 1 + Math.sin(spT * Math.PI * 3) * 0.25;
                    sp.node.setScale(breathe, breathe);
                }
            },
        })
        .call(() => {
            bolt.container.destroy();
            onComplete?.();
        })
        .start();
}
