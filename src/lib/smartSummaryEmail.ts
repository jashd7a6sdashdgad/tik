// Smart Email Summary System with AI-powered analysis

export interface EmailSummaryData {
  user: {
    name: string;
    email: string;
    timezone: string;
    language: string;
  };
  period: {
    type: 'daily' | 'weekly';
    date: string;
    dateRange?: string;
  };
  unreadMessages: UnreadMessage[];
  expenses: ExpenseSummary;
  weather: WeatherData;
  tasks: TaskSummary;
  goals: GoalProgress[];
  budgetAlerts: BudgetAlert[];
  insights: string[];
}

export interface UnreadMessage {
  id: string;
  subject: string;
  sender: string;
  preview: string;
  receivedAt: string;
  priority: 'high' | 'medium' | 'low';
  category: 'email' | 'sms' | 'notification';
}

export interface ExpenseSummary {
  totalSpent: number;
  topExpenses: {
    description: string;
    amount: number;
    category: string;
    date: string;
  }[];
  categoryBreakdown: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  comparedToPrevious: {
    amount: number;
    percentage: number;
    trend: 'up' | 'down' | 'same';
  };
}

export interface WeatherData {
  current: {
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    icon: string;
  };
  forecast: {
    date: string;
    high: number;
    low: number;
    condition: string;
    icon: string;
  }[];
  alerts?: string[];
}

export interface TaskSummary {
  completed: number;
  pending: number;
  overdue: number;
  upcoming: {
    title: string;
    dueDate: string;
    priority: string;
  }[];
  recentlyCompleted: {
    title: string;
    completedAt: string;
  }[];
}

export interface GoalProgress {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  percentage: number;
  deadline?: string;
  status: 'on_track' | 'behind' | 'completed' | 'overdue';
}

export interface BudgetAlert {
  category: string;
  message: string;
  severity: 'info' | 'warning' | 'danger';
  amount?: number;
}

class SmartSummaryEmailService {
  private formatCurrency(amount: number): string {
    return `${amount.toFixed(2)} OMR`;
  }

  private getGreeting(hour: number): string {
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  private async fetchUnreadMessages(): Promise<UnreadMessage[]> {
    // Mock data - in real implementation, this would fetch from email/SMS APIs
    return [
      {
        id: '1',
        subject: 'Monthly bank statement available',
        sender: 'Bank of Oman',
        preview: 'Your monthly statement for December is now available for download...',
        receivedAt: new Date(Date.now() - 3600000).toISOString(),
        priority: 'medium',
        category: 'email'
      },
      {
        id: '2',
        subject: 'Meeting reminder: Team standup',
        sender: 'Calendar App',
        preview: 'Your meeting "Team standup" is starting in 30 minutes...',
        receivedAt: new Date(Date.now() - 1800000).toISOString(),
        priority: 'high',
        category: 'notification'
      },
      {
        id: '3',
        subject: 'Special offer: 20% off dining',
        sender: 'Foodora',
        preview: 'Get 20% off your next order at participating restaurants...',
        receivedAt: new Date(Date.now() - 7200000).toISOString(),
        priority: 'low',
        category: 'email'
      }
    ];
  }

  private async fetchExpenseSummary(period: 'daily' | 'weekly'): Promise<ExpenseSummary> {
    // Mock expense data - would fetch from actual expense API
    const mockExpenses = [
      { description: 'Lunch at restaurant', amount: 15.50, category: 'Food', date: new Date().toISOString() },
      { description: 'Taxi to airport', amount: 25.00, category: 'Transportation', date: new Date(Date.now() - 86400000).toISOString() },
      { description: 'Office supplies', amount: 120.75, category: 'Business', date: new Date(Date.now() - 172800000).toISOString() },
      { description: 'Grocery shopping', amount: 45.20, category: 'Food', date: new Date(Date.now() - 259200000).toISOString() },
      { description: 'Movie tickets', amount: 18.00, category: 'Entertainment', date: new Date(Date.now() - 345600000).toISOString() }
    ];

    const totalSpent = mockExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Category breakdown
    const categoryTotals: Record<string, number> = {};
    mockExpenses.forEach(exp => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    const categoryBreakdown = Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / totalSpent) * 100
    }));

    return {
      totalSpent,
      topExpenses: mockExpenses.slice(0, 3),
      categoryBreakdown,
      comparedToPrevious: {
        amount: 15.30,
        percentage: 12.5,
        trend: 'up' as const
      }
    };
  }

  private async fetchWeatherData(): Promise<WeatherData> {
    // Mock weather data - would fetch from weather API
    return {
      current: {
        temperature: 28,
        condition: 'Sunny',
        humidity: 45,
        windSpeed: 12,
        icon: '☀️'
      },
      forecast: [
        { date: 'Today', high: 32, low: 22, condition: 'Sunny', icon: '☀️' },
        { date: 'Tomorrow', high: 30, low: 20, condition: 'Partly Cloudy', icon: '⛅' },
        { date: 'Wednesday', high: 28, low: 18, condition: 'Cloudy', icon: '☁️' }
      ]
    };
  }

  private async fetchTaskSummary(): Promise<TaskSummary> {
    // Mock task data - would fetch from task management system
    return {
      completed: 3,
      pending: 5,
      overdue: 1,
      upcoming: [
        { title: 'Submit expense report', dueDate: 'Today 5:00 PM', priority: 'high' },
        { title: 'Review budget analysis', dueDate: 'Tomorrow 10:00 AM', priority: 'medium' },
        { title: 'Call insurance company', dueDate: 'Wednesday 2:00 PM', priority: 'low' }
      ],
      recentlyCompleted: [
        { title: 'Update project documentation', completedAt: '2 hours ago' },
        { title: 'Send client proposal', completedAt: 'Yesterday 3:30 PM' }
      ]
    };
  }

  private async fetchGoalProgress(): Promise<GoalProgress[]> {
    return [
      {
        id: '1',
        title: 'Emergency Fund',
        currentValue: 1500,
        targetValue: 4300,
        percentage: 35,
        deadline: '2024-12-31',
        status: 'on_track'
      },
      {
        id: '2',
        title: 'Monthly Savings',
        currentValue: 450,
        targetValue: 500,
        percentage: 90,
        status: 'on_track'
      },
      {
        id: '3',
        title: 'Exercise Goal',
        currentValue: 15,
        targetValue: 20,
        percentage: 75,
        status: 'behind'
      }
    ];
  }

  private async fetchBudgetAlerts(): Promise<BudgetAlert[]> {
    return [
      {
        category: 'Food',
        message: 'You\'re 15% over your weekly food budget',
        severity: 'warning',
        amount: 22.50
      },
      {
        category: 'Transportation',
        message: 'Great job staying under your transport budget this week!',
        severity: 'info'
      }
    ];
  }

  private generateInsights(data: Partial<EmailSummaryData>): string[] {
    const insights: string[] = [];

    // Budget insights
    if (data.expenses?.comparedToPrevious.trend === 'up') {
      insights.push(`💡 Your spending increased by ${data.expenses.comparedToPrevious.percentage.toFixed(1)}% this week. Consider reviewing your top expense categories.`);
    } else if (data.expenses?.comparedToPrevious.trend === 'down') {
      insights.push(`✅ Great job! Your spending decreased by ${Math.abs(data.expenses.comparedToPrevious.percentage).toFixed(1)}% compared to last week.`);
    }

    // Task insights
    if (data.tasks?.overdue && data.tasks.overdue > 0) {
      insights.push(`⚠️ You have ${data.tasks.overdue} overdue task${data.tasks.overdue > 1 ? 's' : ''}. Consider prioritizing these today.`);
    }

    if (data.tasks?.completed && data.tasks.completed > 0) {
      insights.push(`🎉 You completed ${data.tasks.completed} task${data.tasks.completed > 1 ? 's' : ''} recently. Keep up the momentum!`);
    }

    // Weather insights
    if (data.weather?.current.temperature && data.weather.current.temperature > 35) {
      insights.push(`🌡️ It's going to be hot today (${data.weather.current.temperature}°C). Stay hydrated and avoid outdoor activities during peak hours.`);
    }

    // Goal insights
    const completedGoals = data.goals?.filter(goal => goal.status === 'completed').length || 0;
    if (completedGoals > 0) {
      insights.push(`🏆 Congratulations! You've completed ${completedGoals} goal${completedGoals > 1 ? 's' : ''} recently.`);
    }

    const behindGoals = data.goals?.filter(goal => goal.status === 'behind').length || 0;
    if (behindGoals > 0) {
      insights.push(`📊 ${behindGoals} goal${behindGoals > 1 ? 's are' : ' is'} falling behind schedule. Consider adjusting your approach or timeline.`);
    }

    return insights.length > 0 ? insights : ['🌟 Everything looks good! Keep up your great habits.'];
  }

  public async generateSummaryData(
    type: 'daily' | 'weekly',
    userData: { name: string; email: string; timezone: string; language: string }
  ): Promise<EmailSummaryData> {
    const [unreadMessages, expenses, weather, tasks, goals, budgetAlerts] = await Promise.all([
      this.fetchUnreadMessages(),
      this.fetchExpenseSummary(type),
      this.fetchWeatherData(),
      this.fetchTaskSummary(),
      this.fetchGoalProgress(),
      this.fetchBudgetAlerts()
    ]);

    const summaryData: EmailSummaryData = {
      user: userData,
      period: {
        type,
        date: new Date().toLocaleDateString(),
        dateRange: type === 'weekly' 
          ? `${new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toLocaleDateString()} - ${new Date().toLocaleDateString()}`
          : undefined
      },
      unreadMessages,
      expenses,
      weather,
      tasks,
      goals,
      budgetAlerts,
      insights: []
    };

    // Generate insights based on the collected data
    summaryData.insights = this.generateInsights(summaryData);

    return summaryData;
  }

  public generateEmailHTML(data: EmailSummaryData): string {
    const hour = new Date().getHours();
    const greeting = this.getGreeting(hour);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.period.type === 'daily' ? 'Daily' : 'Weekly'} Summary - Mahboob Personal Assistant</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background: linear-gradient(135deg, #3D74B6 0%, #2563eb 100%); color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { padding: 0; }
    .section { margin: 0; padding: 20px; border-bottom: 1px solid #eee; }
    .section:last-child { border-bottom: none; }
    .section-title { font-size: 18px; font-weight: 600; margin: 0 0 15px; color: #333; display: flex; align-items: center; gap: 10px; }
    .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin: 15px 0; }
    .metric-card { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px; }
    .metric-value { font-size: 24px; font-weight: bold; color: #3D74B6; margin-bottom: 5px; }
    .metric-label { font-size: 12px; color: #666; }
    .expense-item, .task-item, .message-item, .goal-item { padding: 10px; margin: 5px 0; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #3D74B6; }
    .expense-amount { float: right; font-weight: bold; color: #dc3545; }
    .task-priority-high { border-left-color: #dc3545; }
    .task-priority-medium { border-left-color: #ffc107; }
    .task-priority-low { border-left-color: #28a745; }
    .message-priority-high { border-left-color: #dc3545; background: #fff5f5; }
    .goal-progress { background: #e9ecef; height: 8px; border-radius: 4px; margin: 8px 0; }
    .goal-progress-bar { background: #28a745; height: 100%; border-radius: 4px; transition: width 0.3s ease; }
    .alert-warning { background: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 12px; border-radius: 6px; margin: 8px 0; }
    .alert-info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 12px; border-radius: 6px; margin: 8px 0; }
    .alert-danger { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 12px; border-radius: 6px; margin: 8px 0; }
    .weather-current { text-align: center; padding: 20px; background: linear-gradient(135deg, #87CEEB 0%, #4682B4 100%); color: white; border-radius: 10px; margin: 10px 0; }
    .weather-temp { font-size: 36px; font-weight: bold; margin: 10px 0; }
    .forecast-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 15px; }
    .forecast-day { text-align: center; padding: 10px; background: #f8f9fa; border-radius: 6px; }
    .insight-item { padding: 12px; margin: 8px 0; background: #e8f4fd; border-left: 3px solid #3D74B6; border-radius: 6px; }
    .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
    .footer a { color: #3D74B6; text-decoration: none; }
    @media (max-width: 600px) {
      .metric-grid { grid-template-columns: repeat(2, 1fr); }
      .forecast-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🤖 ${greeting}, ${data.user.name}!</h1>
      <p>Your ${data.period.type} summary for ${data.period.type === 'weekly' ? data.period.dateRange : data.period.date}</p>
    </div>

    <div class="content">
      <!-- Quick Overview -->
      <div class="section">
        <h2 class="section-title">📊 Quick Overview</h2>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-value">${data.unreadMessages.length}</div>
            <div class="metric-label">Unread Messages</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${this.formatCurrency(data.expenses.totalSpent)}</div>
            <div class="metric-label">Total Spent</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${data.tasks.pending}</div>
            <div class="metric-label">Pending Tasks</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${data.weather.current.temperature}°C</div>
            <div class="metric-label">Current Temp</div>
          </div>
        </div>
      </div>

      <!-- Unread Messages -->
      ${data.unreadMessages.length > 0 ? `
      <div class="section">
        <h2 class="section-title">📧 Unread Messages (${data.unreadMessages.length})</h2>
        ${data.unreadMessages.slice(0, 5).map(msg => `
          <div class="message-item ${msg.priority === 'high' ? 'message-priority-high' : ''}">
            <strong>${msg.subject}</strong>
            <br><small>From: ${msg.sender} • ${new Date(msg.receivedAt).toLocaleString()}</small>
            <br><span style="color: #666;">${msg.preview}</span>
          </div>
        `).join('')}
        ${data.unreadMessages.length > 5 ? `<p><small>And ${data.unreadMessages.length - 5} more messages...</small></p>` : ''}
      </div>
      ` : ''}

      <!-- Expenses -->
      <div class="section">
        <h2 class="section-title">💰 Expenses Summary</h2>
        <div style="margin: 15px 0;">
          <strong>Total Spent: ${this.formatCurrency(data.expenses.totalSpent)}</strong>
          <span style="color: ${data.expenses.comparedToPrevious.trend === 'up' ? '#dc3545' : '#28a745'}; margin-left: 10px;">
            ${data.expenses.comparedToPrevious.trend === 'up' ? '↗️' : '↘️'} 
            ${data.expenses.comparedToPrevious.percentage.toFixed(1)}% vs last ${data.period.type === 'daily' ? 'day' : 'week'}
          </span>
        </div>

        <h3 style="margin: 20px 0 10px;">Top Expenses</h3>
        ${data.expenses.topExpenses.map(exp => `
          <div class="expense-item">
            ${exp.description}
            <span class="expense-amount">${this.formatCurrency(exp.amount)}</span>
            <br><small style="color: #666;">${exp.category} • ${new Date(exp.date).toLocaleDateString()}</small>
          </div>
        `).join('')}

        <h3 style="margin: 20px 0 10px;">Category Breakdown</h3>
        ${data.expenses.categoryBreakdown.map(cat => `
          <div style="margin: 8px 0;">
            <div style="display: flex; justify-content: space-between;">
              <span>${cat.category}</span>
              <span>${this.formatCurrency(cat.amount)} (${cat.percentage.toFixed(1)}%)</span>
            </div>
            <div style="background: #e9ecef; height: 6px; border-radius: 3px; margin-top: 4px;">
              <div style="background: #3D74B6; width: ${cat.percentage}%; height: 100%; border-radius: 3px;"></div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Weather -->
      <div class="section">
        <h2 class="section-title">🌤️ Weather</h2>
        <div class="weather-current">
          <div style="font-size: 48px;">${data.weather.current.icon}</div>
          <div class="weather-temp">${data.weather.current.temperature}°C</div>
          <div>${data.weather.current.condition}</div>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 10px;">
            Humidity: ${data.weather.current.humidity}% • Wind: ${data.weather.current.windSpeed} km/h
          </div>
        </div>

        <div class="forecast-grid">
          ${data.weather.forecast.map(day => `
            <div class="forecast-day">
              <div style="font-size: 24px;">${day.icon}</div>
              <div style="font-weight: bold; margin: 5px 0;">${day.date}</div>
              <div>${day.high}°/${day.low}°</div>
              <div style="font-size: 12px; color: #666;">${day.condition}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Tasks -->
      <div class="section">
        <h2 class="section-title">✅ Tasks Overview</h2>
        <div class="metric-grid" style="margin-bottom: 20px;">
          <div class="metric-card">
            <div class="metric-value" style="color: #28a745;">${data.tasks.completed}</div>
            <div class="metric-label">Completed</div>
          </div>
          <div class="metric-card">
            <div class="metric-value" style="color: #ffc107;">${data.tasks.pending}</div>
            <div class="metric-label">Pending</div>
          </div>
          <div class="metric-card">
            <div class="metric-value" style="color: #dc3545;">${data.tasks.overdue}</div>
            <div class="metric-label">Overdue</div>
          </div>
        </div>

        ${data.tasks.upcoming.length > 0 ? `
          <h3 style="margin: 20px 0 10px;">Upcoming Tasks</h3>
          ${data.tasks.upcoming.map(task => `
            <div class="task-item task-priority-${task.priority}">
              <strong>${task.title}</strong>
              <br><small>Due: ${task.dueDate}</small>
            </div>
          `).join('')}
        ` : ''}

        ${data.tasks.recentlyCompleted.length > 0 ? `
          <h3 style="margin: 20px 0 10px;">Recently Completed</h3>
          ${data.tasks.recentlyCompleted.map(task => `
            <div class="task-item" style="border-left-color: #28a745; background: #f8fff8;">
              <strong>✅ ${task.title}</strong>
              <br><small>Completed: ${task.completedAt}</small>
            </div>
          `).join('')}
        ` : ''}
      </div>

      <!-- Goals -->
      ${data.goals.length > 0 ? `
      <div class="section">
        <h2 class="section-title">🎯 Goal Progress</h2>
        ${data.goals.map(goal => `
          <div class="goal-item">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong>${goal.title}</strong>
              <span style="color: ${goal.status === 'completed' ? '#28a745' : goal.status === 'on_track' ? '#3D74B6' : '#dc3545'};">
                ${goal.percentage}%
              </span>
            </div>
            <div class="goal-progress">
              <div class="goal-progress-bar" style="width: ${goal.percentage}%;"></div>
            </div>
            <small style="color: #666;">
              ${goal.currentValue} / ${goal.targetValue} 
              ${goal.deadline ? `• Deadline: ${new Date(goal.deadline).toLocaleDateString()}` : ''}
            </small>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <!-- Budget Alerts -->
      ${data.budgetAlerts.length > 0 ? `
      <div class="section">
        <h2 class="section-title">💡 Budget Alerts</h2>
        ${data.budgetAlerts.map(alert => `
          <div class="alert-${alert.severity}">
            <strong>${alert.category}:</strong> ${alert.message}
            ${alert.amount ? `<br><small>Amount: ${this.formatCurrency(alert.amount)}</small>` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}

      <!-- Insights -->
      <div class="section">
        <h2 class="section-title">🔍 Smart Insights</h2>
        ${data.insights.map(insight => `
          <div class="insight-item">${insight}</div>
        `).join('')}
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>This summary was generated by your Mahboob Personal Assistant</p>
      <p>
        <a href="http://localhost:3000/dashboard">Open Dashboard</a> • 
        <a href="http://localhost:3000/settings">Update Preferences</a>
      </p>
      <p style="margin-top: 15px; opacity: 0.7;">
        Generated on ${new Date().toLocaleString()} • ${data.user.timezone}
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  public generatePlainTextSummary(data: EmailSummaryData): string {
    const hour = new Date().getHours();
    const greeting = this.getGreeting(hour);
    
    return `
${greeting}, ${data.user.name}!

Your ${data.period.type} summary for ${data.period.type === 'weekly' ? data.period.dateRange : data.period.date}

QUICK OVERVIEW
==============
• Unread Messages: ${data.unreadMessages.length}
• Total Spent: ${this.formatCurrency(data.expenses.totalSpent)}
• Pending Tasks: ${data.tasks.pending}
• Current Temperature: ${data.weather.current.temperature}°C

${data.unreadMessages.length > 0 ? `
UNREAD MESSAGES (${data.unreadMessages.length})
===============
${data.unreadMessages.slice(0, 5).map(msg => 
  `• ${msg.subject} - ${msg.sender}\n  ${msg.preview}\n  ${new Date(msg.receivedAt).toLocaleString()}`
).join('\n\n')}
${data.unreadMessages.length > 5 ? `\n... and ${data.unreadMessages.length - 5} more messages` : ''}
` : ''}

EXPENSES SUMMARY
================
Total Spent: ${this.formatCurrency(data.expenses.totalSpent)}
${data.expenses.comparedToPrevious.trend === 'up' ? '↗️' : '↘️'} ${data.expenses.comparedToPrevious.percentage.toFixed(1)}% vs last ${data.period.type === 'daily' ? 'day' : 'week'}

Top Expenses:
${data.expenses.topExpenses.map(exp => 
  `• ${exp.description}: ${this.formatCurrency(exp.amount)} (${exp.category})`
).join('\n')}

Category Breakdown:
${data.expenses.categoryBreakdown.map(cat =>
  `• ${cat.category}: ${this.formatCurrency(cat.amount)} (${cat.percentage.toFixed(1)}%)`
).join('\n')}

WEATHER
=======
Current: ${data.weather.current.temperature}°C, ${data.weather.current.condition}
Humidity: ${data.weather.current.humidity}% • Wind: ${data.weather.current.windSpeed} km/h

Forecast:
${data.weather.forecast.map(day =>
  `• ${day.date}: ${day.high}°/${day.low}° - ${day.condition}`
).join('\n')}

TASKS OVERVIEW
==============
• Completed: ${data.tasks.completed}
• Pending: ${data.tasks.pending}
• Overdue: ${data.tasks.overdue}

${data.tasks.upcoming.length > 0 ? `
Upcoming Tasks:
${data.tasks.upcoming.map(task => `• ${task.title} - Due: ${task.dueDate}`).join('\n')}
` : ''}

${data.tasks.recentlyCompleted.length > 0 ? `
Recently Completed:
${data.tasks.recentlyCompleted.map(task => `✅ ${task.title} - ${task.completedAt}`).join('\n')}
` : ''}

${data.goals.length > 0 ? `
GOAL PROGRESS
=============
${data.goals.map(goal =>
  `• ${goal.title}: ${goal.percentage}% (${goal.currentValue}/${goal.targetValue})`
).join('\n')}
` : ''}

${data.budgetAlerts.length > 0 ? `
BUDGET ALERTS
=============
${data.budgetAlerts.map(alert => `• ${alert.category}: ${alert.message}`).join('\n')}
` : ''}

SMART INSIGHTS
==============
${data.insights.map(insight => `• ${insight.replace(/[🎉✅💡⚠️🌟🏆📊🌡️]/g, '')}`).join('\n')}

---
Generated by Mahboob Personal Assistant
${new Date().toLocaleString()} • ${data.user.timezone}
`;
  }
}

export const smartSummaryEmailService = new SmartSummaryEmailService();