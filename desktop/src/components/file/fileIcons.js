export function folderSvg(open) {
  const fill = open ? '#e8a33d' : '#dcb67a'
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.8 3.6a1 1 0 0 1 1-1h3.1l1.5 1.7h5.8a1 1 0 0 1 1 1v6.9a1 1 0 0 1-1 1H2.8a1 1 0 0 1-1-1z" fill="${fill}" stroke="rgba(0,0,0,0.12)" stroke-width="0.6"/></svg>`
}

export function fileSvg(name) {
  const ext = (name.split('.').pop() || '').toLowerCase()
  const colorMap = {
    ts: '#3178c6', tsx: '#3178c6', js: '#e8c531', mjs: '#e8c531', cjs: '#e8c531',
    json: '#f0a83c', vue: '#42b883', html: '#e44d26', htm: '#e44d26',
    css: '#42a5f5', scss: '#d76b9c', md: '#607d8b', txt: '#8a93a6',
    yml: '#e05050', yaml: '#e05050', test: '#10b981'
  }
  const color = colorMap[ext] || '#8a93a6'
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4.2 1.6h5.4l3 3v9.8h-8.4a1 1 0 0 1-1-1V2.6a1 1 0 0 1 1-1z" fill="${color}" stroke="rgba(0,0,0,0.12)" stroke-width="0.6"/><path d="M9.6 1.6v3h3" fill="${color}" stroke="rgba(0,0,0,0.12)" stroke-width="0.6"/></svg>`
}

export function chevronSvg(open, placeholder) {
  return `<svg width="16" height="16" viewBox="0 0 16 16" class="chev ${open ? 'open' : ''} ${placeholder ? 'placeholder' : ''}" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
}
