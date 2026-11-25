const picker=document.getElementById('themeSelect');
function setTheme(value){const theme=['dark','bright','colorful'].includes(value)?value:'default';document.documentElement.dataset.theme=theme;picker.value=theme;}
try{setTheme(localStorage.getItem('atlas-theme'));}catch{setTheme('default');}
picker.addEventListener('change',()=>{setTheme(picker.value);try{localStorage.setItem('atlas-theme',picker.value);}catch{}});
import { REQUIRE_SIGN_IN } from './config.js';
if (REQUIRE_SIGN_IN) {
  await import('./account.js');
} else {
  document.body.classList.remove('signed-out');
  try {
    await import('./app.js');
    const note = document.createElement('p');
    note.className = 'test-mode-note';
    note.textContent = 'Test mode · No sign-in · Maps saved in this browser';
    document.querySelector('.sidebar-bottom').prepend(note);
  } catch {
    const message = document.createElement('p');
    message.textContent = 'Atlas could not open. Reload the page to try again.';
    document.body.prepend(message);
  }
}
