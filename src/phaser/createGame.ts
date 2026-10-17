import Phaser from 'phaser';

/** Shared engine/audio initialization; imports no scene and preserves caller-owned lifecycle. */
export function createGame(scene: Phaser.Scene, battle: boolean) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#172033',
    // Right click and long press are cancel gestures, never a browser menu (tech design §5.6).
    disableContextMenu: true,
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    callbacks: { preBoot(game) {
      if(!battle || !('context' in game.sound)) return;
      // Phaser 4.2.1 resumes without a rejection handler on focus, every focused frame,
      // and a delayed VISIBLE callback. BattleAudio owns bounded recovery instead.
      // Install once for the game so scene loading/restart gaps are protected too.
      const recovery=game.sound as unknown as {onFocus:()=>void;onGameVisible:()=>void};
      game.sound.pauseOnBlur=false;
      recovery.onFocus=()=>{};
      game.events.off(Phaser.Core.Events.VISIBLE,recovery.onGameVisible,game.sound);
    } },
    scene,
  });
}
