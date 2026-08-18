export const RACE_DISTANCE = 19000;

export class FinishLine {
  constructor(element) {
    this.element = element;
    this.crossed = false;
  }

  update(playerTravelDist, playerY) {
    const screenY = playerY + (RACE_DISTANCE - playerTravelDist);

    if (screenY > window.innerHeight * 2.5) {
      this.element.style.display = 'none';
      return false;
    }

    this.element.style.display = 'block';
    this.element.style.transform = `translateY(${screenY}px)`;

    return !this.crossed && screenY <= playerY;
  }

  markCrossed() {
    this.crossed = true;
  }
}
