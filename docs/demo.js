(() => {
  const demo = document.querySelector('[data-demo]');
  if (!demo) return;

  const workspace = demo.querySelector('.demo-workspace');
  const files = demo.querySelector('.demo-files');
  const wheel = demo.querySelector('.demo-wheel');
  const petals = demo.querySelector('.demo-petals');
  const label = demo.querySelector('.demo-wheel-label');
  const status = demo.querySelector('.demo-status');
  const modes = [...demo.querySelectorAll('[data-mode]')];
  const shortcuts = { Shift: 'convert', Control: 'tools', Alt: 'actions' };
  const labels = { convert: 'Çevir', tools: 'Alətlər', actions: 'Fayl əməliyyatları' };
  const options = {
    photo: {
      convert: [['PDF', 'şəkil.pdf'], ['PNG', 'şəkil.png'], ['WebP', 'şəkil.webp'], ['BMP', 'şəkil.bmp'], ['TIFF', 'şəkil.tiff'], ['AVIF', 'şəkil.avif']],
      tools: [['Şəkli kəs', 'şəkil-kəsilmiş.jpg'], ['Sıxışdır', 'şəkil-sıxılmış.jpg'], ['Qeyd əlavə et', 'şəkil-qeydli.jpg']],
    },
    pdfs: {
      convert: [['DOCX', 'sənəd.docx'], ['PNG', 'səhifə.png'], ['TXT', 'sənəd.txt']],
      tools: [['PDF-ləri birləşdir', 'birləşdirilmiş.pdf'], ['Sıxışdır', 'sıxılmış.pdf']],
      actions: [['Birləşdir və sıxışdır', 'birləşdirilmiş-sıxılmış.pdf']],
    },
    video: {
      convert: [['MP3', 'video.mp3'], ['MOV', 'video.mov'], ['WebM', 'video.webm'], ['GIF', 'video.gif']],
      tools: [['Videonu qısalt', 'video-qısa.mp4'], ['Səsi sil', 'video-səssiz.mp4'], ['Kadr çıxar', 'kadr.png']],
    },
  };
  const positions = new Map([...files.children].map(icon => [icon, {
    x: parseFloat(icon.style.getPropertyValue('--x')) / 100,
    y: parseFloat(icon.style.getPropertyValue('--y')) / 100,
  }]));
  const initial = new Map(positions);
  const initialStatus = status.textContent;
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  let selected = files.querySelector('[aria-pressed="true"]');
  let anchor;
  let drag;
  let target;
  let suppressClick;

  function fileName(icon) {
    return icon.querySelector('.demo-filename').textContent;
  }

  function space(icon) {
    return {
      x: Math.max(workspace.clientWidth - icon.offsetWidth, 1),
      y: Math.max(workspace.clientHeight - icon.offsetHeight, 1),
    };
  }

  function place(icon, position) {
    positions.set(icon, position);
    const room = space(icon);
    icon.style.setProperty('--x', position.x * room.x + 'px');
    icon.style.setProperty('--y', position.y * room.y + 'px');
  }

  function select(icon) {
    selected?.setAttribute('aria-pressed', 'false');
    selected = icon;
    selected?.setAttribute('aria-pressed', 'true');
  }

  function highlight(choice) {
    if (choice === target) return;
    target?.classList.remove('is-target');
    target = choice;
    target?.classList.add('is-target');
  }

  function closeWheel() {
    if (wheel.contains(document.activeElement)) selected?.focus({ preventScroll: true });
    wheel.hidden = true;
    for (const button of modes) button.setAttribute('aria-pressed', 'false');
    highlight(null);
  }

  function placeWheel() {
    const half = wheel.offsetWidth / 2;
    const width = workspace.clientWidth;
    const height = workspace.clientHeight;
    wheel.style.setProperty('--left', clamp(anchor.x * width, half + 4, width - half - 4) + 'px');
    wheel.style.setProperty('--top', clamp(anchor.y * height, half + 4, height - half - 4) + 'px');
  }

  function point(event) {
    const bounds = workspace.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function openWheel(next, at) {
    if (!selected?.dataset.file) return;
    const configured = options[selected.dataset.file][next] || [];
    const name = fileName(selected);
    const choices = next === 'actions' ? [
      ...configured,
      ['Köçür', name.includes('.') ? name.replace(/(\.[^.]+)$/, '-nüsxə$1') : name + ' - nüsxə'],
      ['Daşı'], ['Paylaş'],
    ] : configured;
    const shouldFocus = !drag && wheel.contains(document.activeElement);
    for (const button of modes) button.setAttribute('aria-pressed', String(button.dataset.mode === next));
    label.textContent = labels[next];
    highlight(null);
    const step = 360 / choices.length;
    wheel.style.setProperty('--step', step + 'deg');
    wheel.style.setProperty('--start', -step / 2 + 'deg');
    petals.replaceChildren(...choices.map(([name, result], index) => {
      const option = document.createElement('button');
      const angle = index * step * Math.PI / 180;
      option.type = 'button';
      option.textContent = name;
      option.dataset.result = result || '';
      option.style.setProperty('--x', (50 + Math.sin(angle) * 34) + '%');
      option.style.setProperty('--y', (50 - Math.cos(angle) * 34) + '%');
      return option;
    }));
    wheel.hidden = false;
    if (at || !anchor) {
      const origin = at || { x: workspace.clientWidth / 2, y: workspace.clientHeight / 2 };
      anchor = { x: origin.x / workspace.clientWidth, y: origin.y / workspace.clientHeight };
    }
    placeWheel();
    if (shouldFocus) petals.firstElementChild.focus({ preventScroll: true });
  }

  function choiceAt(event) {
    if (wheel.hidden) return null;
    const button = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-result]');
    if (button && petals.contains(button)) return button;
    const bounds = wheel.getBoundingClientRect();
    const dx = event.clientX - (bounds.left + bounds.width / 2);
    const dy = event.clientY - (bounds.top + bounds.height / 2);
    const radius = Math.hypot(dx, dy) / (bounds.width / 2);
    if (radius < .33 || radius > 1) return null;
    const angle = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
    return petals.children[Math.round(angle / 360 * petals.children.length) % petals.children.length];
  }

  function createResult(name) {
    const icon = document.createElement('button');
    const fileType = document.createElement('span');
    const title = document.createElement('span');
    icon.type = 'button';
    icon.dataset.output = '';
    icon.title = name;
    icon.className = 'demo-created';
    icon.setAttribute('aria-pressed', 'false');
    fileType.className = 'demo-file-icon';
    fileType.setAttribute('aria-hidden', 'true');
    fileType.textContent = name.includes('.') ? name.split('.').at(-1).toUpperCase() : 'FAYL';
    title.className = 'demo-filename';
    title.textContent = name;
    icon.append(fileType, title);
    files.append(icon);
    const room = space(icon);
    const columns = Math.max(2, Math.floor(workspace.clientWidth / (icon.offsetWidth + 8)));
    const rows = Math.max(2, Math.floor(workspace.clientHeight / (icon.offsetHeight + 8)));
    let best = { x: .93, y: .9 };
    let clearance = -1;
    for (let index = 0; index < columns * rows; index++) {
      const point = {
        x: .04 + .92 * (index % columns) / (columns - 1),
        y: .94 - .88 * Math.floor(index / columns) / (rows - 1),
      };
      const nearest = Math.min(...[...positions.values()].map(({ x, y }) =>
        Math.hypot((x - point.x) * room.x, (y - point.y) * room.y)));
      if (nearest > clearance) {
        best = point;
        clearance = nearest;
      }
    }
    place(icon, best);
    wireIcon(icon);
    select(icon);
  }

  function run(choice) {
    const source = fileName(selected);
    const action = choice.textContent;
    const result = choice.dataset.result;
    closeWheel();
    if (result) {
      const existing = [...files.querySelectorAll('[data-output]')].find(icon => fileName(icon) === result);
      if (existing) select(existing);
      else createResult(result);
      status.textContent = source + ' → ' + result + ' · Nəticə masaüstündədir.';
    } else {
      status.textContent = action + ' əməliyyatı seçildi · ' + source + '.';
    }
  }

  function stopDrag(restore) {
    if (!drag) return;
    const { icon, id, start, moved } = drag;
    drag = null;
    icon.classList.remove('is-dragging');
    if (restore) place(icon, start);
    if (moved) suppressClick = icon;
    if (icon.hasPointerCapture(id)) icon.releasePointerCapture(id);
    highlight(null);
  }

  function wireIcon(icon) {
    icon.addEventListener('click', event => {
      if (suppressClick === icon && event.detail > 0) return;
      const wasSelected = selected === icon;
      select(icon);
      if (icon.dataset.file && (event.detail === 0 || event.detail === 2)) {
        if (event.detail === 0 && !wheel.hidden && wasSelected) {
          petals.firstElementChild.focus({ preventScroll: true });
          return;
        }
        openWheel('convert');
        if (event.detail === 0) petals.firstElementChild.focus({ preventScroll: true });
      } else if (!wasSelected) {
        closeWheel();
      }
    });

    icon.addEventListener('contextmenu', event => event.preventDefault());
    icon.addEventListener('pointerdown', event => {
      if (drag || !event.isPrimary || event.button !== 0) return;
      suppressClick = null;
      closeWheel();
      select(icon);
      icon.focus({ preventScroll: true });
      icon.setPointerCapture(event.pointerId);
      const at = point(event);
      const start = positions.get(icon);
      const room = space(icon);
      drag = {
        icon, id: event.pointerId, start, at, current: at, moved: false,
        offset: { x: at.x - start.x * room.x, y: at.y - start.y * room.y },
      };
      const held = event.altKey ? 'actions' : event.ctrlKey ? 'tools' : event.shiftKey ? 'convert' : '';
      if (held) openWheel(held, at);
    });

    icon.addEventListener('pointermove', event => {
      if (drag?.id !== event.pointerId || drag.icon !== icon) return;
      drag.current = point(event);
      if (!drag.moved && Math.hypot(drag.current.x - drag.at.x, drag.current.y - drag.at.y) < 5) return;
      if (!drag.moved) {
        drag.moved = true;
        icon.classList.add('is-dragging');
      }
      const room = space(icon);
      place(icon, {
        x: clamp((drag.current.x - drag.offset.x) / room.x, .004, .996),
        y: clamp((drag.current.y - drag.offset.y) / room.y, .008, .992),
      });
      highlight(choiceAt(event));
    });

    icon.addEventListener('pointerup', event => {
      if (drag?.id !== event.pointerId || drag.icon !== icon) return;
      const moved = drag.moved;
      const choice = moved && choiceAt(event);
      stopDrag(Boolean(choice));
      if (choice) run(choice);
      else if (moved) {
        closeWheel();
        status.textContent = fileName(icon) + ' masaüstündə köçürüldü.';
      }
    });

    const cancel = event => {
      if (drag?.id !== event.pointerId || drag.icon !== icon) return;
      stopDrag(true);
      closeWheel();
    };
    icon.addEventListener('pointercancel', cancel);
    icon.addEventListener('lostpointercapture', cancel);
  }

  for (const icon of files.children) wireIcon(icon);
  for (const button of modes) button.addEventListener('click', () => {
    if (!selected?.dataset.file) select(initial.keys().next().value);
    openWheel(button.dataset.mode, { x: workspace.clientWidth / 2, y: workspace.clientHeight / 2 });
  });
  petals.addEventListener('click', event => {
    const choice = event.target.closest('[data-result]');
    if (choice) run(choice);
  });
  workspace.addEventListener('pointerdown', event => {
    if (!event.target.closest('button') && !wheel.contains(event.target) && !drag) {
      closeWheel();
      select(null);
    }
  });

  demo.addEventListener('keydown', event => {
    const next = Object.hasOwn(shortcuts, event.key) ? shortcuts[event.key] : '';
    if (next && !event.repeat && selected?.dataset.file) {
      event.preventDefault();
      openWheel(next, drag && (wheel.hidden ? drag.current : undefined));
    }
    if (event.key === 'Escape' && (drag || !wheel.hidden)) {
      event.preventDefault();
      stopDrag(true);
      closeWheel();
      status.textContent = initialStatus;
    }
    if (!wheel.hidden && ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      const choices = [...petals.children];
      const index = choices.indexOf(document.activeElement);
      const direction = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
      choices[index < 0 ? 0 : (index + direction + choices.length) % choices.length].focus({ preventScroll: true });
    }
  });

  demo.querySelector('.demo-reset').addEventListener('click', () => {
    stopDrag(true);
    closeWheel();
    anchor = null;
    for (const icon of files.querySelectorAll('[data-output]')) {
      icon.remove();
      positions.delete(icon);
    }
    for (const [icon, position] of initial) place(icon, position);
    select(initial.keys().next().value);
    status.textContent = initialStatus;
  });

  function layout() {
    if (!workspace.clientWidth) return;
    for (const [icon, position] of positions) place(icon, position);
    if (!wheel.hidden) placeWheel();
  }
  new ResizeObserver(layout).observe(workspace);
  layout();
})();
