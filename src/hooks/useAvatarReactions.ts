'use client';

import { useEffect, useCallback } from 'react';
import { avatarReactions, ReactionTrigger } from '@/lib/avatarReactions';

interface UseAvatarReactionsProps {
  enableBudgetReactions?: boolean;
  enableGoalReactions?: boolean;
  enableTaskReactions?: boolean;
  enableWeatherReactions?: boolean;
}

export const useAvatarReactions = (props: UseAvatarReactionsProps = {}) => {
  const {
    enableBudgetReactions = true,
    enableGoalReactions = true,
    enableTaskReactions = true,
    enableWeatherReactions = true
  } = props;

  // Trigger a reaction manually
  const triggerReaction = useCallback((trigger: ReactionTrigger) => {
    avatarReactions.triggerReaction(trigger);
  }, []);

  // Convenience methods for common reactions
  const celebrateGoalCompletion = useCallback((goalTitle: string, value: number) => {
    triggerReaction({
      type: 'goal_completed',
      data: { goalTitle, value }
    });
  }, [triggerReaction]);

  const alertBudgetOverspend = useCallback((category: string, amount: number) => {
    triggerReaction({
      type: 'budget_over',
      data: { category, amount }
    });
  }, [triggerReaction]);

  const celebrateTaskCompletion = useCallback((taskCount: number = 1) => {
    triggerReaction({
      type: 'task_completed',
      data: { count: taskCount }
    });
  }, [triggerReaction]);

  const showExpenseSpike = useCallback((category: string, increase: number) => {
    triggerReaction({
      type: 'expense_spike',
      data: { category, increase }
    });
  }, [triggerReaction]);

  const showWeatherAlert = useCallback((condition: string, temperature?: number) => {
    triggerReaction({
      type: 'weather_alert',
      data: { condition, temperature }
    });
  }, [triggerReaction]);

  const unlockAchievement = useCallback((title: string, description?: string) => {
    triggerReaction({
      type: 'achievement_unlocked',
      data: { title, description }
    });
  }, [triggerReaction]);

  const celebrateStreak = useCallback((streakType: string, days: number) => {
    triggerReaction({
      type: 'streak_milestone',
      data: { streakType, days }
    });
  }, [triggerReaction]);

  const showSavingsGoalMet = useCallback((goalTitle: string, amount: number) => {
    triggerReaction({
      type: 'savings_goal_met',
      data: { goalTitle, amount }
    });
  }, [triggerReaction]);

  const celebrateProductiveDay = useCallback((tasksCompleted: number) => {
    triggerReaction({
      type: 'productive_day',
      data: { tasksCompleted }
    });
  }, [triggerReaction]);

  // Process budget analysis data
  const processBudgetAnalysis = useCallback((analysis: any) => {
    if (!enableBudgetReactions) return;
    avatarReactions.processBudgetAnalysis(analysis);
  }, [enableBudgetReactions]);

  // Process goal updates
  const processGoalUpdate = useCallback((goal: any) => {
    if (!enableGoalReactions) return;
    avatarReactions.processGoalUpdate(goal);
  }, [enableGoalReactions]);

  // Process task completion
  const processTaskCompletion = useCallback((taskCount: number) => {
    if (!enableTaskReactions) return;
    avatarReactions.processTaskCompletion(taskCount);
  }, [enableTaskReactions]);

  // Get current reaction
  const getCurrentReaction = useCallback(() => {
    return avatarReactions.getCurrentReaction();
  }, []);

  // Get reaction history
  const getReactionHistory = useCallback(() => {
    return avatarReactions.getReactionHistory();
  }, []);

  // Force a specific emotion
  const forceEmotion = useCallback((emotionId: string, message?: string) => {
    avatarReactions.forceReaction(emotionId, message);
  }, []);

  // Clear reaction queue
  const clearReactions = useCallback(() => {
    avatarReactions.clearQueue();
  }, []);

  // Hide current reaction
  const hideCurrentReaction = useCallback(() => {
    avatarReactions.hideCurrentReaction();
  }, []);

  return {
    // Direct trigger methods
    triggerReaction,
    celebrateGoalCompletion,
    alertBudgetOverspend,
    celebrateTaskCompletion,
    showExpenseSpike,
    showWeatherAlert,
    unlockAchievement,
    celebrateStreak,
    showSavingsGoalMet,
    celebrateProductiveDay,
    
    // Data processing methods
    processBudgetAnalysis,
    processGoalUpdate,
    processTaskCompletion,
    
    // State methods
    getCurrentReaction,
    getReactionHistory,
    forceEmotion,
    clearReactions,
    hideCurrentReaction
  };
};

// Achievement tracking system
export const useAchievementSystem = () => {
  const { unlockAchievement } = useAvatarReactions();

  const checkAchievements = useCallback((data: {
    totalExpenses?: number;
    goalCompletions?: number;
    tasksCompleted?: number;
    streakDays?: number;
    savingsAmount?: number;
  }) => {
    // Spending milestone achievements
    if (data.totalExpenses) {
      const milestones = [100, 500, 1000, 2500, 5000];
      milestones.forEach(milestone => {
        if (Math.floor(data.totalExpenses! / milestone) > Math.floor((data.totalExpenses! - 50) / milestone)) {
          unlockAchievement(`${milestone} OMR Spent`, `You've tracked ${milestone} OMR in expenses!`);
        }
      });
    }

    // Goal completion achievements
    if (data.goalCompletions) {
      const goalMilestones = [1, 5, 10, 25, 50];
      goalMilestones.forEach(milestone => {
        if (data.goalCompletions === milestone) {
          unlockAchievement(`Goal Achiever ${milestone}`, `You've completed ${milestone} goals!`);
        }
      });
    }

    // Task completion achievements
    if (data.tasksCompleted) {
      const taskMilestones = [10, 50, 100, 250, 500];
      taskMilestones.forEach(milestone => {
        if (data.tasksCompleted === milestone) {
          unlockAchievement(`Task Master ${milestone}`, `You've completed ${milestone} tasks!`);
        }
      });
    }

    // Streak achievements
    if (data.streakDays) {
      const streakMilestones = [7, 30, 100, 365];
      streakMilestones.forEach(milestone => {
        if (data.streakDays === milestone) {
          unlockAchievement(`${milestone} Day Streak`, `Amazing consistency for ${milestone} days!`);
        }
      });
    }

    // Savings achievements
    if (data.savingsAmount) {
      const savingsMilestones = [500, 1000, 2500, 5000, 10000];
      savingsMilestones.forEach(milestone => {
        if (Math.floor(data.savingsAmount! / milestone) > Math.floor((data.savingsAmount! - 100) / milestone)) {
          unlockAchievement(`Savings Champion ${milestone}`, `You've saved ${milestone} OMR!`);
        }
      });
    }
  }, [unlockAchievement]);

  return { checkAchievements };
};

export default useAvatarReactions;