'use strict';

// Select elements and escape user input before inserting it into the preview.
const $  = id  => document.getElementById(id);
const esc = str => (str || '')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');


function formatDisplayUrl(value) {
  return value
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '');
}

function setHint(el, len, max) {
  if (!el) return;
  el.textContent = `${len} / ${max}`;
  el.classList.toggle('warn', len >= max * 0.85 && len < max);
  el.classList.toggle('over', len >= max);
}

// Store the current form data used by the live preview.
const S = {
  photo: null,
  exps:  [],
  skills: [],
  orgEnabled: true,
};
let _seq = 0;

const inpName = $('inp-name'), inpEmail = $('inp-email'),
      inpPhone = $('inp-phone'), inpLinkedin = $('inp-linkedin'),
      inpInstagram = $('inp-instagram'), inpProfile = $('inp-profile');

const cvName = $('cv-name'), cvEmail = $('cv-email'),
      cvPhone = $('cv-phone'), cvLinkedin = $('cv-linkedin'),
      cvInstagram = $('cv-instagram'), cvProfile = $('cv-profile'),
      cvPhoto = $('cv-photo'), cvPhotoPh = $('cv-photo-ph'),
      cvExpList = $('cv-exp-list'), cvEduList = $('cv-edu-list'),
      cvOrgList = $('cv-org-list'), cvSkillsList = $('cv-skills-list');

const photoInput = $('photo-input'), photoThumb = $('photo-thumb'),
      photoPh = $('photo-ph'), btnRemovePhoto = $('btn-remove-photo');

const btnDownload = $('btn-download'), btnAddExp = $('btn-add-exp');
const expEntriesEl = $('exp-entries'), skillsEl = $('skills-entries');
const orgSection = $('fs-org'), orgBody = $('org-body'), btnToggleOrg = $('btn-toggle-org'), cvOrgSection = $('cv-org-section');

const cropModal = $('crop-modal'), cropImage = $('crop-image'),
      cropClose = $('crop-close'), cropCancel = $('crop-cancel'),
      cropConfirm = $('crop-confirm');

const previewArea = $('preview-area'), cvScaler = $('cv-scaler');
const CV_W = 794;

const tabForm = $('tab-form'), tabPreview = $('tab-preview'),
      formPanel = $('form-panel'), previewPanel = $('preview-panel');

// Switch between the form and preview panels on mobile screens.
function setTab(tab) {
  const mobile = window.innerWidth <= 860;
  if (!mobile) {
    formPanel.classList.remove('tab-hidden');
    previewPanel.classList.remove('tab-hidden');
    tabForm.classList.remove('active');
    tabPreview.classList.remove('active');
    return;
  }
  if (tab === 'form') {
    formPanel.classList.remove('tab-hidden');
    previewPanel.classList.add('tab-hidden');
    tabForm.classList.add('active');
    tabPreview.classList.remove('active');
  } else {
    formPanel.classList.add('tab-hidden');
    previewPanel.classList.remove('tab-hidden');
    tabForm.classList.remove('active');
    tabPreview.classList.add('active');
    requestAnimationFrame(scaleCV);
  }
}
tabForm.addEventListener('click',    () => setTab('form'));
tabPreview.addEventListener('click', () => setTab('preview'));
window.addEventListener('resize', () => {
  setTab(window.innerWidth > 860 ? '_desktop' : 'form');
  scaleCV();
});

// Sync personal information fields into the CV preview.
function syncFields() {
  cvName.textContent      = inpName.value.trim()      || 'FULL NAME';
  cvEmail.textContent     = inpEmail.value.trim()     || 'email';
  cvPhone.textContent     = inpPhone.value.trim()     || 'phone number';
  cvLinkedin.textContent  = formatDisplayUrl(inpLinkedin.value.trim()) || 'linkedin url';
  cvInstagram.textContent = inpInstagram.value.trim() || 'instagram username';
  cvProfile.textContent   = inpProfile.value.trim()
    || 'Your professional summary will appear here after you fill in the form...';
  setHint($('profile-chars'), inpProfile.value.length, 400);
}
[inpName, inpEmail, inpPhone, inpLinkedin, inpInstagram, inpProfile]
  .forEach(el => el.addEventListener('input', syncFields));

// Render education entries in the CV preview.
function syncEdu() {
  const pts = [];
  for (let i = 0; i < 2; i++) {
    const el = $(`edu-${i}`);
    setHint($(`edu-${i}-chars`), (el?.value||'').length, 100);
    const v = (el?.value||'').trim();
    if (v) pts.push(v);
  }
  cvEduList.innerHTML = pts.length
    ? pts.map(v => `<li>${esc(v)}</li>`).join('')
    : '<li class="cv-empty">No education entries yet.</li>';
}
for (let i = 0; i < 2; i++) $(`edu-${i}`)?.addEventListener('input', syncEdu);

// Hide or restore the optional organizations section without deleting its input values.
function setOrgEnabled(enabled) {
  S.orgEnabled = enabled;
  if (orgBody) orgBody.classList.toggle('hidden', !enabled);
  if (btnToggleOrg) {
    btnToggleOrg.textContent = enabled ? 'Remove Section' : '+ Show Section Again';
    btnToggleOrg.classList.toggle('is-danger', enabled);
  }
  if (orgSection) orgSection.classList.toggle('section-disabled', !enabled);
  syncOrgs();
}

function syncOrgs() {
  const pts = [];
  for (let i = 0; i < 2; i++) {
    const el = $(`org-${i}`);
    setHint($(`org-${i}-chars`), (el?.value||'').length, 100);
    const v = (el?.value||'').trim();
    if (v) pts.push(v);
  }

  if (!S.orgEnabled) {
    if (cvOrgSection) cvOrgSection.classList.add('hidden');
    return;
  }

  if (cvOrgSection) cvOrgSection.classList.remove('hidden');
  cvOrgList.innerHTML = pts.length
    ? pts.map(v => `<li>${esc(v)}</li>`).join('')
    : '<li class="cv-empty">No organization entries yet.</li>';
}
for (let i = 0; i < 2; i++) $(`org-${i}`)?.addEventListener('input', syncOrgs);
btnToggleOrg?.addEventListener('click', () => setOrgEnabled(!S.orgEnabled));

const SKILL_MAX = 100;
const SKILL_PH = 'Example: Skill Category: skill 1, skill 2, skill 3';

function addSkill(value = '') {
  S.skills.push(value);
  renderSkillsForm();
  syncSkillsPreview();
}

// Render dynamic skill inputs so users can add only the rows they need.
function renderSkillsForm() {
  skillsEl.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'skills-wrap';

  S.skills.forEach((val, i) => {
    const row = document.createElement('div');
    row.className = 'skill-row';
    const hid = `sk-${i}-ch`, iid = `sk-${i}-inp`;
    row.innerHTML = `
      <label for="${iid}">
        Skill ${i + 1}
        <span class="chint" id="${hid}">${val.length} / ${SKILL_MAX}</span>
      </label>
      <div class="skill-input-row">
        <input type="text" id="${iid}" maxlength="${SKILL_MAX}" value="${esc(val)}" placeholder="${SKILL_PH}" />
        <button type="button" class="btn-del-skill" data-i="${i}" aria-label="Remove skill">✕</button>
      </div>
    `;
    wrap.appendChild(row);
    setHint(row.querySelector(`#${hid}`), val.length, SKILL_MAX);

    row.querySelector('input').addEventListener('input', ev => {
      S.skills[i] = ev.target.value;
      setHint($(`sk-${i}-ch`), ev.target.value.length, SKILL_MAX);
      syncSkillsPreview();
    });

    row.querySelector('.btn-del-skill').addEventListener('click', () => {
      S.skills.splice(i, 1);
      renderSkillsForm();
      syncSkillsPreview();
    });
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn-add-skill';
  addBtn.textContent = '+ Add Skill';
  addBtn.addEventListener('click', () => addSkill());

  if (!S.skills.length) {
    const empty = document.createElement('p');
    empty.className = 'form-empty-note';
    empty.textContent = 'No skills yet. Click the button below to add one.';
    wrap.appendChild(empty);
  }

  skillsEl.appendChild(wrap);
  skillsEl.appendChild(addBtn);
}

function syncSkillsPreview() {
  const pts = S.skills.map(s => s.trim()).filter(Boolean);
  cvSkillsList.innerHTML = pts.length
    ? pts.map(v => `<li>${esc(v)}</li>`).join('')
    : '<li class="cv-empty">No skills added yet.</li>';
}

// Limit point length based on how many bullet points an entry has.
const PT_MAX_LOW  = 200;
const PT_MAX_HIGH = 100

function ptMax(n) { return n <= 2 ? PT_MAX_LOW : PT_MAX_HIGH; }

function addExp() {
  const id = ++_seq;
  S.exps.push({ id, title: '', title2: '', points: [''] });
  return id;
}

function buildExpCard(entry) {
  const card = document.createElement('div');
  card.className = 'exp-card';
  card.dataset.id = entry.id;
  expEntriesEl.appendChild(card);
  refreshExpCard(card, entry);
}

// Rebuild one experience or project card after adding or removing points.
function refreshExpCard(card, entry) {
  const n = entry.points.length;
  const mx = ptMax(n);

  const ptsHTML = entry.points.map((pt, pi) => `
    <div class="exp-pt-row" data-pi="${pi}">
      <label for="ep-${entry.id}-${pi}">
        Point ${pi + 1}
        <span class="chint" id="ep-${entry.id}-${pi}-ch">${pt.length} / ${mx}</span>
      </label>
      <input type="text" id="ep-${entry.id}-${pi}" maxlength="${mx}" value="${esc(pt)}"
        placeholder="Describe the achievement, responsibility, or project impact" />
      ${n > 1 ? `<div class="exp-pt-actions"><button class="btn-del-pt" data-pi="${pi}">✕ Remove Point</button></div>` : ''}
    </div>
  `).join('');

  card.innerHTML = `
    <div class="exp-card-head">
      <span class="exp-card-label">Experience / Project ${entry.id}</span>
      <button class="exp-card-del" title="Remove">✕</button>
    </div>
    <div class="exp-field">
      <label for="et-${entry.id}-1">
        Title Line 1
        <span class="chint" id="et-${entry.id}-1-ch">${entry.title.length} / 80</span>
      </label>
      <input type="text" id="et-${entry.id}-1" maxlength="80" value="${esc(entry.title)}"
        placeholder="Role / Project Name | Organization | Year" />
    </div>
    <div class="exp-field">
      <label for="et-${entry.id}-2">
        Title Line 2 <span class="opt-tag">optional</span>
        <span class="chint" id="et-${entry.id}-2-ch">${entry.title2.length} / 80</span>
      </label>
      <input type="text" id="et-${entry.id}-2" maxlength="80" value="${esc(entry.title2)}"
        placeholder="Subtitle, tech stack, or additional context" />
    </div>
    <div class="exp-pts">${ptsHTML}</div>
    ${n < 6 ? `<button class="btn-add-pt">+ Add Point</button>` : ''}
  `;

  setHint($(`et-${entry.id}-1-ch`), entry.title.length,  80);
  setHint($(`et-${entry.id}-2-ch`), entry.title2.length, 80);
  entry.points.forEach((pt, pi) => setHint($(`ep-${entry.id}-${pi}-ch`), pt.length, mx));

  const t1 = card.querySelector(`#et-${entry.id}-1`);
  const t2 = card.querySelector(`#et-${entry.id}-2`);
  t1.addEventListener('input', () => { entry.title  = t1.value; setHint($(`et-${entry.id}-1-ch`), t1.value.length, 80); syncExpPreview(); });
  t2.addEventListener('input', () => { entry.title2 = t2.value; setHint($(`et-${entry.id}-2-ch`), t2.value.length, 80); syncExpPreview(); });

  entry.points.forEach((_, pi) => {
    const inp = card.querySelector(`#ep-${entry.id}-${pi}`);
    if (!inp) return;
    inp.addEventListener('input', () => {
      entry.points[pi] = inp.value;
      setHint($(`ep-${entry.id}-${pi}-ch`), inp.value.length, mx);
      syncExpPreview();
    });
  });

  card.querySelector('.exp-card-del').addEventListener('click', () => {
    S.exps = S.exps.filter(e => e.id !== entry.id);
    card.remove();
    syncExpPreview();
  });

  card.querySelector('.btn-add-pt')?.addEventListener('click', () => {
    entry.points.push('');
    refreshExpCard(card, entry);
    syncExpPreview();
  });

  card.querySelectorAll('.btn-del-pt').forEach(btn => {
    btn.addEventListener('click', () => {
      const pi = parseInt(btn.dataset.pi);
      entry.points.splice(pi, 1);
      refreshExpCard(card, entry);
      syncExpPreview();
    });
  });
}

function renderExpForm() {
  expEntriesEl.innerHTML = '';
  S.exps.forEach(e => buildExpCard(e));
  syncExpPreview();
}

function syncExpPreview() {
  if (!S.exps.length) {
    cvExpList.innerHTML = '<p class="cv-empty">Add an experience or project using the form.</p>';
    return;
  }
  cvExpList.innerHTML = '';
  S.exps.forEach(e => {
    const div = document.createElement('div');
    div.className = 'cv-exp-entry';
    const titleParts = [e.title, e.title2].filter(Boolean);
    const titleHtml  = titleParts.map(esc).join('<br>');
    const pts = e.points.filter(p => p.trim());
    div.innerHTML = `
      <div class="cv-exp-title">${titleHtml || '<em style="color:#aaa;font-weight:400">Title not added yet</em>'}</div>
      ${pts.length ? `<ul class="cv-exp-pts">${pts.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    `;
    cvExpList.appendChild(div);
  });
}

btnAddExp.addEventListener('click', () => {
  addExp();
  renderExpForm();
});

let cropper = null;

photoInput.addEventListener('change', e => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => openCrop(ev.target.result);
  reader.readAsDataURL(file);
  photoInput.value = '';
});

// Open the image cropper before applying a photo to the CV.
function openCrop(src) {
  cropImage.src = src;
  cropModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  cropImage.onload = () => {
    if (cropper) cropper.destroy();
    cropper = new Cropper(cropImage, {
      aspectRatio: 1, viewMode: 2, dragMode: 'move',
      autoCropArea: 0.85, background: false,
      guides: true, center: true, highlight: false, responsive: true,
    });
  };
}

function closeCrop() {
  cropModal.classList.add('hidden');
  document.body.style.overflow = '';
  if (cropper) { cropper.destroy(); cropper = null; }
}

cropClose.addEventListener('click',  closeCrop);
cropCancel.addEventListener('click', closeCrop);
cropModal.addEventListener('click', e => { if (e.target === cropModal) closeCrop(); });

cropConfirm.addEventListener('click', () => {
  if (!cropper) return;
  const canvas = cropper.getCroppedCanvas({
    width: 420, height: 420,
    imageSmoothingEnabled: true, imageSmoothingQuality: 'high',
  });
  applyPhoto(canvas.toDataURL('image/jpeg', 0.93));
  closeCrop();
});

function applyPhoto(dataUrl) {
  S.photo = dataUrl;
  photoThumb.src = dataUrl;
  photoThumb.classList.remove('hidden');
  photoPh.classList.add('hidden');
  btnRemovePhoto.classList.remove('hidden');
  cvPhoto.src = dataUrl;
  cvPhoto.classList.remove('hidden');
  cvPhotoPh.classList.add('hidden');
}

btnRemovePhoto.addEventListener('click', () => {
  S.photo = null;
  photoThumb.src = '';
  photoThumb.classList.add('hidden');
  photoPh.classList.remove('hidden');
  btnRemovePhoto.classList.add('hidden');
  cvPhoto.src = '';
  cvPhoto.classList.add('hidden');
  cvPhotoPh.classList.remove('hidden');
});

// Scale the A4 preview to fit inside the available screen width.
function scaleCV() {
  const pad = 32;
  const avail = previewArea.clientWidth - pad;
  const scale = Math.min(1, avail / CV_W);
  cvScaler.style.transform = `scale(${scale})`;
  cvScaler.style.transformOrigin = 'top center';
  const cvPage = cvScaler.querySelector('.cv-page');
  if (cvPage) cvScaler.style.height = (cvPage.offsetHeight * scale) + 'px';
}
const ro = new ResizeObserver(scaleCV);
ro.observe(previewArea);

// Export the unscaled CV preview as one exact PDF page.
btnDownload.addEventListener('click', async () => {
  const overlay = document.createElement('div');
  overlay.className = 'gen-overlay';
  overlay.innerHTML = '<div class="spinner"></div><p>Generating your PDF…</p>';
  document.body.appendChild(overlay);
  btnDownload.classList.add('loading');

  const savedT = cvScaler.style.transform;
  const savedH = cvScaler.style.height;
  const cvPage = $('cv-page');
  const savedPageW = cvPage.style.width;
  const savedPageH = cvPage.style.height;
  const savedPageMinH = cvPage.style.minHeight;

  // Store the current mobile tab state so it can be restored after export.
  const savedFormHidden = formPanel.classList.contains('tab-hidden');
  const savedPreviewHidden = previewPanel.classList.contains('tab-hidden');
  const savedTabFormActive = tabForm.classList.contains('active');
  const savedTabPreviewActive = tabPreview.classList.contains('active');

  try {
    // Keep the preview panel visible while html2canvas captures the CV page.
    formPanel.classList.add('tab-hidden');
    previewPanel.classList.remove('tab-hidden');
    tabForm.classList.remove('active');
    tabPreview.classList.add('active');

    cvScaler.style.transform = 'none';
    cvScaler.style.height = 'auto';
    cvPage.style.width = `${CV_W}px`;
    cvPage.style.height = '1123px';
    cvPage.style.minHeight = '1123px';

    // Wait until web fonts are ready before capturing the PDF layout.
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    await new Promise(r => setTimeout(r, 250));

    const rawName = inpName.value.trim() || 'FULL NAME';
    const safeName = rawName.replace(/[\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim() || 'FULL NAME';
    const filename = `${safeName} CV.pdf`;

    if (typeof html2canvas === 'undefined') throw new Error('html2canvas is not loaded');
    const jsPDFCtor = window.jspdf?.jsPDF || window.jsPDF;
    if (!jsPDFCtor) throw new Error('jsPDF is not loaded');

    const canvas = await html2canvas(cvPage, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: CV_W,
      height: 1123,
      windowWidth: CV_W,
      windowHeight: 1123,
      backgroundColor: '#ffffff',
      imageTimeout: 20000,
      scrollX: 0,
      scrollY: 0,
      onclone: doc => {
        const clonedPage = doc.getElementById('cv-page');
        if (clonedPage) {
          clonedPage.style.width = `${CV_W}px`;
          clonedPage.style.height = '1123px';
          clonedPage.style.minHeight = '1123px';
          clonedPage.style.overflow = 'hidden';
          clonedPage.style.boxShadow = 'none';
        }
        const img = doc.getElementById('cv-photo');
        if (img && S.photo) {
          img.src = S.photo;
          img.style.display = 'block';
        }
      },
    });

    const pdf = new jsPDFCtor({
      orientation: 'portrait',
      unit: 'px',
      format: [CV_W, 1123],
      compress: true,
      hotfixes: ['px_scaling'],
    });

    const imageData = canvas.toDataURL('image/jpeg', 0.98);
    pdf.addImage(imageData, 'JPEG', 0, 0, CV_W, 1123, undefined, 'FAST');
    pdf.save(filename);
  } catch(err) {
    console.error('PDF error:', err);
    alert(`Failed to generate the PDF: ${err.message || 'Unknown error'}. Please try again.`);
  } finally {
    cvPage.style.width = savedPageW;
    cvPage.style.height = savedPageH;
    cvPage.style.minHeight = savedPageMinH;
    cvScaler.style.transform = savedT;
    cvScaler.style.height = savedH;

    // Restore the previous tab state after the PDF export finishes.
    formPanel.classList.toggle('tab-hidden', savedFormHidden);
    previewPanel.classList.toggle('tab-hidden', savedPreviewHidden);
    tabForm.classList.toggle('active', savedTabFormActive);
    tabPreview.classList.toggle('active', savedTabPreviewActive);

    scaleCV();
    overlay.remove();
    btnDownload.classList.remove('loading');
  }
});

// Initialize the default form state and preview.
function init() {
  addExp();
  renderExpForm();
  renderSkillsForm();
  syncFields();
  syncEdu();
  setOrgEnabled(true);
  syncSkillsPreview();
  requestAnimationFrame(scaleCV);
  if (window.innerWidth <= 860) setTab('form');
}

init();
