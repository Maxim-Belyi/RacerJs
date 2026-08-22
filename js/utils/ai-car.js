// ─── Physics tuning ─────────────────────────────────────────────────────────
const FRICTION          = 0.85;   // lateral damping (higher = stops quicker)
const STEER_FORCE       = 0.018;  // strength of steering toward target lane
const MAX_VX            = 4.5;    // max horizontal speed
const SEP_FORCE         = 8;      // push force when cars collide

// ─── Danger / crack avoidance ────────────────────────────────────────────────
// AI starts reacting when obstacle is this many px ahead (Y axis)
const AVOID_LOOK_AHEAD  = 550;
// Horizontal detection half-width. Wider = reacts earlier sideways
const AVOID_HWIDTH      = 140;
// Force applied each frame to steer away from obstacle
const AVOID_FORCE       = 1.6;

// ─── Overtake (chasing player) ───────────────────────────────────────────────
// How many px behind the player the AI starts trying to overtake
const OVERTAKE_DIST     = 80;
// Soft speed cap relative to base speed (multiplier). AI never accelerates
// by MORE than this factor above the world base speed.
const OVERTAKE_MULT_MAX = 1.12;
// Slow lerp rate for speed modifier (prevents sudden surges)
const SPEED_LERP        = 0.02;
// The AI won't go above the player's Y minus this margin (prevents jamming top)
const PLAYER_Y_MARGIN   = 30;

// ─── Boost / stun ────────────────────────────────────────────────────────────
const BOOST_SPEED_MULT  = 1.35;   // arrow pickup — gentler than before
const BOOST_DURATION    = 2200;
const STUN_FRAMES       = 100;
const STUN_SPEED_MULT   = 0.12;

// ─── Retarget (random lane drift) ────────────────────────────────────────────
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

    // Target lane X (center of lane the AI wants to reach)
    this.targetX    = 0;

    // Retarget countdown (frames until next random lane pick)
    this.retargetTimer = 0;

    // Obstacle avoidance state
    this.avoidDir   = 0;   // -1 left / 0 none / +1 right

    // Speed state
    this.stunFrames       = 0;
    this.knockbackFrames  = 0;
    this.travelDist       = 0;

    // Current speed modifier (smoothly lerped toward target)
    this.modifier       = 1.0;
    this._targetModifier = 1.0;

    this.boosting   = false;
  }

  // ── place ──────────────────────────────────────────────────────────────────
  place(x, y, syncTravelDist) {
    this.x = this._clamp(x);
    this.y = y;
    this.targetX = this.x;
    this.travelDist = syncTravelDist;
    this._sync();
  }

  // ── update (called every frame) ────────────────────────────────────────────
  update(playerTravelDist, playerY, baseSpeed, dangerInfo, coins, arrows, cracks) {
    // ── 1. Speed factor ──────────────────────────────────────────────────────
    if (this.knockbackFrames > 0) {
      this.knockbackFrames--;
      this.travelDist += baseSpeed * -0.4;
      this.vx += (Math.random() - 0.5) * 1.8;
      if (this.stunFrames > 0) this.stunFrames--;
      this._applyLean();
      this._sync();
      return; // skip normal steering while bouncing back
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

    // ── 2. Advance travel distance ───────────────────────────────────────────
    this.travelDist += baseSpeed * speedFactor;

    // ── 3. Y position from travel distance ──────────────────────────────────
    this.y = playerY + (playerTravelDist - this.travelDist);

    // Enforce: AI must never be ABOVE player + margin (prevents rushing off-screen)
    const yMin = playerY - PLAYER_Y_MARGIN;
    if (this.y < yMin) {
      this.y = yMin;
      this.travelDist = playerTravelDist - (yMin - playerY);
      // Slow down so we don't keep bumping the cap
      this._targetModifier = Math.max(0.8, this._targetModifier - 0.05);
    }

    // ── 4. Steering (only when not stunned) ──────────────────────────────────
    if (this.stunFrames <= 0) {

      // 4a. Retarget random lane periodically (gentle drift)
      if (--this.retargetTimer <= 0) {
        this.retargetTimer = RETARGET_MIN + Math.random() * (RETARGET_MAX - RETARGET_MIN);
        // Pick a random target lane but stay comfortably inside road
        const margin = this.width * 0.5;
        this.targetX = margin + Math.random() * (this.roadWidth - this.width - margin * 2);
      }

      // 4b. Avoidance: danger sign + cracks ────────────────────────────────
      this.avoidDir = 0;
      this._computeAvoidance(dangerInfo);
      if (cracks) {
        for (const crack of cracks) {
          if (crack.visible) this._computeAvoidance(crack);
        }
      }

      if (this.avoidDir !== 0) {
        // Steer hard away; also override targetX to the "safe" side
        this.vx += this.avoidDir * AVOID_FORCE;
        const safeX = this.avoidDir < 0
          ? Math.max(0, this.x - 180)
          : Math.min(this.roadWidth - this.width, this.x + 180);
        this.targetX = safeX;
        this.retargetTimer = Math.max(this.retargetTimer, 40); // don't retarget too soon
      }

      // 4c. Pick up items: arrows first, then coins ─────────────────────────
      const steeredToArrow = this._steerToItem(arrows, 130, 420, 0.16);
      if (!steeredToArrow) this._steerToItem(coins,  90, 300, 0.10);

      // 4d. Steer toward target lane ─────────────────────────────────────────
      this._steerToTarget();

      // 4e. Overtake: if AI is clearly behind player, gently increase speed ─
      const distBehind = this.y - playerY; // positive = behind player
      if (distBehind > OVERTAKE_DIST) {
        // Smoothly ramp up target modifier
        const ratio = Math.min(1, (distBehind - OVERTAKE_DIST) / 200);
        this._targetModifier = 1.0 + ratio * (OVERTAKE_MULT_MAX - 1.0);
      } else {
        // Close to or ahead of player — normalize speed
        this._targetModifier = 1.0;
      }
    }

    // ── 5. Clamp & apply physics ─────────────────────────────────────────────
    this.vx = Math.max(-MAX_VX, Math.min(MAX_VX, this.vx * FRICTION));
    this.x  = this._clamp(this.x + this.vx);

    this._applyLean();
    this._sync();
  }

  // ── public API ─────────────────────────────────────────────────────────────
  stun() {
    if (this.stunFrames > 0) return;
    this.stunFrames = STUN_FRAMES;
    this.element.classList.add('ai-stunned');
    setTimeout(() => this.element.classList.remove('ai-stunned'), 1600);
  }

  crash(dangerCX) {
    if (this.stunFrames > 0 || this.knockbackFrames > 0) return;
    this.stunFrames      = STUN_FRAMES;
    this.knockbackFrames = 18;
    this.element.classList.add('ai-stunned');
    setTimeout(() => this.element.classList.remove('ai-stunned'), 1600);

    // Immediately pick a lane far from the obstacle
    const myCX = this.x + this.width / 2;
    if (myCX < dangerCX) {
      this.targetX = Math.min(this.roadWidth - this.width, dangerCX + this.width * 1.5);
    } else {
      this.targetX = Math.max(0, dangerCX - this.width * 2.5);
    }
    this.retargetTimer = 80;
    this._targetModifier = 1.0;
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
      this.x < bx + b.width  &&
      this.x + this.width  > bx &&
      this.y < by + b.height &&
      this.y + this.height > by
    );
  }

  // ── private helpers ────────────────────────────────────────────────────────

  /**
   * Accumulates avoidance direction based on an obstacle's position.
   * Uses lookahead on Y axis and horizontal proximity.
   */
  _computeAvoidance(obs) {
    const ox = obs.coords ? obs.coords.x : obs.x;
    const oy = obs.coords ? obs.coords.y : obs.y;
    const ow = obs.width  || 40;
    const oh = obs.height || 40;
    const obsCX = ox + ow / 2;
    const myCX  = this.x + this.width / 2;
    const dx    = Math.abs(obsCX - myCX);
    const dy    = oy - this.y; // positive = obstacle is ahead (lower on screen = lower y)

    if (dx < AVOID_HWIDTH && dy > -this.height && dy < AVOID_LOOK_AHEAD) {
      // Closer obstacles get stronger avoidance
      const urgency = 1 - dy / AVOID_LOOK_AHEAD;
      const dir = myCX < obsCX ? -1 : 1;
      if (Math.abs(this.avoidDir) < urgency) {
        this.avoidDir = dir;
      }
    }
  }

  /** Steers toward the closest visible item in the array. Returns true if steered. */
  _steerToItem(items, hWidthPx, lookAheadPx, force) {
    if (!items) return false;
    let bestDy = Infinity;
    let bestDx = 0;
    for (const item of items) {
      const info = item.info || item;
      if (!info.visible) continue;
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

// ── Collision resolution helpers ──────────────────────────────────────────────
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
  if (!a.overlaps(b.getBounds())) return;

  const dir = (a.x + a.width / 2) > (b.x + b.width / 2) ? 1 : -1;
  a.push(dir  * SEP_FORCE);
  b.push(-dir * SEP_FORCE);
}
