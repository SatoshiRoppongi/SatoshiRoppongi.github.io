const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const scrollLayout = window.matchMedia('(min-width: 901px) and (min-height: 680px) and (prefers-reduced-motion: no-preference)');
const approach = document.querySelector('.approach');
const cards = [...document.querySelectorAll('.approach-card')];
const indicators = [...document.querySelectorAll('.step-indicator span')];
const progress = document.querySelector('.approach-progress > span');
const heroVideo = document.querySelector('.hero-media');
const revealElements = document.querySelectorAll('.reveal');
const atmosphereCanvas = document.querySelector('#atmosphere-canvas');
const atmosphereContext = atmosphereCanvas.getContext('2d', { alpha: false });
const scrollProgress = document.querySelector('#scroll-progress');
const scrollChapter = document.querySelector('#scroll-chapter');
const atmosphereGrid = document.querySelector('.atmosphere-grid');
const atmosphereSections = [
  document.querySelector('.hero'),
  document.querySelector('.expertise'),
  document.querySelector('.approach'),
  document.querySelector('.career'),
  document.querySelector('.stack-section'),
  document.querySelector('.contact'),
];
const atmospherePalettes = [
  { base: [248, 249, 246], light: [209, 255, 95], ink: [67, 82, 54] },
  { base: [247, 249, 243], light: [180, 231, 86], ink: [70, 87, 57] },
  { base: [19, 23, 18], light: [209, 255, 95], ink: [194, 212, 174] },
  { base: [246, 248, 242], light: [205, 249, 108], ink: [82, 97, 70] },
  { base: [233, 239, 226], light: [182, 231, 82], ink: [74, 93, 59] },
  { base: [209, 255, 95], light: [250, 255, 232], ink: [58, 75, 39] },
];
const pointer = { x: .72, y: .28, targetX: .72, targetY: .28 };
let atmosphereWidth = 0;
let atmosphereHeight = 0;
let observer;
let scheduled = false;
let atmosphereAnimating = false;
let lastScrollY = window.scrollY;
let scrollVelocity = 0;

function clamp(value, min = 0, max = 1) { return Math.min(max, Math.max(min, value)); }
function smoothstep(value) { const t = clamp(value); return t * t * (3 - 2 * t); }
function mix(a, b, amount) { return a + (b - a) * amount; }
function mixColor(a, b, amount) { return a.map((value, index) => Math.round(mix(value, b[index], amount))); }
function colorString(color, alpha = 1) { return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`; }

function resizeAtmosphere() {
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  atmosphereWidth = window.innerWidth;
  atmosphereHeight = window.innerHeight;
  atmosphereCanvas.width = Math.round(atmosphereWidth * ratio);
  atmosphereCanvas.height = Math.round(atmosphereHeight * ratio);
  atmosphereCanvas.style.width = `${atmosphereWidth}px`;
  atmosphereCanvas.style.height = `${atmosphereHeight}px`;
  atmosphereContext.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function atmosphereState() {
  const documentRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const pageProgress = clamp(window.scrollY / documentRange);
  const focus = window.scrollY + window.innerHeight * .46;
  const anchors = atmosphereSections.map(section => section.offsetTop);
  let index = 0;
  while (index < anchors.length - 1 && focus >= anchors[index + 1]) index += 1;
  const next = Math.min(index + 1, anchors.length - 1);
  const span = Math.max(1, anchors[next] - anchors[index]);
  const local = next === index ? 0 : smoothstep((focus - anchors[index]) / span);
  return {
    index,
    local,
    pageProgress,
    base: mixColor(atmospherePalettes[index].base, atmospherePalettes[next].base, local),
    light: mixColor(atmospherePalettes[index].light, atmospherePalettes[next].light, local),
    ink: mixColor(atmospherePalettes[index].ink, atmospherePalettes[next].ink, local),
  };
}

function drawAtmosphere() {
  if (!atmosphereWidth || !atmosphereHeight) resizeAtmosphere();
  const state = atmosphereState();
  const { pageProgress, base, light, ink, local } = state;
  const velocity = clamp(scrollVelocity / 90);
  const transition = Math.sin(local * Math.PI) ** 8;
  pointer.x = mix(pointer.x, pointer.targetX, .12);
  pointer.y = mix(pointer.y, pointer.targetY, .12);
  atmosphereContext.fillStyle = colorString(base);
  atmosphereContext.fillRect(0, 0, atmosphereWidth, atmosphereHeight);

  const glowX = mix(atmosphereWidth * .2, atmosphereWidth * .82, pageProgress) + (pointer.x - .5) * 90;
  const glowY = atmosphereHeight * mix(.22, .7, Math.sin(pageProgress * Math.PI) ** 2) + (pointer.y - .5) * 60;
  const glowRadius = Math.max(atmosphereWidth, atmosphereHeight) * .72;
  const glow = atmosphereContext.createRadialGradient(glowX, glowY, 0, glowX, glowY, glowRadius);
  glow.addColorStop(0, colorString(light, state.index === 2 ? .2 : .34));
  glow.addColorStop(.42, colorString(light, .09));
  glow.addColorStop(1, colorString(light, 0));
  atmosphereContext.fillStyle = glow;
  atmosphereContext.fillRect(0, 0, atmosphereWidth, atmosphereHeight);

  const counterGlow = atmosphereContext.createRadialGradient(
    atmosphereWidth - glowX * .38,
    atmosphereHeight - glowY * .3,
    0,
    atmosphereWidth - glowX * .38,
    atmosphereHeight - glowY * .3,
    glowRadius * .72,
  );
  counterGlow.addColorStop(0, colorString(ink, state.index === 2 ? .18 : .11 + velocity * .08));
  counterGlow.addColorStop(1, colorString(ink, 0));
  atmosphereContext.fillStyle = counterGlow;
  atmosphereContext.fillRect(0, 0, atmosphereWidth, atmosphereHeight);

  const sweep = atmosphereContext.createLinearGradient(0, 0, atmosphereWidth, atmosphereHeight);
  sweep.addColorStop(0, colorString(ink, 0));
  sweep.addColorStop(.5, colorString(ink, state.index === 2 ? .11 : .035));
  sweep.addColorStop(1, colorString(ink, 0));
  atmosphereContext.fillStyle = sweep;
  atmosphereContext.fillRect(0, 0, atmosphereWidth, atmosphereHeight);

  // A large chapter marker makes every section feel like a new visual scene.
  atmosphereContext.save();
  atmosphereContext.translate(atmosphereWidth * (.67 - local * .08), atmosphereHeight * .82);
  atmosphereContext.rotate(-.07 + pageProgress * .09);
  atmosphereContext.font = `700 ${Math.min(atmosphereWidth * .42, atmosphereHeight * .66)}px Arial, sans-serif`;
  atmosphereContext.textAlign = 'center';
  atmosphereContext.textBaseline = 'middle';
  atmosphereContext.fillStyle = colorString(state.index === 2 ? light : ink, state.index === 2 ? .055 : .035);
  atmosphereContext.fillText(String(state.index + 1).padStart(2, '0'), 0, 0);
  atmosphereContext.restore();

  // Luminous ribbons bend with the pointer and widen as scrolling accelerates.
  atmosphereContext.save();
  atmosphereContext.globalCompositeOperation = state.index === 2 ? 'screen' : 'source-over';
  atmosphereContext.lineCap = 'round';
  atmosphereContext.shadowColor = colorString(light, .45);
  atmosphereContext.shadowBlur = 18 + velocity * 44;
  for (let ribbon = 0; ribbon < (atmosphereWidth < 700 ? 2 : 3); ribbon += 1) {
    const phase = pageProgress * Math.PI * 6 + ribbon * 1.9;
    const startY = atmosphereHeight * (.17 + ribbon * .29) + Math.sin(phase) * atmosphereHeight * .08;
    atmosphereContext.beginPath();
    atmosphereContext.moveTo(-atmosphereWidth * .1, startY);
    atmosphereContext.bezierCurveTo(
      atmosphereWidth * (.2 + pointer.x * .13),
      startY + Math.cos(phase) * atmosphereHeight * .36,
      atmosphereWidth * (.68 - pointer.y * .12),
      startY - Math.sin(phase * .8) * atmosphereHeight * .42,
      atmosphereWidth * 1.1,
      startY + Math.cos(phase * .55) * atmosphereHeight * .18,
    );
    atmosphereContext.strokeStyle = colorString(ribbon === 1 ? ink : light, .11 + velocity * .18 + transition * .13);
    atmosphereContext.lineWidth = 1.5 + ribbon * 1.15 + velocity * 5;
    atmosphereContext.stroke();
  }
  atmosphereContext.restore();

  atmosphereContext.save();
  atmosphereContext.translate(atmosphereWidth * (.72 - pageProgress * .42), atmosphereHeight * .52);
  atmosphereContext.rotate(pageProgress * Math.PI * 1.6);
  atmosphereContext.lineCap = 'round';
  const radiusBase = Math.min(atmosphereWidth, atmosphereHeight) * (.23 + velocity * .045);
  for (let index = 0; index < 6; index += 1) {
    const radius = radiusBase * (1 + index * .62);
    atmosphereContext.beginPath();
    atmosphereContext.ellipse(0, 0, radius * 1.72, radius * (.52 + index * .05), index * .42, -.85, 3.95);
    atmosphereContext.strokeStyle = colorString(index % 2 ? light : ink, (state.index === 2 ? .19 : .1) + velocity * .12);
    atmosphereContext.lineWidth = index === 0 ? 2.5 + velocity * 3 : 1 + velocity;
    atmosphereContext.stroke();
  }
  atmosphereContext.restore();

  for (let index = 0; index < (atmosphereWidth < 700 ? 9 : 16); index += 1) {
    const angle = pageProgress * Math.PI * 5 + index * 1.71;
    const x = atmosphereWidth * .5 + Math.cos(angle) * atmosphereWidth * (.18 + (index % 3) * .12);
    const y = atmosphereHeight * .5 + Math.sin(angle * .73) * atmosphereHeight * .34;
    const streak = velocity * (22 + index % 4 * 9);
    atmosphereContext.beginPath();
    atmosphereContext.moveTo(x - streak, y + streak * .2);
    atmosphereContext.lineTo(x, y);
    atmosphereContext.strokeStyle = colorString(index % 2 ? light : ink, .3 + velocity * .42);
    atmosphereContext.lineWidth = index % 3 === 0 ? 3 : 1.5;
    atmosphereContext.stroke();
  }

  if (transition > .02) {
    const flash = atmosphereContext.createLinearGradient(0, atmosphereHeight, atmosphereWidth, 0);
    flash.addColorStop(0, colorString(light, 0));
    flash.addColorStop(.52, colorString(light, transition * .25));
    flash.addColorStop(1, colorString(light, 0));
    atmosphereContext.fillStyle = flash;
    atmosphereContext.fillRect(0, 0, atmosphereWidth, atmosphereHeight);
  }

  scrollProgress.style.transform = `scaleY(${pageProgress})`;
  scrollChapter.textContent = String(state.index).padStart(2, '0');
  atmosphereGrid.style.transform = `translate3d(${(pointer.x - .5) * 18}px, ${pageProgress * -72}px, 0) rotate(${pageProgress * 1.5}deg) scale(1.08)`;
}

function animateAtmosphere() {
  drawAtmosphere();
  scrollVelocity *= .87;
  if (scrollVelocity > .2) requestAnimationFrame(animateAtmosphere);
  else atmosphereAnimating = false;
}
function configureMotion() {
  document.documentElement.classList.toggle('motion', !reducedMotion.matches);
  if (reducedMotion.matches) {
    heroVideo.pause();
    heroVideo.currentTime = 2.5;
  } else {
    heroVideo.play().catch(() => {});
  }
  observer?.disconnect();
  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08 });
    revealElements.forEach(element => observer.observe(element));
  } else {
    revealElements.forEach(element => element.classList.add('visible'));
  }
  updateScroll();
}
function updateScroll() {
  scheduled = false;
  const nextScrollY = window.scrollY;
  scrollVelocity = Math.max(scrollVelocity, Math.abs(nextScrollY - lastScrollY));
  lastScrollY = nextScrollY;
  if (scrollLayout.matches) {
    const headerHeight = document.querySelector('.header').offsetHeight;
    const distance = approach.offsetHeight - (window.innerHeight - headerHeight);
    const value = Math.max(0, Math.min(1, (headerHeight - approach.getBoundingClientRect().top) / distance));
    const current = Math.min(2, Math.floor(value * 3));
    cards.forEach((card, index) => card.classList.toggle('active', index === current));
    indicators.forEach((indicator, index) => indicator.classList.toggle('active', index === current));
    progress.style.transform = `scaleX(${value})`;
  } else {
    cards.forEach(card => card.classList.add('active'));
  }
  if (!reducedMotion.matches && window.scrollY < window.innerHeight * 1.5) {
    const shift = Math.min(window.scrollY / 18, 28);
    heroVideo.style.transform = `scale(1.035) translateY(${shift}px)`;
  } else if (reducedMotion.matches) heroVideo.style.transform = '';
  drawAtmosphere();
  if (!reducedMotion.matches && scrollVelocity > .2 && !atmosphereAnimating) {
    atmosphereAnimating = true;
    requestAnimationFrame(animateAtmosphere);
  }
}
function requestScrollUpdate() {
  if (!scheduled) { scheduled = true; requestAnimationFrame(updateScroll); }
}
window.addEventListener('scroll', requestScrollUpdate, { passive: true });
window.addEventListener('resize', () => { resizeAtmosphere(); requestScrollUpdate(); }, { passive: true });
window.addEventListener('pointermove', event => {
  if (reducedMotion.matches || event.pointerType === 'touch') return;
  pointer.targetX = event.clientX / Math.max(1, window.innerWidth);
  pointer.targetY = event.clientY / Math.max(1, window.innerHeight);
  requestScrollUpdate();
}, { passive: true });
reducedMotion.addEventListener('change', configureMotion);
scrollLayout.addEventListener('change', requestScrollUpdate);
resizeAtmosphere();
configureMotion();
document.querySelector('#year').textContent = new Date().getFullYear();
document.querySelector('#copy-email').addEventListener('click', async () => {
  const status = document.querySelector('#copy-status');
  try {
    await navigator.clipboard.writeText('satoshiroppongi@gmail.com');
    status.textContent = 'メールアドレスをコピーしました。';
  } catch {
    status.textContent = 'コピーできませんでした。メールアドレスを選択してコピーしてください。';
  }
});

// Native disclosures stay usable without JavaScript; enhance them to a focused dialog.
const detailDialog = document.querySelector('#detail-dialog');
const detailBody = detailDialog.querySelector('.dialog-body');
let detailTrigger;
let previousBodyOverflow;
if (typeof detailDialog.showModal === 'function') {
  function closeDetails() {
    detailDialog.close();
    document.body.style.overflow = previousBodyOverflow ?? '';
    detailTrigger?.focus({ preventScroll: true });
  }
  detailDialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeDetails();
  });
  document.querySelectorAll('.detail-disclosure > summary').forEach(summary => {
    summary.setAttribute('aria-haspopup', 'dialog');
    summary.setAttribute('aria-controls', 'detail-dialog');
    summary.addEventListener('click', event => {
      event.preventDefault();
      const content = summary.nextElementSibling.cloneNode(true);
      content.querySelector('h2').id = 'detail-title';
      detailBody.replaceChildren(content);
      detailTrigger = summary;
      previousBodyOverflow = document.body.style.overflow;
      detailDialog.showModal();
      document.body.style.overflow = 'hidden';
      detailDialog.scrollTop = 0;
    });
  });
  detailDialog.querySelector('.dialog-close').addEventListener('click', closeDetails);
  detailDialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...detailDialog.querySelectorAll('button, a[href]')];
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  let backdropPress = false;
  const outsideDialog = event => {
    const rect = detailDialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  detailDialog.addEventListener('pointerdown', event => { backdropPress = event.target === detailDialog && outsideDialog(event); });
  detailDialog.addEventListener('click', event => {
    if (backdropPress && event.target === detailDialog && outsideDialog(event)) closeDetails();
    backdropPress = false;
  });
  detailDialog.querySelector('.dialog-footer a').addEventListener('click', event => {
    event.preventDefault();
    closeDetails();
    // Wait for native focus restoration before moving to the contact action.
    requestAnimationFrame(() => {
      document.querySelector('#contact').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
      document.querySelector('.email-button').focus({ preventScroll: true });
      history.replaceState(null, '', '#contact');
    });
  });
}
