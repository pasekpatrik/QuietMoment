const steps = [
  {
    kicker: 'ROZHLÉDNI SE',
    title: 'Najdi 5 věcí, které vidíš.',
    prompt: 'Všímej si barev, tvarů nebo světla. Není kam spěchat.',
    hint: 'Nemusíš nic pojmenovávat nahlas.',
    number: '5',
  },
  {
    kicker: 'ZAPOJ DOTYK',
    title: 'Najdi 4 věci, kterých se můžeš dotknout.',
    prompt: 'Vnímej jejich povrch, teplotu nebo to, jak působí pod prsty.',
    hint: 'Může to být i oblečení nebo podlaha pod nohama.',
    number: '4',
  },
  {
    kicker: 'ZAPOSLOUCHEJ SE',
    title: 'Všimni si 3 zvuků, které slyšíš.',
    prompt: 'Zkus zachytit zvuky blízko i dál od sebe.',
    hint: 'Ticho se také počítá.',
    number: '3',
  },
  {
    kicker: 'VŠIMNI SI VŮNÍ',
    title: 'Najdi 2 věci, které můžeš cítit.',
    prompt: 'Zkus si všimnout vůní ve svém okolí.',
    hint: 'Pokud žádnou necítíš, klidně tento krok přeskoč.',
    number: '2',
  },
  {
    kicker: 'VNÍMEJ CHUŤ',
    title: 'Všimni si 1 chuti.',
    prompt: 'Vnímej chuť, kterou právě cítíš, nebo se napij vody.',
    hint: 'Pokud se ti to nehodí, můžeš krok přeskočit.',
    number: '1',
  },
];

const welcomeScreen = document.querySelector('#welcome-screen');
const exerciseScreen = document.querySelector('#exercise-screen');
const finishScreen = document.querySelector('#finish-screen');
const stepCount = document.querySelector('#step-count');
const progressFill = document.querySelector('#progress-fill');
const stepKicker = document.querySelector('#step-kicker');
const stepTitle = document.querySelector('#step-title');
const stepPrompt = document.querySelector('#step-prompt');
const stepHint = document.querySelector('#step-hint');
const orbitNumber = document.querySelector('#orbit-number');
const nextButton = document.querySelector('#next-button');
const backButton = document.querySelector('#back-button');
let currentStep = 0;

function showScreen(screen) {
  for (const candidate of [welcomeScreen, exerciseScreen, finishScreen]) {
    candidate.hidden = candidate !== screen;
  }
}

function renderStep() {
  const step = steps[currentStep];
  stepCount.textContent = `KROK ${currentStep + 1} Z ${steps.length}`;
  progressFill.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
  stepKicker.textContent = step.kicker;
  stepTitle.textContent = step.title;
  stepPrompt.textContent = step.prompt;
  stepHint.textContent = step.hint;
  orbitNumber.textContent = step.number;
  backButton.disabled = currentStep === 0;
  backButton.setAttribute('aria-disabled', String(currentStep === 0));
  backButton.style.opacity = currentStep === 0 ? '.4' : '1';
  nextButton.innerHTML = currentStep === steps.length - 1
    ? 'Dokončit <span aria-hidden="true">✓</span>'
    : 'Pokračovat <span aria-hidden="true">→</span>';
}

function startExercise() {
  currentStep = 0;
  renderStep();
  showScreen(exerciseScreen);
  stepTitle.focus({ preventScroll: true });
}

function advance() {
  if (currentStep === steps.length - 1) {
    showScreen(finishScreen);
    document.querySelector('#finish-title').focus({ preventScroll: true });
    return;
  }
  currentStep += 1;
  renderStep();
}

document.querySelector('#start-button').addEventListener('click', startExercise);
nextButton.addEventListener('click', advance);
document.querySelector('#skip-button').addEventListener('click', advance);
backButton.addEventListener('click', () => {
  if (currentStep > 0) {
    currentStep -= 1;
    renderStep();
  }
});
document.querySelector('#exit-button').addEventListener('click', () => showScreen(welcomeScreen));
document.querySelector('#repeat-button').addEventListener('click', startExercise);
document.querySelector('#home-button').addEventListener('click', () => showScreen(welcomeScreen));

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}

if (!navigator.onLine) document.querySelector('#offline-note').hidden = false;
window.addEventListener('offline', () => { document.querySelector('#offline-note').hidden = false; });
window.addEventListener('online', () => { document.querySelector('#offline-note').hidden = true; });
