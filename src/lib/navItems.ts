/**
 * Single source of truth for the site navigation.
 *
 * `key` is a stable, locale-independent identifier used for both the
 * translation lookup (`nav.items.<key>`) and the scroll/overlay branching in
 * the nav components. The visible label must never be used for logic —
 * translating it would otherwise break navigation in Arabic.
 */
export const NAV_ITEMS = [
  { key: 'home', target: '.gsap-main-hero' },
  { key: 'services', target: '#services' },
  { key: 'about', target: '#about' },
  { key: 'projects', target: '#projects' },
  { key: 'contact', target: '#contact' }
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];
export type NavKey = NavItem['key'];
