import {
  blueCar,
  arrow,
  arrowInfo,
  gameScoreWrapper,
  gameScoreValue,
  backdropEndGame,
  restartButton,
  trees,
  coin,
  coinAlt,
  coinInfo,
  coinAltInfo,
  controlLeft,
  controlDown,
  controlTop,
  controlRight,
  roadWidth,
  negativeRandom100,
  negativeRandom500,
  negativeRandom900,
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

  function elementAnimation(elem, elemInfo, elemInitialYCoord) {
    let newYCoord = elemInfo.coords.y + signsMoveSpeed;
    let newXcoord = elemInfo.coords.x;

    if (newYCoord > window.innerHeight / 10) {
      newYCoord = elemInitialYCoord;

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
      elementAnimation(coin, coinInfo, negativeRandom100);
      elementAnimation(arrow, arrowInfo, negativeRandom500);
      elementAnimation(danger, dangerInfo, negativeRandom900);
      elementAnimation(coinAlt, coinAltInfo, negativeRandom500);

      console.log(blueCarInfo.coords.y)
      if (Sounds.isPlaying) { Sounds.play("main") };

      if (dangerInfo.visible && hasCollision(blueCarInfo, dangerInfo)) {
        finishGame();
        return;
      }

      if (coinInfo.visible && hasCollision(blueCarInfo, coinInfo)) {
        score++;
        gameScoreValue.innerText = score;
        coin.style.display = "none";
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
        coinAlt.style.display = "none";
        coinAltInfo.visible = false;

        if (Sounds.isPlaying) { Sounds.play("coin"); }
      }

      if (arrowInfo.visible && hasCollision(blueCarInfo, arrowInfo)) {
        arrow.style.display = "none";
        arrowInfo.visible = false;
        danger.style.opacity = 0.2;
        dangerInfo.visible = false;
        if (Sounds.isPlaying) { Sounds.play("arrow") };

        blueCarMoveSpeed += 7;
        treesMoveSpeed += 5;
        signsMoveSpeed += 4;

        setTimeout(() => {
          coinInfo.visible = true;
          danger.style.opacity = 1;
          blueCarMoveSpeed -= 7;
          treesMoveSpeed -= 5;
          signsMoveSpeed -= 4;

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

    // Встряска экрана — применяем к body (overflow:hidden уже стоит)
    document.body.classList.add('screen-shake');
    document.body.addEventListener('animationend', () => {
      document.body.classList.remove('screen-shake');
    }, { once: true });

    // Показываем экран Game Over с небольшой задержкой — после shake
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
