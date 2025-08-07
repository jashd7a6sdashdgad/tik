// Islamic Calendar System with Prayer Times and Religious Events

export interface HijriDate {
  day: number;
  month: number;
  year: number;
  monthName: string;
  monthNameArabic: string;
  weekday: string;
  weekdayArabic: string;
  formatted: string;
  formattedArabic: string;
}

export interface IslamicHoliday {
  id: string;
  name: string;
  nameArabic: string;
  date: HijriDate;
  gregorianDate: Date;
  type: 'major' | 'minor' | 'observance';
  description: string;
  significance: string;
  recommendedActions: string[];
  duration?: number; // days
  isToday?: boolean;
  daysUntil?: number;
}

export interface IslamicEvent {
  id: string;
  title: string;
  date: Date;
  hijriDate: HijriDate;
  type: 'holiday' | 'observance' | 'reminder';
  category: 'worship' | 'charity' | 'celebration' | 'fasting' | 'pilgrimage' | 'remembrance';
  description: string;
  reminder?: {
    enabled: boolean;
    daysBefore: number;
  };
}

class IslamicCalendarService {
  private holidays: IslamicHoliday[] = [];
  private monthNames = [
    'Muharram', 'Safar', 'Rabi\' al-awwal', 'Rabi\' al-thani',
    'Jumada al-awwal', 'Jumada al-thani', 'Rajab', 'Sha\'ban',
    'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
  ];

  private monthNamesArabic = [
    'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
    'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان',
    'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
  ];

  private weekdays = ['Ahad', 'Ithnayn', 'Thulatha', 'Arba\'a', 'Khams', 'Jum\'a', 'Sabt'];
  private weekdaysArabic = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  constructor() {
    this.initializeHolidays();
  }

  // Convert Gregorian date to Hijri
  gregorianToHijri(gregorianDate: Date): HijriDate {
    // This is a simplified calculation. For production, use a proper Islamic calendar library
    const jd = this.gregorianToJulianDay(gregorianDate);
    const hijriDateObj = this.julianDayToHijri(jd);
    
    const monthName = this.monthNames[hijriDateObj.month - 1];
    const monthNameArabic = this.monthNamesArabic[hijriDateObj.month - 1];
    
    const weekdayIndex = gregorianDate.getDay();
    const weekday = this.weekdays[weekdayIndex];
    const weekdayArabic = this.weekdaysArabic[weekdayIndex];
    
    return {
      ...hijriDateObj,
      monthName,
      monthNameArabic,
      weekday,
      weekdayArabic,
      formatted: `${hijriDateObj.day} ${monthName} ${hijriDateObj.year} AH`,
      formattedArabic: `${hijriDateObj.day} ${monthNameArabic} ${hijriDateObj.year} هـ`
    };
  }

  // Convert Hijri date to Gregorian
  hijriToGregorian(hijriDate: { day: number; month: number; year: number }): Date {
    const jd = this.hijriToJulianDay(hijriDate);
    return this.julianDayToGregorian(jd);
  }

  // Get today's Hijri date
  getTodaysHijriDate(): HijriDate {
    return this.gregorianToHijri(new Date());
  }

  // Get upcoming Islamic holidays
  getUpcomingHolidays(limit: number = 5): IslamicHoliday[] {
    const today = new Date();
    
    return this.holidays
      .map(holiday => ({
        ...holiday,
        gregorianDate: this.hijriToGregorian(holiday.date),
        isToday: false,
        daysUntil: 0
      }))
      .map(holiday => ({
        ...holiday,
        isToday: this.isSameDay(holiday.gregorianDate, today),
        daysUntil: Math.ceil((holiday.gregorianDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      }))
      .filter(holiday => holiday.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, limit);
  }

  // Get holidays for a specific month
  getHolidaysForMonth(month: number, year: number): IslamicHoliday[] {
    return this.holidays.filter(holiday => 
      holiday.date.month === month && holiday.date.year === year
    );
  }

  // Check if a date is an Islamic holiday
  isHoliday(date: Date): IslamicHoliday | null {
    const hijriDate = this.gregorianToHijri(date);
    
    return this.holidays.find(holiday =>
      holiday.date.day === hijriDate.day &&
      holiday.date.month === hijriDate.month
    ) || null;
  }

  // Get Islamic year
  getCurrentIslamicYear(): number {
    return this.getTodaysHijriDate().year;
  }

  // Check if currently in sacred months (Dhu al-Qi'dah, Dhu al-Hijjah, Muharram, Rajab)
  isInSacredMonth(date?: Date): { isSacred: boolean; monthName: string; significance: string } {
    const hijriDate = this.gregorianToHijri(date || new Date());
    const sacredMonths = [1, 7, 11, 12]; // Muharram, Rajab, Dhu al-Qi'dah, Dhu al-Hijjah
    
    const isSacred = sacredMonths.includes(hijriDate.month);
    
    const significance = {
      1: 'Muharram - The sacred month of Allah, excellent for voluntary fasting',
      7: 'Rajab - One of the sacred months, time for increased worship',
      11: 'Dhu al-Qi\'dah - Sacred month before Hajj, no fighting allowed',
      12: 'Dhu al-Hijjah - Month of Hajj pilgrimage, very blessed'
    };
    
    return {
      isSacred,
      monthName: hijriDate.monthName,
      significance: isSacred ? significance[hijriDate.month as keyof typeof significance] : ''
    };
  }

  // Get special observances for current month
  getCurrentMonthObservances(): Array<{
    title: string;
    description: string;
    type: 'fasting' | 'worship' | 'charity' | 'remembrance';
    days?: number[];
  }> {
    const currentHijri = this.getTodaysHijriDate();
    const observances: Array<{
      title: string;
      description: string;
      type: 'fasting' | 'worship' | 'charity' | 'remembrance';
      days?: number[];
    }> = [];

    switch (currentHijri.month) {
      case 1: // Muharram
        observances.push({
          title: 'Day of Ashura',
          description: 'Recommended fasting on the 10th of Muharram',
          type: 'fasting' as const,
          days: [9, 10, 11]
        });
        break;
        
      case 2: // Safar
        observances.push({
          title: 'Last Wednesday of Safar',
          description: 'Some observe this as a day of seeking protection',
          type: 'worship' as const
        });
        break;
        
      case 3: // Rabi' al-awwal
        observances.push({
          title: 'Mawlid an-Nabi',
          description: 'Birth of Prophet Muhammad (peace be upon him)',
          type: 'remembrance' as const,
          days: [12]
        });
        break;
        
      case 7: // Rajab
        observances.push({
          title: 'Isra and Mi\'raj',
          description: 'Night Journey of Prophet Muhammad (peace be upon him)',
          type: 'remembrance' as const,
          days: [27]
        });
        break;
        
      case 8: // Sha'ban
        observances.push({
          title: 'Night of Bara\'at',
          description: 'Night of forgiveness and salvation',
          type: 'worship' as const,
          days: [15]
        });
        break;
        
      case 9: // Ramadan
        observances.push({
          title: 'Laylat al-Qadr',
          description: 'Night of Power - last 10 nights of Ramadan',
          type: 'worship' as const,
          days: [21, 23, 25, 27, 29]
        });
        break;
        
      case 12: // Dhu al-Hijjah
        observances.push({
          title: 'First 10 Days',
          description: 'Most blessed days for good deeds and worship',
          type: 'worship' as const,
          days: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        });
        break;
    }

    return observances;
  }

  // Get monthly deed recommendations
  getMonthlyRecommendations(): Array<{
    category: string;
    recommendations: string[];
  }> {
    const currentHijri = this.getTodaysHijriDate();
    const sacredMonth = this.isInSacredMonth();
    
    const recommendations = [
      {
        category: 'General Worship',
        recommendations: [
          'Increase daily Quran recitation',
          'Make extra du\'a (supplications)',
          'Increase dhikr (remembrance of Allah)',
          'Perform voluntary prayers (Sunnah and Nafl)'
        ]
      }
    ];

    if (sacredMonth.isSacred) {
      recommendations.push({
        category: 'Sacred Month Observances',
        recommendations: [
          'Avoid conflicts and disputes',
          'Increase charitable giving',
          'Seek forgiveness (Istighfar)',
          'Reflect on spiritual goals'
        ]
      });
    }

    // Month-specific recommendations
    switch (currentHijri.month) {
      case 1: // Muharram
        recommendations.push({
          category: 'Muharram Observances',
          recommendations: [
            'Fast on the Day of Ashura (10th)',
            'Fast on 9th and 11th as well (Sunnah)',
            'Reflect on the hijra (migration)',
            'Make fresh spiritual resolutions'
          ]
        });
        break;
        
      case 9: // Ramadan
        recommendations.push({
          category: 'Ramadan Observances',
          recommendations: [
            'Observe daily fasting',
            'Increase Quran recitation',
            'Perform Tarawih prayers',
            'Give Zakat and Sadaqah',
            'Seek Laylat al-Qadr'
          ]
        });
        break;
        
      case 12: // Dhu al-Hijjah
        recommendations.push({
          category: 'Dhu al-Hijjah Observances',
          recommendations: [
            'Fast the first 9 days (especially Day of Arafat)',
            'Increase Takbir and Tahlil',
            'Prepare for Hajj if planning to go',
            'Perform Qurbani (sacrifice) if able'
          ]
        });
        break;
    }

    return recommendations;
  }

  // Get Zakat calculation reminders
  getZakatReminders(): Array<{
    type: string;
    description: string;
    dueDate?: Date;
    amount?: number;
  }> {
    const currentHijri = this.getTodaysHijriDate();
    const reminders: Array<{
      type: string;
      description: string;
      dueDate?: Date;
      amount?: number;
    }> = [];

    // Zakat al-Fitr reminder during Ramadan
    if (currentHijri.month === 9) {
      reminders.push({
        type: 'Zakat al-Fitr',
        description: 'Obligatory charity to be paid before Eid al-Fitr prayer',
        dueDate: this.hijriToGregorian({ day: 30, month: 9, year: currentHijri.year })
      });
    }

    // Annual Zakat reminder
    const yearAnniversary = new Date();
    yearAnniversary.setMonth(0, 1); // January 1st as default - users should customize
    
    reminders.push({
      type: 'Annual Zakat',
      description: 'Calculate and pay annual Zakat on wealth, savings, and investments',
      dueDate: yearAnniversary
    });

    return reminders;
  }

  // Private helper methods
  private gregorianToJulianDay(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const a = Math.floor((14 - month) / 12);
    const y = year - a;
    const m = month + 12 * a - 3;
    
    return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + 1720997;
  }

  private julianDayToHijri(jd: number): { day: number; month: number; year: number } {
    // Simplified Hijri calculation - for production use a proper library
    const islamicEpoch = 1948439.5; // Julian day of Hijri epoch
    const daysSinceEpoch = jd - islamicEpoch;
    
    // Average Islamic year is about 354.367 days
    const islamicYear = Math.floor(daysSinceEpoch / 354.367) + 1;
    
    // Simplified month/day calculation
    const daysInYear = daysSinceEpoch - (islamicYear - 1) * 354.367;
    const month = Math.min(Math.floor(daysInYear / 29.5) + 1, 12);
    const day = Math.max(1, Math.floor(daysInYear - (month - 1) * 29.5));
    
    return { day, month, year: islamicYear };
  }

  private hijriToJulianDay(hijriDate: { day: number; month: number; year: number }): number {
    // Simplified calculation
    const islamicEpoch = 1948439.5;
    const daysFromEpoch = (hijriDate.year - 1) * 354.367 + (hijriDate.month - 1) * 29.5 + hijriDate.day - 1;
    
    return islamicEpoch + daysFromEpoch;
  }

  private julianDayToGregorian(jd: number): Date {
    const a = jd + 32044;
    const b = Math.floor((4 * a + 3) / 146097);
    const c = a - Math.floor((146097 * b) / 4);
    const d = Math.floor((4 * c + 3) / 1461);
    const e = c - Math.floor((1461 * d) / 4);
    const m = Math.floor((5 * e + 2) / 153);
    
    const day = e - Math.floor((153 * m + 2) / 5) + 1;
    const month = m + 3 - 12 * Math.floor(m / 10);
    const year = 100 * b + d - 4800 + Math.floor(m / 10);
    
    return new Date(year, month - 1, day);
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  private initializeHolidays(): void {
    const currentYear = this.getCurrentIslamicYear();
    
    this.holidays = [
      {
        id: 'muharram-1',
        name: 'Islamic New Year',
        nameArabic: 'رأس السنة الهجرية',
        date: { day: 1, month: 1, year: currentYear, monthName: 'Muharram', monthNameArabic: 'محرم', weekday: '', weekdayArabic: '', formatted: '', formattedArabic: '' },
        gregorianDate: new Date(),
        type: 'major',
        description: 'Beginning of the Islamic calendar year',
        significance: 'Commemorates the Hijra (migration) of Prophet Muhammad from Mecca to Medina',
        recommendedActions: ['Reflect on spiritual goals', 'Make du\'a for the new year', 'Increase worship']
      },
      {
        id: 'ashura',
        name: 'Day of Ashura',
        nameArabic: 'يوم عاشوراء',
        date: { day: 10, month: 1, year: currentYear, monthName: 'Muharram', monthNameArabic: 'محرم', weekday: '', weekdayArabic: '', formatted: '', formattedArabic: '' },
        gregorianDate: new Date(),
        type: 'major',
        description: 'Day of fasting commemorating multiple historical events',
        significance: 'Allah saved Prophet Musa (Moses) and the Israelites from Pharaoh',
        recommendedActions: ['Fast this day', 'Fast 9th and 11th as well (Sunnah)', 'Give charity', 'Make du\'a']
      },
      {
        id: 'mawlid',
        name: 'Mawlid an-Nabi',
        nameArabic: 'المولد النبوي',
        date: { day: 12, month: 3, year: currentYear, monthName: 'Rabi\' al-awwal', monthNameArabic: 'ربيع الأول', weekday: '', weekdayArabic: '', formatted: '', formattedArabic: '' },
        gregorianDate: new Date(),
        type: 'major',
        description: 'Birth of Prophet Muhammad (peace be upon him)',
        significance: 'Celebrating the birth of the final messenger',
        recommendedActions: ['Send blessings on the Prophet', 'Learn about his life', 'Increase good deeds']
      },
      {
        id: 'isra-miraj',
        name: 'Isra and Mi\'raj',
        nameArabic: 'الإسراء والمعراج',
        date: { day: 27, month: 7, year: currentYear, monthName: 'Rajab', monthNameArabic: 'رجب', weekday: '', weekdayArabic: '', formatted: '', formattedArabic: '' },
        gregorianDate: new Date(),
        type: 'major',
        description: 'Night Journey and Ascension of Prophet Muhammad',
        significance: 'Miraculous journey from Mecca to Jerusalem and ascension to heavens',
        recommendedActions: ['Perform extra prayers', 'Reflect on the significance', 'Make du\'a']
      },
      {
        id: 'laylat-al-baraat',
        name: 'Laylat al-Bara\'at',
        nameArabic: 'ليلة البراءة',
        date: { day: 15, month: 8, year: currentYear, monthName: 'Sha\'ban', monthNameArabic: 'شعبان', weekday: '', weekdayArabic: '', formatted: '', formattedArabic: '' },
        gregorianDate: new Date(),
        type: 'observance',
        description: 'Night of Forgiveness',
        significance: 'Night when Allah forgives sins and determines destiny for the coming year',
        recommendedActions: ['Stay awake in worship', 'Seek forgiveness', 'Make du\'a', 'Recite Quran']
      },
      {
        id: 'ramadan-start',
        name: 'Start of Ramadan',
        nameArabic: 'بداية رمضان',
        date: { day: 1, month: 9, year: currentYear, monthName: 'Ramadan', monthNameArabic: 'رمضان', weekday: '', weekdayArabic: '', formatted: '', formattedArabic: '' },
        gregorianDate: new Date(),
        type: 'major',
        description: 'Beginning of the holy month of fasting',
        significance: 'Month of fasting, prayer, reflection and community',
        recommendedActions: ['Begin fasting', 'Increase Quran recitation', 'Give charity', 'Perform Tarawih'],
        duration: 30
      },
      {
        id: 'laylat-al-qadr',
        name: 'Laylat al-Qadr',
        nameArabic: 'ليلة القدر',
        date: { day: 27, month: 9, year: currentYear, monthName: 'Ramadan', monthNameArabic: 'رمضان', weekday: '', weekdayArabic: '', formatted: '', formattedArabic: '' },
        gregorianDate: new Date(),
        type: 'major',
        description: 'Night of Power',
        significance: 'Night when the Quran was first revealed, better than a thousand months',
        recommendedActions: ['Stay awake in worship', 'Recite Quran', 'Make intensive du\'a', 'Seek forgiveness']
      },
      {
        id: 'eid-al-fitr',
        name: 'Eid al-Fitr',
        nameArabic: 'عيد الفطر',
        date: { day: 1, month: 10, year: currentYear, monthName: 'Shawwal', monthNameArabic: 'شوال', weekday: '', weekdayArabic: '', formatted: '', formattedArabic: '' },
        gregorianDate: new Date(),
        type: 'major',
        description: 'Festival of Breaking the Fast',
        significance: 'Celebration marking the end of Ramadan',
        recommendedActions: ['Pay Zakat al-Fitr', 'Attend Eid prayer', 'Celebrate with family', 'Give charity'],
        duration: 3
      },
      {
        id: 'hajj-start',
        name: 'Hajj Pilgrimage',
        nameArabic: 'الحج',
        date: { day: 8, month: 12, year: currentYear, monthName: 'Dhu al-Hijjah', monthNameArabic: 'ذو الحجة', weekday: '', weekdayArabic: '', formatted: '', formattedArabic: '' },
        gregorianDate: new Date(),
        type: 'major',
        description: 'Annual pilgrimage to Mecca',
        significance: 'Fifth pillar of Islam, obligatory for those who are able',
        recommendedActions: ['Perform Hajj if able', 'Fast on Day of Arafat', 'Increase Takbir', 'Give charity'],
        duration: 5
      },
      {
        id: 'eid-al-adha',
        name: 'Eid al-Adha',
        nameArabic: 'عيد الأضحى',
        date: { day: 10, month: 12, year: currentYear, monthName: 'Dhu al-Hijjah', monthNameArabic: 'ذو الحجة', weekday: '', weekdayArabic: '', formatted: '', formattedArabic: '' },
        gregorianDate: new Date(),
        type: 'major',
        description: 'Festival of Sacrifice',
        significance: 'Commemorates Prophet Ibrahim\'s willingness to sacrifice his son',
        recommendedActions: ['Attend Eid prayer', 'Perform Qurbani if able', 'Distribute meat to poor', 'Celebrate with family'],
        duration: 4
      }
    ];

    // Update Gregorian dates for all holidays
    this.holidays = this.holidays.map(holiday => ({
      ...holiday,
      gregorianDate: this.hijriToGregorian(holiday.date)
    }));
  }
}

export const islamicCalendarService = new IslamicCalendarService();

export function getIslamicCalendarService(): IslamicCalendarService {
  return islamicCalendarService;
}

// Helper functions for common operations
export const IslamicHelpers = {
  // Check if two dates are the same day
  isSameDay: (date1: Date, date2: Date) => date1.toDateString() === date2.toDateString(),
};