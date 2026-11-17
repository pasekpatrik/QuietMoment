import * as THREE from './vendor/three.module.min.js';
import { BALLOON_COUNT, createBalloonGame, getRemainingBalloons, popBalloon } from './balloon-game.mjs';

const steps = [
  { kicker: 'ROZHLÉDNI SE', title: 'Najdi 5 věcí, které vidíš.', prompt: 'Všímej si barev, tvarů nebo světla. Není kam spěchat.', hint: 'Nemusíš nic pojmenovávat nahlas.', number: '5' },
  { kicker: 'ZAPOJ DOTYK', title: 'Najdi 4 věci, kterých se můžeš dotknout.', prompt: 'Vnímej jejich povrch, teplotu nebo to, jak působí pod prsty.', hint: 'Může to být i oblečení nebo podlaha pod nohama.', number: '4' },
  { kicker: 'ZAPOSLOUCHEJ SE', title: 'Všimni si 3 zvuků, které slyšíš.', prompt: 'Zkus zachytit zvuky blízko i dál od sebe.', hint: 'Ticho se také počítá.', number: '3' },
  { kicker: 'VŠIMNI SI VŮNÍ', title: 'Najdi 2 věci, které můžeš cítit.', prompt: 'Zkus si všimnout vůní ve svém okolí.', hint: 'Pokud žádnou necítíš, klidně tento krok přeskoč.', number: '2' },
  { kicker: 'VNÍMEJ CHUŤ', title: 'Všimni si 1 chuti.', prompt: 'Vnímej chuť, kterou právě cítíš, nebo se napij vody.', hint: 'Pokud se ti to nehodí, můžeš krok přeskočit.', number: '1' },
];

const $ = (selector) => document.querySelector(selector);
const welcomeScreen = $('#welcome-screen');
const exerciseScreen = $('#exercise-screen');
const boxScreen = $('#box-screen');
const balloonScreen = $('#balloon-screen');
const finishScreen = $('#finish-screen');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const phaseDuration = 4_000;
const totalRounds = 4;
const totalDuration = phaseDuration * 4 * totalRounds;
const phases = [
  { kicker: 'NÁDECH', title: 'Nadechuj se.', prompt: 'Nech kouli pomalu růst.', direction: 'in' },
  { kicker: 'ZADRŽ DECH', title: 'Zůstaň chvíli.', prompt: 'Jen klidně setrvej.', direction: 'hold-large' },
  { kicker: 'VÝDECH', title: 'Pomalu vydechuj.', prompt: 'Nech kouli zase zmenšit.', direction: 'out' },
  { kicker: 'ZADRŽ DECH', title: 'Zůstaň chvíli.', prompt: 'Dovol tělu spočinout.', direction: 'hold-small' },
];

let currentStep = 0;
let lastExercise = 'grounding';
let boxRunning = false;
let boxStartedAt = 0;
let boxElapsed = 0;
let animationFrame = 0;
let previousPhase = -1;
let renderer;
let scene;
let camera;
let sphere;
let balloonRenderer;
let balloonScene;
let balloonCamera;
let balloonMeshes = [];
let balloonRunning = false;
let balloonFrame = 0;
let balloonGame = createBalloonGame();
let balloonRound = 0;
let balloonCompletionTimer = 0;

function showScreen(screen) {
  stopBox();
  stopBalloonAnimation();
  for (const candidate of [welcomeScreen, exerciseScreen, boxScreen, finishScreen]) candidate.hidden = candidate !== screen;
  balloonScreen.hidden = balloonScreen !== screen;
}

function renderStep() {
  const step = steps[currentStep];
  $('#step-count').textContent = `KROK ${currentStep + 1} Z ${steps.length}`;
  $('#progress-fill').style.width = `${((currentStep + 1) / steps.length) * 100}%`;
  $('#step-kicker').textContent = step.kicker;
  $('#step-title').textContent = step.title;
  $('#step-prompt').textContent = step.prompt;
  $('#step-hint').textContent = step.hint;
  $('#orbit-number').textContent = step.number;
  const backButton = $('#back-button');
  backButton.disabled = currentStep === 0;
  backButton.setAttribute('aria-disabled', String(currentStep === 0));
  backButton.style.opacity = currentStep === 0 ? '.4' : '1';
  $('#next-button').innerHTML = currentStep === steps.length - 1 ? 'Dokončit <span aria-hidden="true">✓</span>' : 'Pokračovat <span aria-hidden="true">→</span>';
}

function startExercise() {
  lastExercise = 'grounding';
  currentStep = 0;
  renderStep();
  showScreen(exerciseScreen);
  $('#step-title').focus({ preventScroll: true });
}

function showFinish(exercise) {
  lastExercise = exercise;
  showScreen(finishScreen);
  $('#finish-title').focus({ preventScroll: true });
}

function advance() {
  if (currentStep === steps.length - 1) return showFinish('grounding');
  currentStep += 1;
  renderStep();
}

function initScene() {
  if (renderer || reducedMotion) return;
  const visual = $('.box-visual');
  const canvas = $('#breathing-canvas');
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.z = 5;
    sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 48, 48),
      new THREE.MeshPhysicalMaterial({ color: 0x87ad95, roughness: .28, transmission: .13, thickness: 1.1, transparent: true, opacity: .94 }),
    );
    scene.add(sphere, new THREE.HemisphereLight(0xf8f6ec, 0x426d5b, 2.8));
    const light = new THREE.DirectionalLight(0xffe4b8, 2.5);
    light.position.set(-3, 4, 5);
    scene.add(light);
    visual.classList.add('has-webgl');
    resizeScene();
    window.addEventListener('resize', resizeScene);
  } catch {
    renderer?.dispose();
    renderer = undefined;
  }
}

function resizeScene() {
  if (!renderer) return;
  const { width, height } = renderer.domElement.parentElement.getBoundingClientRect();
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function updateSphere(direction, fraction = 0) {
  if (!sphere) return;
  const ease = (1 - Math.cos(Math.PI * fraction)) / 2;
  let scale = .5;
  if (direction === 'in') scale = .5 + (.72 * ease);
  if (direction === 'hold-large') scale = 1.22;
  if (direction === 'out') scale = 1.22 - (.72 * ease);
  sphere.scale.setScalar(scale);
  sphere.rotation.y += .003;
  renderer.render(scene, camera);
}

function renderBox(elapsed) {
  const safeElapsed = Number.isFinite(elapsed)
    ? Math.min(Math.max(elapsed, 0), totalDuration)
    : 0;
  const cycleDuration = phaseDuration * phases.length;
  const cycleElapsed = safeElapsed === totalDuration
    ? cycleDuration - 1
    : safeElapsed % cycleDuration;
  const phaseIndex = Math.floor(cycleElapsed / phaseDuration);
  const phaseElapsed = cycleElapsed % phaseDuration;
  const phase = phases[phaseIndex] ?? phases[0];
  const round = Math.min(Math.floor(safeElapsed / (phaseDuration * 4)) + 1, totalRounds);
  const seconds = Math.max(1, 4 - Math.floor(phaseElapsed / 1000));
  $('#box-progress').style.width = `${(safeElapsed / totalDuration) * 100}%`;
  $('#box-count').textContent = `KOLO ${round} Z ${totalRounds}`;
  $('#box-seconds').textContent = seconds;
  if (phaseIndex !== previousPhase) {
    $('#box-kicker').textContent = phase.kicker;
    $('#box-title').textContent = phase.title;
    $('#box-prompt').textContent = phase.prompt;
    previousPhase = phaseIndex;
  }
  updateSphere(phase.direction, phaseElapsed / phaseDuration);
}

function tick(now) {
  if (!boxRunning) return;
  boxElapsed = now - boxStartedAt;
  if (boxElapsed >= totalDuration) {
    boxElapsed = totalDuration;
    renderBox(boxElapsed);
    stopBox();
    showFinish('box');
    return;
  }
  renderBox(boxElapsed);
  animationFrame = requestAnimationFrame(tick);
}

function stopBox() {
  boxRunning = false;
  cancelAnimationFrame(animationFrame);
}

function resetBox() {
  stopBox();
  boxElapsed = 0;
  previousPhase = -1;
  $('#box-progress').style.width = '0%';
  $('#box-count').textContent = '4 KOLA · 1 MINUTA';
  $('#box-kicker').textContent = 'BOX BREATHING';
  $('#box-title').textContent = 'Najdi si pohodlnou polohu.';
  $('#box-prompt').textContent = 'Čtyři klidné fáze, čtyři sekundy každá.';
  $('#box-countdown').hidden = true;
  $('#box-toggle-button').innerHTML = 'Spustit cvičení <span aria-hidden="true">→</span>';
  updateSphere('hold-small');
}

function startBox() {
  lastExercise = 'box';
  showScreen(boxScreen);
  initScene();
  resetBox();
  $('#box-title').focus({ preventScroll: true });
}

function toggleBox() {
  if (boxRunning) {
    stopBox();
    $('#box-toggle-button').textContent = 'Pokračovat';
    return;
  }
  boxRunning = true;
  boxStartedAt = performance.now() - boxElapsed;
  $('#box-countdown').hidden = false;
  $('#box-toggle-button').textContent = 'Pozastavit';
  animationFrame = requestAnimationFrame(tick);
}

function resizeBalloonScene() {
  if (!balloonRenderer) return;
  const { width, height } = $('#balloon-canvas').parentElement.getBoundingClientRect();
  const aspect = width / height;
  balloonRenderer.setSize(width, height, false);
  balloonCamera.left = -2.2 * aspect;
  balloonCamera.right = 2.2 * aspect;
  balloonCamera.top = 2.2;
  balloonCamera.bottom = -2.2;
  balloonCamera.updateProjectionMatrix();
  for (const balloon of balloonMeshes) {
    balloon.position.x = (balloon.userData.x / 100 - .5) * 4.4 * aspect;
  }
  balloonRenderer.render(balloonScene, balloonCamera);
}

function initBalloonScene() {
  if (balloonRenderer) return;
  const field = $('#balloon-field');
  const canvas = $('#balloon-canvas');
  const positions = [
    [14, 20], [36, 50], [59, 24], [82, 48],
    [22, 66], [47, 68], [72, 15], [87, 72],
  ];
  const colors = [0xb7d1b5, 0xdfc7a2, 0xc3d1db, 0xd7c6d9, 0xe4c4b8, 0xc5d5b9, 0xead9a9, 0xb8d2ce];
  const { width, height } = field.getBoundingClientRect();
  const aspect = width / height;
  try {
    balloonRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    balloonRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    balloonScene = new THREE.Scene();
    balloonCamera = new THREE.OrthographicCamera(-2.2, 2.2, 2.2, -2.2, 0.1, 100);
    balloonCamera.position.z = 8;
    balloonScene.add(new THREE.HemisphereLight(0xf8f6ec, 0x426d5b, 2.4));
    const light = new THREE.DirectionalLight(0xfff0d7, 2.2);
    light.position.set(-3, 4, 5);
    balloonScene.add(light);
    balloonMeshes = positions.map(([x, y], index) => {
      const group = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(.55, 32, 24),
        new THREE.MeshPhysicalMaterial({ color: colors[index], roughness: .28, metalness: 0, clearcoat: .45, transparent: true, opacity: .96 }),
      );
      body.scale.set(.76, 1, .58);
      group.add(body);
      const knot = new THREE.Mesh(
        new THREE.ConeGeometry(.09, .16, 12),
        new THREE.MeshStandardMaterial({ color: colors[index], roughness: .4 }),
      );
      knot.position.y = -.58;
      knot.rotation.z = Math.PI;
      group.add(knot);
      const string = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -.64, 0), new THREE.Vector3(0, -1.2, 0)]),
        new THREE.LineBasicMaterial({ color: 0x708e7d, transparent: true, opacity: .65 }),
      );
      group.add(string);
      group.position.set((x / 100 - .5) * 4.4 * aspect, (.5 - y / 100) * 4.4, 0);
      group.userData.baseY = group.position.y;
      group.userData.phase = index * .83;
      group.userData.x = x;
      balloonScene.add(group);
      return group;
    });
    field.classList.remove('no-webgl');
    field.classList.add('has-webgl');
    resizeBalloonScene();
    window.addEventListener('resize', resizeBalloonScene);
  } catch {
    balloonRenderer?.dispose();
    balloonRenderer = undefined;
    field.classList.remove('has-webgl');
    field.classList.add('no-webgl');
  }
}

function renderBalloons(now) {
  if (!balloonRunning || !balloonRenderer) return;
  if (!reducedMotion) {
    for (const balloon of balloonMeshes) {
      const phase = now / 1800 + balloon.userData.phase;
      balloon.position.y = balloon.userData.baseY + Math.sin(phase) * .08;
      balloon.rotation.z = Math.sin(phase * .7) * .035;
    }
  }
  balloonRenderer.render(balloonScene, balloonCamera);
  if (!reducedMotion) balloonFrame = requestAnimationFrame(renderBalloons);
}

function startBalloonAnimation() {
  if (!balloonRenderer || balloonRunning) return;
  balloonRunning = true;
  if (reducedMotion) renderBalloons(0);
  else balloonFrame = requestAnimationFrame(renderBalloons);
}

function stopBalloonAnimation() {
  balloonRunning = false;
  cancelAnimationFrame(balloonFrame);
}

function balloonNoun(count) {
  return count === 1 ? 'balónek' : count >= 2 && count <= 4 ? 'balónky' : 'balónků';
}

function resetBalloonGame() {
  clearTimeout(balloonCompletionTimer);
  balloonRound += 1;
  balloonGame = createBalloonGame();
  $('#balloon-field').hidden = false;
  $('#balloon-kicker').hidden = false;
  $('#balloon-title').hidden = false;
  $('#balloon-prompt').hidden = false;
  $('#balloon-status').hidden = false;
  $('#balloon-complete').hidden = true;
  $('#balloon-count').textContent = `${BALLOON_COUNT} BALÓNKŮ`;
  $('#balloon-status').textContent = `Zbývá ${BALLOON_COUNT} balónků.`;
  for (const button of $('#balloon-targets').querySelectorAll('.balloon-target')) {
    const index = Number(button.dataset.balloonIndex);
    button.disabled = false;
    button.hidden = false;
    button.classList.remove('is-popping', 'is-popped');
    button.setAttribute('aria-label', `Balónek ${index + 1}, prasknout`);
    if (balloonMeshes[index]) balloonMeshes[index].visible = true;
  }
}

function popBalloonAt(index, button) {
  const nextGame = popBalloon(balloonGame, index);
  if (nextGame === balloonGame) return;
  balloonGame = nextGame;
  const round = balloonRound;
  button.disabled = true;
  button.classList.add('is-popping');
  button.setAttribute('aria-label', `Balónek ${index + 1}, praskl`);
  if (balloonMeshes[index]) balloonMeshes[index].visible = false;
  setTimeout(() => {
    if (round !== balloonRound) return;
    button.classList.remove('is-popping');
    button.classList.add('is-popped');
  }, 340);
  const remaining = getRemainingBalloons(balloonGame);
  $('#balloon-count').textContent = remaining ? `${remaining} ${balloonNoun(remaining).toLocaleUpperCase('cs')}` : 'HOTOVO';
  $('#balloon-status').textContent = remaining ? `Zbývá ${remaining} ${balloonNoun(remaining)}.` : 'Všechny balónky praskly.';
  if (remaining === 0) {
    balloonCompletionTimer = setTimeout(() => {
      if (balloonScreen.hidden || getRemainingBalloons(balloonGame) !== 0) return;
      stopBalloonAnimation();
      $('#balloon-field').hidden = true;
      $('#balloon-kicker').hidden = true;
      $('#balloon-title').hidden = true;
      $('#balloon-prompt').hidden = true;
      $('#balloon-status').hidden = true;
      $('#balloon-complete').hidden = false;
      $('#balloon-repeat-button').focus({ preventScroll: true });
    }, 380);
  }
}

function startBalloonGame() {
  showScreen(balloonScreen);
  initBalloonScene();
  resetBalloonGame();
  startBalloonAnimation();
  $('#balloon-title').focus({ preventScroll: true });
}

function exitBalloonGame() {
  showScreen(welcomeScreen);
  $('#welcome-title').focus({ preventScroll: true });
}

$('#start-button').addEventListener('click', startExercise);
$('#start-box-button').addEventListener('click', startBox);
$('#start-balloon-button').addEventListener('click', startBalloonGame);
$('#next-button').addEventListener('click', advance);
$('#skip-button').addEventListener('click', advance);
$('#back-button').addEventListener('click', () => { if (currentStep > 0) { currentStep -= 1; renderStep(); } });
$('#exit-button').addEventListener('click', () => showScreen(welcomeScreen));
$('#box-exit-button').addEventListener('click', () => showScreen(welcomeScreen));
$('#box-back-button').addEventListener('click', () => showScreen(welcomeScreen));
$('#box-toggle-button').addEventListener('click', toggleBox);
$('#balloon-exit-button').addEventListener('click', exitBalloonGame);
$('#balloon-repeat-button').addEventListener('click', startBalloonGame);
$('#balloon-home-button').addEventListener('click', exitBalloonGame);
for (const button of $('#balloon-targets').querySelectorAll('.balloon-target')) {
  button.addEventListener('click', () => popBalloonAt(Number(button.dataset.balloonIndex), button));
}
$('#repeat-button').addEventListener('click', () => lastExercise === 'box' ? startBox() : startExercise());
$('#home-button').addEventListener('click', () => showScreen(welcomeScreen));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && boxRunning) toggleBox();
  if (document.hidden && balloonRunning) stopBalloonAnimation();
  if (!document.hidden && !balloonScreen.hidden && $('#balloon-complete').hidden) startBalloonAnimation();
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  let reloadingForServiceWorker = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloadingForServiceWorker) {
      reloadingForServiceWorker = true;
      location.reload();
    }
  });
  window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch(() => {}));
}
if (!navigator.onLine) $('#offline-note').hidden = false;
window.addEventListener('offline', () => { $('#offline-note').hidden = false; });
window.addEventListener('online', () => { $('#offline-note').hidden = true; });
