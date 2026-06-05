'use strict';

async function init() {
  const [settings, statsData] = await Promise.all([
    window.api.getSettings(),
    window.api.getStats()
  ]);

  // Set interval radio
  const radio = document.querySelector(`input[name="interval"][value="${settings.interval}"]`);
  if (radio) radio.checked = true;

  // Stats
  const accuracy = statsData.totalShown > 0
    ? Math.round((statsData.totalCorrect / statsData.totalShown) * 100) + '%'
    : '—';
  document.getElementById('stat-practiced').textContent =
    `${statsData.practiced} / ${statsData.total}`;
  document.getElementById('stat-accuracy').textContent = accuracy;

  // Worst characters
  if (statsData.worstChars.length > 0) {
    document.getElementById('worst-section').classList.remove('hidden');
    const list = document.getElementById('worst-list');
    list.innerHTML = statsData.worstChars.map(({ romaji, missRate }) => `
      <div class="worst-item">
        <span class="romaji">${romaji}</span>
        <span class="miss-pct">${Math.round(missRate * 100)}% miss</span>
      </div>
    `).join('');
  }
}

// Save
document.getElementById('save-btn').addEventListener('click', async () => {
  const checked = document.querySelector('input[name="interval"]:checked');
  if (!checked) return;
  const interval = parseInt(checked.value, 10);
  await window.api.saveSettings({ interval });
  window.close();
});

// Reset
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
  // Refresh stats display
  document.getElementById('stat-practiced').textContent = '0 / 46';
  document.getElementById('stat-accuracy').textContent = '—';
  document.getElementById('worst-section').classList.add('hidden');
  resetPending = false;
  setTimeout(() => {
    document.getElementById('reset-confirm').classList.add('hidden');
  }, 3000);
});

init();
