import { DEAL_KEYFRAMES } from '../constants';

/* Keyframes used by the table and its child components.
 *
 * Kept as a global `<style>` block (rather than CSS Modules) because the
 * original markup references these names from many inline-styled places
 * inside the room — moving them to a module would break those references.
 *
 * `DEAL_KEYFRAMES` is generated dynamically from the seat layout and
 * therefore must live in JS rather than a static CSS file. */
export function GameRoomKeyframes() {
  return (
    <style>{`
      @keyframes svrSheetFade { from { opacity: 0 } to { opacity: 1 } }
      @keyframes svrSheetUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      @keyframes svrReactPop {
        0% { transform: translate(-50%, 8px) scale(.6); opacity: 0 }
        5% { transform: translate(-50%, -3px) scale(1.08); opacity: 1 }
        10% { transform: translate(-50%, 0) scale(1); opacity: 1 }
        92% { transform: translate(-50%, 0) scale(1); opacity: 1 }
        100% { transform: translate(-50%, -6px) scale(.96); opacity: 0 }
      }
      ${DEAL_KEYFRAMES}
      @keyframes svrDeckFade {
        from { opacity: 1; transform: translate3d(-50%, -50%, 0) scale(1) }
        to   { opacity: 0; transform: translate3d(-50%, -50%, 0) scale(.5) }
      }
      @keyframes svrSeatArrowPulse {
        0%, 100% { transform: translateY(-2px) scale(1); opacity: .55 }
        50%      { transform: translateY(3px)  scale(1.12); opacity: 1 }
      }
      @keyframes svrSeatInviteBounce {
        0%, 100% { transform: translateX(-50%) translateY(0);     animation-timing-function: cubic-bezier(.5,0,.4,1); }
        45%      { transform: translateX(-50%) translateY(-10px); animation-timing-function: cubic-bezier(.6,0,.5,1); }
        60%      { transform: translateX(-50%) translateY(-9px); }
        80%      { transform: translateX(-50%) translateY(0); }
        88%      { transform: translateX(-50%) translateY(-3px); }
        96%      { transform: translateX(-50%) translateY(0); }
      }
      @keyframes svrSeatInviteGlow {
        0%, 100% { opacity: .55; transform: translateX(-50%) scale(.9); }
        50%      { opacity: .95; transform: translateX(-50%) scale(1.05); }
      }
      @keyframes svrSeatWaitPulse {
        0%, 100% { opacity: .48 }
        50% { opacity: 1 }
      }
      @keyframes svrHandEnter {
        from { opacity: 0; transform: translate3d(-50%, 14px, 0) scale(.86) }
        to   { opacity: 1; transform: translate3d(-50%, 0, 0) scale(1) }
      }
      /* Same fade-in as svrHandEnter but without the translate3d(-50%) — used
         by the inner wrapper inside MyHand so the outer wrapper is free to
         carry its own position/scale transform without being clobbered. */
      @keyframes svrHandEnterInner {
        from { opacity: 0; transform: translate3d(0, 14px, 0) scale(.86) }
        to   { opacity: 1; transform: translate3d(0, 0, 0) scale(1) }
      }
      @keyframes svrCardFlip {
        from { transform: translateZ(0) rotateY(0deg) }
        to   { transform: translateZ(0) rotateY(180deg) }
      }
    `}</style>
  );
}
