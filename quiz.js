(() => {
  const dialog = document.querySelector('#quiz');
  if (!dialog) return;
  // Replace these four entries when the final questions are approved.
  const questions = [
    { title: 'Какую баню вы рассматриваете?', options: ['Баню-бочку', 'Каркасную баню', 'Пока выбираю — нужна помощь'] },
    { title: 'Сколько человек будут отдыхать вместе?', options: ['1–2 человека', '3–4 человека', '5 и больше'] },
    { title: 'Когда хотите установить баню?', options: ['В ближайший месяц', 'Через 2–3 месяца', 'Пока присматриваюсь'] },
    { title: 'На какой бюджет ориентируетесь?', options: ['До 300 000 ₽', '300 000–500 000 ₽', 'От 500 000 ₽', 'Хочу сравнить варианты'] }
  ];
  const DAY = 24 * 60 * 60 * 1000;
  let deadline = Date.now() + DAY;
  let submitted = false;
  try {
    const saved = Number(localStorage.getItem('banipremium-gift-deadline-v1'));
    if (saved > 0 && Number.isFinite(saved)) deadline = Math.min(saved, deadline);
    else localStorage.setItem('banipremium-gift-deadline-v1', String(deadline));
    submitted = localStorage.getItem('banipremium-gift-submitted-v1') === 'yes';
  } catch { /* The form remains usable when browser storage is disabled. */ }
  const answers = Array(questions.length).fill(null);
  let step = 0;
  let opener;
  const heading = dialog.querySelector('#quiz-heading');
  const fieldset = dialog.querySelector('.quiz-options');
  const next = dialog.querySelector('.quiz-next');
  const back = dialog.querySelector('.quiz-back');
  const form = dialog.querySelector('[data-lead-form]');
  const submit = form.querySelector('[type=submit]');
  const questionView = dialog.querySelector('#quiz-question-view');
  const resultView = dialog.querySelector('#quiz-result-view');
  const progress = dialog.querySelector('progress');
  const clock = dialog.querySelector('[data-gift-timer]');
  const intro = dialog.querySelector('.quiz-contact-intro');
  const tick = () => {
    const remaining = Math.max(0, deadline - Date.now());
    const seconds = Math.floor(remaining / 1000);
    clock.textContent = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
    dialog.classList.toggle('gift-expired', !remaining && !submitted);
    dialog.querySelector('[data-timer-label]').textContent = submitted ? 'Заявка принята' : remaining ? 'Осталось' : 'Время истекло';
    clock.hidden = submitted;
    if (!remaining && !submitted) {
      intro.textContent = 'Время закрепления подарка истекло. Оставьте телефон — поможем подобрать баню и уточним доступные предложения.';
      if (!submit.disabled) submit.textContent = 'Получить подбор бани';
    }
  };
  const updateProgress = () => {
    const percent = answers.filter(a => a !== null).length * 25;
    progress.value = percent;
    progress.textContent = `${percent}%`;
    dialog.style.setProperty('--quiz-progress', `${percent}%`);
    dialog.querySelector('#quiz-percent').textContent = `${percent}%`;
    dialog.querySelector('#quiz-step-label').textContent = step === questions.length ? '4 ответа из 4 — готово' : `Вопрос ${step + 1} из 4`;
  };
  const render = (focus = true) => {
    const done = step === questions.length;
    questionView.hidden = done;
    resultView.hidden = !done;
    dialog.setAttribute('aria-labelledby', done ? 'quiz-result-heading' : 'quiz-heading');
    updateProgress(); tick();
    if (done) {
      if (focus) dialog.querySelector('#quiz-result-heading').focus();
      return;
    }
    heading.textContent = questions[step].title;
    fieldset.querySelectorAll('label').forEach(el => el.remove());
    questions[step].options.forEach((option, index) => {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'quiz-answer'; radio.value = option;
      radio.checked = answers[step] === index;
      radio.addEventListener('change', () => { answers[step] = index; next.disabled = false; updateProgress(); });
      const text = document.createElement('span'); text.textContent = option;
      label.append(radio, text); fieldset.append(label);
    });
    back.hidden = step === 0;
    next.disabled = answers[step] === null;
    next.textContent = step === questions.length - 1 ? 'Посмотреть подарок' : 'Далее';
    if (focus) heading.focus();
  };
  const open = event => {
    event?.preventDefault(); opener = event?.currentTarget || document.activeElement;
    document.body.classList.remove('menu-open');
    document.querySelector('.menu-toggle')?.setAttribute('aria-expanded','false');
    const menuButton = document.querySelector('.menu-toggle'); if (menuButton) menuButton.textContent = 'Меню';
    render(false); dialog.showModal(); document.body.classList.add('quiz-open');
    (step === questions.length ? dialog.querySelector('#quiz-result-heading') : heading).focus();
  };
  document.querySelectorAll('[data-open-quiz]').forEach(link => link.addEventListener('click',open));
  dialog.querySelector('.quiz-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { document.body.classList.remove('quiz-open'); opener?.focus(); if (location.hash === '#quiz') history.replaceState(null,'',location.pathname + location.search); });
  next.addEventListener('click', () => { if (answers[step] !== null) { step++; render(); } });
  back.addEventListener('click', () => { if (step > 0) { step--; render(); } });
  dialog.querySelector('.quiz-edit').addEventListener('click', () => { step = 0; render(); });
  window.saunaQuiz = {
    getLeadDetails: () => ({ quiz: questions.map((q,i) => ({ question:q.title, answer:q.options[answers[i]] || '' })), giftDeadline: new Date(deadline).toISOString(), giftRequested: Date.now() < deadline }),
    markSubmitted: () => {
      submitted = true;
      try { localStorage.setItem('banipremium-gift-submitted-v1','yes'); } catch {}
      form.querySelector('.form-status').textContent = Date.now() < deadline ? 'Спасибо! Заявка принята. Подарок при заказе бани закреплён за вашей заявкой. Мы свяжемся с вами.' : 'Спасибо! Заявка принята. Мы свяжемся с вами и поможем подобрать баню.';
      tick();
    }
  };
  tick(); setInterval(tick,1000);
  if (location.hash === '#quiz') open();
})();
