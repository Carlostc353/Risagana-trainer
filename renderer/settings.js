'use strict';

let currentTotal = 46;

async function init() {
  const [settings, statsData] = await Promise.all([
    window.api.getSettings(),
    window.api.getStats()
  ]);

  currentTotal = statsData.total;

  const radio = document.querySelector(`input[name="interval"][value="${settings.interval}"]`);
  if (radio) radio.checked = true;

  const groups = settings.enabledGroups || ['basic'];
  document.querySelectorAll('input[name="group"]').forEach(cb => {
    cb.checked = groups.includes(cb.value);
  });

  const accuracy = statsData.totalShown > 0
    ? Math.round((statsData.totalCorrect / statsData.totalShown) * 100) + '%'
    : '—';
  document.getElementById('stat-practiced').textContent =
    `${statsData.practiced} / ${statsData.total}`;
  document.getElementById('stat-accuracy').textContent = accuracy;

  if (statsData.worstChars.length > 0) {
    document.getElementById('worst-section').classList.remove('hidden');
    const list = document.getElementById('worst-list');
    list.innerHTML = '';
    statsData.worstChars.forEach(({ displayRomaji, character, missRate }) => {
      const item = document.createElement('div');
      item.className = 'worst-item';
      const r = document.createElement('span');
      r.className = 'romaji';
      r.textContent = displayRomaji;
      const c = document.createElement('span');
      c.className = 'worst-char';
      c.textContent = character;
      const m = document.createElement('span');
      m.className = 'miss-pct';
      m.textContent = `${Math.round(missRate * 100)}% miss`;
      item.append(r, c, m);
      list.appendChild(item);
    });
  }
}

document.querySelectorAll('input[name="group"]').forEach(cb => {
  cb.addEventListener('change', () => {
    document.getElementById('group-error').classList.add('hidden');
  });
});

document.getElementById('save-btn').addEventListener('click', async () => {
  const checked = document.querySelector('input[name="interval"]:checked');
  if (!checked) return;
  const interval = parseInt(checked.value, 10);

  const enabledGroups = [...document.querySelectorAll('input[name="group"]:checked')]
    .map(cb => cb.value);

  if (enabledGroups.length === 0) {
    document.getElementById('group-error').classList.remove('hidden');
    return;
  }

  await window.api.saveSettings({ interval, enabledGroups });
  window.close();
});

let resetPending = false;
document.getElementById('reset-btn').addEventListener('click', async () => {
  if (!resetPending) {
    resetPending = true;
    document.getElementById('reset-btn').textContent = 'Click again to confirm';
    return;
  }
  await window.api.resetStats();
  document.getElementById('reset-confirm').classList.remove('hidden');
  document.getElementById('reset-btn').disabled = true;
  document.getElementById('reset-btn').textContent = 'Reset all progress';
  document.getElementById('stat-practiced').textContent = `0 / ${currentTotal}`;
  document.getElementById('stat-accuracy').textContent = '—';
  document.getElementById('worst-section').classList.add('hidden');
  resetPending = false;
  setTimeout(() => {
    document.getElementById('reset-confirm').classList.add('hidden');
  }, 3000);
});

init();
