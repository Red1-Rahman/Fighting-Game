/**
 * AI Controller for Fighting Game
 * Provides decision-making for computer-controlled opponent
 */

class AIController {
  constructor(difficulty = 'medium') {
    this.difficulty = difficulty;
    this.state = 'idle';
    this.reactionTime = this.getReactionTime(difficulty);
    this.lastDecisionTime = 0;
    this.currentAction = null;
    this.actionDuration = 0;
    this.attackCooldown = 0;
    this.jumpCooldown = 0;
    this.strikeCount = 0; // Track strikes for Easy mode pattern
    
    // AI personality parameters based on difficulty
    this.params = this.getDifficultyParams(difficulty);
  }

  getReactionTime(difficulty) {
    switch(difficulty) {
      case 'easy': return 1200; // 1200ms reaction time (very slow)
      case 'medium': return 400; // 400ms reaction time
      case 'hard': return 150; // 150ms reaction time
      default: return 400;
    }
  }

  getDifficultyParams(difficulty) {
    switch(difficulty) {
      case 'easy':
        return {
          aggressiveness: 0.9,    // 90% chance to attack when in range (high for consistent strikes)
          defensiveness: 0.6,     // 60% chance to retreat
          attackRange: 190,       // Attack range
          comfortDistance: 320,   // Stays very far away
          jumpChance: 0.12,       // 12% chance to jump
          mistakes: 0.5,          // 50% chance of making a mistake
          attackCooldownMin: 120, // Minimum 2 seconds between attacks
          attackCooldownMax: 120  // Fixed 2 seconds between attacks
        };
      case 'medium':
        return {
          aggressiveness: 0.28,   // 28% chance to attack (reduced from 35%)
          defensiveness: 0.35,    // 35% chance to retreat
          attackRange: 195,       // Attack range (reduced from 200)
          comfortDistance: 200,   // Preferred distance (increased from 180)
          jumpChance: 0.22,       // 22% chance to jump (reduced from 25%)
          mistakes: 0.25,         // 25% chance of making a mistake (increased from 20%)
          attackCooldownMin: 180, // Minimum 3 seconds between attacks (strict enforcement)
          attackCooldownMax: 240  // Maximum 4 seconds between attacks
        };
      case 'hard':
        return {
          aggressiveness: 0.38,   // 38% chance to attack (reduced from 50%)
          defensiveness: 0.45,    // 45% chance to retreat (increased from 40%)
          attackRange: 220,       // Attack range (reduced from 240)
          comfortDistance: 170,   // Closer preferred distance (increased from 150)
          jumpChance: 0.3,        // 30% chance to jump (reduced from 35%)
          mistakes: 0.12,         // 12% chance of making a mistake (increased from 8%)
          attackCooldownMin: 90,  // Minimum frames between attacks (1.5 seconds)
          attackCooldownMax: 150  // Maximum frames between attacks (2.5 seconds)
        };
      default:
        return this.getDifficultyParams('medium');
    }
  }

  /**
   * Main decision-making function
   * Called every frame to determine AI actions
   */
  update(aiPlayer, opponent, currentTime) {
    // Update cooldowns
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.jumpCooldown > 0) this.jumpCooldown--;

    // Check if AI is dead or opponent is dead
    if (aiPlayer.dead || opponent.dead) {
      return this.getIdleActions();
    }

    // Prevent attacking if already attacking (spam prevention)
    if (aiPlayer.isAttacking) {
      return this.continueCurrentAction();
    }

    // Reaction time simulation - only make new decisions periodically
    if (currentTime - this.lastDecisionTime < this.reactionTime) {
      return this.continueCurrentAction();
    }

    this.lastDecisionTime = currentTime;

    // Calculate distance and position relative to opponent
    const distance = this.getDistance(aiPlayer, opponent);
    const isOpponentLeft = opponent.position.x < aiPlayer.position.x;
    
    // Decide action based on game state
    const action = this.makeDecision(aiPlayer, opponent, distance, isOpponentLeft);
    
    this.currentAction = action;
    return action;
  }

  /**
   * Core AI decision-making logic
   */
  makeDecision(aiPlayer, opponent, distance, isOpponentLeft) {
    const params = this.params;
    
    // Simulate mistakes (random wrong decisions)
    if (Math.random() < params.mistakes) {
      return this.makeRandomAction();
    }

    // Priority 1: Attack if in range and cooldown ready
    if (distance < params.attackRange && this.attackCooldown === 0) {
      if (Math.random() < params.aggressiveness) {
        // Easy mode: Every third strike should miss
        if (this.difficulty === 'easy') {
          this.strikeCount++;
          if (this.strikeCount % 3 === 0) {
            // Third strike - don't attack (intentional miss)
            this.attackCooldown = params.attackCooldownMin;
            return this.getIdleActions();
          }
        }
        
        // Use difficulty-specific cooldown
        const cooldownRange = params.attackCooldownMax - params.attackCooldownMin;
        this.attackCooldown = params.attackCooldownMin + Math.random() * cooldownRange;
        return { attack: true };
      }
    }

    // Priority 2: Jump if opponent is very close or to approach
    if (this.jumpCooldown === 0) {
      // Jump when too close (defensive)
      if (distance < 100 && Math.random() < params.defensiveness) {
        this.jumpCooldown = 120; // 2 second cooldown
        const jumpDirection = isOpponentLeft ? 'right' : 'left'; // Jump away
        return { jump: true, moveDirection: jumpDirection };
      }
      
      // Jump to approach (offensive)
      if (distance > 250 && distance < 400 && Math.random() < params.jumpChance) {
        this.jumpCooldown = 120;
        const jumpDirection = isOpponentLeft ? 'left' : 'right'; // Jump towards
        return { jump: true, moveDirection: jumpDirection };
      }
    }

    // Priority 3: Movement decisions
    const idealDistance = params.comfortDistance;
    
    // Too far - approach
    if (distance > idealDistance + 50) {
      const moveToward = isOpponentLeft ? 'left' : 'right';
      return { move: moveToward };
    }
    
    // Too close - retreat
    if (distance < idealDistance - 50 && Math.random() < params.defensiveness) {
      const moveAway = isOpponentLeft ? 'right' : 'left';
      return { move: moveAway };
    }

    // At good distance - strafe or wait
    if (Math.random() < 0.3) {
      const strafeDirection = Math.random() < 0.5 ? 'left' : 'right';
      return { move: strafeDirection };
    }

    // Default: idle (no action)
    return this.getIdleActions();
  }

  /**
   * Continue current action if still in decision window
   */
  continueCurrentAction() {
    if (this.currentAction) {
      return this.currentAction;
    }
    return this.getIdleActions();
  }

  /**
   * Random action for simulating mistakes
   */
  makeRandomAction() {
    const actions = [
      this.getIdleActions(),
      { move: 'left' },
      { move: 'right' },
      { attack: true },
      { jump: true, moveDirection: 'left' },
      { jump: true, moveDirection: 'right' }
    ];
    return actions[Math.floor(Math.random() * actions.length)];
  }

  /**
   * Return idle/no action
   */
  getIdleActions() {
    return { idle: true };
  }

  /**
   * Calculate distance between two fighters
   */
  getDistance(fighter1, fighter2) {
    const center1 = fighter1.position.x + fighter1.width / 2;
    const center2 = fighter2.position.x + fighter2.width / 2;
    return Math.abs(center1 - center2);
  }

  /**
   * Change difficulty mid-game
   */
  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    this.reactionTime = this.getReactionTime(difficulty);
    this.params = this.getDifficultyParams(difficulty);
  }
}

// Export for use in game.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIController;
}
