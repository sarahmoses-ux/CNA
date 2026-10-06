import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const revealTargets = '.section-heading, .program-card, .learning-photo, .learning-point, .academy-layout > div, .faq-layout > div, .cta-inner > div, .values-grid article, .steps-grid article, .contact-method, .visit-card, .detail-block, .news-grid article, .experiences-grid article, .resource-directory > section, .class-schedule, .account-form, .account-layout > aside, .dashboard-card, .notice, .resource-callout .container';

export default function MotionEffects() {
  const { pathname } = useLocation();

  useEffect(() => {
    const root = document.getElementById('main');
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const seen = new WeakSet();
    const active = new Set();
    if (!root || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        observer.unobserve(target);
        if (preference.matches) return;
        const siblings = [...target.parentElement.children];
        const stagger = target.matches('.program-card, .values-grid article, .steps-grid article, .news-grid article, .experiences-grid article, .dashboard-card')
          ? (siblings.indexOf(target) % 3) * 90 : 0;
        const distance = target.matches('.account-form, .account-layout > aside') ? 14 : 24;
        const animation = target.animate([
          { opacity: 0, transform: 'translateY(' + distance + 'px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ], { duration: 720, delay: stagger, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
        active.add(animation);
        animation.finished.then(() => active.delete(animation)).catch(() => active.delete(animation));
      });
    }, { threshold: 0.08 });

    const observe = () => root.querySelectorAll(revealTargets).forEach(element => {
      if (seen.has(element)) return;
      seen.add(element);
      observer.observe(element);
    });
    const cancel = () => { if (preference.matches) active.forEach(animation => animation.cancel()); };
    const mutations = new MutationObserver(observe);
    observe();
    mutations.observe(root, { childList: true, subtree: true });
    preference.addEventListener('change', cancel);

    return () => {
      observer.disconnect();
      mutations.disconnect();
      preference.removeEventListener('change', cancel);
      active.forEach(animation => animation.cancel());
    };
  }, [pathname]);

  return null;
}
