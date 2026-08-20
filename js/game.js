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
import { FinishLine, RACE_DISTANCE } from './utils/finish-line.js';

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
  let finishReached = false;
  let playerCarClass = null;

  const aiCars = [];

  const road = document.querySelector('[data-js-road]');
  const dangerElem = danger; 
  const dangerInfo = createElementInfo(dangerElem);

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

  [coinInfo, coinAltInfo, coinBInfo, coinCInfo, coinDInfo, coinEInfo, coinFInfo, coinGInfo].forEach(info => {
    if (!Number.isFinite(info.coords.x)) info.coords.x = 0;
  });

  coinInfo.coords.y    = -450;
  coinAltInfo.coords.y = -800;
  coinBInfo.coords.y   = -1800;
  coinCInfo.coords.y   = -2400;
  coinDInfo.coords.y   = -600;
  coinEInfo.coords.y   = -1200;
  coinFInfo.coords.y   = -2100;
  coinGInfo.coords.y   = -3000;

  arrowInfo.coords.y = -2000;
  arrowBInfo.coords.y = -4000;
  magnetInfo.coords.y = -6000;
  magnet.style.display = 'none';
  magnetInfo.visible = false;

  dangerInfo.coords.y = -3000;

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


  function treesAnimation() {
    roadMarkingOffset = (roadMarkingOffset + treesMoveSpeed) % MARKING_REPEAT;
    roadMarking.style.backgroundPositionY = roadMarkingOffset + 'px';

    for (let i = 0; i < trees.length; i++) {
      let y = treesCoords[i].y + treesMoveSpeed;
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

 
  function elementAnimation(elem, elemInfo, trackLength) {
    const newY = elemInfo.coords.y + signsMoveSpeed;
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

  function moveExtraCoin(coinObj) {
    if (!coinObj.info.visible) return;

    if (magnetActive) {
      pullCoinToCar(coinObj.info);
    }

    const newY = coinObj.info.coords.y + signsMoveSpeed;
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

    treesAnimation();

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
      elementAnimation(c.element, c.info, c.speed);

      if (magnetActive && c.info.visible) pullCoinToCar(c.info);

      if (c.info.visible && hasCollision(blueCarInfo, c.info)) {
        collectCoin(c.element, c.info);
      }
    });

    extraCoins.forEach(coinObj => {
      moveExtraCoin(coinObj);

      if (coinObj.info.visible && hasCollision(blueCarInfo, coinObj.info)) {
        collectCoin(coinObj.element, coinObj.info);
        parkExtraCoin(coinObj);
      }
    });

    [{ el: arrow, info: arrowInfo }, { el: arrowB, info: arrowBInfo }].forEach(({ el, info }) => {
      elementAnimation(el, info, 4000);
      if (info.visible && hasCollision(blueCarInfo, info)) {
        spawnPopLabel(el, 'BOOST!', 'boost');
        info.visible = false;
        dangerElem.style.opacity = 0.2;
        dangerInfo.visible = false;
        if (Sounds.isPlaying) Sounds.play('arrow');

        blueCar.classList.add('car--boosting');
        blueCarMoveSpeed += 7;
        treesMoveSpeed   += 5;
        signsMoveSpeed   += 4;
        playerBoostDelta  = 4;

        setTimeout(() => {
          dangerElem.style.opacity = 1;
          blueCarMoveSpeed -= 7;
          treesMoveSpeed   -= 5;
          signsMoveSpeed   -= 4;
          playerBoostDelta  = 0;
          blueCar.classList.remove('car--boosting');
          setTimeout(() => { dangerInfo.visible = true; }, 1000);
        }, 2000);
      }
    });

    const state = Storage.get();
    if (state.hasMagnet) {
      elementAnimation(magnet, magnetInfo, 6000);
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

    elementAnimation(dangerElem, dangerInfo, 3000);
    if (dangerInfo.visible && hasCollision(blueCarInfo, dangerInfo)) {
      finishGame();
      return;
    }

    if (state.speedLevel > 1 && blueCarMoveSpeed < 6) {
      blueCarMoveSpeed = 4.5;
    }

    playerTravelDist += signsMoveSpeed;
    
    const worldBaseSpeed = playerCarClass ? (signsMoveSpeed / playerCarClass.modifier) : signsMoveSpeed;
    const aiBaseSpeed = worldBaseSpeed - playerBoostDelta;

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
      ai.update(playerTravelDist, blueCarInfo.coords.y, aiBaseSpeed, dangerInfo, coinsForAi, arrowsForAi);
      resolveAiPlayerCollision(ai, blueCarInfo, blueCar, roadWidth);

      if (ai.overlaps(dangerInfo)) ai.stun();

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

    const state = Storage.get();

    if (state.extraLives > 0) {
      if (confirm('Вы разбились! Использовать "Второй шанс" чтобы продолжить?')) {
        state.extraLives--;
        Storage.save(state);
        dangerInfo.coords.y -= 1500;
        dangerInfo.visible = false;
        dangerElem.style.display = 'none';
        isPause = false;
        animationId = requestAnimationFrame(startGame);
        return;
      }
    }

    document.body.classList.add('screen-shake');
    document.body.addEventListener('animationend', () => {
      document.body.classList.remove('screen-shake');
    }, { once: true });

    setTimeout(() => {
      Storage.addCoins(score);
      const currentState = Storage.get();
      backdropEndGame.style.display = 'flex';
      const scoreEndGame = backdropEndGame.querySelector('[data-js-end-game-score]');
      scoreEndGame.innerHTML = `${score} <br><span style="font-size: 1rem; color: gold;">Total Coins: ${currentState.totalCoins}</span>`;
      gameScoreWrapper.style.display = 'none';
      gameButton.style.display = 'none';
    }, 300);
  }

  const welcomeScreen       = document.querySelector('[data-js-welcome-screen]');
  const welcomeStartButton  = document.querySelector('[data-js-start-game]');
  carMagnetIndicator        = document.querySelector('[data-js-car-magnet]');
  const gameButton          = document.querySelector('[data-js-start-game-button]');
  const musicToggle         = document.querySelector('[data-js-sound-button]');
  const finishLine          = new FinishLine(document.querySelector('[data-js-finish-line]'), roadWidth);
  const raceResultEl        = document.querySelector('[data-js-race-result]');
  const resultListEl        = document.querySelector('[data-js-result-list]');

  function finishRace() {
    cancelAnimationFrame(animationId);
    stopCarAnimations();
    if (carMagnetIndicator) carMagnetIndicator.style.display = 'none';
    magnetActive = false;
    clearTimeout(magnetTimeout);

    const places = [
      { label: 'You', dist: playerTravelDist },
      ...aiCars.map((ai, i) => ({ label: `Бот ${i + 1}`, dist: ai.travelDist })),
    ].sort((a, b) => b.dist - a.dist);

    const medals = ['🥇', '🥈', '🥉'];
    resultListEl.innerHTML = places
      .map((p, i) => `<li class="race-result__item race-result__item--${['first','second','third'][i] || ''}">
        <span>${medals[i] || (i + 1)}</span><span>${p.label}</span>
      </li>`)
      .join('');

    raceResultEl.classList.add('visible');
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-js-restart]')) {
      sessionStorage.setItem('skipWelcome', 'true');
      window.location.reload();
    }
  });

  welcomeStartButton.addEventListener('click', () => {
    welcomeScreen.style.display = 'none';
    runCountdown(() => {
      const state = Storage.get();
      playerCarClass = getCarClass(state.selectedCar);
      
      blueCarMoveSpeed = 3 * playerCarClass.modifier;
      treesMoveSpeed = 7 * playerCarClass.modifier;
      signsMoveSpeed = 5 * playerCarClass.modifier;

      const aiElements = [...document.querySelectorAll('[data-js-ai-car]')];
      aiCars.length = 0;
      const startRatios = [0.1, 0.68];
      aiElements.forEach((el, i) => {
        const ai = new AiCar(el, roadWidth);
        ai.place(roadWidth * startRatios[i], blueCarInfo.coords.y, playerTravelDist);
        aiCars.push(ai);
      });

      isPause = false;
      animationId = requestAnimationFrame(startGame);
      gameButton.children[1].classList.remove('visually-hidden');
      gameButton.children[0].classList.add('visually-hidden');
    });
  });

  if (sessionStorage.getItem('skipWelcome') === 'true') {
    sessionStorage.removeItem('skipWelcome');
    welcomeStartButton.click();
  }

  initShop();
  applySkin(Storage.get().selectedCar);

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
