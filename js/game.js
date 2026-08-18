import {
  blueCar,
  arrow,
  arrowInfo,
  arrowB,
  arrowBInfo,
  gameScoreWrapper,
  gameScoreValue,
  backdropEndGame,
  restartButton,
  trees,
  coin,
  coinAlt,
  coinB,
  coinC,
  coinInfo,
  coinAltInfo,
  coinBInfo,
  coinCInfo,
  controlLeft,
  controlDown,
  controlTop,
  controlRight,
  roadWidth,
  treesCoords,
} from "./utils/variables.js";

import { hasCollision } from "./utils/has-collision.js";
import { createElementInfo } from "./utils/create-elem-info.js";
import { getCoords } from "./utils/get-coords.js";
import { Sounds } from "./utils/sound.js";


(function () {
  const danger = document.querySelector('[data-js-danger]');
  const dangerInfo = createElementInfo(danger);

  let isPause = true;
  let animationId = null;
  let score = 0;
  let blueCarMoveSpeed = 3;
  let treesMoveSpeed = 7;
  let signsMoveSpeed = 5;

  const roadMarking = document.querySelector('[data-js-road-marking]');
  let roadMarkingOffset = 0;
  const MARKING_REPEAT = 80; // шаг паттерна разметки в px

  /**
   * @param {HTMLElement} elem  — знак, на котором произошла коллизия
   * @param {string} text       — текст лейбла ('+1', 'BOOST!')
   * @param {string} modifier   — CSS-модификатор ('coin' | 'boost')
   */
  function spawnPopLabel(elem, text, modifier) {
    // Pop-анимация на img внутри знака
    // (не на самом div — там inline transform от JS имеет приоритет над CSS-анимацией)
    const img = elem.querySelector('img');
    img.classList.add('pop-collect');
    img.addEventListener('animationend', () => {
      elem.style.display = 'none';
      img.classList.remove('pop-collect');
    }, { once: true });

    // Плавающий текст в позиции знака
    const rect = elem.getBoundingClientRect();
    const label = document.createElement('div');
    label.className = `pop-label pop-label--${modifier}`;
    label.textContent = text;
    label.style.left = (rect.left + rect.width / 2) + 'px';
    label.style.top  = (rect.top  - 8) + 'px';
    document.body.appendChild(label);
    label.addEventListener('animationend', () => label.remove(), { once: true });
  }

  const blueCarInfo = {
    ...createElementInfo(blueCar),
    moveSpeed: blueCarMoveSpeed,

    move: {
      up: null,
      down: null,
      left: null,
      right: null,
    },
  };

  for (let i = 0; i < trees.length; i++) {
    const tree = trees[i];
    const coordsTree = getCoords(tree);
    treesCoords.push(coordsTree);
  }

  coinInfo.coords.y = -450;
  coinAltInfo.coords.y = -800;
  coinBInfo.coords.y = -1800;
  coinCInfo.coords.y = -2400;

  arrowInfo.coords.y = -2000;
  arrowBInfo.coords.y = -4000;

  dangerInfo.coords.y = -3000;

  function stopCarAnimations() {
    Object.values(blueCarInfo.move).forEach((id) => {
      if (id) cancelAnimationFrame(id);
    });
    Object.keys(blueCarInfo.move).forEach((key) => {
      blueCarInfo.move[key] = null;
    });
  }

  document.addEventListener("keydown", (event) => {
    if (isPause) {
      return;
    }
    switch (event.code) {
      case 'ArrowUp': case 'KeyW': startMove('up'); break;
      case 'ArrowDown': case 'KeyS': startMove('down'); break;
      case 'ArrowLeft': case 'KeyA': startMove('left'); break;
      case 'ArrowRight': case 'KeyD': startMove('right'); break;
    }
  });

  document.addEventListener("keyup", (event) => {
    if (isPause) {
      return;
    }
    switch (event.code) {
      case 'ArrowUp': case 'KeyW': stopMove('up'); break;
      case 'ArrowDown': case 'KeyS': stopMove('down'); break;
      case 'ArrowLeft': case 'KeyA': stopMove('left'); break;
      case 'ArrowRight': case 'KeyD': stopMove('right'); break;
    }
  });

  function moveUp() {
    blueCarInfo.coords.y -= blueCarMoveSpeed;
    blueCar.style.transform = `translate(${blueCarInfo.coords.x}px, ${blueCarInfo.coords.y}px)`;
    if (blueCarInfo.coords.y < -(window.innerHeight)) {
      return;
    } else { blueCarInfo.move.up = requestAnimationFrame(moveUp); }
  }

  function moveDown() {
    blueCarInfo.coords.y += blueCarMoveSpeed;
    if (blueCarInfo.coords.y > -blueCarInfo.height) {
      return;
    }

    blueCar.style.transform = `translate(${blueCarInfo.coords.x}px, ${blueCarInfo.coords.y}px)`;
    blueCarInfo.move.down = requestAnimationFrame(moveDown);
  }

  function moveLeft() {
    blueCarInfo.coords.x -= blueCarMoveSpeed;

    if (blueCarInfo.coords.x > roadWidth || blueCarInfo.coords.x < 0) {
      return;
    }

    blueCar.style.transform = `translate(${blueCarInfo.coords.x}px, ${blueCarInfo.coords.y}px)`;
    blueCarInfo.move.left = requestAnimationFrame(moveLeft);
  }

  function moveRight() {
    blueCarInfo.coords.x += blueCarMoveSpeed;

    if (blueCarInfo.coords.x > roadWidth - blueCarInfo.width) {
      return;
    }

    blueCar.style.transform = `translate(${blueCarInfo.coords.x}px, ${blueCarInfo.coords.y}px)`;
    blueCarInfo.move.right = requestAnimationFrame(moveRight);
  }

  function startMove(direction) {
    if (isPause) {
      return;
    }

    // Наклон машины при повороте
    if (direction === 'left') {
      blueCar.classList.remove('car--lean-right');
      blueCar.classList.add('car--lean-left');
    } else if (direction === 'right') {
      blueCar.classList.remove('car--lean-left');
      blueCar.classList.add('car--lean-right');
    }

    const moveTouchFunction = {
      up: moveUp,
      down: moveDown,
      left: moveLeft,
      right: moveRight,
    };

    if (!blueCarInfo.move[direction]) {
      stopCarAnimations();
      blueCarInfo.move[direction] = requestAnimationFrame(moveTouchFunction[direction]);
    }
  }

  function stopMove(direction) {
    if (blueCarInfo.move[direction]) {
      cancelAnimationFrame(blueCarInfo.move[direction]);
      blueCarInfo.move[direction] = null;
    }
    // Убираем наклон при отпускании клавиши
    if (direction === 'left')  blueCar.classList.remove('car--lean-left');
    if (direction === 'right') blueCar.classList.remove('car--lean-right');
  }

  const controls = [
    { button: controlTop, direction: 'up' },
    { button: controlRight, direction: 'right' },
    { button: controlDown, direction: 'down' },
    { button: controlLeft, direction: 'left' },
  ]

  controls.forEach(({ button, direction }) => {
    button.addEventListener('touchstart', (event) => {
      event.preventDefault();
      startMove(direction);
    });

    button.addEventListener('touchend', () => {
      stopMove(direction);
    })
  })

  function treesAnimation() {
    // Анимация разметки дороги — синхронно со скоростью деревьев
    roadMarkingOffset = (roadMarkingOffset + treesMoveSpeed) % MARKING_REPEAT;
    roadMarking.style.backgroundPositionY = roadMarkingOffset + 'px';

    for (let i = 0; i < trees.length; i++) {
      const tree = trees[i];
      const coords = treesCoords[i];

      let newYCoord = coords.y + treesMoveSpeed;

      if (newYCoord > window.innerHeight / 3) {
        newYCoord = -window.innerHeight * 1.5;
      }

      treesCoords[i].y = newYCoord;
      tree.style.transform = `translate(${coords.x}px, ${newYCoord}px)`;
    }
  }

  function elementAnimation(elem, elemInfo, trackLength) {
    let newYCoord = elemInfo.coords.y + signsMoveSpeed;
    let newXcoord = elemInfo.coords.x;

    if (newYCoord > window.innerHeight / 10) {
      newYCoord -= trackLength;

      const directionX = Math.random() * (roadWidth - elemInfo.width);

      elem.style.display = "initial";
      elemInfo.visible = true;
      newXcoord = directionX;
    }

    elemInfo.coords.y = newYCoord;
    elemInfo.coords.x = newXcoord;

    elem.style.transform = `translate(${newXcoord}px, ${newYCoord}px)`;
  }

  function startGame() {
    if (!isPause) {
      treesAnimation();
      elementAnimation(coin, coinInfo, 2400);
      elementAnimation(coinAlt, coinAltInfo, 2400);
      elementAnimation(coinB, coinBInfo, 2400);
      elementAnimation(coinC, coinCInfo, 2400);
      elementAnimation(arrow, arrowInfo, 4000);
      elementAnimation(arrowB, arrowBInfo, 4000);
      elementAnimation(danger, dangerInfo, 3000);

      console.log(blueCarInfo.coords.y)
      if (Sounds.isPlaying) { Sounds.play("main") };

      if (dangerInfo.visible && hasCollision(blueCarInfo, dangerInfo)) {
        finishGame();
        return;
      }

      if (coinInfo.visible && hasCollision(blueCarInfo, coinInfo)) {
        score++;
        gameScoreValue.innerText = score;
        spawnPopLabel(coin, '+1', 'coin');
        coinInfo.visible = false;

        if (Sounds.isPlaying) { Sounds.play("coin"); }

        if (score % 3 === 0) {
          blueCarMoveSpeed++;
          signsMoveSpeed++;
          treesMoveSpeed++;
        }
      }

      if (coinAltInfo.visible && hasCollision(blueCarInfo, coinAltInfo)) {
        score++;
        gameScoreValue.innerText = score;
        spawnPopLabel(coinAlt, '+1', 'coin');
        coinAltInfo.visible = false;

        if (Sounds.isPlaying) { Sounds.play("coin"); }
      }

      if (coinBInfo.visible && hasCollision(blueCarInfo, coinBInfo)) {
        score++;
        gameScoreValue.innerText = score;
        spawnPopLabel(coinB, '+1', 'coin');
        coinBInfo.visible = false;

        if (Sounds.isPlaying) { Sounds.play("coin"); }

        if (score % 3 === 0) {
          blueCarMoveSpeed++;
          signsMoveSpeed++;
          treesMoveSpeed++;
        }
      }

      if (coinCInfo.visible && hasCollision(blueCarInfo, coinCInfo)) {
        score++;
        gameScoreValue.innerText = score;
        spawnPopLabel(coinC, '+1', 'coin');
        coinCInfo.visible = false;

        if (Sounds.isPlaying) { Sounds.play("coin"); }
      }

      if (arrowInfo.visible && hasCollision(blueCarInfo, arrowInfo)) {
        spawnPopLabel(arrow, 'BOOST!', 'boost');
        arrowInfo.visible = false;
        danger.style.opacity = 0.2;
        dangerInfo.visible = false;
        if (Sounds.isPlaying) { Sounds.play("arrow") };

        // Визуальный шлейф буста
        blueCar.classList.add('car--boosting');

        blueCarMoveSpeed += 7;
        treesMoveSpeed += 5;
        signsMoveSpeed += 4;

        setTimeout(() => {
          coinInfo.visible = true;
          danger.style.opacity = 1;
          blueCarMoveSpeed -= 7;
          treesMoveSpeed -= 5;
          signsMoveSpeed -= 4;

          blueCar.classList.remove('car--boosting');

          setTimeout(() => {
            dangerInfo.visible = true;
          }, 1000);
        }, 2000);
      }

      if (arrowBInfo.visible && hasCollision(blueCarInfo, arrowBInfo)) {
        spawnPopLabel(arrowB, 'BOOST!', 'boost');
        arrowBInfo.visible = false;
        danger.style.opacity = 0.2;
        dangerInfo.visible = false;
        if (Sounds.isPlaying) { Sounds.play("arrow") };

        blueCar.classList.add('car--boosting');

        blueCarMoveSpeed += 7;
        treesMoveSpeed += 5;
        signsMoveSpeed += 4;

        setTimeout(() => {
          danger.style.opacity = 1;
          blueCarMoveSpeed -= 7;
          treesMoveSpeed -= 5;
          signsMoveSpeed -= 4;
          blueCar.classList.remove('car--boosting');

          setTimeout(() => {
            dangerInfo.visible = true;
          }, 1000);
        }, 2000);
      }

      animationId = requestAnimationFrame(startGame);
    }
  }

  function finishGame() {
    cancelAnimationFrame(animationId);
    stopCarAnimations();

    document.body.classList.add('screen-shake');
    document.body.addEventListener('animationend', () => {
      document.body.classList.remove('screen-shake');
    }, { once: true });

    setTimeout(() => {
      backdropEndGame.style.display = 'flex';
      const scoreEndGame = backdropEndGame.querySelector('[data-js-end-game-score]');
      scoreEndGame.innerText = score;
      gameScoreWrapper.style.display = 'none';
      gameButton.style.display = 'none';
    }, 300);
  }

  const gameButton = document.querySelector('[data-js-start-game-button]');
  gameButton.addEventListener("click", () => {
    isPause = !isPause;
    if (isPause) {
      cancelAnimationFrame(animationId);
      stopCarAnimations();
      gameButton.children[1].classList.add("visually-hidden");
      gameButton.children[0].classList.remove("visually-hidden");
    } else {
      animationId = requestAnimationFrame(startGame);
      gameButton.children[1].classList.remove("visually-hidden");
      gameButton.children[0].classList.add("visually-hidden");
    }
  });

  const musicToggle = document.querySelector('[data-js-sound-button]');

  musicToggle.addEventListener("click", () => {
    Sounds.toggleMute();

    musicToggle.children[0].classList.toggle("visually-hidden");
    musicToggle.children[1].classList.toggle("visually-hidden");
  });

  restartButton.addEventListener("click", () => {
    window.location.reload();
  });
})();
