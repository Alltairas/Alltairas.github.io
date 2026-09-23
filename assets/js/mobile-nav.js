// Phone navigation helpers; the reasoning is in assets/css/mobile-nav.css.
(function () {
  // Pulse the Menu and Search buttons on the first page of a browser session,
  // so a new visitor notices them without being nagged on every click.
  try {
    if (!sessionStorage.getItem('nav-hint-seen')) {
      sessionStorage.setItem('nav-hint-seen', '1');
      document.documentElement.classList.add('nav-hint');
    }
  } catch (e) {
    // Storage blocked: skip the hint rather than replay it on every page.
  }

  const list = document.querySelector('.md-tabs__list');
  if (!list) return;

  // On a narrow screen the later tabs start off the right edge; scroll the
  // current section's tab to the middle so it's visible on arrival.
  const active = list.querySelector('.md-tabs__item--active');
  if (active && list.scrollWidth > list.clientWidth) {
    const offset = active.getBoundingClientRect().left - list.getBoundingClientRect().left;
    list.scrollLeft += offset - (list.clientWidth - active.offsetWidth) / 2;
  }

  // Fade whichever edge still has tabs hidden behind it.
  function updateEdges() {
    const max = list.scrollWidth - list.clientWidth;
    list.classList.toggle('md-tabs__list--more-left', list.scrollLeft > 1);
    list.classList.toggle('md-tabs__list--more-right', list.scrollLeft < max - 1);
  }
  list.addEventListener('scroll', updateEdges, { passive: true });
  window.addEventListener('resize', updateEdges);
  updateEdges();
})();
