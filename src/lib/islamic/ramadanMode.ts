// Ramadan Mode with Enhanced Islamic Features and Fasting Support

import { prayerTimesService } from './prayerTimes';

// Interfaces for data structures
export interface RamadanSettings {
  enabled: boolean;
  autoDetect: boolean; // Auto-enable during Ramadan month
  fastingReminders: {
    enabled: boolean;
    suhoorReminder: number; // minutes before Fajr
    iftarReminder: number; // minutes before Maghrib
    suhoorRecipesSuggestions: boolean;
    iftarRecipesSuggestions: boolean;
  };
  schedulingAdjustments: {
    avoidMeetingsDuringFasting: boolean;
    preferPostIftarMeetings: boolean;
    reducedWorkingHours: boolean;
    customWorkingHours?: {
      start: string; // HH:MM
      end: string; // HH:MM
    };
  };
  notifications: {
    reduceNonEssential: boolean;
    quietHours: {
      enabled: boolean;
      start: string; // HH:MM (after Isha)
      end: string; // HH:MM (before Fajr)
    };
    specialReminders: {
      tahajjud: boolean; // Late night prayer
      quranReading: boolean;
      zakat: boolean;
      charity: boolean;
    };
  };
  wellness: {
    hydrationReminders: boolean;
    restReminders: boolean;
    moderateExerciseOnly: boolean;
    fastingHealthTips: boolean;
  };
  spiritual: {
    quranReadingGoal: number; // pages per day
    dhikrReminders: boolean;
    charityTracking: boolean;
    qiyamAlLaylReminders: boolean; // Night prayer
  };
}

export interface FastingDay {
  date: string;
  day: number; // Day of Ramadan (1-30)
  suhoorTime: string;
  iftarTime: string;
  fastingHours: number;
  isToday: boolean;
  completed?: boolean;
  notes?: string;
  charityGiven?: number;
  quranPages?: number;
}

export interface RamadanStats {
  daysCompleted: number;
  totalDays: number;
  currentStreak: number;
  longestStreak: number;
  totalCharityGiven: number;
  quranPagesRead: number;
  averageFastingHours: number;
  healthMetrics: {
    weightChange?: number;
    energyLevel: number; // 1-10 scale
    sleepQuality: number; // 1-10 scale
    moodRating: number; // 1-10 scale
  };
}

export interface SuhoorIftarSuggestion {
  type: 'suhoor' | 'iftar';
  title: string;
  description: string;
  ingredients: string[];
  preparationTime: number; // minutes
  nutritionalBenefits: string[];
  category: 'light' | 'moderate' | 'hearty';
  difficulty: 'easy' | 'medium' | 'hard';
  culturalOrigin?: string;
}

// Interface for the notification objects, to fix the type error
export interface RamadanNotification {
  type: 'suhoor' | 'iftar' | 'prayer' | 'spiritual' | 'health';
  title: string;
  message: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
}

class RamadanModeService {
  private settings: RamadanSettings;
  private fastingDays: FastingDay[] = [];
  private currentRamadanYear: number;

  constructor() {
    this.currentRamadanYear = this.getCurrentHijriYear();
    this.settings = this.loadSettings();
    this.loadFastingData();

    if (this.settings.autoDetect) {
      this.checkRamadanPeriod();
    }
  }

  // Check if currently in Ramadan period
  async checkRamadanPeriod(): Promise<boolean> {
    const ramadanDates = await this.getRamadanDates();
    const today = new Date();

    const isRamadan = today >= ramadanDates.start && today <= ramadanDates.end;

    if (isRamadan && !this.settings.enabled) {
      // Auto-enable Ramadan mode
      this.settings.enabled = true;
      this.saveSettings();
    } else if (!isRamadan && this.settings.enabled && this.settings.autoDetect) {
      // Auto-disable after Ramadan
      this.settings.enabled = false;
      this.saveSettings();
    }

    return isRamadan;
  }

  // Get Ramadan start and end dates for current year
  async getRamadanDates(): Promise<{ start: Date; end: Date }> {
    try {
      // Use Islamic calendar API or calculation
      const response = await fetch(`https://api.aladhan.com/v1/gToHCalendar/${new Date().getMonth() + 1}/${new Date().getFullYear()}`);
      const data = await response.json();

      // This is a simplified approach - in reality, you'd need a proper Hijri calendar
      const currentYear = new Date().getFullYear();
      const ramadanStart = new Date(currentYear, 2, 23); // Approximate - varies each year
      const ramadanEnd = new Date(currentYear, 3, 21); // Approximate - varies each year

      return { start: ramadanStart, end: ramadanEnd };
    } catch (error) {
      console.warn('Failed to fetch Ramadan dates, using defaults:', error);

      // Fallback to estimated dates
      const currentYear = new Date().getFullYear();
      return {
        start: new Date(currentYear, 2, 23),
        end: new Date(currentYear, 3, 21)
      };
    }
  }

  // Initialize Ramadan calendar
  async initializeRamadanCalendar(): Promise<FastingDay[]> {
    const ramadanDates = await this.getRamadanDates();
    const fastingDays: FastingDay[] = [];

    const current = new Date(ramadanDates.start);
    let dayNumber = 1;

    while (current <= ramadanDates.end && dayNumber <= 30) {
      const prayerTimes = await prayerTimesService.getPrayerTimes(current);
      const fajrPrayer = prayerTimes.prayers.find(p => p.name === 'fajr');
      const maghribPrayer = prayerTimes.prayers.find(p => p.name === 'maghrib');

      if (fajrPrayer && maghribPrayer) {
        const fastingHours = this.calculateFastingHours(fajrPrayer.time, maghribPrayer.time);

        fastingDays.push({
          date: current.toISOString().split('T')[0],
          day: dayNumber,
          suhoorTime: fajrPrayer.time,
          iftarTime: maghribPrayer.time,
          fastingHours,
          isToday: this.isToday(current)
        });
      }

      current.setDate(current.getDate() + 1);
      dayNumber++;
    }

    this.fastingDays = fastingDays;
    this.saveFastingData();
    return fastingDays;
  }

  // Get today's fasting information
  getTodaysFasting(): FastingDay | null {
    return this.fastingDays.find(day => day.isToday) || null;
  }

  // Mark fasting day as completed
  completeFastingDay(date: string, data: {
    notes?: string;
    charityGiven?: number;
    quranPages?: number;
    energyLevel?: number;
    moodRating?: number;
  }): void {
    const day = this.fastingDays.find(d => d.date === date);
    if (day) {
      day.completed = true;
      day.notes = data.notes;
      day.charityGiven = data.charityGiven;
      day.quranPages = data.quranPages;
      this.saveFastingData();
    }
  }

  // Get Ramadan statistics
  getRamadanStats(): RamadanStats {
    const completedDays = this.fastingDays.filter(d => d.completed);
    const totalCharity = completedDays.reduce((sum, day) => sum + (day.charityGiven || 0), 0);
    const totalQuranPages = completedDays.reduce((sum, day) => sum + (day.quranPages || 0), 0);
    const averageFastingHours = this.fastingDays.reduce((sum, day) => sum + day.fastingHours, 0) / this.fastingDays.length;

    return {
      daysCompleted: completedDays.length,
      totalDays: this.fastingDays.length,
      currentStreak: this.calculateCurrentStreak(),
      longestStreak: this.calculateLongestStreak(),
      totalCharityGiven: totalCharity,
      quranPagesRead: totalQuranPages,
      averageFastingHours,
      healthMetrics: {
        energyLevel: 7, // This would be calculated from daily entries
        sleepQuality: 7,
        moodRating: 8
      }
    };
  }

  // Get meal suggestions
  getMealSuggestions(type: 'suhoor' | 'iftar', preference?: 'light' | 'moderate' | 'hearty'): SuhoorIftarSuggestion[] {
    if (type === 'suhoor') {
      return [
        {
          type: 'suhoor',
          title: 'Traditional Suhoor Bowl',
          description: 'Oatmeal with dates, nuts, and milk - provides sustained energy',
          ingredients: ['Oats', 'Dates', 'Almonds', 'Milk', 'Honey'],
          preparationTime: 10,
          nutritionalBenefits: ['High fiber', 'Sustained energy', 'Protein rich'],
          category: 'moderate',
          difficulty: 'easy',
          culturalOrigin: 'Universal'
        },
        {
          type: 'suhoor',
          title: 'Arabic Breakfast',
          description: 'Traditional Middle Eastern breakfast with labneh and vegetables',
          ingredients: ['Labneh', 'Olive oil', 'Cucumber', 'Tomatoes', 'Bread', 'Olives'],
          preparationTime: 5,
          nutritionalBenefits: ['Probiotics', 'Healthy fats', 'Hydrating'],
          category: 'light',
          difficulty: 'easy',
          culturalOrigin: 'Middle Eastern'
        },
        {
          type: 'suhoor',
          title: 'Protein Power Bowl',
          description: 'Eggs with whole grain toast and avocado',
          ingredients: ['Eggs', 'Whole grain bread', 'Avocado', 'Spinach'],
          preparationTime: 15,
          nutritionalBenefits: ['High protein', 'Healthy fats', 'Iron rich'],
          category: 'hearty',
          difficulty: 'medium'
        }
      ];
    } else {
      return [
        {
          type: 'iftar',
          title: 'Traditional Iftar Start',
          description: 'Dates with water or milk - following the Sunnah',
          ingredients: ['Fresh dates', 'Water or milk'],
          preparationTime: 2,
          nutritionalBenefits: ['Quick energy', 'Natural sugars', 'Potassium'],
          category: 'light',
          difficulty: 'easy',
          culturalOrigin: 'Traditional Islamic'
        },
        {
          type: 'iftar',
          title: 'Harira Soup',
          description: 'Traditional Moroccan soup with lentils and tomatoes',
          ingredients: ['Lentils', 'Tomatoes', 'Onions', 'Cilantro', 'Spices'],
          preparationTime: 45,
          nutritionalBenefits: ['High protein', 'Fiber rich', 'Warming'],
          category: 'moderate',
          difficulty: 'medium',
          culturalOrigin: 'Moroccan'
        },
        {
          type: 'iftar',
          title: 'Balanced Iftar Meal',
          description: 'Grilled chicken with rice and vegetables',
          ingredients: ['Chicken breast', 'Basmati rice', 'Mixed vegetables', 'Herbs'],
          preparationTime: 30,
          nutritionalBenefits: ['Complete protein', 'Complex carbs', 'Vitamins'],
          category: 'hearty',
          difficulty: 'medium'
        }
      ];
    }
  }

  // Get smart notifications based on Ramadan mode
  getSmartNotifications(): RamadanNotification[] {
    if (!this.settings.enabled) return [];

    const notifications: RamadanNotification[] = [];
    const today = this.getTodaysFasting();

    if (today) {
      // Suhoor reminder
      if (this.settings.fastingReminders.enabled) {
        const suhoorReminderTime = this.subtractMinutes(today.suhoorTime, this.settings.fastingReminders.suhoorReminder);
        notifications.push({
          type: 'suhoor',
          title: 'Suhoor Time Approaching',
          message: `Suhoor ends at ${today.suhoorTime}. Prepare your pre-dawn meal.`,
          time: suhoorReminderTime,
          priority: 'high'
        });

        // Iftar reminder
        const iftarReminderTime = this.subtractMinutes(today.iftarTime, this.settings.fastingReminders.iftarReminder);
        notifications.push({
          type: 'iftar',
          title: 'Iftar Time Approaching',
          message: `Break your fast at ${today.iftarTime}. ${today.fastingHours} hours of fasting completed!`,
          time: iftarReminderTime,
          priority: 'high'
        });
      }

      // Spiritual reminders
      if (this.settings.notifications.specialReminders.quranReading) {
        notifications.push({
          type: 'spiritual',
          title: 'Quran Reading Time',
          message: `Goal: ${this.settings.spiritual.quranReadingGoal} pages today`,
          time: '20:30', // After Isha
          priority: 'medium'
        });
      }

      if (this.settings.notifications.specialReminders.tahajjud) {
        notifications.push({
          type: 'prayer',
          title: 'Tahajjud Prayer',
          message: 'Time for the blessed night prayer',
          time: '02:00', // Late night
          priority: 'medium'
        });
      }

      // Health reminders
      if (this.settings.wellness.hydrationReminders) {
        notifications.push({
          type: 'health',
          title: 'Hydration Reminder',
          message: 'Drink water slowly after breaking your fast',
          time: this.addMinutes(today.iftarTime, 30),
          priority: 'medium'
        });
      }
    }

    return notifications;
  }

  // Adjust meeting scheduling during Ramadan
  async adjustMeetingScheduling(
    startTime: Date,
    duration: number
  ): Promise<{
    recommended: boolean;
    alternatives?: Array<{
      startTime: Date;
      reason: string;
    }>;
    warnings?: string[];
  }> {
    if (!this.settings.enabled) {
      return { recommended: true };
    }

    // Explicitly type the arrays to resolve the type error
    const warnings: string[] = [];
    const alternatives: Array<{ startTime: Date; reason: string }> = [];
    const today = this.getTodaysFasting();

    if (today) {
      const meetingEnd = new Date(startTime.getTime() + duration * 60000);
      const iftarTime = new Date();
      const [hours, minutes] = today.iftarTime.split(':').map(Number);
      iftarTime.setHours(hours, minutes, 0, 0);

      // Check if meeting conflicts with iftar
      if (startTime <= iftarTime && meetingEnd >= iftarTime) {
        warnings.push('Meeting conflicts with iftar time');

        // Suggest before iftar
        const beforeIftar = new Date(iftarTime.getTime() - (duration + 30) * 60000);
        alternatives.push({
          startTime: beforeIftar,
          reason: 'Scheduled before iftar with buffer time'
        });

        // Suggest after iftar
        const afterIftar = new Date(iftarTime.getTime() + 60 * 60000); // 1 hour after iftar
        alternatives.push({
          startTime: afterIftar,
          reason: 'Scheduled after iftar and meal time'
        });
      }

      // Check if during fasting hours and settings avoid meetings
      if (this.settings.schedulingAdjustments.avoidMeetingsDuringFasting) {
        const suhoorTime = new Date();
        const [sHours, sMinutes] = today.suhoorTime.split(':').map(Number);
        suhoorTime.setHours(sHours, sMinutes, 0, 0);

        if (startTime > suhoorTime && startTime < iftarTime) {
          warnings.push('Meeting scheduled during fasting hours');
        }
      }

      // Prefer post-iftar meetings if enabled
      if (this.settings.schedulingAdjustments.preferPostIftarMeetings && startTime < iftarTime) {
        const postIftarTime = new Date(iftarTime.getTime() + 90 * 60000); // 1.5 hours after iftar
        alternatives.push({
          startTime: postIftarTime,
          reason: 'Preferred post-iftar timing for better energy levels'
        });
      }
    }

    return {
      recommended: warnings.length === 0,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  // Update Ramadan settings
  updateSettings(newSettings: Partial<RamadanSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  // Get current settings
  getSettings(): RamadanSettings {
    return { ...this.settings };
  }

  // Enable/disable Ramadan mode
  toggleRamadanMode(enabled: boolean): void {
    this.settings.enabled = enabled;
    this.saveSettings();
  }

  // Private helper methods
  private calculateFastingHours(suhoorTime: string, iftarTime: string): number {
    const [sHours, sMinutes] = suhoorTime.split(':').map(Number);
    const [iHours, iMinutes] = iftarTime.split(':').map(Number);

    const suhoorMinutes = sHours * 60 + sMinutes;
    const iftarMinutes = iHours * 60 + iMinutes;

    let diffMinutes = iftarMinutes - suhoorMinutes;
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60; // Next day
    }

    return Math.round(diffMinutes / 60 * 10) / 10; // Round to 1 decimal
  }

  private subtractMinutes(timeStr: string, minutes: number): string {
    const [hours, mins] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins - minutes, 0, 0);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private addMinutes(timeStr: string, minutes: number): string {
    const [hours, mins] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins + minutes, 0, 0);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  private calculateCurrentStreak(): number {
    let streak = 0;
    const today = new Date();

    // Count backwards from today
    for (let i = this.fastingDays.length - 1; i >= 0; i--) {
      const day = this.fastingDays[i];
      const dayDate = new Date(day.date);

      if (dayDate <= today && day.completed) {
        streak++;
      } else if (dayDate <= today) {
        break;
      }
    }

    return streak;
  }

  private calculateLongestStreak(): number {
    let maxStreak = 0;
    let currentStreak = 0;

    this.fastingDays.forEach(day => {
      if (day.completed) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    return maxStreak;
  }

  private getCurrentHijriYear(): number {
    // Simplified calculation - in reality, you'd use a proper Hijri calendar
    const gregorianYear = new Date().getFullYear();
    return gregorianYear - 579; // Approximate conversion
  }

  private loadSettings(): RamadanSettings {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('ramadanSettings');
        if (stored) {
          return { ...this.getDefaultSettings(), ...JSON.parse(stored) };
        }
      }
    } catch (error) {
      console.warn('Failed to load Ramadan settings:', error);
    }

    return this.getDefaultSettings();
  }

  private getDefaultSettings(): RamadanSettings {
    return {
      enabled: false,
      autoDetect: true,
      fastingReminders: {
        enabled: true,
        suhoorReminder: 30,
        iftarReminder: 15,
        suhoorRecipesSuggestions: true,
        iftarRecipesSuggestions: true
      },
      schedulingAdjustments: {
        avoidMeetingsDuringFasting: false,
        preferPostIftarMeetings: true,
        reducedWorkingHours: false
      },
      notifications: {
        reduceNonEssential: true,
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '05:00'
        },
        specialReminders: {
          tahajjud: false,
          quranReading: true,
          zakat: true,
          charity: true
        }
      },
      wellness: {
        hydrationReminders: true,
        restReminders: true,
        moderateExerciseOnly: true,
        fastingHealthTips: true
      },
      spiritual: {
        quranReadingGoal: 1,
        dhikrReminders: true,
        charityTracking: true,
        qiyamAlLaylReminders: false
      }
    };
  }

  private saveSettings(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('ramadanSettings', JSON.stringify(this.settings));
      }
    } catch (error) {
      console.warn('Failed to save Ramadan settings:', error);
    }
  }

  private loadFastingData(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(`ramadanFasting_${this.currentRamadanYear}`);
        if (stored) {
          this.fastingDays = JSON.parse(stored);
        }
      }
    } catch (error) {
      console.warn('Failed to load fasting data:', error);
    }
  }

  private saveFastingData(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`ramadanFasting_${this.currentRamadanYear}`, JSON.stringify(this.fastingDays));
      }
    } catch (error) {
      console.warn('Failed to save fasting data:', error);
    }
  }
}

export const ramadanModeService = new RamadanModeService();