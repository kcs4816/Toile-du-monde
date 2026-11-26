// MOTEUR DE DESSIN CAO PARAMÉTRIQUE & CALCUL ADAPTATIF — KCS CHARPENTE PRO CI
const toile = document.getElementById('zone-toile');
const ctx = toile.getContext('2d');

let outilActif = 'ligne';
let enTrainDeDessiner = false;
let pointDepart = null;
let pointActuel = null;
let objetsDessines = [];

function redimensionnerToile() {
  const rect = toile.getBoundingClientRect();
  toile.width = rect.width || 800;
  toile.height = 480;
  redessinerTout();
}
window.addEventListener('resize', redimensionnerToile);
setTimeout(redimensionnerToile, 100);

function choisirOutil(nomOutil) {
  outilActif = nomOutil;
  document.querySelectorAll('.outils-dessin .btn').forEach(b => b.classList.remove('actif'));
  const btn = document.getElementById('outil-' + nomOutil);
  if (btn) btn.classList.add('actif');
}

// Aimantation intelligente (Snap grille 10px + mode Ortho 0° / 45° / 90°)
function calculerPointAimante(x, y, depart) {
  const grille = 10;
  let sx = Math.round(x / grille) * grille;
  let sy = Math.round(y / grille) * grille;

  if (depart) {
    const dx = sx - depart.x;
    const dy = sy - depart.y;
    const angle = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI);
    if (angle < 8 || angle > 172) sy = depart.y; // Horizontal 0°
    else if (Math.abs(angle - 90) < 8) sx = depart.x; // Vertical 90°
    else if (Math.abs(angle - 45) < 6 || Math.abs(angle - 135) < 6) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      sx = depart.x + Math.sign(dx) * dist;
      sy = depart.y + Math.sign(dy) * dist;
    }
  }
  return { x: sx, y: sy };
}

function obtenirPositionCurseur(evt) {
  const rect = toile.getBoundingClientRect();
  const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
  const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
  return { x: clientX - rect.left, y: clientY - rect.top };
}

toile.addEventListener('pointerdown', (e) => {
  const pos = obtenirPositionCurseur(e);
  pointDepart = calculerPointAimante(pos.x, pos.y, null);
  pointActuel = pointDepart;
  enTrainDeDessiner = true;
});

toile.addEventListener('pointermove', (e) => {
  if (!enTrainDeDessiner) return;
  const pos = obtenirPositionCurseur(e);
  pointActuel = calculerPointAimante(pos.x, pos.y, pointDepart);
  redessinerTout();
  dessinerApercuEnDirect(pointDepart, pointActuel);
});

toile.addEventListener('pointerup', () => {
  if (!enTrainDeDessiner) return;
  enTrainDeDessiner = false;
  if (pointDepart && pointActuel && (pointDepart.x !== pointActuel.x || pointDepart.y !== pointActuel.y)) {
    objetsDessines.push({ type: outilActif, debut: pointDepart, fin: pointActuel });
  }
  pointDepart = null;
  pointActuel = null;
  redessinerTout();
  recalculerTout();
});

function dessinerGrilleMillimetree() {
  ctx.clearRect(0, 0, toile.width, toile.height);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let x = 0; x < toile.width; x += 20) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, toile.height); ctx.stroke();
  }
  for (let y = 0; y < toile.height; y += 20) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(toile.width, y); ctx.stroke();
  }
}

function afficherCoteDynamique(p1, p2, couleur = '#1d4ed8') {
  const echelle = parseFloat(document.getElementById('echelle-mm').value) || 25;
  const distPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const distMm = Math.round(distPx * echelle);
  const distM = (distMm / 1000).toFixed(2);
  const angleDeg = Math.round(Math.abs(Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI));

  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2 - 8;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(mx - 58, my - 13, 116, 18);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${distMm} mm (${distM}m) • ${angleDeg}°`, mx, my);
}

function dessinerObjet(obj) {
  ctx.lineWidth = 3;
  ctx.strokeStyle = obj.type === 'patio' ? '#15803d' : (obj.type === 'chienassis' ? '#d97706' : '#0f172a');

  if (obj.type === 'rectangle' || obj.type === 'patio' || obj.type === 'chienassis') {
    const w = obj.fin.x - obj.debut.x;
    const h = obj.fin.y - obj.debut.y;
    ctx.strokeRect(obj.debut.x, obj.debut.y, w, h);
    if (obj.type === 'chienassis') {
      // Tracé automatique des arêtiers du chien-assis
      ctx.beginPath();
      ctx.moveTo(obj.debut.x, obj.debut.y);
      ctx.lineTo(obj.debut.x + w / 2, obj.debut.y + h / 2);
      ctx.lineTo(obj.fin.x, obj.debut.y);
      ctx.stroke();
    }
    afficherCoteDynamique(obj.debut, { x: obj.fin.x, y: obj.debut.y });
    afficherCoteDynamique({ x: obj.fin.x, y: obj.debut.y }, obj.fin);
  } else {
    ctx.beginPath();
    ctx.moveTo(obj.debut.x, obj.debut.y);
    ctx.lineTo(obj.fin.x, obj.fin.y);
    ctx.stroke();
    afficherCoteDynamique(obj.debut, obj.fin);
  }
}

function dessinerApercuEnDirect(p1, p2) {
  dessinerObjet({ type: outilActif, debut: p1, fin: p2 });
}

function redessinerTout() {
  dessinerGrilleMillimetree();
  objetsDessines.forEach(dessinerObjet);
}

// Génération automatique d'une toiture 4 pans cotée avec faîtière et arêtiers
function genererCharpenteAuto() {
  const echelle = parseFloat(document.getElementById('echelle-mm').value) || 25;
  const L = (parseFloat(document.getElementById('bat-longueur').value) || 18000) / echelle;
  const l = (parseFloat(document.getElementById('bat-largeur').value) || 8000) / echelle;
  const x0 = 60, y0 = 70;
  const x1 = Math.min(x0 + L, toile.width - 40);
  const y1 = Math.min(y0 + l, toile.height - 40);
  const demiH = (y1 - y0) / 2;

  objetsDessines = [
    { type: 'rectangle', debut: { x: x0, y: y0 }, fin: { x: x1, y: y1 } },
    { type: 'ligne', debut: { x: x0, y: y0 }, fin: { x: x0 + demiH, y: y0 + demiH } },
    { type: 'ligne', debut: { x: x0, y: y1 }, fin: { x: x0 + demiH, y: y0 + demiH } },
    { type: 'ligne', debut: { x: x1, y: y0 }, fin: { x: x1 - demiH, y: y0 + demiH } },
    { type: 'ligne', debut: { x: x1, y: y1 }, fin: { x: x1 - demiH, y: y0 + demiH } },
    { type: 'ligne', debut: { x: x0 + demiH, y: y0 + demiH }, fin: { x: x1 - demiH, y: y0 + demiH } }
  ];
  redessinerTout();
  recalculerTout();
}

function annulerDernierTrait() { objetsDessines.pop(); redessinerTout(); }
function effacerToile() { objetsDessines = []; redessinerTout(); }

// Calcul adaptatif : Pentes en degrés, Hauteurs par pan, Pignons et Esthétique
function recalculerTout() {
  const L = (parseFloat(document.getElementById('bat-longueur').value) || 0) / 1000;
  const l = (parseFloat(document.getElementById('bat-largeur').value) || 0) / 1000;
  const debord = (parseFloat(document.getElementById('debord-toit').value) || 0) / 1000;
  const pente1 = parseFloat(document.getElementById('pente-pan-1').value) || 35;
  const pente2 = parseFloat(document.getElementById('pente-pan-2').value) || 35;

  const Ltot = L + 2 * debord;
  const ltot = l + 2 * debord;
  const demiLargeur = ltot / 2;

  const angle1Deg = (Math.atan(pente1 / 100) * 180 / Math.PI).toFixed(1);
  const angle2Deg = (Math.atan(pente2 / 100) * 180 / Math.PI).toFixed(1);
  const hauteurFaitage1 = (demiLargeur * (pente1 / 100)).toFixed(2);
  const hauteurFaitage2 = (demiLargeur * (pente2 / 100)).toFixed(2);
  const rampant1 = Math.hypot(demiLargeur, parseFloat(hauteurFaitage1)).toFixed(2);
  const surfaceHorizontale = Ltot * ltot;
  const surfaceTotaleToit = (surfaceHorizontale * Math.sqrt(1 + Math.pow((pente1 + pente2) / 200, 2))).toFixed(2);

  let conseilEsthetique = "Équilibre idéal (20°–30°) : belle allure de façade et évacuation rapide des pluies.";
  if (parseFloat(angle1Deg) < 15) conseilEsthetique = "Style Contemporain (< 15°) : idéal pour tôle bac long pan moderne.";
  else if (parseFloat(angle1Deg) > 32) conseilEsthetique = "Style Haut Standing (> 32°) : volume majestueux, recommandé pour tuiles.";

  window.donneesCalculActuel = { Ltot, ltot, surfaceTotaleToit, rampant1, hauteurFaitage1 };

  document.getElementById('bloc-propositions').innerHTML = `
    <b>Dimensions hors-tout (avec débords) :</b><br/>
    ${Ltot.toFixed(2)} m × ${ltot.toFixed(2)} m (${(Ltot*1000).toFixed(0)} × ${(ltot*1000).toFixed(0)} mm)<br/><br/>
    <b>Versant Principal (Pan 1) :</b><br/>
    • Pente : <b>${pente1}%</b> soit <b>${angle1Deg}°</b><br/>
    • Hauteur faîtage : <b>${hauteurFaitage1} m</b> (${Math.round(hauteurFaitage1*1000)} mm)<br/>
    • Longueur rampant : <b>${rampant1} m</b><br/><br/>
    <b>Versant Secondaire / Pignons :</b><br/>
    • Pignon A (Largeur ${ltot.toFixed(2)} m) : Hauteur <b>${hauteurFaitage1} m</b><br/>
    • Pignon B (Pan 2 à ${angle2Deg}°) : Hauteur <b>${hauteurFaitage2} m</b><br/>
    • Surface totale couverture : <b>${surfaceTotaleToit} m²</b><br/>
    <div class="badge-esthetique">✨ ${conseilEsthetique}</div>
  `;
}

function telechargerImagePlan() {
  const lien = document.createElement('a');
  lien.download = 'Plan_KCS_Charpente_Pro.png';
  lien.href = toile.toDataURL('image/png');
  lien.click();
}
