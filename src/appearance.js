export async function initializeAppearance() {
  const root = document.documentElement;
  let frame;
  const apply = ({ dark }) => {
    cancelAnimationFrame(frame);
    root.classList.add('theme-switching');
    root.classList.toggle('dark', dark);
    // Commit the new colors without replaying hover/surface transitions.
    void root.offsetHeight;
    frame = requestAnimationFrame(() => root.classList.remove('theme-switching'));
  };
  window.study.onAppearanceChanged(apply);
  apply(await window.study.getAppearance());
}
