export const BALLOON_COUNT = 8;

export function createBalloonGame() {
  return Array.from({ length: BALLOON_COUNT }, () => false);
}

export function popBalloon(game, index) {
  if (!Number.isInteger(index) || index < 0 || index >= game.length || game[index]) return game;
  return game.map((popped, balloonIndex) => balloonIndex === index || popped);
}

export function getRemainingBalloons(game) {
  return game.filter((popped) => !popped).length;
}
