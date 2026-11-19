'use strict';

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() {
  if (!navigation || !menuButton) return;
  navigation.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'เปิดเมนู');
}
if (menuButton && navigation) {
  menuButton.addEventListener('click', () => {
    const open = navigation.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'ปิดเมนู' : 'เปิดเมนู');
  });
  navigation.querySelectorAll('a').forEach(a => {
    if (a.pathname === location.pathname && !a.hash) a.setAttribute('aria-current', 'page');
    a.addEventListener('click', closeMenu);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && navigation.classList.contains('open')) {
      closeMenu();
      menuButton.focus();
    }
  });
}

// Infinite 3D Coverflow Auto-Gliding Product Showcase (100% clickable + hover pause + drag + arrows)
const carousel = document.querySelector('[data-lux-carousel]');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
if (carousel) {
  const track = carousel.querySelector('[data-lux-track]');
  const plates = [...carousel.querySelectorAll('.lux-plate')];
  const prevBtn = carousel.querySelector('[data-lux-prev]');
  const nextBtn = carousel.querySelector('[data-lux-next]');

  if (track && plates.length) {
    carousel.classList.add('is-carousel');

    let step = 276;
    let stageWidth = carousel.clientWidth || innerWidth;
    let offset = 0;
    let currentSpeed = reducedMotion.matches ? 0 : 42;
    let nudgeRemaining = 0;
    let isHoveredStage = false;
    let hoveredPlate = null;
    let isPointerDown = false;
    let dragged = false;
    let startX = 0;
    let lastX = 0;
    let suppressClickUntil = 0;
    let lastTime = performance.now();

    function measure() {
      stageWidth = carousel.clientWidth || innerWidth;
      step = innerWidth <= 760 ? 224 : innerWidth <= 980 ? 248 : 276;
    }

    function renderPlates() {
      const total = plates.length * step;
      const maxVisible = Math.max(stageWidth * 0.56, step * 2.4);

      for (let i = 0; i < plates.length; i++) {
        const plate = plates[i];
        const raw = (((i * step - offset) % total) + total) % total;
        const dx = raw > total * 0.5 ? raw - total : raw;
        const absDx = Math.abs(dx);
        const norm = Math.max(-1.35, Math.min(1.35, dx / (step * 2.15)));
        const absNorm = Math.abs(norm);
        const isHot = hoveredPlate === plate;

        const scale = (1.13 - absNorm * 0.2) + (isHot ? 0.045 : 0);
        const rotY = isHot ? 0 : -norm * 13.5;
        const tz = (1 - absNorm) * 44 - 14 + (isHot ? 32 : 0);
        const ty = Math.pow(absNorm, 1.55) * 24 - 6 + (isHot ? -8 : 0);
        const opacity = absDx >= maxVisible ? 0 : Math.min(1, (maxVisible - absDx) / (step * 0.65));
        const zIndex = isHot ? 55 : Math.round(40 - absNorm * 24);

        plate.style.transform = `translate3d(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${ty.toFixed(1)}px), ${tz.toFixed(1)}px) rotateY(${rotY.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        plate.style.opacity = opacity.toFixed(3);
        plate.style.zIndex = String(zIndex);
        plate.style.pointerEvents = opacity > 0.25 ? 'auto' : 'none';
        plate.classList.toggle('is-center', absDx < step * 0.45);
      }
    }

    function tick(now) {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const autoSpeed = reducedMotion.matches ? 0 : 42;
      const targetSpeed = (isHoveredStage || isPointerDown) ? 0 : autoSpeed;
      currentSpeed += (targetSpeed - currentSpeed) * Math.min(1, dt * 7);

      if (!isPointerDown) {
        offset += currentSpeed * dt;
        if (Math.abs(nudgeRemaining) > 0.15) {
          const delta = nudgeRemaining * Math.min(1, dt * 8.5);
          offset += delta;
          nudgeRemaining -= delta;
        } else {
          nudgeRemaining = 0;
        }
      }

      renderPlates();
      requestAnimationFrame(tick);
    }

    plates.forEach(plate => {
      plate.addEventListener('pointerenter', () => { hoveredPlate = plate; });
      plate.addEventListener('pointerleave', () => { if (hoveredPlate === plate) hoveredPlate = null; });
      plate.addEventListener('focus', () => { isHoveredStage = true; hoveredPlate = plate; });
      plate.addEventListener('blur', () => { isHoveredStage = false; if (hoveredPlate === plate) hoveredPlate = null; });
    });

    carousel.addEventListener('pointerenter', () => { isHoveredStage = true; });
    carousel.addEventListener('pointerleave', () => { isHoveredStage = false; hoveredPlate = null; });

    track.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      isPointerDown = true;
      dragged = false;
      startX = e.clientX;
      lastX = e.clientX;
      nudgeRemaining = 0;
    });

    addEventListener('pointermove', e => {
      if (!isPointerDown) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      if (!dragged && Math.abs(e.clientX - startX) > 8) {
        dragged = true;
        carousel.classList.add('is-dragging');
      }
      if (dragged) {
        offset -= dx * 1.15;
      }
    });

    function endDrag() {
      if (!isPointerDown) return;
      isPointerDown = false;
      carousel.classList.remove('is-dragging');
      if (dragged) {
        suppressClickUntil = performance.now() + 260;
      }
    }

    addEventListener('pointerup', endDrag);
    addEventListener('pointercancel', endDrag);

    track.addEventListener('click', e => {
      if (performance.now() < suppressClickUntil) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    if (prevBtn) {
      prevBtn.addEventListener('click', () => { nudgeRemaining -= step; });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => { nudgeRemaining += step; });
    }

    addEventListener('resize', () => { measure(); renderPlates(); });
    measure();
    renderPlates();
    requestAnimationFrame(tick);
  }
}

// Quote summary generator (client-side only)
const form = document.querySelector('#quote-form');
let summary = '';
if (form) {
  const select = form.elements.product;
  const requested = new URLSearchParams(location.search).get('product');
  if ([...select.options].some(o => o.value === requested)) select.value = requested;
  const today = new Date();
  const localDate = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  form.elements.date.min = localDate;
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    summary = [
      'ForU — สรุปคำขอใบเสนอราคา',
      'สถานะ: ฉบับเตรียมส่ง ยังไม่ได้ส่งถึงทีมขาย',
      '',
      `ชื่อผู้ติดต่อ: ${data.get('name')}`,
      `บริษัท: ${data.get('company') || 'ไม่ระบุ'}`,
      `อีเมล: ${data.get('email')}`,
      `โทรศัพท์: ${data.get('phone') || 'ไม่ระบุ'}`,
      `สินค้า: ${select.selectedOptions[0].textContent}`,
      `จำนวน: ${data.get('quantity')} ชิ้น/ชุด`,
      `งบประมาณต่อชิ้น/ชุด: ${data.get('budget') ? data.get('budget') + ' บาท' : 'รอประเมิน'}`,
      `วันใช้งาน: ${data.get('date') || 'ไม่ระบุ'}`,
      `รายละเอียด: ${data.get('details') || 'ไม่ระบุ'}`,
      '',
      'โปรดยืนยันราคา สเปก ขั้นต่ำ ตัวอย่าง กำหนดส่ง ภาษี และค่าจัดส่งก่อนสั่งผลิต'
    ].join('\n');
    document.querySelector('#quote-summary').textContent = summary;
    document.querySelector('#email-quote').href = 'mailto:sales@forupremium.com?subject=' + encodeURIComponent('ขอใบเสนอราคา ForU — ' + select.selectedOptions[0].textContent) + '&body=' + encodeURIComponent(summary);
    const result = document.querySelector('#quote-result');
    result.hidden = false;
    document.querySelector('#copy-status').textContent = '';
    result.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'nearest' });
  });
  document.querySelector('#copy-summary').addEventListener('click', async () => {
    const status = document.querySelector('#copy-status');
    try {
      await navigator.clipboard.writeText(summary);
      status.textContent = 'คัดลอกสรุปแล้ว';
    } catch {
      status.textContent = 'เบราว์เซอร์ไม่อนุญาตให้คัดลอก กรุณาดาวน์โหลดไฟล์หรือเลือกข้อความด้วยตนเอง';
    }
  });
  document.querySelector('#download-summary').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob(['\uFEFF' + summary], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'foru-quote-request.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  const reference = new URLSearchParams(location.search).get('reference');
  if (reference && /^[A-Z0-9-]{3,20}$/i.test(reference)) {
    form.elements.details.value = 'สนใจสินค้ารหัส ' + reference + '\n';
  }
}

// Catalog photographs pagination, filters & multi-angle thumbs
document.querySelectorAll('[data-catalog]').forEach(catalog => {
  catalog.querySelectorAll('.catalog-thumbs').forEach(thumbs => thumbs.addEventListener('click', event => {
    const button = event.target.closest('button[data-gallery-src]');
    if (!button) return;
    const main = button.closest('.catalog-card').querySelector('.catalog-photo img');
    main.src = button.dataset.gallerySrc;
    main.alt = button.dataset.galleryAlt;
    thumbs.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  }));
  const cards = [...catalog.querySelectorAll('.catalog-card')];
  const filters = [...catalog.querySelectorAll('[data-filter]')];
  const more = catalog.querySelector('.catalog-more');
  const count = catalog.querySelector('.catalog-count');
  const pageSize = Number(catalog.dataset.pageSize) || 12;
  let selected = 'all';
  let limit = pageSize;
  function update() {
    const matching = cards.filter(c => selected === 'all' || c.dataset.category === selected);
    cards.forEach(c => { c.hidden = true; });
    matching.slice(0, limit).forEach(c => { c.hidden = false; });
    more.hidden = matching.length <= limit;
    count.textContent = `แสดง ${Math.min(limit, matching.length)} จาก ${matching.length} รายการ`;
    filters.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === selected)));
  }
  filters.forEach(b => b.addEventListener('click', () => { selected = b.dataset.filter; limit = pageSize; update(); }));
  more.addEventListener('click', () => { limit += pageSize; update(); });
  update();
});

const requestedCategory = new URLSearchParams(location.search).get('category');
if (requestedCategory) {
  const filter = [...document.querySelectorAll('[data-filter]')].find(b => b.dataset.filter === requestedCategory);
  if (filter) filter.click();
}
