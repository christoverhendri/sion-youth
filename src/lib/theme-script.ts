export const THEME_KEY = "sion-theme";

// Dipasang di <head> supaya tema terpasang sebelum halaman tampil (tidak berkedip).
// Default gelap, sesuai desain referensi.
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){}`;
