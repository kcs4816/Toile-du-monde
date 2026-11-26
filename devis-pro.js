// MODULE DEVIS VERROUILLÉ, CATALOGUE AUTO-SUGGESTION & DOUBLE MARGE
let planVerrouille = false;
let lignesDevis = [];
let catalogueMateriaux = JSON.parse(localStorage.getItem('kcs_catalogue_v2')) || [
  { nom: 'Tôle Bac Alu-Zinc 7/10e (3,00m x 0,90m)', unite: 'feuille', prix: 9500, surfaceUtile: 2.24 },
  { nom: 'Chevron bois rouge traité 60x80 mm (4m)', unite: 'pièce', prix: 3500, surfaceUtile: 0 },
  { nom: 'Panne bois rouge 75x150 mm (4m)', unite: 'pièce', prix: 7500, surfaceUtile: 0 },
  { nom: 'Planche de rive 25x250 mm (4m)', unite: 'pièce', prix: 4500, surfaceUtile: 0 },
  { nom: 'Tôle faîtière développée 50 cm (2m)', unite: 'pièce', prix: 4000, surfaceUtile: 0 }
];

function changerOnglet(nom, bouton) {
  document.querySelectorAll('main > section').forEach(s => s.classList.add('section-cachee'));
  document.getElementById('section-' + nom).classList.remove('section-cachee');
  document.querySelectorAll('.onglet').forEach(o => o.classList.remove('actif'));
  if (bouton) bouton.classList.add('actif');
  if (nom === 'devis') appliquerModeImageDevis();
}

function basculerVerrouillageDevis() {
  planVerrouille = !planVerrouille;
  const btn = document.getElementById('btn-verrou');
  btn.textContent = planVerrouille ? '🔓 Plan Verrouillé (Cliquer pour modifier)' : '🔒 Verrouiller le plan pour Devis';
  btn.classList.toggle('btn-succes', planVerrouille);
  document.querySelectorAll('#section-atelier input').forEach(inp => inp.disabled = planVerrouille);
}

function appliquerModeImageDevis() {
  const mode = document.getElementById('mode-image-devis').value;
  const dataUrl = document.getElementById('zone-toile').toDataURL('image/png');
  const imgBanniere = document.getElementById('image-banniere-devis');
  const imgFiligrane = document.getElementById('image-filigrane-devis');

  imgBanniere.style.display = 'none';
  imgFiligrane.style.display = 'none';

  if (mode === 'banniere') {
    imgBanniere.src = dataUrl;
    imgBanniere.style.display = 'block';
  } else if (mode === 'filigrane') {
    imgFiligrane.src = dataUrl;
    imgFiligrane.style.display = 'block';
  }
}

function actualiserCatalogueUI() {
  const datalist = document.getElementById('liste-suggestions');
  const tbody = document.getElementById('corps-catalogue');
  datalist.innerHTML = '';
  tbody.innerHTML = '';

  catalogueMateriaux.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.nom;
    datalist.appendChild(opt);

    tbody.innerHTML += `<tr>
      <td>${item.nom}</td>
      <td>${item.unite}</td>
      <td>${item.surfaceUtile > 0 ? item.surfaceUtile + ' m²' : '—'}</td>
      <td><b>${item.prix.toLocaleString('fr-FR')} FCFA</b></td>
    </tr>`;
  });
}

function autoRemplirPrixArticle() {
  const texte = document.getElementById('saisie-article').value.trim().toLowerCase();
  const trouve = catalogueMateriaux.find(m => m.nom.toLowerCase() === texte);
  if (trouve) {
    document.getElementById('saisie-unite').value = trouve.unite;
    document.getElementById('saisie-pu').value = trouve.prix;
  }
}

function enregistrerAuCatalogue() {
  const nom = document.getElementById('cat-nom').value.trim();
  const unite = document.getElementById('cat-unite').value.trim() || 'pièce';
  const prix = parseFloat(document.getElementById('cat-prix').value) || 0;
  const surfaceUtile = parseFloat(document.getElementById('cat-surface-utile').value) || 0;
  if (!nom) return alert('Veuillez saisir le nom du matériau.');

  catalogueMateriaux.push({ nom, unite, prix, surfaceUtile });
  localStorage.setItem('kcs_catalogue_v2', JSON.stringify(catalogueMateriaux));
  actualiserCatalogueUI();
  document.getElementById('cat-nom').value = '';
}

function ajouterLigneDevis() {
  const nom = document.getElementById('saisie-article').value.trim();
  const unite = document.getElementById('saisie-unite').value.trim() || 'pièce';
  const qte = parseFloat(document.getElementById('saisie-qte').value) || 0;
  const pu = parseFloat(document.getElementById('saisie-pu').value) || 0;
  if (!nom || qte <= 0) return alert('Complétez la désignation et la quantité.');

  // Enregistrement automatique dans l'historique si nouveau prix ou nouvel article
  const existant = catalogueMateriaux.find(m => m.nom.toLowerCase() === nom.toLowerCase());
  if (existant) { existant.prix = pu; }
  else { catalogueMateriaux.push({ nom, unite, prix: pu, surfaceUtile: 0 }); }
  localStorage.setItem('kcs_catalogue_v2', JSON.stringify(catalogueMateriaux));
  actualiserCatalogueUI();

  lignesDevis.push({ nom, unite, qte, pu });
  document.getElementById('saisie-article').value = '';
  actualiserCalculDevis();
}

function injecterMetreDansDevis() {
  recalculerTout();
  const calc = window.donneesCalculActuel;
  const toleRef = catalogueMateriaux.find(m => m.surfaceUtile > 0) || { nom: 'Tôle Bac Alu-Zinc', unite: 'feuille', prix: 9500, surfaceUtile: 2.24 };
  const nbToles = Math.ceil((parseFloat(calc.surfaceTotaleToit) / toleRef.surfaceUtile) * 1.05); // +5% chutes arêtiers

  lignesDevis = [
    { nom: toleRef.nom, unite: toleRef.unite, qte: nbToles, pu: toleRef.prix },
    { nom: 'Chevron bois rouge traité 60x80 mm (4m)', unite: 'pièce', qte: Math.ceil(calc.Ltot / 0.6) * 2, pu: 3500 },
    { nom: 'Panne bois rouge 75x150 mm (4m)', unite: 'pièce', qte: Math.ceil((calc.rampant1 / 1.2) * (calc.Ltot / 4) * 2), pu: 7500 }
  ];
  changerOnglet('devis', document.querySelectorAll('.onglet')[1]);
  actualiserCalculDevis();
}

function supprimerLigneDevis(index) {
  lignesDevis.splice(index, 1);
  actualiserCalculDevis();
}

function actualiserCalculDevis() {
  const tbody = document.getElementById('corps-tableau-devis');
  tbody.innerHTML = '';
  let brut = 0;

  lignesDevis.forEach((l, idx) => {
    const totalLigne = l.qte * l.pu;
    brut += totalLigne;
    tbody.innerHTML += `<tr>
      <td>${l.nom}</td>
      <td>${l.unite}</td>
      <td>${l.qte}</td>
      <td>${l.pu.toLocaleString('fr-FR')}</td>
      <td><b>${totalLigne.toLocaleString('fr-FR')}</b></td>
      <td class="no-print"><button class="btn" onclick="supprimerLigneDevis(${idx})">✖</button></td>
    </tr>`;
  });

  const tauxImprevu = (parseFloat(document.getElementById('marge-imprevue').value) || 0) / 100;
  const tauxPrevu = (parseFloat(document.getElementById('marge-prevue').value) || 0) / 100;

  const montantImprevu = Math.round(brut * tauxImprevu);
  const montantPrevu = Math.round((brut + montantImprevu) * tauxPrevu);
  const netAPayer = brut + montantImprevu + montantPrevu;

  document.getElementById('total-brut').textContent = brut.toLocaleString('fr-FR') + ' FCFA';
  document.getElementById('total-imprevu').textContent = montantImprevu.toLocaleString('fr-FR') + ' FCFA';
  document.getElementById('total-ttc').textContent = netAPayer.toLocaleString('fr-FR') + ' FCFA';
}

function sauvegarderProjetLocal() {
  localStorage.setItem('kcs_projet_sauvegarde', JSON.stringify({ objetsDessines, lignesDevis }));
  alert('✅ Projet sauvegardé hors-ligne sur cet appareil !');
}

function exporterProjetJSON() {
  const blob = new Blob([JSON.stringify({ objetsDessines, lignesDevis }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'Projet_KCS_Sauvegarde.json';
  a.click();
}

// Initialisation au démarrage
actualiserCatalogueUI();
recalculerTout();
