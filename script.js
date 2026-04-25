(() => {
  'use strict';

  const PRODUCTS = ['Äpfel', 'Brot', 'Kaffee', 'Smartphones', 'Fahrräder', 'Energie'];
  const START_MONEY = 100;

  const game = {
    money: START_MONEY,
    score: 0,
    level: 1,
    day: 1,
    timeOfDay: 8,
    inventory: Object.fromEntries(PRODUCTS.map(p => [p, 0])),
    capacity: 60,
    loan: { active: false, amount: 0, dueDay: 0, interest: 0.18 },
    prices: {
      Äpfel: { base: 6, supply: 1.0, demand: 1.1, elasticity: 0.45, price: 0 },
      Brot: { base: 4, supply: 1.1, demand: 1.0, elasticity: 0.35, price: 0 },
      Kaffee: { base: 8, supply: 1.0, demand: 1.0, elasticity: 0.55, price: 0 },
      Smartphones: { base: 120, supply: 0.9, demand: 1.2, elasticity: 1.3, price: 0 },
      Fahrräder: { base: 90, supply: 1.0, demand: 1.0, elasticity: 0.9, price: 0 },
      Energie: { base: 30, supply: 1.0, demand: 1.0, elasticity: 0.25, price: 0 }
    },
    activeEvents: [],
    roundsUntilEvent: 1,
    interacted: {},
    askedQuestionIds: new Set(),
    answeredQuestions: 0,
    passedFinalExam: false
  };

  const world = {
    areas: {
      Bauernmarkt: { pos: null, unlockedAt: 1, key: 'farm' },
      Einkaufsstrasse: { pos: null, unlockedAt: 2, key: 'street' },
      Elektronikviertel: { pos: null, unlockedAt: 3, key: 'electro' },
      Bank: { pos: null, unlockedAt: 4, key: 'bank' },
      Lagerhaus: { pos: null, unlockedAt: 4, key: 'warehouse' },
      Rathaus: { pos: null, unlockedAt: 5, key: 'cityhall' }
    },
    interactables: []
  };

  const quests = [
    { id: 1, text: 'Kaufe mindestens 5 Äpfel günstig ein.', done: false, check: () => game.inventory['Äpfel'] >= 5 },
    { id: 2, text: 'Verkaufe Äpfel nach einem Ernteausfall.', done: false, check: () => game.interacted.soldApplesAfterFailure },
    { id: 3, text: 'Erkläre, warum der Preis bei Knappheit steigt.', done: false, check: () => game.interacted.explainedScarcity },
    { id: 4, text: 'Vergleiche Brot und Äpfel als Güter (Quizfrage lösen).', done: false, check: () => game.interacted.comparedBreadApple },
    { id: 5, text: 'Reagiere auf Überproduktion bei Brot (kaufen/verkaufen).', done: false, check: () => game.interacted.reactedBreadOverproduction },
    { id: 6, text: 'Besuche die Bank und entscheide über Kredit.', done: false, check: () => game.interacted.bankVisited },
    { id: 7, text: 'Investiere in Lagerkapazität.', done: false, check: () => game.capacity >= 120 },
    { id: 8, text: 'Entscheide bei hoher Nachfrage: sofort verkaufen oder warten.', done: false, check: () => game.interacted.highDemandDecision },
    { id: 9, text: 'Beantworte eine Frage zur Preiselastizität korrekt.', done: false, check: () => game.interacted.elasticityQuestionRight },
    { id: 10, text: 'Analysiere ein Marktereignis im Rathaus.', done: false, check: () => game.interacted.marketAnalysis },
    { id: 11, text: 'Erreiche ein Vermögen von 500 Franken.', done: false, check: () => netWorth() >= 500 },
    { id: 12, text: 'Bestehe die Abschlussprüfung im Rathaus.', done: false, check: () => game.passedFinalExam }
  ];

  const QUIZ = [
    q('Was beschreibt die Nachfrage?', ['Menge, die Konsumenten zu Preisen kaufen wollen', 'Menge der produzierten Güter', 'Fixe staatliche Preise'], 0, 'Nachfrage hängt vom Preis und Kaufwunsch der Konsumenten ab.'),
    q('Was passiert meist mit dem Preis bei Knappheit?', ['Preis sinkt', 'Preis steigt', 'Preis bleibt immer gleich'], 1, 'Knappheit reduziert das Angebot relativ zur Nachfrage.'),
    q('Gleichgewichtspreis bedeutet …', ['Preis ohne Steuern', 'Preis bei dem Angebot = Nachfrage', 'höchster möglicher Preis'], 1, 'Im Marktgleichgewicht gleichen sich geplante Mengen aus.'),
    q('Überproduktion von Brot führt eher zu …', ['fallenden Brotpreisen', 'steigenden Brotpreisen', 'keiner Änderung'], 0, 'Mehr Angebot drückt bei gleicher Nachfrage den Preis.'),
    q('Ein Social-Media-Hype für Smartphones bewirkt …', ['Nachfrage sinkt', 'Nachfrage steigt', 'Angebot sinkt sicher'], 1, 'Hype verschiebt die Nachfragekurve nach rechts.'),
    q('Preiselastizität misst …', ['Staatliche Subvention', 'Reaktion der Nachfrage auf Preisänderung', 'Lagerkosten'], 1, 'Sie zeigt, wie sensibel Käufer auf Preisänderungen reagieren.'),
    q('Welche Güter sind oft Komplementärgüter?', ['Kaffee und Kaffeemaschine', 'Äpfel und Birnen', 'Brot und Smartphones'], 0, 'Komplementärgüter werden zusammen genutzt.'),
    q('Substitutionsgut zu Kaffee wäre eher …', ['Tee', 'Fahrrad', 'Energie'], 0, 'Substitute erfüllen ein ähnliches Bedürfnis.'),
    q('Was ist ein staatlicher Eingriff?', ['Steuererhöhung', 'Wetterwechsel', 'Private Werbung'], 0, 'Steuern, Subventionen und Regeln sind staatliche Eingriffe.'),
    q('Wenn Angebot steigt und Nachfrage konstant bleibt, dann …', ['steigt der Preis meist', 'sinkt der Preis meist', 'ändert sich nie etwas'], 1, 'Mehr Angebot bei gleicher Nachfrage drückt den Preis.'),
    q('Welche Aussage zur Knappheit stimmt?', ['Knappheit existiert nie', 'Knappheit betrifft nur Luxusgüter', 'Ressourcen sind begrenzt und Bedürfnisse unbegrenzt'], 2, 'Das ist ein Kernproblem der Volkswirtschaftslehre.'),
    q('Eine Subvention auf Energie führt kurzfristig eher zu …', ['mehr Angebot', 'weniger Angebot', 'automatisch Nullpreis'], 0, 'Niedrigere Kosten fördern Produktion/Angebot.'),
    q('Steuer auf Smartphones führt tendenziell zu …', ['niedrigerem Endpreis', 'höherem Endpreis', 'keiner Auswirkung'], 1, 'Steuern erhöhen Kosten und häufig den Marktpreis.'),
    q('Was ist Marktgleichgewicht?', ['Zustand ohne Wettbewerb', 'Punkt ohne Käufer', 'Ausgeglichene Menge zu einem Preis'], 2, 'Dort treffen sich Angebots- und Nachfragepläne.'),
    q('Transportprobleme bedeuten oft …', ['Angebotsrückgang', 'Nachfragerückgang', 'sinkende Kosten'], 0, 'Lieferengpässe verringern das verfügbare Angebot.'),
    q('Bei sehr elastischer Nachfrage führt Preiserhöhung häufig zu …', ['kaum Mengenänderung', 'stark sinkender Nachfrage', 'mehr Nachfrage'], 1, 'Elastische Nachfrage reagiert stark auf Preisänderungen.'),
    q('Was ist bei unelastischer Nachfrage typisch?', ['Käufer reagieren stark', 'Käufer reagieren kaum', 'Nachfrage wird negativ'], 1, 'Bei notwendigen Gütern ist Nachfrage oft unelastisch.'),
    q('Neue Technologie senkt Produktionskosten. Folge?', ['Angebot kann steigen', 'Angebot sinkt', 'Nachfrage verschwindet'], 0, 'Günstigere Produktion verschiebt das Angebot nach rechts.'),
    q('Rabattaktion der Konkurrenz beeinflusst dein Geschäft, weil …', ['deine Produkte relativ teurer wirken', 'Steuern automatisch steigen', 'Lager verschwindet'], 0, 'Relative Preise verändern die Nachfrageaufteilung.'),
    q('Warum ist Lagerkapazität strategisch wichtig?', ['Sie erlaubt zeitversetztes Verkaufen', 'Sie erhöht automatisch Nachfrage', 'Sie verbietet Verluste'], 0, 'Du kannst günstig einkaufen und später teuer verkaufen.')
  ];

  const EVENT_POOL = [
    event('Ernteausfall bei Äpfeln', 'Äpfel werden knapp.', { Äpfel: { supply: -0.45 } }),
    event('Überproduktion bei Brot', 'Brotangebot steigt stark.', { Brot: { supply: +0.4 } }),
    event('Social-Media-Hype bei Smartphones', 'Nachfrage nach Smartphones steigt.', { Smartphones: { demand: +0.38 } }),
    event('Energiekrise', 'Energie ist knapp und teuer.', { Energie: { supply: -0.35, demand: +0.15 } }),
    event('Rabattaktion der Konkurrenz', 'Konkurrenz senkt Preise in der Einkaufsstrasse.', { Kaffee: { demand: -0.18 }, Brot: { demand: -0.12 } }),
    event('Transportprobleme', 'Lieferketten stocken.', { Äpfel: { supply: -0.2 }, Kaffee: { supply: -0.2 }, Fahrräder: { supply: -0.2 } }),
    event('Neue Technologie senkt Produktionskosten', 'Mehr Produktion möglich.', { Smartphones: { supply: +0.3 }, Fahrräder: { supply: +0.2 } }),
    event('Staatliche Subvention', 'Produzenten erhalten Unterstützung.', { Energie: { supply: +0.25 }, Brot: { supply: +0.15 } }),
    event('Steuererhöhung', 'Verbrauchssteuer steigt.', { Kaffee: { demand: -0.13 }, Smartphones: { demand: -0.16 } }),
    event('Streik im Lagerhaus', 'Lagerbetrieb eingeschränkt.', { Äpfel: { supply: -0.15 }, Brot: { supply: -0.15 }, Kaffee: { supply: -0.15 } })
  ];

  let scene, camera, renderer, sun, raycaster;
  let gameStarted = false;
  let lastTime = 0;
  let roundTimer = 0;

  const keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false };
  const velocity = { x: 0, z: 0 };
  const direction = { x: 0, z: 0 };
  const player = { yaw: 0, pitch: 0, speed: 18, locked: false };

  const startBtn = document.getElementById('startBtn');
  const startStatus = document.getElementById('startStatus');
  const overlay = document.getElementById('overlay');

  startBtn.addEventListener('click', startGame);
  document.getElementById('closeDialog').addEventListener('click', closeDialog);

  if (!window.THREE) {
    startStatus.textContent = 'Three.js konnte nicht geladen werden. Bitte Internet prüfen und die Datei neu öffnen.';
    startStatus.classList.add('bad');
    startBtn.disabled = true;
  }

  setInitialHudState();

  function startGame() {
    if (gameStarted) return;
    if (!window.THREE) return;

    initScene();
    gameStarted = true;
    overlay.style.display = 'none';
    renderer.domElement.requestPointerLock();
    toast('Willkommen in Marktstadt 3D! Ziel: Vermögen, Wissen und Strategie kombinieren.');
    lastTime = performance.now();
    animate(lastTime);
  }

  function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87aadd);
    scene.fog = new THREE.Fog(0x87aadd, 120, 280);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 2, 14);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xcde5ff, 0x334455, 0.8);
    scene.add(hemi);
    sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(45, 70, 30);
    sun.castShadow = true;
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(320, 320),
      new THREE.MeshStandardMaterial({ color: 0x3d6d3f })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(280, 22),
      new THREE.MeshStandardMaterial({ color: 0x44474f })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.02;
    scene.add(road);

    world.areas.Bauernmarkt.pos = new THREE.Vector3(-80, 0, -20);
    world.areas.Einkaufsstrasse.pos = new THREE.Vector3(-15, 0, -15);
    world.areas.Elektronikviertel.pos = new THREE.Vector3(52, 0, -12);
    world.areas.Bank.pos = new THREE.Vector3(40, 0, 50);
    world.areas.Lagerhaus.pos = new THREE.Vector3(70, 0, 64);
    world.areas.Rathaus.pos = new THREE.Vector3(-55, 0, 56);

    buildWorld();
    buildNPCs();
    createPriceModel();
    raycaster = new THREE.Raycaster();

    wireControls();
  }

  function wireControls() {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    window.addEventListener('resize', onResize);
  }

  function onKeyDown(e) {
    if (!gameStarted) return;
    if (keys[e.code] !== undefined) keys[e.code] = true;
    if (e.code === 'KeyE') tryInteract();
  }

  function onKeyUp(e) {
    if (!gameStarted) return;
    if (keys[e.code] !== undefined) keys[e.code] = false;
  }

  function onMouseMove(e) {
    if (!gameStarted || !player.locked || dialogOpen()) return;
    player.yaw -= e.movementX * 0.0025;
    player.pitch -= e.movementY * 0.0023;
    player.pitch = Math.max(-1.35, Math.min(1.35, player.pitch));
    camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
  }

  function onPointerLockChange() {
    if (!gameStarted) return;
    player.locked = document.pointerLockElement === renderer.domElement;
  }

  function onResize() {
    if (!gameStarted) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate(now) {
    if (!gameStarted) return;
    requestAnimationFrame(animate);

    const delta = (now - lastTime) / 1000;
    lastTime = now;

    updateMovement(delta);
    updateClock(delta);
    pulseInteractables(now);

    scene.traverse(obj => {
      if (obj.userData && typeof obj.userData.update === 'function') {
        obj.userData.update(now);
      }
    });

    renderer.render(scene, camera);
  }

  function updateMovement(delta) {
    if (dialogOpen()) return;

    direction.x = 0;
    direction.z = 0;
    velocity.x = 0;
    velocity.z = 0;

    if (keys.KeyW) direction.z -= 1;
    if (keys.KeyS) direction.z += 1;
    if (keys.KeyA) direction.x -= 1;
    if (keys.KeyD) direction.x += 1;

    const len = Math.hypot(direction.x, direction.z) || 1;
    direction.x /= len;
    direction.z /= len;

    const speed = player.speed * delta;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0; right.normalize();

    camera.position.addScaledVector(forward, direction.z * speed);
    camera.position.addScaledVector(right, direction.x * speed);
    camera.position.y = 2;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -145, 145);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -145, 145);
  }

  function updateClock(delta) {
    roundTimer += delta;
    game.timeOfDay += delta * 0.18;

    if (game.timeOfDay >= 24) {
      game.timeOfDay -= 24;
      game.day += 1;
      tickDay();
    }

    const dayProgress = Math.sin((game.timeOfDay / 24) * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
    sun.intensity = 0.2 + dayProgress;
    scene.background = new THREE.Color().setHSL(0.58, 0.45, 0.2 + dayProgress * 0.45);

    if (roundTimer > 60) {
      roundTimer = 0;
      tickRound();
    }

    refreshHUD();
  }

  function tickRound() {
    game.roundsUntilEvent -= 1;
    if (game.roundsUntilEvent <= 0) {
      triggerRandomEvent();
      game.roundsUntilEvent = 1 + Math.floor(Math.random() * 2);
    }

    game.activeEvents.forEach(ev => ev.remaining -= 1);
    game.activeEvents = game.activeEvents.filter(ev => ev.remaining > 0);

    if (game.loan.active && game.day >= game.loan.dueDay) {
      const payment = Math.round(game.loan.amount * (1 + game.loan.interest));
      game.money -= payment;
      game.loan.active = false;
      toast(`Kredit fällig: ${payment} Fr. zurückgezahlt.`);
    }

    applyMarketDynamics();
    maybeAskRandomQuestion();
    progressQuests();
    updateLevel();
  }

  function tickDay() {
    PRODUCTS.forEach(p => {
      const model = game.prices[p];
      model.supply = clamp(model.supply + rand(-0.05, 0.05), 0.45, 1.8);
      model.demand = clamp(model.demand + rand(-0.05, 0.06), 0.45, 1.9);
    });
    applyMarketDynamics();
  }

  function applyMarketDynamics() {
    PRODUCTS.forEach(name => {
      const m = game.prices[name];
      const scarcity = m.demand / m.supply;
      const elasticityImpact = 1 + (scarcity - 1) * (0.85 + m.elasticity * 0.35);
      const noise = rand(-0.06, 0.06);
      m.price = Math.max(1, Math.round(m.base * elasticityImpact * (1 + noise)));
    });
  }

  function triggerRandomEvent() {
    const e = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)];
    Object.entries(e.effects).forEach(([product, effect]) => {
      if (effect.supply) game.prices[product].supply = clamp(game.prices[product].supply + effect.supply, 0.35, 2.3);
      if (effect.demand) game.prices[product].demand = clamp(game.prices[product].demand + effect.demand, 0.35, 2.3);
    });
    game.activeEvents.unshift({ name: e.name, text: e.text, remaining: e.duration });
    toast(`Ereignis: ${e.name}`);
  }

  function maybeAskRandomQuestion() {
    if (Math.random() > 0.35) return;
    const remaining = QUIZ.filter((_, i) => !game.askedQuestionIds.has(i));
    if (!remaining.length) return;
    const qObj = remaining[Math.floor(Math.random() * remaining.length)];
    const qId = QUIZ.indexOf(qObj);
    game.askedQuestionIds.add(qId);
    showQuiz(qObj, (correct) => {
      game.answeredQuestions += 1;
      game.score += correct ? 25 : 5;
      if (correct && qObj.question.includes('Preiselastizität')) game.interacted.elasticityQuestionRight = true;
      if (qObj.question.includes('Brot und Äpfel') && correct) game.interacted.comparedBreadApple = true;
      progressQuests();
    });
  }

  function updateLevel() {
    const doneCount = quests.filter(q => q.done).length;
    const wealth = netWorth();
    if (game.level < 2 && doneCount >= 3) { game.level = 2; toast('Level 2 freigeschaltet: Einkaufsstrasse'); }
    if (game.level < 3 && doneCount >= 5) { game.level = 3; toast('Level 3 freigeschaltet: Elektronikviertel'); }
    if (game.level < 4 && doneCount >= 7 && wealth >= 260) { game.level = 4; toast('Level 4 freigeschaltet: Bank + Lagerhaus'); }
    if (game.level < 5 && doneCount >= 10 && wealth >= 450) { game.level = 5; toast('Level 5 freigeschaltet: Rathaus + Abschlussprüfung'); }
  }

  function progressQuests() {
    quests.forEach(q => {
      if (!q.done && q.check()) {
        q.done = true;
        game.score += 80;
        toast(`Quest abgeschlossen: ${q.text}`);
      }
    });
  }

  function netWorth() {
    return Math.round(game.money + PRODUCTS.reduce((sum, p) => sum + game.inventory[p] * game.prices[p].price, 0));
  }

  function tryInteract() {
    if (!player.locked || dialogOpen()) return;
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const hits = raycaster.intersectObjects(world.interactables.map(i => i.mesh));
    if (!hits.length || hits[0].distance > 8) return;

    const interact = world.interactables.find(i => i.mesh === hits[0].object);
    if (!interact) return;
    if (game.level < interact.unlockedAt) return toast(`Bereich gesperrt. Benötigt Level ${interact.unlockedAt}.`);

    interact.action();
  }

  function openDialog(html) {
    const d = document.getElementById('dialog');
    document.getElementById('dialogContent').innerHTML = html;
    d.classList.remove('hidden');
    if (gameStarted) document.exitPointerLock();
  }

  function closeDialog() {
    const d = document.getElementById('dialog');
    d.classList.add('hidden');
    if (gameStarted) renderer.domElement.requestPointerLock();
  }

  function dialogOpen() {
    return !document.getElementById('dialog').classList.contains('hidden');
  }

  function showMarketDialog(areaName, productList, message) {
    const lines = productList.map(p => `
      <div><b>${p}</b> - Preis: ${game.prices[p].price} Fr. | Bestand: ${game.inventory[p]}
        <button class="actionBtn good" data-buy="${p}">Kaufen (1)</button>
        <button class="actionBtn" data-sell="${p}">Verkaufen (1)</button>
      </div>
    `).join('');

    openDialog(`
      <h2>${areaName}</h2>
      <p>${message}</p>
      <p class="muted">Tipp: Beobachte Ereignisse. Bei Knappheit steigen Preise oft, bei Überangebot fallen sie häufig.</p>
      ${lines}
      <hr>
      <button class="actionBtn" id="askQ">Wissensfrage</button>
      <button class="actionBtn" id="explainScarcity">Warum steigt Preis bei Knappheit?</button>
    `);

    document.querySelectorAll('[data-buy]').forEach(btn => btn.onclick = () => buy(btn.dataset.buy, 1));
    document.querySelectorAll('[data-sell]').forEach(btn => btn.onclick = () => sell(btn.dataset.sell, 1));

    document.getElementById('askQ').onclick = () => {
      const remaining = QUIZ.filter((_, i) => !game.askedQuestionIds.has(i));
      if (!remaining.length) return toast('Alle Quizfragen wurden bereits gespielt.');
      const randomQ = remaining[Math.floor(Math.random() * remaining.length)];
      game.askedQuestionIds.add(QUIZ.indexOf(randomQ));
      showQuiz(randomQ, (correct) => {
        game.answeredQuestions += 1;
        game.score += correct ? 25 : 5;
        progressQuests();
      });
    };

    document.getElementById('explainScarcity').onclick = () => {
      openDialog(`
        <h3>Knappheit und Preis</h3>
        <p>Wenn ein Gut knapp wird, sinkt das Angebot. Bei gleicher/höherer Nachfrage konkurrieren Käufer stärker – der Preis steigt.</p>
        <p>Das ist eine klassische Angebotsverschiebung nach links.</p>
      `);
      game.interacted.explainedScarcity = true;
      progressQuests();
    };
  }

  function buy(product, qty) {
    const price = game.prices[product].price * qty;
    if (game.money < price) return toast('Nicht genug Geld.');
    if (inventoryAmount() + qty > game.capacity) return toast('Lager voll.');

    game.money -= price;
    game.inventory[product] += qty;
    game.score += 3;

    if (product === 'Äpfel' && game.prices[product].price <= 7) game.interacted.appleCheapBought = true;
    if (product === 'Brot' && game.activeEvents.some(e => e.name.includes('Überproduktion'))) game.interacted.reactedBreadOverproduction = true;

    progressQuests();
  }

  function sell(product, qty) {
    if (game.inventory[product] < qty) return toast('Nicht genug Bestand.');
    game.inventory[product] -= qty;
    game.money += game.prices[product].price * qty;
    game.score += 5;

    if (product === 'Äpfel' && game.activeEvents.some(e => e.name.includes('Ernteausfall'))) game.interacted.soldApplesAfterFailure = true;
    if (game.prices[product].demand > 1.35) game.interacted.highDemandDecision = true;

    progressQuests();
  }

  function inventoryAmount() {
    return PRODUCTS.reduce((sum, p) => sum + game.inventory[p], 0);
  }

  function showBankDialog() {
    game.interacted.bankVisited = true;
    progressQuests();
    openDialog(`
      <h2>Bank</h2>
      <p>Optionen: Kredit für mehr Handelsvolumen, aber Rückzahlung mit Zins.</p>
      <p>Kreditstatus: ${game.loan.active ? `Aktiv (${game.loan.amount} Fr., fällig Tag ${game.loan.dueDay})` : 'Kein aktiver Kredit'}</p>
      <button class="actionBtn good" id="takeLoan">Kredit 200 Fr. aufnehmen</button>
      <button class="actionBtn" id="repayLoan">Kredit sofort zurückzahlen</button>
      <button class="actionBtn" id="investStorage">In Lagerkapazität investieren (150 Fr.)</button>
    `);

    document.getElementById('takeLoan').onclick = () => {
      if (game.loan.active) return toast('Es gibt bereits einen Kredit.');
      game.loan.active = true;
      game.loan.amount = 200;
      game.loan.dueDay = game.day + 6;
      game.money += 200;
      toast('Kredit aufgenommen: +200 Fr.');
      closeDialog();
    };

    document.getElementById('repayLoan').onclick = () => {
      if (!game.loan.active) return toast('Kein Kredit aktiv.');
      const payment = Math.round(game.loan.amount * (1 + game.loan.interest));
      if (game.money < payment) return toast('Zu wenig Geld für Rückzahlung.');
      game.money -= payment;
      game.loan.active = false;
      toast(`Kredit zurückgezahlt (${payment} Fr.).`);
      closeDialog();
    };

    document.getElementById('investStorage').onclick = () => {
      if (game.money < 150) return toast('Zu wenig Geld für die Investition.');
      game.money -= 150;
      game.capacity += 60;
      game.score += 50;
      toast('Lagerkapazität erhöht.');
      progressQuests();
      closeDialog();
    };
  }

  function showWarehouseDialog() {
    openDialog(`
      <h2>Lagerhaus</h2>
      <p>Hier kannst du Bestände strategisch halten, um auf Preisschwankungen zu reagieren.</p>
      <p>Genutzte Kapazität: ${inventoryAmount()} / ${game.capacity}</p>
      <button class="actionBtn" id="warehouseQuiz">Ereignisanalyse starten</button>
    `);

    document.getElementById('warehouseQuiz').onclick = () => {
      showQuiz({
        question: 'Ein Streik im Lagerhaus unterbricht Lieferungen. Welche Marktwirkung ist wahrscheinlich?',
        options: ['Angebot sinkt, Preis steigt tendenziell', 'Angebot steigt, Preis sinkt sicher', 'Keine Wirkung auf den Markt'],
        correct: 0,
        explanation: 'Logistikprobleme reduzieren verfügbare Waren auf dem Markt.'
      }, (ok) => {
        if (ok) {
          game.score += 20;
          game.interacted.marketAnalysis = true;
        }
        progressQuests();
      });
    };
  }

  function showCityHallDialog() {
    if (game.level < 5) {
      return openDialog('<h2>Rathaus</h2><p>Noch geschlossen. Erreiche Level 5 für die Abschlussprüfung.</p>');
    }

    openDialog(`
      <h2>Rathaus – Abschlussprüfung</h2>
      <p>Bestehe 6 Fragen in Folge mit mindestens 4 richtigen Antworten.</p>
      <button class="actionBtn good" id="startExam">Prüfung starten</button>
      <button class="actionBtn" id="eventAnalysis">Marktereignis analysieren</button>
    `);

    document.getElementById('startExam').onclick = runFinalExam;
    document.getElementById('eventAnalysis').onclick = () => {
      game.interacted.marketAnalysis = true;
      toast('Analyse eingetragen.');
      progressQuests();
    };
  }

  function runFinalExam() {
    const picks = shuffle(QUIZ.slice()).slice(0, 6);
    let index = 0;
    let correct = 0;

    const ask = () => {
      showQuiz(picks[index], (ok) => {
        if (ok) correct += 1;
        index += 1;
        if (index < picks.length) return ask();

        if (correct >= 4) {
          game.passedFinalExam = true;
          game.score += 300;
          toast(`Prüfung bestanden (${correct}/6)!`);
        } else {
          toast(`Prüfung nicht bestanden (${correct}/6). Versuche es erneut.`);
        }
        progressQuests();
      }, true);
    };

    ask();
  }

  function showQuiz(questionObj, onDone, keepDialogOpen = false) {
    openDialog(`
      <h3>Quiz: ${questionObj.question}</h3>
      ${questionObj.options.map((o, i) => `<button class="quiz-option actionBtn" data-opt="${i}">${String.fromCharCode(65 + i)}: ${o}</button>`).join('')}
      <p id="quizFeedback" class="muted">Wähle eine Antwort.</p>
    `);

    document.querySelectorAll('[data-opt]').forEach(btn => {
      btn.onclick = () => {
        const ok = Number(btn.dataset.opt) === questionObj.correct;
        const feedback = document.getElementById('quizFeedback');
        feedback.innerHTML = ok
          ? `<span class="ok">Richtig!</span> ${questionObj.explanation}`
          : `<span class="bad">Falsch.</span> ${questionObj.explanation}`;

        setTimeout(() => {
          if (!keepDialogOpen) closeDialog();
          onDone(ok);
        }, 1400);
      };
    });
  }

  function refreshHUD() {
    const doneCount = quests.filter(q => q.done).length;
    const currentQuest = quests.find(q => !q.done)?.text || 'Alle Quests abgeschlossen! Rathausprüfung abschliessen.';

    document.getElementById('stats').innerHTML = `
      Geld: <b>${game.money} Fr.</b><br>
      Punkte: <b>${game.score}</b><br>
      Level: <b>${game.level}</b><br>
      Tag: <b>${game.day}</b>, Uhrzeit: <b>${game.timeOfDay.toFixed(1)}h</b><br>
      Vermögen: <b>${netWorth()} Fr.</b><br>
      Quests: <b>${doneCount}/12</b>
    `;

    document.getElementById('goal').innerHTML = `<b>Aktuelles Ziel:</b><br>${currentQuest}`;
    document.getElementById('inventory').innerHTML = PRODUCTS.map(p => `${p}: <b>${game.inventory[p]}</b>`).join('<br>') + `<br><span class="muted">Kapazität: ${inventoryAmount()}/${game.capacity}</span>`;
    document.getElementById('prices').innerHTML = PRODUCTS.map(p => `${p}: <b>${game.prices[p].price}</b> <span class="muted">(A:${game.prices[p].supply.toFixed(2)} / N:${game.prices[p].demand.toFixed(2)})</span>`).join('<br>');
    document.getElementById('events').innerHTML = game.activeEvents.length
      ? game.activeEvents.map(e => `<div>${e.name} <span class="muted">(${e.remaining} Runden)</span></div>`).join('')
      : '<span class="muted">Derzeit keine besonderen Ereignisse.</span>';
    document.getElementById('quests').innerHTML = quests.map(q => `<div class="${q.done ? 'ok' : ''}">${q.done ? '✔' : '•'} ${q.id}. ${q.text}</div>`).join('');
  }

  function pulseInteractables(now) {
    world.interactables.forEach((i, idx) => {
      const t = Math.sin(now * 0.002 + idx) * 0.15 + 0.85;
      i.mesh.material.emissiveIntensity = i.unlockedAt <= game.level ? t : 0.08;
      i.mesh.material.color.setHex(i.unlockedAt <= game.level ? 0x3a78c8 : 0x666666);
    });
  }

  function setInitialHudState() {
    refreshHUD();
  }

  function buildWorld() {
    for (let i = 0; i < 30; i++) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(rand(5, 10), rand(6, 15), rand(5, 10)),
        new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(rand(0.05, 0.65), 0.35, rand(0.35, 0.62)) })
      );
      box.position.set(rand(-130, 130), box.geometry.parameters.height / 2, rand(-130, 130));
      if (Math.abs(box.position.z) < 16) box.position.z += 35 * Math.sign(box.position.z || 1);
      box.castShadow = true;
      box.receiveShadow = true;
      scene.add(box);
    }

    addArea('Bauernmarkt', -80, -20, 0x6cae3c, () => showMarketDialog('Bauernmarkt', ['Äpfel', 'Brot'], 'Frische Ware aus der Region.'));
    addArea('Einkaufsstrasse', -15, -15, 0xaf8f41, () => showMarketDialog('Einkaufsstrasse', ['Brot', 'Kaffee', 'Fahrräder'], 'Viele Konkurrenten, häufige Aktionen.'));
    addArea('Elektronikviertel', 52, -12, 0x5887c4, () => showMarketDialog('Elektronikviertel', ['Smartphones', 'Energie'], 'Technologie und hohe Margen.'));
    addArea('Bank', 40, 50, 0x7b5ac7, showBankDialog);
    addArea('Lagerhaus', 70, 64, 0x5a6f7c, showWarehouseDialog);
    addArea('Rathaus', -55, 56, 0xc76b6b, showCityHallDialog);

    Object.entries(world.areas).forEach(([, area]) => {
      const sign = new THREE.Mesh(new THREE.BoxGeometry(7, 3, 0.6), new THREE.MeshStandardMaterial({ color: 0xefe7cc }));
      sign.position.set(area.pos.x, 3, area.pos.z - 8);
      scene.add(sign);

      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3, 0.4), new THREE.MeshStandardMaterial({ color: 0x3b2f1f }));
      pole.position.set(area.pos.x, 1.5, area.pos.z - 8);
      scene.add(pole);
    });
  }

  function addArea(name, x, z, color, action) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 20), new THREE.MeshStandardMaterial({ color }));
    base.position.set(x, 5, z);
    base.castShadow = true;
    base.receiveShadow = true;
    scene.add(base);

    const marker = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 2.2, 24),
      new THREE.MeshStandardMaterial({ color: 0x3a78c8, emissive: 0x1c385c, emissiveIntensity: 1 })
    );
    marker.position.set(x, 1.2, z + 12);
    marker.castShadow = true;
    scene.add(marker);

    world.interactables.push({ mesh: marker, name, unlockedAt: world.areas[name].unlockedAt, action });
  }

  function buildNPCs() {
    const npcGeom = new THREE.CapsuleGeometry(0.6, 1.0, 4, 8);
    for (let i = 0; i < 18; i++) {
      const npc = new THREE.Mesh(
        npcGeom,
        new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(rand(0, 1), 0.55, 0.52) })
      );
      npc.position.set(rand(-100, 100), 1.3, rand(-100, 100));
      npc.userData.update = (t) => {
        const phase = i * 0.77;
        npc.position.x += Math.sin(t * 0.0005 + phase) * 0.02;
        npc.position.z += Math.cos(t * 0.0005 + phase) * 0.02;
      };
      scene.add(npc);
    }
  }

  function createPriceModel() {
    applyMarketDynamics();
    refreshHUD();
    game.interacted.appleCheapBought = false;
  }

  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { t.style.opacity = '0'; }, 3000);
  }

  function q(question, options, correct, explanation) {
    return { question, options, correct, explanation };
  }

  function event(name, text, effects) {
    return { name, text, effects, duration: 2 + Math.floor(Math.random() * 2) };
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  setInterval(() => {
    if (game.interacted.appleCheapBought && game.inventory['Äpfel'] >= 5) {
      quests[0].done = true;
    }
  }, 1200);
})();
