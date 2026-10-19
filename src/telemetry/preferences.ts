import './preferences.css';
import { allowTelemetryNextVisit, optOutTelemetry, telemetryPreference } from './browser';

/** Mounted in existing scrollable tools, including the run's replacement action controls. */
export function mountTelemetryPreferences(parent: HTMLElement) {
  if (parent.querySelector('.telemetry-preferences')) return;
  const section = document.createElement('details');
  section.className = 'telemetry-preferences';
  const summary = document.createElement('summary'); summary.textContent = 'Privacy & analytics';
  const notice = document.createElement('p');
  const region = import.meta.env.VITE_POSTHOG_HOST === 'https://eu.i.posthog.com' ? 'EU' : 'US';
  notice.textContent = `Anonymous gameplay events and sanitized error reports help improve Tactics Guru. Reports go to PostHog in the ${region}. No saves, personal profiles, replay, or page URLs are collected. Retention target: 30 days. Browser privacy signals can keep reports off. Turning reports off does not delete data already sent.`;
  const label = document.createElement('label');
  const choice = document.createElement('input'); choice.type = 'checkbox'; choice.dataset.telemetryChoice = '';
  label.append(choice, 'Allow anonymous analytics and error reports');
  const status = document.createElement('p'); status.setAttribute('role', 'status'); status.dataset.telemetryStatus = '';
  const refresh = () => {
    const preference = telemetryPreference(); choice.checked = preference.allowed;
    status.textContent = preference.collecting ? 'Reports are enabled.' : preference.allowed
      ? 'Reports are off for this page. Your preference applies when collection is available on a later visit.'
      : 'Reports are off on this browser.';
  };
  choice.addEventListener('change', () => {
    const allowed = choice.checked;
    const stored = allowed ? allowTelemetryNextVisit() : optOutTelemetry();
    refresh();
    document.dispatchEvent(new Event('telemetry-preference-change'));
    if (!stored) status.textContent = 'This browser could not save your preference. Reports remain off for this page.';
  });
  section.addEventListener('toggle', refresh);
  section.append(summary, notice, label, status); parent.append(section); refresh();
}

function refreshConnectedControls() {
  const preference = telemetryPreference();
  document.querySelectorAll<HTMLInputElement>('[data-telemetry-choice]').forEach(input => { input.checked = preference.allowed; });
  if (!preference.collecting) document.querySelectorAll<HTMLElement>('[data-telemetry-status]').forEach(status => {
    status.textContent = preference.allowed ? 'Reports are off for this page. Changes apply on a later visit.' : 'Reports are off on this browser.';
  });
}
document.addEventListener('telemetry-preference-change', refreshConnectedControls);
window.addEventListener('storage', () => queueMicrotask(refreshConnectedControls));
