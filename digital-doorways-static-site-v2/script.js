const nav = document.querySelector('.nav');
let lastY = window.scrollY;
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  nav.style.opacity = y > lastY && y > 100 ? '0.35' : '1';
  nav.style.transition = 'opacity .25s ease';
  lastY = y;
});

// Subtle pointer movement on the hero artwork.
const hero = document.querySelector('.hero');
hero.addEventListener('pointermove', (e) => {
  const x = (e.clientX / window.innerWidth - .5) * 8;
  const y = (e.clientY / window.innerHeight - .5) * 8;
  document.querySelector('.hero h1').style.transform = `translate(${x}px, ${y}px)`;
});
hero.addEventListener('pointerleave', () => {
  document.querySelector('.hero h1').style.transform = '';
});

// Portfolio video hover previews + case-study modal.
document.querySelectorAll('.project').forEach(project => {
  const video = project.querySelector('.project-video');
  if (video && video.querySelector('source')?.getAttribute('src')) {
    project.addEventListener('mouseenter', () => video.play().catch(()=>{}));
    project.addEventListener('mouseleave', () => { video.pause(); video.currentTime = 0; });
  }
});

const modal = document.querySelector('.case-modal');
const closeModal = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; };

document.querySelectorAll('.project').forEach(project => {
  project.addEventListener('click', () => {
    const image = project.querySelector('.project-video')?.getAttribute('poster') || '';
    modal.querySelector('.modal-media img').src = image;
    modal.querySelector('.modal-info h3').textContent = project.dataset.title || '';
    modal.querySelector('.modal-category').textContent = project.dataset.category || '';
    modal.querySelector('.modal-info p').textContent = project.dataset.description || '';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
  });
});
document.querySelector('.modal-close').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if(e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });
