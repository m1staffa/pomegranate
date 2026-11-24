(() => {
  const demo = document.querySelector('[data-demo]');
  if (!demo) return;

  const modes = Array.from(demo.querySelectorAll('[data-mode]'));
  const files = Array.from(demo.querySelectorAll('[data-file]'));
  const petals = demo.querySelector('.demo-petals');
  const center = demo.querySelector('.demo-center');
  const status = demo.querySelector('.demo-status');
  const labels = { convert: 'Çevir', tools: 'Alətlər', actions: 'Fayl əməliyyatları' };
  const names = { photo: 'şəkil.jpg', pdfs: 'iki PDF faylı', video: 'video.mp4' };
  const positions = [[50, 14], [80, 31], [80, 69], [50, 86], [20, 69], [20, 31]];
  const options = {
    photo: {
      convert: [['PDF', 'şəkil.pdf'], ['PNG', 'şəkil.png'], ['WebP', 'şəkil.webp'], ['BMP', 'şəkil.bmp'], ['TIFF', 'şəkil.tiff'], ['AVIF', 'şəkil.avif']],
      tools: [['Şəkli kəs', 'kəsilmiş şəkil'], ['Sıxışdır', 'sıxışdırılmış şəkil'], ['Qeyd əlavə et', 'qeydli şəkil']],
    },
    pdfs: {
      convert: [['DOCX', 'DOCX sənədləri'], ['PNG', 'PNG şəkilləri'], ['TXT', 'mətn faylları']],
      tools: [['PDF-ləri birləşdir', 'Birləşdirilmiş.pdf'], ['Sıxışdır', 'sıxışdırılmış PDF-lər']],
      actions: [['Birləşdir və sıxışdır', 'Birləşdirilmiş və sıxışdırılmış.pdf']],
    },
    video: {
      convert: [['MP3', 'video.mp3'], ['MOV', 'video.mov'], ['WebM', 'video.webm'], ['GIF', 'video.gif']],
      tools: [['Videonu qısalt', 'qısaldılmış video'], ['Səsi sil', 'səssiz video'], ['Kadr çıxar', 'kadr şəkli']],
    },
  };
  const commonActions = [['Köçür', 'fayl nüsxəsi'], ['Daşı', 'yeni fayl yeri'], ['Paylaş', 'paylaşma pəncərəsi']];
  let file = 'photo';
  let mode = 'convert';
  let drag = null;

  function select(nextFile, nextMode) {
    file = nextFile;
    mode = nextMode;
    for (const button of files) button.setAttribute('aria-pressed', String(button.dataset.file === file));
    for (const button of modes) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    const choices = options[file][mode] || [];
    const current = mode === 'actions' ? [...choices, ...commonActions] : choices;
    center.textContent = labels[mode];
    petals.replaceChildren(...current.map(([name, result], index) => {
      const petal = document.createElement('button');
      petal.type = 'button';
      petal.dataset.result = result;
      petal.textContent = name;
      petal.style.setProperty('--x', positions[index][0] + '%');
      petal.style.setProperty('--y', positions[index][1] + '%');
      return petal;
    }));
  }

  function run(petal) {
    status.textContent = 'Sınaq tamamlandı — ' + names[file] + ' → ' + petal.dataset.result + '.';
  }

  function choiceAt(event) {
    const button = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-result]');
    return button && petals.contains(button) ? button : null;
  }

  function setTarget(button) {
    for (const option of petals.children) option.classList.toggle('is-target', button === option);
  }

  function clearDrag() {
    drag?.ghost?.remove();
    drag = null;
    setTarget(null);
  }

  for (const button of modes) button.addEventListener('click', () => select(file, button.dataset.mode));
  petals.addEventListener('click', event => {
    const petal = event.target.closest('[data-result]');
    if (petal) run(petal);
  });

  for (const button of files) {
    button.addEventListener('click', () => {
      if (file !== button.dataset.file) select(button.dataset.file, mode);
    });
    button.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      clearDrag();
      select(button.dataset.file, mode);
      button.focus({ preventScroll: true });
      button.setPointerCapture(event.pointerId);
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, ghost: null };
    });
    button.addEventListener('pointermove', event => {
      if (drag?.id !== event.pointerId) return;
      if (!drag.ghost && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) >= 7) {
        drag.ghost = document.createElement('span');
        drag.ghost.className = 'demo-ghost';
        drag.ghost.setAttribute('aria-hidden', 'true');
        drag.ghost.textContent = button.querySelector('.demo-file-icon').textContent;
        document.body.append(drag.ghost);
      }
      if (!drag.ghost) return;
      drag.ghost.style.left = event.clientX + 'px';
      drag.ghost.style.top = event.clientY + 'px';
      setTarget(choiceAt(event));
    });
    button.addEventListener('pointerup', event => {
      if (drag?.id !== event.pointerId) return;
      const petal = drag.ghost ? choiceAt(event) : null;
      clearDrag();
      if (petal) run(petal);
    });
    button.addEventListener('lostpointercapture', clearDrag);
    button.addEventListener('pointercancel', clearDrag);
  }

  demo.addEventListener('keydown', event => {
    const next = { Shift: 'convert', Control: 'tools', Alt: 'actions' }[event.key];
    if (next && !event.repeat) {
      event.preventDefault();
      select(file, next);
    }
    if (event.key === 'Escape') clearDrag();
  });
  select(file, mode);
})();
