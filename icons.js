const paths={
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 back:'<path d="m15 18-6-6 6-6"/>',
 wallet:'<path d="M20 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v11H5a2 2 0 0 1-2-2V6m18 6h-5a2 2 0 0 0 0 4h5m-4-2h.01"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0"/>',
 cart:'<circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M2 4h3l2.5 12H19l2-9H6"/>',
 users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2M16 5a3 3 0 0 1 0 6m2 3a4 4 0 0 1 3 4v2"/>',
 layers:'<path d="m12 3 9 5-9 5-9-5zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 4h1m6 0h1m-8 3h1m6 0h1"/>',
 chart:'<path d="M3 21h18M5 20v-6h3v6m3 0V9h3v11m3 0V4h3v16"/>',
 file:'<path d="M6 3h8l5 5v13H6zm8 0v6h5M9 13h7m-7 4h7"/>',
 home:'<path d="m3 10 9-7 9 7v10H3zm7 10v-7h4v7"/>',
 list:'<path d="M5 6h15M5 12h15M5 18h10M2 6h.01M2 12h.01M2 18h.01"/>',
 plus:'<path d="M12 4v16M4 12h16"/>',
 settings:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/><circle cx="12" cy="12" r="8"/>',
 coins:'<ellipse cx="15.5" cy="6" rx="6" ry="3"/><path d="M9.5 6v4c0 4 12 4 12 0V6m-12 4v4c0 4 12 4 12 0v-4m-12 4v4c0 4 12 4 12 0v-4"/><ellipse cx="6.5" cy="13" rx="4" ry="2"/><path d="M2.5 13v4c0 3 8 3 8 0v-4m-8 4v3c0 3 8 3 8 0v-3"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 5v2"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>'
};
export const icon=(name,cls='')=>'<svg class="icon '+cls+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[name]+'</svg>';
