/* eslint-disable no-console */
(() => {
  const $ = (sel) => document.querySelector(sel);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  const els = {
    progressFill: $('#progressFill'),
    progressLabel: $('#progressLabel'),
    btnGenerate: $('#btnGenerate'),
    btnCopy: $('#btnCopy'),
    btnClear: $('#btnClear'),
    btnExample: $('#btnExample'),
    statusText: $('#statusText'),
    countHint: $('#countHint'),
    pairsMeta: $('#pairsMeta'),
    pairsGrid: $('#pairsGrid'),
    board: $('#board'),
    toast: $('#toast')
  };

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove('show'), 1600);
  }

  function getFields() {
    return [...document.querySelectorAll('.num')];
  }

  function focusField(idx) {
    const fields = getFields();
    const el = fields[clamp(idx, 0, fields.length - 1)];
    el?.focus();
    el?.select?.();
  }

  function isValidDigit(v) {
    return /^[0-9]$/.test(v);
  }

  function readValues() {
    const fields = getFields();
    const values = fields.map((f) => f.value.trim());
    const filled = values.filter((v) => v !== '').length;
    const allValid = values.every((v) => isValidDigit(v));
    return {values, filled, allValid};
  }

  function buildBoard() {
    els.board.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.idx = String(i);

      const inner = document.createElement('div');
      inner.className = 'cellInner';
      inner.textContent = '—';

      const tag = document.createElement('div');
      tag.className = 'cellTag';
      tag.textContent = `#${i + 1}`;

      cell.appendChild(inner);
      cell.appendChild(tag);
      els.board.appendChild(cell);
    }
  }

  function syncBoardCell(index, value) {
    const cell = document.querySelector(`.cell[data-idx="${index}"]`);
    if (!cell) return;
    const inner = cell.querySelector('.cellInner');

    cell.dataset.animate = 'flip';
    requestAnimationFrame(() => {
      inner.textContent = value === '' ? '—' : value;
      cell.dataset.animate = 'pop';
      setTimeout(() => (cell.dataset.animate = ''), 520);
    });
  }

  function distributeDigits(startIdx, digits) {
    const fields = getFields();
    let i = startIdx;
    for (const ch of digits) {
      if (i >= fields.length) break;
      fields[i].value = ch;
      syncBoardCell(i, ch);
      i++;
    }
    updateUI({keepPairs: true});
    focusField(Math.min(i, fields.length - 1));
  }

  function attachInputBehavior() {
    const fields = getFields();

    fields.forEach((input) => {
      input.autocomplete = 'off';

      input.addEventListener('input', () => {
        const idx = Number(input.dataset.idx);
        const digits = input.value.replace(/\D/g, '');

        if (!digits) {
          input.value = '';
          syncBoardCell(idx, '');
          updateUI({keepPairs: true});
          return;
        }

        if (digits.length === 1) {
          input.value = digits[0];
          syncBoardCell(idx, digits[0]);
          updateUI({keepPairs: true});
          if (idx < 8) focusField(idx + 1);
          return;
        }

        input.value = digits[0];
        syncBoardCell(idx, digits[0]);
        distributeDigits(idx + 1, digits.slice(1));
      });

      input.addEventListener('keydown', (e) => {
        const idx = Number(input.dataset.idx);

        if (e.key === 'Backspace' && input.value === '') {
          e.preventDefault();
          focusField(idx - 1);
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          focusField(idx - 1);
          return;
        }
        if (e.key === 'ArrowRight' || e.key === 'Enter') {
          e.preventDefault();
          focusField(idx + 1);
          return;
        }

        const isControl =
          e.ctrlKey ||
          e.metaKey ||
          e.altKey ||
          ['Tab', 'Shift', 'Escape', 'Home', 'End', 'Delete'].includes(e.key);

        if (isControl) return;

        if (!/^\d$/.test(e.key)) e.preventDefault();
      });

      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const idx = Number(input.dataset.idx);
        const text = (e.clipboardData || window.clipboardData).getData('text') || '';
        const digits = text.replace(/\D/g, '');
        if (!digits) return toast('Cole só dígitos 🙂');
        distributeDigits(idx, digits);
      });
    });
  }

  function generatePairs(values) {
    const pairs = [];
    for (let i = 0; i < values.length; i++) {
      for (let j = i + 1; j < values.length; j++) {
        pairs.push({i, j, a: values[i], b: values[j], concat: `${values[i]}${values[j]}`});
      }
    }
    return pairs;
  }

  function renderPairs(pairs) {
    els.pairsGrid.innerHTML = '';
    pairs.forEach((p, idx) => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.style.animationDelay = `${Math.min(idx * 18, 320)}ms`;

      chip.innerHTML = `
        <div class="chipMain">
          <div>
            <div class="chipVal">${p.concat}</div>
            <div class="chipSmall">(${p.a}, ${p.b})</div>
          </div>
          <div class="chipSmall">${p.i + 1}-${p.j + 1}</div>
        </div>
      `;

      chip.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(p.concat);
          toast(`Copiado: ${p.concat}`);
        } catch {
          toast('Não consegui copiar (permissão do navegador).');
        }
      });

      els.pairsGrid.appendChild(chip);
    });
  }

  function buildCopyText(pairs) {
    return pairs.map((p) => p.concat).join(' - ');
  }

  function updateProgress(filled) {
    const pct = (filled / 9) * 100;
    els.progressFill.style.width = `${pct}%`;
    els.progressLabel.textContent = `${filled}/9`;
  }

  function updateFilledAndInvalid(values) {
    const fields = getFields();
    values.forEach((v, i) => {
      fields[i].classList.toggle('filled', v !== '');
      fields[i].classList.toggle('invalid', v !== '' && !isValidDigit(v));
    });
  }

  function updateUI({keepPairs}) {
    const {values, filled, allValid} = readValues();

    els.countHint.textContent = `${filled}/9 preenchidos`;
    updateProgress(filled);
    updateFilledAndInvalid(values);

    els.btnGenerate.disabled = !(filled === 9 && allValid);

    if (filled < 9) els.statusText.textContent = 'Preencha os 9 campos (0–9).';
    else if (!allValid) els.statusText.textContent = 'Só aceito 1 dígito por campo (0–9).';
    else els.statusText.textContent = 'Tudo certo. Bora gerar os pares!';

    values.forEach((v, i) => syncBoardCell(i, v));

    if (!keepPairs) {
      els.btnCopy.disabled = true;
      els.pairsMeta.textContent = '—';
    }
  }

  function sortPairsAscending(pairs) {
    return [...pairs].sort((p1, p2) => {
      const n1 = Number(p1.concat);
      const n2 = Number(p2.concat);

      if (n1 !== n2) return n1 - n2;

      if (p1.concat !== p2.concat) return p1.concat.localeCompare(p2.concat);
      if (p1.i !== p2.i) return p1.i - p2.i;
      return p1.j - p2.j;
    });
  }

  function onGenerate() {
    const {values, filled, allValid} = readValues();
    if (!(filled === 9 && allValid)) return toast('Preenche os 9 dígitos (0–9) antes de gerar 😉');

    const pairs = sortPairsAscending(generatePairs(values));
    renderPairs(pairs);
    els.pairsMeta.textContent = `${pairs.length} pares gerados (36 combinações)`;
    els.btnCopy.disabled = false;
    toast('Pares gerados! 🚀');
  }

  async function onCopyAll() {
    const {values, filled, allValid} = readValues();
    if (!(filled === 9 && allValid)) return;

    const pairs = sortPairsAscending(generatePairs(values));
    const text = buildCopyText(pairs);

    try {
      await navigator.clipboard.writeText(text);
      toast('Lista completa copiada!');
    } catch {
      toast('Não consegui copiar (permissão do navegador).');
    }
  }

  function onClear() {
    const fields = getFields();
    fields.forEach((f) => (f.value = ''));

    els.pairsGrid.innerHTML = '';
    els.pairsMeta.textContent = '—';
    els.btnCopy.disabled = true;

    for (let i = 0; i < 9; i++) syncBoardCell(i, '');
    updateUI({keepPairs: false});
    focusField(0);
    toast('Limpo!');
  }

  function randomUniqueDigits(count = 9) {
    const pool = Array.from({length: 10}, (_, i) => String(i));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  }

  function clearPairsUI() {
    els.pairsGrid.innerHTML = '';
    els.pairsMeta.textContent = '—';
    els.btnCopy.disabled = true;
  }

  function onExample() {
    const digits = randomUniqueDigits(9);
    distributeDigits(0, digits.join(''));
    clearPairsUI();
  }

  function init() {
    buildBoard();
    attachInputBehavior();
    updateUI({keepPairs: false});
    focusField(0);

    els.btnGenerate.addEventListener('click', onGenerate);
    els.btnCopy.addEventListener('click', onCopyAll);
    els.btnClear.addEventListener('click', onClear);
    els.btnExample.addEventListener('click', onExample);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
