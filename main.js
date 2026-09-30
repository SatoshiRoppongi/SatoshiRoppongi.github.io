const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const scrollLayout = window.matchMedia('(min-width: 901px) and (min-height: 680px) and (prefers-reduced-motion: no-preference)');
const approach = document.querySelector('.approach');
const cards = [...document.querySelectorAll('.approach-card')];
const indicators = [...document.querySelectorAll('.step-indicator span')];
const progress = document.querySelector('.approach-progress > span');
const heroVideo = document.querySelector('.hero-media');
const revealElements = document.querySelectorAll('.reveal');
let observer;
let scheduled = false;
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
}
function requestScrollUpdate() {
  if (!scheduled) { scheduled = true; requestAnimationFrame(updateScroll); }
}
window.addEventListener('scroll', requestScrollUpdate, { passive: true });
window.addEventListener('resize', requestScrollUpdate, { passive: true });
reducedMotion.addEventListener('change', configureMotion);
scrollLayout.addEventListener('change', requestScrollUpdate);
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
