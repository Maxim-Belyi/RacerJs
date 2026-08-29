const FRICTION          = 0.85;   
const STEER_FORCE       = 0.018; 
const MAX_VX            = 4.5;   
const SEP_FORCE         = 8;      

const AVOID_LOOK_AHEAD  = 550;
const AVOID_HWIDTH      = 140;
const AVOID_FORCE       = 1.6;

const OVERTAKE_DIST     = 80;
const OVERTAKE_MULT_MAX = 1.12;
const SPEED_LERP        = 0.02;

const BOOST_SPEED_MULT  = 1.35;  
const BOOST_DURATION    = 2200;
const STUN_FRAMES       = 100;
const STUN_SPEED_MULT   = 0.12;

const RETARGET_MIN      = 90;
const RETARGET_MAX      = 220;

export class AiCar {
  constructor(element, roadWidth) {
    this.element    = element;
    this.roadWidth  = roadWidth;
    this.width      = element.clientWidth  || 60;
    this.height     = element.clientHeight || 100;

    this.x          = 0;
    this.y          = 0;
    this.vx         = 0;
    this._baseY     = 0;   // fixed Y reference (road coord system, set at place())

    this.targetX    = 0;
    this.retargetTimer = 0;
    this.avoidDir   = 0;   
    this.stunFrames       = 0;
    this.knockbackFrames  = 0;
    this.travelDist       = 0;
    this.modifier       = 1.0;
    this._targetModifier = 1.0;

    this.boosting   = false;
  }

  place(x, y, syncTravelDist) {
    this.x = this._clamp(x);
    this.y = y;
    this._baseY = y;          // lock the reference once at start
    this.targetX = this.x;
    this.travelDist = syncTravelDist;
    this._sync();
  }

  update(playerTravelDist, baseSpeed, dangerInfos, coins, arrows, cracks) {
    if (this.knockbackFrames > 0) {
      this.knockbackFrames--;
      // During knockback: car moves backward slowly
      this.travelDist -= baseSpeed * 0.4;
      // Keep y in sync with travelDist so there's no jump when knockback ends
      this.y = this._baseY + (playerTravelDist - this.travelDist);
      this.vx *= 0.92;
      this.x = this._clamp(this.x + this.vx);
      
      if (this.stunFrames > 0) this.stunFrames--;
      this._applyLean();
      this._sync();
      return;
    }

    let speedFactor;
    if (this.stunFrames > 0) {
      this.stunFrames--;
      speedFactor = STUN_SPEED_MULT;
    } else if (this.boosting) {
      speedFactor = BOOST_SPEED_MULT;
    } else {
      // Smooth speed lerp
      this.modifier += (this._targetModifier - this.modifier) * SPEED_LERP;
      speedFactor = this.modifier;
    }

    this.travelDist += baseSpeed * speedFactor;
    this.y = this._baseY + (playerTravelDist - this.travelDist);
    if (this.stunFrames <= 0) {

      if (--this.retargetTimer <= 0) {
        this.retargetTimer = RETARGET_MIN + Math.random() * (RETARGET_MAX - RETARGET_MIN);
        const margin = this.width * 0.5;
        this.targetX = margin + Math.random() * (this.roadWidth - this.width - margin * 2);
      }

      this.avoidDir = 0;
      if (dangerInfos) {
        for (const info of dangerInfos) {
          if (info.visible) this._computeAvoidance(info);
        }
      }
      if (cracks) {
        for (const crack of cracks) {
          if (crack.visible) this._computeAvoidance(crack);
        }
      }

      if (this.avoidDir !== 0) {
        this.vx += this.avoidDir * AVOID_FORCE;
        const safeX = this.avoidDir < 0
          ? Math.max(0, this.x - 180)
          : Math.min(this.roadWidth - this.width, this.x + 180);
        this.targetX = safeX;
        this.retargetTimer = Math.max(this.retargetTimer, 40);
      }

      // 4c. Pick up items: arrows first, then coins ─────────────────────────
      const steeredToArrow = this._steerToItem(arrows, 130, 420, 0.16);
      if (!steeredToArrow) this._steerToItem(coins, 90, 300, 0.10);

      this._steerToTarget();

      const distBehind = this.y - this._baseY;
      if (distBehind > OVERTAKE_DIST) {
        const ratio = Math.min(1, (distBehind - OVERTAKE_DIST) / 200);
        this._targetModifier = 1.0 + ratio * (OVERTAKE_MULT_MAX - 1.0);
      } else {
        this._targetModifier = 1.0;
      }
    }

    this.vx = Math.max(-MAX_VX, Math.min(MAX_VX, this.vx * FRICTION));
    this.x  = this._clamp(this.x + this.vx);

    this._applyLean();
    this._sync();
  }

  stun() {
    if (this.stunFrames > 0) return;
    this.stunFrames = STUN_FRAMES;
    this.element.classList.add('ai-stunned');
    setTimeout(() => this.element.classList.remove('ai-stunned'), 1600);
  }

  crash(dangerCX) {
    if (this.stunFrames > 0 || this.knockbackFrames > 0) return;
    this.stunFrames      = STUN_FRAMES;
    this.knockbackFrames = 15;
    this.element.classList.add('ai-stunned');
    setTimeout(() => this.element.classList.remove('ai-stunned'), 1600);

    const myCX = this.x + this.width / 2;
    const dir = myCX < dangerCX ? -1 : 1;
    this.vx = dir * 8; // Reasonable sideways jolt

    if (myCX < dangerCX) {
      this.targetX = Math.max(0, dangerCX - this.width * 2.0); 
    } else {
      this.targetX = Math.min(this.roadWidth - this.width, dangerCX + this.width * 1.0);
    }
    this.retargetTimer = 80;
    this._targetModifier = 1.0;
  }

  bump() {
    // Minor slow down for cracks, no sideways knockback
    if (this.stunFrames > 0 || this.knockbackFrames > 0) return;
    this.stunFrames = 60; // Shorter stun for cracks
    this.element.classList.add('ai-slowed');
    setTimeout(() => this.element.classList.remove('ai-slowed'), 1000);
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
    const bw = b.width  || 40;
    const bh = b.height || 40;
    return (
      this.x < bx + bw &&
      this.x + this.width  > bx &&
      this.y < by + bh &&
      this.y + this.height > by
    );
  }

  _computeAvoidance(obs) {
    const ox = obs.coords ? obs.coords.x : obs.x;
    const oy = obs.coords ? obs.coords.y : obs.y;
    if (oy < -1000) return; // Ignore deeply off-screen obstacles
    
    const ow = obs.width  || 40;
    const obsCX = ox + ow / 2;
    const myCX  = this.x + this.width / 2;
    const dx    = Math.abs(obsCX - myCX);
    const dy    = oy - this.y;

    if (dx < AVOID_HWIDTH && dy < this.height && dy > -AVOID_LOOK_AHEAD) {
      const urgency = 1 - Math.abs(dy) / AVOID_LOOK_AHEAD;
      const dir = myCX < obsCX ? -1 : 1;
      if (Math.abs(this.avoidDir) < urgency) {
        this.avoidDir = dir;
      }
    }
  }

  _steerToItem(items, hWidthPx, lookAheadPx, force) {
    if (!items) return false;
    let bestDy = Infinity;
    let bestDx = 0;
    for (const item of items) {
      const info = item.info || item;
      if (info.visible === false) continue;
      const cx = (info.coords ? info.coords.x : info.x) + (info.width || 30) / 2;
      const cy = info.coords ? info.coords.y : info.y;
      const myCX = this.x + this.width / 2;
      const dx = cx - myCX;
      const dy = cy - this.y;
      if (Math.abs(dx) < hWidthPx && dy > -this.height && dy < lookAheadPx) {
        if (dy < bestDy) { bestDy = dy; bestDx = dx; }
      }
    }
    if (bestDy !== Infinity) {
      this.vx += bestDx * force * 0.1;
      return true;
    }
    return false;
  }

  _steerToTarget() {
    const dx = (this.targetX + this.width / 2) - (this.x + this.width / 2);
    this.vx += dx * STEER_FORCE;
  }

  _applyLean() {
    if (this.vx < -1.5) {
      this.element.classList.add('car--lean-left');
      this.element.classList.remove('car--lean-right');
    } else if (this.vx > 1.5) {
      this.element.classList.add('car--lean-right');
      this.element.classList.remove('car--lean-left');
    } else {
      this.element.classList.remove('car--lean-left', 'car--lean-right');
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
    width:  playerInfo.width,
    height: playerInfo.height,
  };
  if (!ai.overlaps(b)) return;

  const dir = (ai.x + ai.width / 2) > (playerInfo.coords.x + playerInfo.width / 2) ? 1 : -1;
  ai.push(dir * SEP_FORCE);

  playerInfo.coords.x = Math.max(0, Math.min(roadWidth - playerInfo.width, playerInfo.coords.x - dir * 5));
  playerElement.style.transform = `translate(${playerInfo.coords.x}px, ${playerInfo.coords.y}px)`;
}

export function resolveAiAiCollision(a, b) {
  if (Math.abs(a.y - b.y) > a.height * 1.5) return;

  const dx = (a.x + a.width / 2) - (b.x + b.width / 2);
  const minSeparation = a.width * 1.2;

  if (Math.abs(dx) < minSeparation) {
    const dir = dx > 0 ? 1 : -1;
    a.push(dir * 2);
    b.push(-dir * 2);
  }

  if (a.overlaps(b.getBounds())) {
    const hardDir = dx > 0 ? 1 : -1;
    a.push(hardDir * SEP_FORCE);
    b.push(-hardDir * SEP_FORCE);
  }
}
