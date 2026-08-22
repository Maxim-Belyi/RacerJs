export const RACE_DISTANCE = 18000;

export class FinishLine {
  constructor(element, roadWidth) {
    this.element = element;
    this.crossed = false;
    this.element.style.width = `${roadWidth}px`;
    this._baseY = undefined;
  }

  update(playerTravelDist, playerY) {
    if (this._baseY === undefined) {
      this._baseY = playerY - 20;
    }

    const remaining = RACE_DISTANCE - playerTravelDist;
    const screenY = this._baseY - remaining;

    if (screenY < -window.innerHeight * 2.5) {
      this.element.style.display = 'none';
      return false;
    }

    this.element.style.display = 'block';
    this.element.style.transform = `translateY(${screenY}px)`;

    return !this.crossed && screenY >= playerY;
  }

  markCrossed() {
    this.crossed = true;
  }
}

export class StartLine {
  constructor(element, roadWidth) {
    this.element = element;
    this.element.style.width = `${roadWidth}px`;
    this._baseY = undefined;
  }

  update(playerTravelDist, playerY) {
    if (this._baseY === undefined) {
      this._baseY = window.innerHeight * 0.15;
    }

    const screenY = this._baseY + playerTravelDist;

    if (screenY > window.innerHeight * 1.5) {
      this.element.style.display = 'none';
      return;
    }

    this.element.style.display = 'block';
    this.element.style.transform = `translateY(${screenY}px)`;
  }
}
