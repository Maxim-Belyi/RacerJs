const FRICTION = 0.87;
const STEER_FORCE = 0.08;
const MAX_VX = 5;
const DANGER_FORCE = 7;
const DANGER_X = 120;
const DANGER_Y = 500;
const ITEM_X = 80;
const ITEM_Y = 320;
const COIN_FORCE = 0.10;
const ARROW_FORCE = 0.18;
const RETARGET_MIN = 70;
const RETARGET_MAX = 180;
const STUN_FRAMES = 120;
const STUN_SPEED_MULT = 0.15;
const BOOST_SPEED_MULT = 1.8;
const BOOST_DURATION = 2000;
const SEP_FORCE = 9;

export class AiCar {
  constructor(element, roadWidth) {
    this.element = element;
    this.roadWidth = roadWidth;
    this.width = element.clientWidth || 60;
    this.height = element.clientHeight || 100;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.targetX = 0;
    this.retargetTimer = 0;
    this.stunFrames = 0;
    this.slowDownFrames = 0;
    this.travelDist = 0;
    this.modifier = 1.0;
    this.boosting = false;
  }

  place(x, y, syncTravelDist) {
    this.x = this._clamp(x);
    this.y = y;
    this.targetX = this.x;
    this.travelDist = syncTravelDist;
    this._sync();
  }

  update(playerTravelDist, playerY, baseSpeed, dangerInfo, coins, arrows, cracks) {
    let speedFactor = this.modifier;
    if (this.stunFrames > 0) {
      this.stunFrames--;
      speedFactor *= STUN_SPEED_MULT;
      this.vx += (Math.random() - 0.5) * 2.5;
    } else if (this.boosting) {
      speedFactor *= BOOST_SPEED_MULT;
    }
    
    if (this.slowDownFrames > 0) {
      this.slowDownFrames--;
      speedFactor *= 0.5;
    }

    this.travelDist += baseSpeed * speedFactor;

    this.y = playerY + (playerTravelDist - this.travelDist);

    if (this.stunFrames <= 0) {
      if (--this.retargetTimer <= 0) {
        this.retargetTimer = RETARGET_MIN + Math.random() * (RETARGET_MAX - RETARGET_MIN);
        this.targetX = Math.random() * (this.roadWidth - this.width);
      }

      const steered = this._steerToArrow(arrows) || this._steerToCoin(coins);
      if (!steered) this._steerToTarget();

      this._avoidDanger(dangerInfo);
      
      if (cracks) {
        for (let crack of cracks) {
          if (crack.visible && this.overlaps(crack)) {
            this.slowDown();
          }
        }
      }
    }

    this.vx = Math.max(-MAX_VX, Math.min(MAX_VX, this.vx * FRICTION));
    this.x = this._clamp(this.x + this.vx);
    this._sync();
  }

  stun() {
    if (this.stunFrames > 0) return;
    this.stunFrames = STUN_FRAMES;
    this.element.classList.add('ai-stunned');
    setTimeout(() => this.element.classList.remove('ai-stunned'), 1800);
  }

  slowDown() {
    if (this.slowDownFrames > 0) return;
    this.slowDownFrames = 120; // 2 seconds at 60fps
    this.element.classList.add('ai-slowed');
    setTimeout(() => this.element.classList.remove('ai-slowed'), 2000);
  }

  boost() {
    if (this.boosting) return;
    this.boosting = true;
    setTimeout(() => { this.boosting = false; }, BOOST_DURATION);
  }

  push(force) {
    this.vx += force;
  }

  getBounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  overlaps(b) {
    const bx = b.coords ? b.coords.x : b.x;
    const by = b.coords ? b.coords.y : b.y;
    return (
      this.x < bx + b.width &&
      this.x + this.width > bx &&
      this.y < by + b.height &&
      this.y + this.height > by
    );
  }

  _steerToTarget() {
    const dx = (this.targetX + this.width / 2) - (this.x + this.width / 2);
    this.vx += dx * STEER_FORCE * 0.05;
  }

  _steerToArrow(arrows) {
    if (!arrows) return false;
    for (const a of arrows) {
      if (!a.info.visible) continue;
      const arrowCX = a.info.coords.x + a.info.width / 2;
      const myCX = this.x + this.width / 2;
      const dy = a.info.coords.y - this.y;
      if (Math.abs(arrowCX - myCX) < ITEM_X * 1.5 && dy > -this.height && dy < ITEM_Y * 1.2) {
        this.vx += (arrowCX - myCX) * ARROW_FORCE * 0.1;
        return true;
      }
    }
    return false;
  }

  _steerToCoin(coins) {
    if (!coins) return false;
    for (const c of coins) {
      if (!c.info.visible) continue;
      const coinCX = c.info.coords.x + c.info.width / 2;
      const myCX = this.x + this.width / 2;
      const dy = c.info.coords.y - this.y;
      if (Math.abs(coinCX - myCX) < ITEM_X && dy > -this.height && dy < ITEM_Y) {
        this.vx += (coinCX - myCX) * COIN_FORCE * 0.1;
        return true;
      }
    }
    return false;
  }

  _avoidDanger(info) {
    const dangerCX = info.coords.x + info.width / 2;
    const myCX = this.x + this.width / 2;
    const dy = info.coords.y - this.y;
    if (Math.abs(dangerCX - myCX) < DANGER_X && dy > -this.height && dy < DANGER_Y) {
      this.vx += myCX < dangerCX ? -DANGER_FORCE : DANGER_FORCE;
    }
  }

  _clamp(x) {
    return Math.max(0, Math.min(this.roadWidth - this.width, x));
  }

  _sync() {
    this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
  }
}

export function resolveAiPlayerCollision(ai, playerInfo, playerElement, roadWidth) {
  const b = {
    x: playerInfo.coords.x,
    y: playerInfo.coords.y,
    width: playerInfo.width,
    height: playerInfo.height,
  };
  if (!ai.overlaps(b)) return;

  const dir = (ai.x + ai.width / 2) > (playerInfo.coords.x + playerInfo.width / 2) ? 1 : -1;
  ai.push(dir * SEP_FORCE);

  playerInfo.coords.x = Math.max(0, Math.min(roadWidth - playerInfo.width, playerInfo.coords.x - dir * 5));
  playerElement.style.transform = `translate(${playerInfo.coords.x}px, ${playerInfo.coords.y}px)`;
}

export function resolveAiAiCollision(a, b) {
  if (!a.overlaps(b.getBounds())) return;

  const dir = (a.x + a.width / 2) > (b.x + b.width / 2) ? 1 : -1;
  a.push(dir * SEP_FORCE);
  b.push(-dir * SEP_FORCE);
}
