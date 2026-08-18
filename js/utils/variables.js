import { createElementInfo } from "./create-elem-info.js";

export const arrow = document.querySelector('[data-js-arrow]');
export const arrowInfo = createElementInfo(arrow);
export const arrowB = document.querySelector('[data-js-arrow-b]');
export const arrowBInfo = { ...createElementInfo(arrowB), visible: true };

export const magnet = document.querySelector('[data-js-magnet]');
export const magnetInfo = { ...createElementInfo(magnet), visible: false };

export const danger = document.querySelector('[data-js-danger]');
export const blueCar = document.querySelector('[data-js-car]');
export let gameScoreWrapper = document.querySelector('[data-js-game-score-wrapper]');
export let gameScoreValue = document.querySelector('[data-js-game-score-value]');
export let backdropEndGame = document.querySelector('[data-js-end-game-backdrop]');
export const restartButton = document.querySelector('[data-js-end-game-button]');

export const coinAlt = document.querySelector('[data-js-coin-alt]');
export const coinAltInfo = createElementInfo(coinAlt);
export const coin = document.querySelector('[data-js-coin]');
export const coinInfo = createElementInfo(coin);
export const coinB = document.querySelector('[data-js-coin-b]');
export const coinBInfo = createElementInfo(coinB);
export const coinC = document.querySelector('[data-js-coin-c]');
export const coinCInfo = createElementInfo(coinC);

export const controlLeft = document.querySelector('[data-js-left-control]');
export const controlDown = document.querySelector('[data-js-down-control]');
export const controlTop = document.querySelector('[data-js-top-control]');
export const controlRight = document.querySelector('[data-js-right-control]');

export const trees = document.querySelectorAll('[data-js-tree]');
export const road = document.querySelector('[data-js-road]');

export const roadWidth = road.clientWidth;

export const treesCoords = [];