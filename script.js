const header = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelectorAll('.main-nav a');

const updateHeader = () => header?.classList.toggle('scrolled', window.scrollY > 30);
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

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

const lightbox = document.querySelector('.lightbox');
const lightboxImage = lightbox?.querySelector('img');
document.querySelectorAll('[data-lightbox]').forEach((button) => {
  button.addEventListener('click', () => {
    if (!lightbox || !lightboxImage) return;
    lightboxImage.src = button.dataset.lightbox;
    lightboxImage.alt = button.querySelector('img')?.alt || 'Фотография бани';
    lightbox.showModal();
  });
});
lightbox?.querySelector('button')?.addEventListener('click', () => lightbox.close());
lightbox?.addEventListener('click', (event) => {
  if (event.target === lightbox) lightbox.close();
});

const normalizePhone = (value) => value.replace(/[^0-9+]/g, '');

document.querySelectorAll('[data-lead-form]').forEach((form) => {
  const startedAt = Date.now();
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = form.querySelector('.form-status');
    const submit = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const phone = normalizePhone(String(data.get('phone') || '').trim());

    status.className = 'form-status';
    if (name.length < 2 || phone.replace(/\D/g, '').length < 10) {
      status.textContent = 'Проверьте имя и номер телефона.';
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
      submit.textContent = form.closest('.hero-card') ? 'Получить консультацию' : 'Оставить заявку';
    }
  });
});
