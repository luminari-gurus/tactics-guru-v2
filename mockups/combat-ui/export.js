/* Hide reviewer chrome when capturing screenshots (?export=1). */
if (new URLSearchParams(location.search).has('export')) {
  document.documentElement.classList.add('export');
  document.body.classList.add('export');
}
