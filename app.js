const body = document.body;
const crtToggle = document.querySelector('#crtToggle');
const signupForm = document.querySelector('#signupForm');
const formStatus = document.querySelector('#formStatus');

crtToggle.addEventListener('click', () => {
  const enabled = body.classList.toggle('crt-off') === false;
  crtToggle.setAttribute('aria-pressed', enabled);
  crtToggle.innerHTML = `CRT <span>${enabled ? '●' : '○'}</span>`;
});

signupForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = new FormData(signupForm).get('email');
  formStatus.textContent = `${email} queued for transmission. Welcome to the signal.`;
  formStatus.style.color = 'var(--acid)';
  signupForm.reset();
});
