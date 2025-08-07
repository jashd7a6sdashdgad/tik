// Avatar Reaction System for Dynamic User Interface Feedback

export interface AvatarEmotionState {
  id: string;
  name: string;
  emoji: string;
  description: string;
  triggers: string[];
  animation: 'bounce' | 'shake' | 'pulse' | 'spin' | 'wobble' | 'flash' | 'tada' | 'jello';
  color: string;
  duration: number; // in milliseconds
  priority: number; // higher numbers override lower ones
}

export interface AvatarReaction {
  id: string;
  emotionState: AvatarEmotionState;
  message: string;
  timestamp: Date;
  context: any;
  shown: boolean;
  autoHide: boolean;
  hideAfter?: number; // milliseconds
}

export interface ReactionTrigger {
  type: 'budget_over' | 'budget_under' | 'goal_completed' | 'goal_behind' | 'expense_spike' | 'task_completed' | 'email_received' | 'weather_alert' | 'achievement_unlocked' | 'streak_milestone' | 'savings_goal_met' | 'spending_streak' | 'productive_day';
  data: any;
}

class AvatarReactionSystem {
  private emotionStates: AvatarEmotionState[] = [
    {
      id: 'happy',
      name: 'Happy',
      emoji: '😊',
      description: 'Pleased with positive achievements',
      triggers: ['goal_completed', 'budget_under', 'task_completed', 'achievement_unlocked', 'savings_goal_met'],
      animation: 'bounce',
      color: '#10B981',
      duration: 2000,
      priority: 5
    },
    {
      id: 'excited',
      name: 'Excited',
      emoji: '🎉',
      description: 'Very excited about major accomplishments',
      triggers: ['streak_milestone', 'achievement_unlocked', 'savings_goal_met'],
      animation: 'tada',
      color: '#F59E0B',
      duration: 3000,
      priority: 8
    },
    {
      id: 'concerned',
      name: 'Concerned',
      emoji: '😟',
      description: 'Worried about budget or goal issues',
      triggers: ['budget_over', 'goal_behind', 'expense_spike'],
      animation: 'shake',
      color: '#EF4444',
      duration: 2500,
      priority: 6
    },
    {
      id: 'focused',
      name: 'Focused',
      emoji: '🤔',
      description: 'Concentrating on important tasks',
      triggers: ['productive_day', 'task_completed'],
      animation: 'pulse',
      color: '#3B82F6',
      duration: 1500,
      priority: 4
    },
    {
      id: 'proud',
      name: 'Proud',
      emoji: '😌',
      description: 'Satisfied with consistent good habits',
      triggers: ['spending_streak', 'productive_day'],
      animation: 'jello',
      color: '#8B5CF6',
      duration: 2000,
      priority: 5
    },
    {
      id: 'alert',
      name: 'Alert',
      emoji: '⚠️',
      description: 'Warning about important issues',
      triggers: ['budget_over', 'weather_alert', 'expense_spike'],
      animation: 'flash',
      color: '#F59E0B',
      duration: 2000,
      priority: 7
    },
    {
      id: 'neutral',
      name: 'Neutral',
      emoji: '🙂',
      description: 'Default calm state',
      triggers: ['email_received'],
      animation: 'pulse',
      color: '#6B7280',
      duration: 1000,
      priority: 1
    },
    {
      id: 'celebrating',
      name: 'Celebrating',
      emoji: '🥳',
      description: 'Celebrating major milestones',
      triggers: ['streak_milestone', 'achievement_unlocked'],
      animation: 'spin',
      color: '#EC4899',
      duration: 4000,
      priority: 9
    }
  ];

  private currentReaction: AvatarReaction | null = null;
  private reactionQueue: AvatarReaction[] = [];
  private listeners: ((reaction: AvatarReaction | null) => void)[] = [];
  private reactionHistory: AvatarReaction[] = [];

  public getEmotionState(id: string): AvatarEmotionState | undefined {
    return this.emotionStates.find(state => state.id === id);
  }

  public getAllEmotionStates(): AvatarEmotionState[] {
    return [...this.emotionStates];
  }

  public triggerReaction(trigger: ReactionTrigger): void {
    const matchingStates = this.emotionStates.filter(state =>
      state.triggers.includes(trigger.type)
    );

    if (matchingStates.length === 0) return;

    // Select the highest priority emotion state
    const emotionState = matchingStates.reduce((highest, current) =>
      current.priority > highest.priority ? current : highest
    );

    const message = this.generateReactionMessage(trigger, emotionState);
    
    const reaction: AvatarReaction = {
      id: `reaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      emotionState,
      message,
      timestamp: new Date(),
      context: trigger.data,
      shown: false,
      autoHide: true,
      hideAfter: emotionState.duration + 2000 // Show message for 2 seconds after animation
    };

    this.addReactionToQueue(reaction);
  }

  private generateReactionMessage(trigger: ReactionTrigger, emotionState: AvatarEmotionState): string {
    const messages: Record<string, string[]> = {
      'budget_over': [
        "Looks like we're over budget this week! 💸",
        "Time to review those spending habits! 🤔",
        "Budget alert! Let's get back on track! ⚡"
      ],
      'budget_under': [
        "Great job staying under budget! 🎯",
        "Your spending discipline is paying off! 💪",
        "Budget goals achieved! Keep it up! ✨"
      ],
      'goal_completed': [
        "Goal achieved! You're amazing! 🌟",
        "Another milestone reached! 🚀",
        "Success! Your hard work paid off! 💫"
      ],
      'goal_behind': [
        "Let's catch up on this goal together! 💪",
        "Time to refocus on our targets! 🎯",
        "We can still make this happen! 🔥"
      ],
      'expense_spike': [
        "Noticed a spending spike today! 📈",
        "Let's review this large expense! 👀",
        "Unexpected spending detected! 🚨"
      ],
      'task_completed': [
        "Task completed! You're on fire! 🔥",
        "Another one done! Great momentum! ⚡",
        "Productivity level: Amazing! 📊"
      ],
      'achievement_unlocked': [
        "Achievement unlocked! 🏆",
        "You've earned a new badge! 🥇",
        "Incredible achievement! 🎖️"
      ],
      'streak_milestone': [
        "Streak milestone reached! 🔥",
        "Your consistency is incredible! ⭐",
        "This streak is legendary! 👑"
      ],
      'savings_goal_met': [
        "Savings goal crushed! 💰",
        "Your financial future looks bright! ☀️",
        "Money saved = Dreams achieved! 🏦"
      ],
      'weather_alert': [
        "Weather update for you! 🌤️",
        "Check the weather conditions! 🌧️",
        "Weather alert! Plan accordingly! ⛈️"
      ],
      'productive_day': [
        "What a productive day! 📈",
        "You're crushing your tasks! 💪",
        "Peak performance today! 🚀"
      ]
    };

    const triggerMessages = messages[trigger.type] || ["Something happened! 🤖"];
    return triggerMessages[Math.floor(Math.random() * triggerMessages.length)];
  }

  private addReactionToQueue(reaction: AvatarReaction): void {
    // If there's a current reaction with lower priority, replace it
    if (this.currentReaction && reaction.emotionState.priority > this.currentReaction.emotionState.priority) {
      this.reactionQueue.unshift(this.currentReaction);
      this.showReaction(reaction);
    } else if (!this.currentReaction) {
      this.showReaction(reaction);
    } else {
      // Add to queue, sorted by priority (highest first)
      this.reactionQueue.push(reaction);
      this.reactionQueue.sort((a, b) => b.emotionState.priority - a.emotionState.priority);
    }
  }

  private showReaction(reaction: AvatarReaction): void {
    this.currentReaction = reaction;
    reaction.shown = true;
    
    // Add to history
    this.reactionHistory.unshift(reaction);
    if (this.reactionHistory.length > 50) {
      this.reactionHistory = this.reactionHistory.slice(0, 50);
    }

    // Notify listeners
    this.notifyListeners(reaction);

    // Auto-hide if configured
    if (reaction.autoHide && reaction.hideAfter) {
      setTimeout(() => {
        this.hideCurrentReaction();
      }, reaction.hideAfter);
    }
  }

  public hideCurrentReaction(): void {
    this.currentReaction = null;
    this.notifyListeners(null);
    
    // Show next reaction in queue
    if (this.reactionQueue.length > 0) {
      const nextReaction = this.reactionQueue.shift()!;
      setTimeout(() => this.showReaction(nextReaction), 500); // Small delay between reactions
    }
  }

  public getCurrentReaction(): AvatarReaction | null {
    return this.currentReaction;
  }

  public getReactionHistory(): AvatarReaction[] {
    return [...this.reactionHistory];
  }

  public subscribe(listener: (reaction: AvatarReaction | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(reaction: AvatarReaction | null): void {
    this.listeners.forEach(listener => listener(reaction));
  }

  public clearQueue(): void {
    this.reactionQueue = [];
  }

  public forceReaction(emotionId: string, message?: string): void {
    const emotionState = this.getEmotionState(emotionId);
    if (!emotionState) return;

    const reaction: AvatarReaction = {
      id: `force-reaction-${Date.now()}`,
      emotionState,
      message: message || `Showing ${emotionState.name} emotion!`,
      timestamp: new Date(),
      context: { forced: true },
      shown: false,
      autoHide: true,
      hideAfter: emotionState.duration + 2000
    };

    this.showReaction(reaction);
  }

  // Budget analysis integration
  public processBudgetAnalysis(analysis: any): void {
    // Check for budget alerts
    if (analysis.alerts) {
      analysis.alerts.forEach((alert: any) => {
        if (alert.type === 'danger') {
          this.triggerReaction({
            type: 'budget_over',
            data: { category: alert.category, message: alert.message }
          });
        }
      });
    }

    // Check budget score
    if (analysis.score && analysis.score.overall >= 80) {
      this.triggerReaction({
        type: 'budget_under',
        data: { score: analysis.score.overall }
      });
    }

    // Check for expense spikes
    if (analysis.categoryBreakdown) {
      analysis.categoryBreakdown.forEach((category: any) => {
        if (category.trendPercentage > 50) {
          this.triggerReaction({
            type: 'expense_spike',
            data: { category: category.category, increase: category.trendPercentage }
          });
        }
      });
    }
  }

  // Goal completion integration
  public processGoalUpdate(goal: any): void {
    if (goal.status === 'completed') {
      this.triggerReaction({
        type: 'goal_completed',
        data: { goalTitle: goal.title, value: goal.currentValue }
      });
    } else if (goal.status === 'behind') {
      this.triggerReaction({
        type: 'goal_behind',
        data: { goalTitle: goal.title, percentage: goal.percentage }
      });
    }
  }

  // Task completion integration
  public processTaskCompletion(taskCount: number): void {
    if (taskCount > 0) {
      this.triggerReaction({
        type: 'task_completed',
        data: { count: taskCount }
      });
    }

    // Trigger productive day if many tasks completed
    if (taskCount >= 5) {
      this.triggerReaction({
        type: 'productive_day',
        data: { tasksCompleted: taskCount }
      });
    }
  }

  // Achievement system
  public unlockAchievement(achievementId: string, title: string): void {
    this.triggerReaction({
      type: 'achievement_unlocked',
      data: { id: achievementId, title }
    });
  }

  // Streak tracking
  public processStreakMilestone(streakType: string, days: number): void {
    if ([7, 14, 30, 60, 100].includes(days)) {
      this.triggerReaction({
        type: 'streak_milestone',
        data: { streakType, days }
      });
    }
  }
}

export const avatarReactions = new AvatarReactionSystem();