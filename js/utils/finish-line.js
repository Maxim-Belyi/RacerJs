export const RACE_DISTANCE = 25000;

export class FinishLine {
  constructor(element, roadWidth) {
    this.element = element;
    this.crossed = false;
    this.element.style.width = `${roadWidth}px`;
  }

  update(playerTravelDist, playerY) {
    const remaining = RACE_DISTANCE - playerTravelDist;
    const screenY = playerY - remaining;

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
