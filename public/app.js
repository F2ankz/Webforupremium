'use strict';
const menuButton=document.querySelector('.menu-toggle');
const navigation=document.querySelector('#navigation');
function closeMenu(){navigation.classList.remove('open');menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','เปิดเมนู');}
menuButton.addEventListener('click',()=>{const open=navigation.classList.toggle('open');menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'ปิดเมนู':'เปิดเมนู');});
navigation.querySelectorAll('a').forEach(a=>{if(a.pathname===location.pathname&&!a.hash)a.setAttribute('aria-current','page');a.addEventListener('click',closeMenu);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&navigation.classList.contains('open')){closeMenu();menuButton.focus();}});
const form=document.querySelector('#quote-form');
let summary='';
if(form){const select=form.elements.product;const requested=new URLSearchParams(location.search).get('product');if([...select.options].some(o=>o.value===requested))select.value=requested;const today=new Date();const localDate=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');form.elements.date.min=localDate;form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;const data=new FormData(form);summary=['ForU — สรุปคำขอใบเสนอราคา','สถานะ: ฉบับเตรียมส่ง ยังไม่ได้ส่งถึงทีมขาย','',`ชื่อผู้ติดต่อ: ${data.get('name')}`,`บริษัท: ${data.get('company')||'ไม่ระบุ'}`,`อีเมล: ${data.get('email')}`,`โทรศัพท์: ${data.get('phone')||'ไม่ระบุ'}`,`สินค้า: ${select.selectedOptions[0].textContent}`,`จำนวน: ${data.get('quantity')} ชิ้น/ชุด`,`งบประมาณต่อชิ้น/ชุด: ${data.get('budget')?data.get('budget')+' บาท':'รอประเมิน'}`,`วันใช้งาน: ${data.get('date')||'ไม่ระบุ'}`,`รายละเอียด: ${data.get('details')||'ไม่ระบุ'}`,'','โปรดยืนยันราคา สเปก ขั้นต่ำ ตัวอย่าง กำหนดส่ง ภาษี และค่าจัดส่งก่อนสั่งผลิต'].join('\n');document.querySelector('#quote-summary').textContent=summary;document.querySelector('#email-quote').href='mailto:sales@forupremium.com?subject='+encodeURIComponent('ขอใบเสนอราคา ForU — '+select.selectedOptions[0].textContent)+'&body='+encodeURIComponent(summary);const result=document.querySelector('#quote-result');result.hidden=false;document.querySelector('#copy-status').textContent='';result.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});});document.querySelector('#copy-summary').addEventListener('click',async()=>{const status=document.querySelector('#copy-status');try{await navigator.clipboard.writeText(summary);status.textContent='คัดลอกสรุปแล้ว';}catch{status.textContent='เบราว์เซอร์ไม่อนุญาตให้คัดลอก กรุณาดาวน์โหลดไฟล์หรือเลือกข้อความด้วยตนเอง';}});document.querySelector('#download-summary').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob(['\uFEFF'+summary],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='foru-quote-request.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});}
// Catalog photographs are server rendered; pagination and filters enhance browsing.
document.querySelectorAll('[data-catalog]').forEach(catalog=>{
catalog.querySelectorAll('.catalog-thumbs').forEach(thumbs=>thumbs.addEventListener('click',event=>{const button=event.target.closest('button[data-gallery-src]');if(!button)return;const main=button.closest('.catalog-card').querySelector('.catalog-photo img');main.src=button.dataset.gallerySrc;main.alt=button.dataset.galleryAlt;thumbs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));
const cards=[...catalog.querySelectorAll('.catalog-card')],filters=[...catalog.querySelectorAll('[data-filter]')],more=catalog.querySelector('.catalog-more'),count=catalog.querySelector('.catalog-count'),pageSize=Number(catalog.dataset.pageSize)||12;let selected='all',limit=pageSize;
function update(){const matching=cards.filter(c=>selected==='all'||c.dataset.category===selected);cards.forEach(c=>c.hidden=true);matching.slice(0,limit).forEach(c=>c.hidden=false);more.hidden=matching.length<=limit;count.textContent=`แสดง ${Math.min(limit,matching.length)} จาก ${matching.length} ภาพ`;filters.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===selected)));}
filters.forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.filter;limit=pageSize;update();}));more.addEventListener('click',()=>{limit+=pageSize;update();});update();
});
if(form){const reference=new URLSearchParams(location.search).get('reference');if(reference&&/^[A-Z0-9-]{3,20}$/i.test(reference))form.elements.details.value='สนใจสินค้ารหัส '+reference+'\n';}

// Progressive reveals leave all content visible when motion is reduced or JS is unavailable.
if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.08});document.querySelectorAll('.intro,.section-heading,.details-band,.steps article,.journal-grid>a,.project-cta').forEach(el=>{el.classList.add('reveal-ready');observer.observe(el)});}


const requestedCategory=new URLSearchParams(location.search).get('category');if(requestedCategory){const filter=[...document.querySelectorAll('[data-filter]')].find(b=>b.dataset.filter===requestedCategory);if(filter)filter.click();}

// Stats strip smooth count-up on scroll
const statEls=[...document.querySelectorAll('.foru-stat-num[data-count]')];
if('IntersectionObserver' in window&&statEls.length&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  let started=false;
  const statObs=new IntersectionObserver(entries=>{
    if(started||!entries.some(e=>e.isIntersecting))return;
    started=true;
    statEls.forEach(el=>{
      const target=Number(el.dataset.count||0),suffix=el.dataset.suffix||'',t0=performance.now();
      const step=now=>{
        const p=Math.min((now-t0)/1100,1),eased=1-Math.pow(1-p,3);
        el.textContent=Math.round(target*eased).toLocaleString('en-US')+suffix;
        if(p<1)requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    statObs.disconnect();
  },{threshold:.25});
  statObs.observe(statEls[0]);
}
