import test from 'node:test';
import assert from 'node:assert/strict';
import { createBalloonGame, getRemainingBalloons, popBalloon } from '../balloon-game.mjs';

test('a new balloon game starts with eight balloons', () => {
  const game = createBalloonGame();

  assert.equal(getRemainingBalloons(game), 8);
});

test('popping balloons is idempotent and completes only after the last one', () => {
  let game = createBalloonGame();

  for (let index = 0; index < 7; index += 1) {
    game = popBalloon(game, index);
  }
  assert.equal(getRemainingBalloons(game), 1);

  game = popBalloon(game, 6);
  assert.equal(getRemainingBalloons(game), 1);

  game = popBalloon(game, 7);
  assert.equal(getRemainingBalloons(game), 0);
});
