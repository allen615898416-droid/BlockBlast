import { AudioClip, AudioSource, Node, resources } from 'cc';

export type SfxCue = 'ui_tap' | 'piece_pickup' | 'piece_reject' | 'bb_block_place' | 'bb_block_clear' | 'bb_block_start';

const SFX_PATHS: Record<SfxCue, string> = {
    ui_tap: 'blockblast/audio/sfx/ui_tap',
    piece_pickup: 'blockblast/audio/sfx/piece_pickup',
    piece_reject: 'blockblast/audio/sfx/piece_reject',
    bb_block_place: 'blockblast/audio/sfx/bb_block_place',
    bb_block_clear: 'blockblast/audio/sfx/bb_block_clear',
    bb_block_start: 'blockblast/audio/sfx/bb_block_start',
};

export class SfxService {
    private source: AudioSource;
    private clips = new Map<SfxCue, AudioClip>();
    private lastPlayed = new Map<SfxCue, number>();

    constructor(host: Node) {
        this.source = host.getComponent(AudioSource) ?? host.addComponent(AudioSource);
        this.preload();
    }

    public play(cue: SfxCue, volume = 1): void {
        const clip = this.clips.get(cue);
        if (!clip) return;
        const now = Date.now();
        const last = this.lastPlayed.get(cue) ?? 0;
        const cooldownMs = cue === 'bb_block_place' ? 45 : cue === 'piece_pickup' ? 80 : 120;
        if (now - last < cooldownMs) return;
        this.lastPlayed.set(cue, now);
        this.source.playOneShot(clip, volume);
    }

    private preload(): void {
        (Object.keys(SFX_PATHS) as SfxCue[]).forEach((cue) => {
            resources.load(SFX_PATHS[cue], AudioClip, (err, clip) => {
                if (err || !clip) return;
                this.clips.set(cue, clip);
            });
        });
    }
}
