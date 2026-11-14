import * as THREE from './vendor/three.module.min.js';

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

function showScreen(screen) {
  stopBox();
  for (const candidate of [welcomeScreen, exerciseScreen, boxScreen, finishScreen]) candidate.hidden = candidate !== screen;
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

$('#start-button').addEventListener('click', startExercise);
$('#start-box-button').addEventListener('click', startBox);
$('#next-button').addEventListener('click', advance);
$('#skip-button').addEventListener('click', advance);
$('#back-button').addEventListener('click', () => { if (currentStep > 0) { currentStep -= 1; renderStep(); } });
$('#exit-button').addEventListener('click', () => showScreen(welcomeScreen));
$('#box-exit-button').addEventListener('click', () => showScreen(welcomeScreen));
$('#box-back-button').addEventListener('click', () => showScreen(welcomeScreen));
$('#box-toggle-button').addEventListener('click', toggleBox);
$('#repeat-button').addEventListener('click', () => lastExercise === 'box' ? startBox() : startExercise());
$('#home-button').addEventListener('click', () => showScreen(welcomeScreen));
document.addEventListener('visibilitychange', () => { if (document.hidden && boxRunning) toggleBox(); });

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
