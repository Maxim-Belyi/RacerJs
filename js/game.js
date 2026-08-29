import {
  blueCar,
  arrow,
  arrowInfo,
  arrowB,
  arrowBInfo,
  magnet,
  magnetInfo,
  danger,
  gameScoreWrapper,
  gameScoreValue,
  crashModal,
  crashReviveBtn,
  crashRestartBtn,
  crashLivesText,
  backdropEndGame,
  restartButton,
  trees,
  coin,
  coinAlt,
  coinB,
  coinC,
  coinD,
  coinE,
  coinF,
  coinG,
  coinInfo,
  coinAltInfo,
  coinBInfo,
  coinCInfo,
  coinDInfo,
  coinEInfo,
  coinFInfo,
  coinGInfo,
  controlLeft,
  controlDown,
  controlTop,
  controlRight,
  roadWidth,
  treesCoords,
  cracks,
  cracksInfo
} from "./utils/variables.js";

import { hasCollision } from "./utils/has-collision.js";
import { Storage } from "./utils/storage.js";
import { createElementInfo } from "./utils/create-elem-info.js";
import { getCoords } from "./utils/get-coords.js";
import { Sounds } from "./utils/sound.js";
import { initShop, applySkin } from "./utils/shop.js";
import { getCarClass } from './utils/car-catalog.js';
import { runCountdown } from './utils/countdown.js';
import { AiCar, resolveAiPlayerCollision, resolveAiAiCollision } from './utils/ai-car.js';
import { FinishLine, StartLine, RACE_DISTANCE } from './utils/finish-line.js';

(function () {
  let isPause = true;
  let animationId = null;
  let score = 0;
  let magnetActive = false;
  let magnetTimeout = null;

  let blueCarMoveSpeed = 3;
  let treesMoveSpeed = 7;
  let signsMoveSpeed = 5;

  let playerTravelDist = 0;
  let playerBoostDelta = 0;
  let playerSlowDownFrames = 0;
  let finishReached = false;
  let isInvulnerable = false;
  let playerCarClass = null;

  const aiCars = [];

  const road = document.querySelector('[data-js-road]');
  const dangerElem = danger; 
  const dangerInfo = createElementInfo(dangerElem);

  let activeDangerElems = [dangerElem];
  let activeDangerInfos = [dangerInfo];
  let activeCracks = [...cracks];
  let activeCracksInfos = [...cracksInfo];

  const EXTRA_COIN_COUNT = 16;
  const OFFSCREEN_Y = -10000; 
  const extraCoins = [];

  for (let i = 0; i < EXTRA_COIN_COUNT; i++) {
    const el = document.createElement('div');
    el.className = 'signs signs__coin coin-extra';
    el.innerHTML = '<img src="./images/coin.png" alt="">';
    road.appendChild(el);

    const info = createElementInfo(el);
    info.visible = false;
    info.coords.x = 0;  
    info.coords.y = OFFSCREEN_Y;
    info.width  = info.width  || 40; 
    info.height = info.height || 40;
    el.style.display = 'none';
    el.style.transform = `translate(0px, ${OFFSCREEN_Y}px)`;

    extraCoins.push({ element: el, info });
  }

  const roadMarking = document.querySelector('[data-js-road-marking]');
  let roadMarkingOffset = 0;
  const MARKING_REPEAT = 80;

  let carMagnetIndicator = null;

  const allSignInfos = [coinInfo, coinAltInfo, coinBInfo, coinCInfo, coinDInfo, coinEInfo, coinFInfo, coinGInfo];
  allSignInfos.forEach(info => {
    const w = info.width || 50;
    info.coords.x = Math.random() * Math.max(0, roadWidth - w);
  });

  coinInfo.coords.y    = -450;
  coinAltInfo.coords.y = -800;
  coinBInfo.coords.y   = -1800;
  coinCInfo.coords.y   = -2400;
  coinDInfo.coords.y   = -600;
  coinEInfo.coords.y   = -1200;
  coinFInfo.coords.y   = -2100;
  coinGInfo.coords.y   = -3000;

  const arrowW = arrowInfo.width || 50;
  arrowInfo.coords.x  = Math.random() * Math.max(0, roadWidth - arrowW);
  arrowInfo.coords.y  = -2000;
  arrowInfo.visible   = true;
  arrowBInfo.coords.x = Math.random() * Math.max(0, roadWidth - arrowW);
  arrowBInfo.coords.y = -4000;
  arrowBInfo.visible  = true;
  const magnetW = magnetInfo.width || 50;
  magnetInfo.coords.x = Math.random() * Math.max(0, roadWidth - magnetW);
  magnetInfo.coords.y = -6000;
  magnet.style.display = 'none';
  magnetInfo.visible = false;

  const level = Storage.get().gameLevel || 1;

  // Clean up previous dynamically added items
  [...document.querySelectorAll('.dynamic-danger, .dynamic-crack')].forEach(el => el.remove());
  
  activeDangerElems = [dangerElem];
  activeDangerInfos = [dangerInfo];
  activeCracks = [...cracks];
  activeCracksInfos = [...cracksInfo];

  const extraDangersCount = Math.floor((level - 1) / 5);
  const extraCracksCount = Math.floor((level - 1) / 3);
  
  const dangerParent = dangerElem.parentElement;
  
  for(let i = 0; i < extraDangersCount; i++) {
    const clone = dangerElem.cloneNode(true);
    clone.classList.add('dynamic-danger');
    dangerParent.appendChild(clone);
    activeDangerElems.push(clone);
    activeDangerInfos.push(createElementInfo(clone));
  }

  for(let i = 0; i < extraCracksCount; i++) {
    const clone = cracks[0].cloneNode(true);
    clone.classList.add('dynamic-crack');
    dangerParent.appendChild(clone);
    activeCracks.push(clone);
    activeCracksInfos.push(createElementInfo(clone));
  }

  activeDangerElems.forEach((el, i) => {
    const info = activeDangerInfos[i];
    info.coords.x = Math.random() * (roadWidth - (info.width || 50));
    info.coords.y = -3000 - (i * 4000);
    info.visible = true;
    el.style.opacity = 1;
    el.style.display = 'initial';
  });

  activeCracks.forEach((el, i) => {
    const info = activeCracksInfos[i];
    info.coords.x = Math.random() * (roadWidth - (info.width || 50));
    info.coords.y = -2000 - (i * 2500);
    info.visible = true;
    el.style.display = 'initial';
  });

  // Apply initial transforms to all signs so CSS defaults are overridden immediately
  allSignInfos.forEach((info, i) => {
    const elems = [coin, coinAlt, coinB, coinC, coinD, coinE, coinF, coinG];
    elems[i].style.transform = `translate(${info.coords.x}px, ${info.coords.y}px)`;
  });
  arrow.style.transform  = `translate(${arrowInfo.coords.x}px, ${arrowInfo.coords.y}px)`;
  arrowB.style.transform = `translate(${arrowBInfo.coords.x}px, ${arrowBInfo.coords.y}px)`;
  magnet.style.transform = `translate(${magnetInfo.coords.x}px, ${magnetInfo.coords.y}px)`;

  const blueCarInfo = {
    ...createElementInfo(blueCar),
    moveSpeed: blueCarMoveSpeed,
    move: { up: null, down: null, left: null, right: null },
  };

  for (let i = 0; i < trees.length; i++) {
    treesCoords.push(getCoords(trees[i]));
  }

  function spawnPopLabel(elem, text, modifier) {
    const img = elem.querySelector('img');
    img.classList.add('pop-collect');
    img.addEventListener('animationend', () => {
      elem.style.display = 'none';  
      img.classList.remove('pop-collect');
    }, { once: true });

    const rect = elem.getBoundingClientRect();
    const label = document.createElement('div');
    label.className = `pop-label pop-label--${modifier}`;
    label.textContent = text;
    label.style.left = (rect.left + rect.width / 2) + 'px';
    label.style.top  = (rect.top  - 8) + 'px';
    document.body.appendChild(label);
    label.addEventListener('animationend', () => label.remove(), { once: true });
  }


  function stopCarAnimations() {
    Object.values(blueCarInfo.move).forEach((id) => { if (id) cancelAnimationFrame(id); });
    Object.keys(blueCarInfo.move).forEach((key) => { blueCarInfo.move[key] = null; });
  }

  function moveUp() {
    blueCarInfo.coords.y -= blueCarMoveSpeed;
    blueCar.style.transform = `translate(${blueCarInfo.coords.x}px, ${blueCarInfo.coords.y}px)`;
    if (blueCarInfo.coords.y < -(window.innerHeight)) return;
    blueCarInfo.move.up = requestAnimationFrame(moveUp);
  }

  function moveDown() {
    blueCarInfo.coords.y += blueCarMoveSpeed;
    if (blueCarInfo.coords.y > -blueCarInfo.height) return;
    blueCar.style.transform = `translate(${blueCarInfo.coords.x}px, ${blueCarInfo.coords.y}px)`;
    blueCarInfo.move.down = requestAnimationFrame(moveDown);
  }

  function moveLeft() {
    blueCarInfo.coords.x -= blueCarMoveSpeed;
    if (blueCarInfo.coords.x > roadWidth || blueCarInfo.coords.x < 0) return;
    blueCar.style.transform = `translate(${blueCarInfo.coords.x}px, ${blueCarInfo.coords.y}px)`;
    blueCarInfo.move.left = requestAnimationFrame(moveLeft);
  }

  function moveRight() {
    blueCarInfo.coords.x += blueCarMoveSpeed;
    if (blueCarInfo.coords.x > roadWidth - blueCarInfo.width) return;
    blueCar.style.transform = `translate(${blueCarInfo.coords.x}px, ${blueCarInfo.coords.y}px)`;
    blueCarInfo.move.right = requestAnimationFrame(moveRight);
  }

  function startMove(direction) {
    if (isPause) return;
    if (direction === 'left') {
      blueCar.classList.remove('car--lean-right');
      blueCar.classList.add('car--lean-left');
    } else if (direction === 'right') {
      blueCar.classList.remove('car--lean-left');
      blueCar.classList.add('car--lean-right');
    }
    const fns = { up: moveUp, down: moveDown, left: moveLeft, right: moveRight };
    if (!blueCarInfo.move[direction]) {
      stopCarAnimations();
      blueCarInfo.move[direction] = requestAnimationFrame(fns[direction]);
    }
  }

  function stopMove(direction) {
    if (blueCarInfo.move[direction]) {
      cancelAnimationFrame(blueCarInfo.move[direction]);
      blueCarInfo.move[direction] = null;
    }
    if (direction === 'left')  blueCar.classList.remove('car--lean-left');
    if (direction === 'right') blueCar.classList.remove('car--lean-right');
  }

  document.addEventListener('keydown', (e) => {
    if (isPause) return;
    switch (e.code) {
      case 'ArrowUp':    case 'KeyW': startMove('up');    break;
      case 'ArrowDown':  case 'KeyS': startMove('down');  break;
      case 'ArrowLeft':  case 'KeyA': startMove('left');  break;
      case 'ArrowRight': case 'KeyD': startMove('right'); break;
    }
  });

  document.addEventListener('keyup', (e) => {
    if (isPause) return;
    switch (e.code) {
      case 'ArrowUp':    case 'KeyW': stopMove('up');    break;
      case 'ArrowDown':  case 'KeyS': stopMove('down');  break;
      case 'ArrowLeft':  case 'KeyA': stopMove('left');  break;
      case 'ArrowRight': case 'KeyD': stopMove('right'); break;
    }
  });

  const controls = [
    { button: controlTop,   direction: 'up'    },
    { button: controlRight, direction: 'right' },
    { button: controlDown,  direction: 'down'  },
    { button: controlLeft,  direction: 'left'  },
  ];
  controls.forEach(({ button, direction }) => {
    button.addEventListener('touchstart', (e) => { e.preventDefault(); startMove(direction); });
    button.addEventListener('touchend',   ()  => { stopMove(direction); });
  });


  function treesAnimation(speed) {
    roadMarkingOffset = (roadMarkingOffset + speed) % MARKING_REPEAT;
    roadMarking.style.backgroundPositionY = roadMarkingOffset + 'px';

    for (let i = 0; i < trees.length; i++) {
      let y = treesCoords[i].y + speed;
      if (y > window.innerHeight / 3) y = -window.innerHeight * 1.5;
      treesCoords[i].y = y;
      trees[i].style.transform = `translate(${treesCoords[i].x}px, ${y}px)`;
    }
  }


  function pullCoinToCar(cInfo) {
    if (!Number.isFinite(cInfo.coords.x)) cInfo.coords.x = roadWidth / 2;

    const carCX  = blueCarInfo.coords.x + blueCarInfo.width  / 2;
    const carCY  = blueCarInfo.coords.y + blueCarInfo.height / 2;
    const coinCX = cInfo.coords.x + (cInfo.width  || 40) / 2;
    const coinCY = cInfo.coords.y + (cInfo.height || 40) / 2;
    const dx   = carCX - coinCX;
    const dy   = carCY - coinCY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 900) {
      cInfo.coords.x += dx * 0.06;
      cInfo.coords.y += dy * 0.06;
      cInfo.coords.x = Math.max(0, Math.min(roadWidth - (cInfo.width || 40), cInfo.coords.x));
    }
  }

 
  function elementAnimation(elem, elemInfo, trackLength, speed = signsMoveSpeed) {
    const newY = elemInfo.coords.y + speed;
    const newX = elemInfo.coords.x;

    if (newY > window.innerHeight + 50) {
      const recycleX = Math.random() * (roadWidth - elemInfo.width);
      elemInfo.coords.y = -trackLength;
      elemInfo.coords.x = recycleX;
      elemInfo.visible = true;
      elem.style.display = 'initial';
      elem.style.transform = `translate(${recycleX}px, ${-trackLength}px)`;
      return;
    }

    elemInfo.coords.y = newY;
    elem.style.transform = `translate(${newX}px, ${newY}px)`;
  }

  function moveExtraCoin(coinObj, speed) {
    if (!coinObj.info.visible) return;

    if (magnetActive) {
      pullCoinToCar(coinObj.info);
    }

    const newY = coinObj.info.coords.y + speed;
    coinObj.info.coords.y = newY;
    coinObj.element.style.transform = `translate(${coinObj.info.coords.x}px, ${newY}px)`;

    if (newY > window.innerHeight + 50) {
      parkExtraCoin(coinObj);
    }
  }

  function spawnExtraCoins() {
    const coinW = extraCoins[0]?.info.width || 40;
    const maxX = Math.max(roadWidth - coinW, 10);

    extraCoins.forEach((coinObj, i) => {
      if (coinObj.info.coords.y === OFFSCREEN_Y) {
        const delay = i * 80;
        setTimeout(() => {
          if (!magnetActive) return;
          const startY = -(Math.random() * 2000 + 500);
          const startX = Math.random() * maxX;
          coinObj.info.coords.y = startY;
          coinObj.info.coords.x = startX;
          coinObj.info.visible = true;
          coinObj.element.style.display = 'initial';
          coinObj.element.style.transform = `translate(${startX}px, ${startY}px)`;
        }, delay);
      }
    });
  }

  function parkExtraCoin(coinObj) {
    coinObj.info.visible = false;
    coinObj.element.style.display = 'none';
    coinObj.info.coords.y = OFFSCREEN_Y;
    coinObj.element.style.transform = `translate(0px, ${OFFSCREEN_Y}px)`;
  }

  function parkAllExtraCoins() {
    extraCoins.forEach(parkExtraCoin);
  }

  function collectCoin(elem, elemInfo) {
    score++;
    gameScoreValue.innerText = score;
    spawnPopLabel(elem, '+1', 'coin'); 
    elemInfo.visible = false;  

    if (Sounds.isPlaying) Sounds.play('coin');

    if (score % 3 === 0 && signsMoveSpeed < 25) {
      blueCarMoveSpeed += 0.5;
      signsMoveSpeed   += 0.5;
      treesMoveSpeed   += 0.5;
    }
  }

  
  function startGame() {
    if (isPause) return;

    if (playerSlowDownFrames > 0) {
      playerSlowDownFrames--;
      blueCarInfo.moveSpeed = blueCarMoveSpeed * 0.5;
    } else {
      blueCarInfo.moveSpeed = blueCarMoveSpeed;
    }
    
    const currentSpeedMod = playerSlowDownFrames > 0 ? 0.5 : 1.0;
    const actualTreesSpeed = treesMoveSpeed * currentSpeedMod;
    const actualSignsSpeed = signsMoveSpeed * currentSpeedMod;

    treesAnimation(actualTreesSpeed);

    const regularCoins = [
      { element: coin,    info: coinInfo,    speed: 1000 },
      { element: coinAlt, info: coinAltInfo, speed: 1600 },
      { element: coinB,   info: coinBInfo,   speed: 2000 },
      { element: coinC,   info: coinCInfo,   speed: 2400 },
      { element: coinD,   info: coinDInfo,   speed: 1300 },
      { element: coinE,   info: coinEInfo,   speed: 1800 },
      { element: coinF,   info: coinFInfo,   speed: 2200 },
      { element: coinG,   info: coinGInfo,   speed: 2700 },
    ];

    regularCoins.forEach(c => {
      elementAnimation(c.element, c.info, c.speed, actualSignsSpeed);

      if (magnetActive && c.info.visible) pullCoinToCar(c.info);

      if (c.info.visible && hasCollision(blueCarInfo, c.info)) {
        collectCoin(c.element, c.info);
      }
    });

    extraCoins.forEach(coinObj => {
      moveExtraCoin(coinObj, actualSignsSpeed);

      if (coinObj.info.visible && hasCollision(blueCarInfo, coinObj.info)) {
        collectCoin(coinObj.element, coinObj.info);
        parkExtraCoin(coinObj);
      }
    });

    [{ el: arrow, info: arrowInfo }, { el: arrowB, info: arrowBInfo }].forEach(({ el, info }) => {
      elementAnimation(el, info, 4000, actualSignsSpeed);
      if (info.visible && hasCollision(blueCarInfo, info)) {
        spawnPopLabel(el, 'BOOST!', 'boost');
        info.visible = false;
        
        activeDangerElems.forEach((dEl, i) => {
          dEl.style.opacity = 0.2;
          activeDangerInfos[i].visible = false;
        });
        
        if (Sounds.isPlaying) Sounds.play('arrow');

        blueCar.classList.add('car--boosting');
        blueCarMoveSpeed += 7;
        treesMoveSpeed   += 5;
        signsMoveSpeed   += 4;
        playerBoostDelta  = 4;

        setTimeout(() => {
          activeDangerElems.forEach((dEl) => dEl.style.opacity = 1);
          blueCarMoveSpeed -= 7;
          treesMoveSpeed   -= 5;
          signsMoveSpeed   -= 4;
          playerBoostDelta  = 0;
          blueCar.classList.remove('car--boosting');
          setTimeout(() => { 
            activeDangerInfos.forEach((dInfo) => dInfo.visible = true); 
          }, 1000);
        }, 2000);
      }
    });

    const state = Storage.get();
    if (state.hasMagnet) {
      elementAnimation(magnet, magnetInfo, 6000, actualSignsSpeed);
      if (magnetInfo.visible && hasCollision(blueCarInfo, magnetInfo)) {
        magnetActive = true;
        if (carMagnetIndicator) carMagnetIndicator.style.display = 'block';
        clearTimeout(magnetTimeout);
        spawnExtraCoins();

        magnetTimeout = setTimeout(() => {
          magnetActive = false;
          if (carMagnetIndicator) carMagnetIndicator.style.display = 'none';
        }, 6000);

        spawnPopLabel(magnet, 'MAGNET!', 'boost');
        magnetInfo.visible = false;
        magnet.style.display = 'none';
        magnetInfo.coords.y = -6000;

        if (Sounds.isPlaying) Sounds.play('coin');
      }
    }

    for (let i = 0; i < activeDangerElems.length; i++) {
      elementAnimation(activeDangerElems[i], activeDangerInfos[i], 3000 + i * 4000, actualSignsSpeed);
      if (!isInvulnerable && activeDangerInfos[i].visible && hasCollision(blueCarInfo, activeDangerInfos[i])) {
        finishGame();
        return;
      }
    }

    for (let i = 0; i < activeCracks.length; i++) {
      elementAnimation(activeCracks[i], activeCracksInfos[i], 2000 + (i * 2500), actualSignsSpeed);
      if (!isInvulnerable && activeCracksInfos[i].visible && hasCollision(blueCarInfo, activeCracksInfos[i])) {
        playerSlowDownFrames = 120;
        activeCracksInfos[i].visible = false;
        activeCracks[i].style.display = 'none';
        activeCracksInfos[i].coords.y = -5000;
        if (Sounds.isPlaying) Sounds.play('slow');
        blueCar.classList.add('car--damaged');
        setTimeout(() => blueCar.classList.remove('car--damaged'), 2000);
      }
    }

    if (state.speedLevel > 1 && blueCarMoveSpeed < 6) {
      blueCarMoveSpeed = 4.5;
    }

    playerTravelDist += signsMoveSpeed;
    
    const worldBaseSpeed = playerCarClass ? (signsMoveSpeed / playerCarClass.modifier) : signsMoveSpeed;
    let aiBaseSpeed = worldBaseSpeed - playerBoostDelta;
    if (window.currentGameLevel) {
      aiBaseSpeed *= 1 + (window.currentGameLevel - 1) * 0.02;
    }

    const coinsForAi = [
      { element: coin,    info: coinInfo    },
      { element: coinAlt, info: coinAltInfo },
      { element: coinB,   info: coinBInfo   },
      { element: coinC,   info: coinCInfo   },
      { element: coinD,   info: coinDInfo   },
      { element: coinE,   info: coinEInfo   },
      { element: coinF,   info: coinFInfo   },
      { element: coinG,   info: coinGInfo   },
    ];

    const arrowsForAi = [
      { element: arrow,  info: arrowInfo  },
      { element: arrowB, info: arrowBInfo },
    ];

    aiCars.forEach(ai => {
      ai.update(playerTravelDist, aiBaseSpeed, activeDangerInfos, coinsForAi, arrowsForAi, activeCracksInfos);
      resolveAiPlayerCollision(ai, blueCarInfo, blueCar, roadWidth);

      // AI collision with danger signs
      for (const dInfo of activeDangerInfos) {
        if (dInfo.visible && ai.overlaps(dInfo)) {
          ai.crash(dInfo.coords.x + dInfo.width / 2);
        }
      }

      // AI collision with cracks
      for (const cInfo of activeCracksInfos) {
        if (cInfo.visible && ai.overlaps(cInfo)) {
          ai.bump(); // Cracks cause a minor slowdown without sideways knockback
        }
      }

      coinsForAi.forEach(c => {
        if (c.info.visible && ai.overlaps(c.info)) {
          c.info.visible = false;
          c.element.style.display = 'none';
        }
      });

      arrowsForAi.forEach(a => {
        if (a.info.visible && ai.overlaps(a.info)) {
          ai.boost();
          a.info.visible = false;
          a.element.style.display = 'none';
        }
      });
    });

    if (aiCars.length >= 2) resolveAiAiCollision(aiCars[0], aiCars[1]);

    startLine.update(playerTravelDist, blueCarInfo.coords.y);

    if (finishLine.update(playerTravelDist, blueCarInfo.coords.y)) {
      finishLine.markCrossed();
      finishReached = true;
    }

    if (finishReached) {
      signsMoveSpeed   = Math.max(0, signsMoveSpeed   * 0.97);
      treesMoveSpeed   = Math.max(0, treesMoveSpeed   * 0.97);
      blueCarMoveSpeed = Math.max(0, blueCarMoveSpeed * 0.97);

      if (signsMoveSpeed < 0.1) {
        finishRace();
        return;
      }
    }

    if (Sounds.isPlaying) Sounds.play('main');

    animationId = requestAnimationFrame(startGame);
  }


  function finishGame() {
    isPause = true;
    cancelAnimationFrame(animationId);
    stopCarAnimations();
    if (carMagnetIndicator) carMagnetIndicator.style.display = 'none';
    magnetActive = false;
    clearTimeout(magnetTimeout);
    parkAllExtraCoins();

    document.body.classList.add('screen-shake');
    document.body.addEventListener('animationend', () => {
      document.body.classList.remove('screen-shake');
    }, { once: true });

    setTimeout(() => {
      Storage.addCoins(score);
      const state = Storage.get();
      
      crashLivesText.textContent = state.extraLives;
      if (state.extraLives > 0) {
        crashReviveBtn.style.display = 'block';
      } else {
        crashReviveBtn.style.display = 'none';
      }
      
      crashModal.classList.add('visible');
    }, 300);
  }

  const welcomeScreen       = document.querySelector('[data-js-welcome-screen]');
  const welcomeStartButton  = document.querySelector('[data-js-start-game]');
  carMagnetIndicator        = document.querySelector('[data-js-car-magnet]');
  const gameButton          = document.querySelector('[data-js-start-game-button]');
  const musicToggle         = document.querySelector('[data-js-sound-button]');
  const finishLine          = new FinishLine(document.querySelector('[data-js-finish-line]'), roadWidth);
  const startLine           = new StartLine(document.querySelector('[data-js-start-line]'), roadWidth);
  const raceResultEl        = document.querySelector('[data-js-race-result]');
  const resultListEl        = document.querySelector('[data-js-result-list]');
  const gameLevelValue      = document.querySelector('[data-js-game-level-value]');

  if (gameLevelValue) {
    const st = Storage.get();
    gameLevelValue.textContent = st.gameLevel || 1;
  }

  function finishRace() {
    cancelAnimationFrame(animationId);
    stopCarAnimations();
    if (carMagnetIndicator) carMagnetIndicator.style.display = 'none';
    magnetActive = false;
    clearTimeout(magnetTimeout);

    // Save coins collected during the race
    Storage.addCoins(score);

    const places = [
      { label: 'You', dist: playerTravelDist },
      ...aiCars.map((ai, i) => ({ label: `Бот ${i + 1}`, dist: ai.travelDist })),
    ].sort((a, b) => b.dist - a.dist);

    if (places[0].label === 'You') {
      const state = Storage.get();
      state.gameLevel = (state.gameLevel || 1) + 1;
      Storage.save(state);
    }

    const medals = ['🥇', '🥈', '🥉'];
    resultListEl.innerHTML = places
      .map((p, i) => `<li class="race-result__item race-result__item--${['first','second','third'][i] || ''}">
        <span>${medals[i] || (i + 1)}</span><span>${p.label}</span>
      </li>`)
      .join('');

    raceResultEl.classList.add('visible');
  }

  crashReviveBtn.addEventListener('click', () => {
    const state = Storage.get();
    if (state.extraLives > 0) {
      state.extraLives--;
      Storage.save(state);
      
      activeDangerInfos.forEach((dInfo, i) => {
        dInfo.coords.y -= 1500;
        dInfo.visible = false;
        activeDangerElems[i].style.display = 'none';
      });

      activeCracksInfos.forEach((cInfo, i) => {
        cInfo.coords.y -= 1500;
        cInfo.visible = false;
        activeCracks[i].style.display = 'none';
      });
      
      crashModal.classList.remove('visible');
      isInvulnerable = true;
      blueCar.classList.add('car--invulnerable');
      
      setTimeout(() => {
        isInvulnerable = false;
        blueCar.classList.remove('car--invulnerable');
      }, 2000);

      isPause = false;
      animationId = requestAnimationFrame(startGame);
    }
  });

  crashRestartBtn.addEventListener('click', () => {
    sessionStorage.setItem('skipWelcome', 'true');
    window.location.reload();
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-js-restart]')) {
      sessionStorage.setItem('skipWelcome', 'true');
      window.location.reload();
    }
  });

  welcomeStartButton.addEventListener('click', () => {
    welcomeScreen.style.display = 'none';
    startLine.update(playerTravelDist, blueCarInfo.coords.y);
    runCountdown(() => {
      const state = Storage.get();
      playerCarClass = getCarClass(state.selectedCar);
      
      const level = state.gameLevel || 1;
      window.currentGameLevel = level;
      if (gameLevelValue) gameLevelValue.textContent = level;

      blueCarMoveSpeed = 3 * playerCarClass.modifier;
      treesMoveSpeed = 7 * playerCarClass.modifier;
      signsMoveSpeed = 5 * playerCarClass.modifier;

      const aiCarImages = [
        './images/car.png',
        './images/cars/car_porshe_black2.png',
        './images/cars/car_race_black.png',
        './images/cars/car_sport_black.png',
        './images/cars/car_race_blue.png',
        './images/cars/car_porshe_silver.png',
        './images/cars/car_race_red.png',
        './images/cars/car_sport_gold.png'
      ];

      const aiElements = [...document.querySelectorAll('[data-js-ai-car]')];
      aiCars.length = 0;
      const startRatios = [0.1, 0.68];
      aiElements.forEach((el, i) => {
        const carIndex = i === 0 
           ? Math.floor((level + 5) / 10) 
           : Math.floor(level / 10);
        
        const carImage = aiCarImages[Math.min(carIndex, aiCarImages.length - 1)];

        const img = el.querySelector('img');
        if (img) img.src = carImage;
        const ai = new AiCar(el, roadWidth);
        ai.place(roadWidth * startRatios[i], blueCarInfo.coords.y, playerTravelDist);
        aiCars.push(ai);
      });

      isPause = false;
      animationId = requestAnimationFrame(startGame);
      if (gameButton) {
        gameButton.children[1].classList.remove('visually-hidden');
        gameButton.children[0].classList.add('visually-hidden');
      }
    });
  });

  if (sessionStorage.getItem('skipWelcome') === 'true') {
    sessionStorage.removeItem('skipWelcome');
    welcomeStartButton.click();
  }

  initShop();
  applySkin(Storage.get().selectedCar);

  if (gameButton) {
    gameButton.addEventListener('click', () => {
      isPause = !isPause;
      if (isPause) {
        cancelAnimationFrame(animationId);
        stopCarAnimations();
        gameButton.children[1].classList.add('visually-hidden');
        gameButton.children[0].classList.remove('visually-hidden');
      } else {
        animationId = requestAnimationFrame(startGame);
        gameButton.children[1].classList.remove('visually-hidden');
        gameButton.children[0].classList.add('visually-hidden');
      }
    });
  }

  musicToggle.addEventListener('click', () => {
    Sounds.toggleMute();
    musicToggle.children[0].classList.toggle('visually-hidden');
    musicToggle.children[1].classList.toggle('visually-hidden');
  });

  restartButton.addEventListener('click', () => {
    sessionStorage.setItem('skipWelcome', 'true');
    window.location.reload();
  });
})();
