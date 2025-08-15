const els = {
  company: document.querySelector('#company'),
  client: document.querySelector('#client'),
  description: document.querySelector('#description'),
  hours: document.querySelector('#hours'),
  rate: document.querySelector('#rate'),
  margin: document.querySelector('#margin'),
  vat: document.querySelector('#vat'),
  linesWrap: document.querySelector('#lines'),
  addLine: document.querySelector('#addLine'),
  generate: document.querySelector('#generate'),
  download: document.querySelector('#download'),
  p: {
    company: document.querySelector('#p-company'),
    client: document.querySelector('#p-client'),
    description: document.querySelector('#p-description'),
    intro: document.querySelector('#p-intro'),
    rows: document.querySelector('#p-rows'),
    hours: document.querySelector('#p-hours'),
    rate: document.querySelector('#p-rate'),
    ex: document.querySelector('#p-ex'),
    tax: document.querySelector('#p-tax'),
    inc: document.querySelector('#p-inc'),
  }
};

const state = {
  profile: { company: '' },
  data: { client: '', description: '', hours: 0, rate: 0, margin: 0, vat: 21 },
  lines: []
};

function addLine(desc='', qty=1, price=0){
  const row = document.createElement('div');
  row.className = 'grid';
  row.innerHTML = `
    <label>Omschrijving <input class="l-desc" value="\${desc}"/></label>
    <label>Aantal <input class="l-qty" type="number" min="0" step="1" value="\${qty}"/></label>
    <label>Prijs (€) <input class="l-price" type="number" min="0" step="0.01" value="\${price}"/></label>
    <button class="ghost remove">Verwijder</button>
  `;
  els.linesWrap.appendChild(row);

  function sync(){
    const items = [...els.linesWrap.querySelectorAll('.grid')].map(g => ({
      desc: g.querySelector('.l-desc').value,
      qty: Number(g.querySelector('.l-qty').value || 0),
      price: Number(g.querySelector('.l-price').value || 0),
    }));
    state.lines = items;
    render();
  }
  row.addEventListener('input', sync);
  row.querySelector('.remove').addEventListener('click', () => {
    row.remove(); sync();
  });
  sync();
}

function formatEUR(n){ return (Number(n)||0).toLocaleString('nl-NL',{minimumFractionDigits:2, maximumFractionDigits:2}); }

function computeTotals(){
  const hours = Number(els.hours.value || 0);
  const rate = Number(els.rate.value || 0);
  const margin = Number(els.margin.value || 0);
  const vat = Number(els.vat.value || 21);
  const hoursTotal = hours * rate;
  const materials = state.lines.reduce((s,l)=> s + (l.qty*l.price), 0);
  const sub = hoursTotal + materials;
  const withMargin = sub * (1 + margin/100);
  const tax = withMargin * (vat/100);
  const inc = withMargin + tax;
  return { hours, rate, margin, vat, ex: withMargin, tax, inc };
}

function render(){
  state.profile.company = els.company.value;
  state.data.client = els.client.value;
  state.data.description = els.description.value;
  state.data.hours = Number(els.hours.value || 0);
  state.data.rate = Number(els.rate.value || 0);
  state.data.margin = Number(els.margin.value || 0);
  state.data.vat = Number(els.vat.value || 21);

  const totals = computeTotals();
  state.totals = totals;

  els.p.company.textContent = state.profile.company || 'Mijn bedrijfsnaam';
  els.p.client.textContent = state.data.client || '—';
  els.p.description.textContent = state.data.description || '—';
  els.p.hours.textContent = totals.hours;
  els.p.rate.textContent = totals.rate;
  els.p.ex.textContent = formatEUR(totals.ex);
  els.p.tax.textContent = formatEUR(totals.tax);
  els.p.inc.textContent = formatEUR(totals.inc);

  els.p.rows.innerHTML = state.lines.map(l=>{
    const total = l.qty*l.price;
    return `<tr><td>\${l.desc||''}</td><td>\${l.qty||0}</td><td>€\${formatEUR(l.price||0)}</td><td>€\${formatEUR(total)}</td></tr>`;
  }).join('');
}

['input','change'].forEach(ev=>{
  document.addEventListener(ev, e=>{
    if(['INPUT','SELECT'].includes(e.target.tagName)) render();
  });
});

els.addLine.addEventListener('click', ()=> addLine());

els.generate.addEventListener('click', async ()=>{
  els.generate.disabled = true;
  els.generate.textContent = 'Bezig…';
  els.p.intro.textContent = 'AI-intro genereren…';

  try{
    const resp = await fetch('/api/ai-intro', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(state)
    });
    const data = await resp.json();
    if (data?.intro) {
      els.p.intro.textContent = data.intro;
      els.p.intro.classList.remove('muted');
      els.download.disabled = false;
    } else {
      els.p.intro.textContent = 'Kon geen AI-intro genereren.';
      els.download.disabled = true;
    }
  }catch(err){
    console.error(err);
    els.p.intro.textContent = 'Fout bij genereren.';
    els.download.disabled = true;
  }finally{
    els.generate.disabled = false;
    els.generate.textContent = 'Genereer offerte';
  }
});

els.download.addEventListener('click', ()=>{
  const node = document.querySelector('#preview');
  const opt = {
    margin:       10,
    filename:     `offerte-\${(state.data.client||'klant').toLowerCase().replace(/\s+/g,'-')}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(node).save();
});

addLine('1,2 mm rvs 304', 2, 20);
render();
