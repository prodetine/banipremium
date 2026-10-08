const header = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelectorAll('.main-nav a');

const hero = document.querySelector('.hero');
const updateHeader = () => {
  const heroInView = hero ? hero.getBoundingClientRect().bottom > 100 : false;
  header?.classList.toggle('scrolled', window.scrollY > 30);
  document.body.classList.toggle('hero-in-view', heroInView);
};
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });
window.addEventListener('resize', updateHeader, { passive: true });

menuToggle?.addEventListener('click', () => {
  const open = document.body.classList.toggle('menu-open');
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.textContent = open ? 'Закрыть' : 'Меню';
});

navLinks.forEach((link) => link.addEventListener('click', () => {
  document.body.classList.remove('menu-open');
  menuToggle?.setAttribute('aria-expanded', 'false');
  if (menuToggle) menuToggle.textContent = 'Меню';
}));

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !document.body.classList.contains('menu-open')) return;
  document.body.classList.remove('menu-open');
  menuToggle?.setAttribute('aria-expanded', 'false');
  if (menuToggle) {
    menuToggle.textContent = 'Меню';
    menuToggle.focus();
  }
});

document.querySelectorAll('[data-year]').forEach((node) => {
  node.textContent = new Date().getFullYear();
});

const revealObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px' })
  : null;

document.querySelectorAll('.reveal').forEach((element) => {
  if (revealObserver) revealObserver.observe(element);
  else element.classList.add('visible');
});

const normalizePhone = (value) => value.replace(/[^0-9+]/g, '');

document.querySelectorAll('[data-lead-form]').forEach((form) => {
  const startedAt = Date.now();
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = form.querySelector('.form-status');
    const submit = form.querySelector('button[type="submit"]');
    const originalSubmitText = submit.textContent;
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const phone = normalizePhone(String(data.get('phone') || '').trim());

    status.className = 'form-status';
    if (name.length < 2 || phone.replace(/\D/g, '').length < 10) {
      status.textContent = 'Проверьте имя и номер телефона.';
      status.classList.add('error');
      return;
    }

    if (location.hostname.endsWith('github.io')) {
      status.textContent = 'Запись через форму пока недоступна. Позвоните нам: +7 915 775-09-09.';
      status.classList.add('error');
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Отправляем…';
    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          website: String(data.get('website') || ''),
          elapsed: Date.now() - startedAt,
          page: window.location.pathname
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Не удалось отправить заявку');
      form.reset();
      status.textContent = 'Спасибо! Заявка принята. Мы свяжемся с вами в рабочее время.';
      status.classList.add('success');
    } catch (error) {
      status.textContent = 'Не получилось отправить заявку. Позвоните нам: +7 915 775-09-09.';
      status.classList.add('error');
    } finally {
      submit.disabled = false;
      submit.textContent = originalSubmitText;
    }
  });
});

const reviewTrack = document.querySelector('.reviews-track');
if (reviewTrack) {
  const cards = [...reviewTrack.querySelectorAll('.review-card')];
  const previous = document.querySelector('.review-prev');
  const next = document.querySelector('.review-next');
  const position = document.querySelector('.review-position');
  const phoneLayout = matchMedia('(max-width: 500px)');
  let current = 0;
  const updateReviews = () => {
    if (!phoneLayout.matches) return;
    current = cards.reduce((closest, card, index) => Math.abs(card.offsetLeft - cards[0].offsetLeft - reviewTrack.scrollLeft) < Math.abs(cards[closest].offsetLeft - cards[0].offsetLeft - reviewTrack.scrollLeft) ? index : closest, 0);
    previous.disabled = current === 0;
    next.disabled = current === cards.length - 1;
    position.textContent = `${current + 1} из ${cards.length}`;
  };
  const goToReview = (index) => {
    if (!phoneLayout.matches) return;
    const target = Math.max(0, Math.min(cards.length - 1, index));
    reviewTrack.scrollTo({left: cards[target].offsetLeft - cards[0].offsetLeft, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  };
  previous.addEventListener('click', () => goToReview(current - 1));
  next.addEventListener('click', () => goToReview(current + 1));
  reviewTrack.addEventListener('scroll', updateReviews, {passive: true});
  reviewTrack.addEventListener('keydown', (event) => {
    if (!phoneLayout.matches || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    goToReview(current + (event.key === 'ArrowRight' ? 1 : -1));
  });
  window.addEventListener('resize', updateReviews);
  document.fonts.ready.then(updateReviews);
  updateReviews();
}
