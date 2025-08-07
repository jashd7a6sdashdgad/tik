'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Target,
  DollarSign,
  PieChart,
  BarChart3,
  Brain,
  Lightbulb,
  Eye,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Calendar,
  Zap
} from 'lucide-react';
import { budgetAdvisor, BudgetAnalysis, BudgetRecommendation, CategoryAnalysis } from '@/lib/budgetAdvisor';

interface BudgetAdvisorDashboardProps {
  expenses: any[];
  onRefresh?: () => void;
}

const BudgetAdvisorDashboard: React.FC<BudgetAdvisorDashboardProps> = ({ expenses, onRefresh }) => {
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'recommendations' | 'trends' | 'insights'>('overview');

  useEffect(() => {
    if (expenses && expenses.length > 0) {
      const budgetAnalysis = budgetAdvisor.analyzeWeeklyBudget(expenses);
      setAnalysis(budgetAnalysis);
    }
  }, [expenses]);

  if (!analysis) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Loading budget analysis...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (trend: string, percentage: number) => {
    if (trend === 'increasing') return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (trend === 'decreasing') return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'cut': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'increase': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'maintain': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'reallocate': return <Target className="h-4 w-4 text-purple-500" />;
      default: return <Brain className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatCurrency = (amount: number) => `${amount.toFixed(2)} OMR`;

  return (
    <div className="space-y-6">
      {/* Header with Score and Quick Stats */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                Auto Budget Advisor
              </CardTitle>
              <CardDescription>
                AI-powered weekly spending analysis and recommendations
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(analysis.score.overall)}`}>
                Score: {analysis.score.overall}/100
              </div>
              <Button onClick={onRefresh} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(analysis.totalSpent)}</p>
              <p className="text-sm text-gray-600">This Week</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <BarChart3 className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{formatCurrency(analysis.weeklyAverage)}</p>
              <p className="text-sm text-gray-600">Weekly Average</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(analysis.monthlyProjection)}</p>
              <p className="text-sm text-gray-600">Monthly Projection</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Target className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-600">{analysis.recommendations.length}</p>
              <p className="text-sm text-gray-600">Recommendations</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {analysis.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Budget Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.alerts.map((alert, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border ${
                    alert.type === 'danger' ? 'bg-red-50 border-red-200' :
                    alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                    alert.type === 'success' ? 'bg-green-50 border-green-200' :
                    'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className={`text-sm ${
                        alert.type === 'danger' ? 'text-red-800' :
                        alert.type === 'warning' ? 'text-yellow-800' :
                        alert.type === 'success' ? 'text-green-800' :
                        'text-blue-800'
                      }`}>
                        {alert.message}
                      </p>
                      {alert.category && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {alert.category}
                        </Badge>
                      )}
                    </div>
                    {alert.actionRequired && (
                      <Badge 
                        variant={alert.severity === 'high' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        Action Required
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation */}
      <Card>
        <CardHeader>
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'overview', label: 'Overview', icon: PieChart },
              { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
              { id: 'trends', label: 'Trends', icon: TrendingUp },
              { id: 'insights', label: 'Insights', icon: Eye }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
                <div className="space-y-3">
                  {analysis.categoryBreakdown.map((category) => (
                    <div key={category.category} className="p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{category.category}</span>
                          {getTrendIcon(category.trend, category.trendPercentage)}
                          <span className={`text-sm ${
                            category.trend === 'increasing' ? 'text-red-600' :
                            category.trend === 'decreasing' ? 'text-green-600' :
                            'text-gray-600'
                          }`}>
                            {category.trendPercentage > 0 ? '+' : ''}{category.trendPercentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(category.currentSpending)}</p>
                          <p className="text-sm text-gray-600">{category.percentageOfTotal.toFixed(1)}% of total</p>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className={`h-2 rounded-full ${
                            category.isOverBudget ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(category.percentageOfTotal, 100)}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Budget: {category.budgetLimit ? formatCurrency(category.budgetLimit) : 'Not set'}</span>
                        <span>Projected: {formatCurrency(category.projectedMonthlySpend)}/month</span>
                        {category.isOverBudget && (
                          <Badge variant="destructive" className="text-xs">Over Budget</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Budget Score Breakdown */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Budget Health Score</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(analysis.score.factors).map(([factor, score]) => (
                    <div key={factor} className="text-center p-3 border rounded-lg">
                      <p className={`text-2xl font-bold ${getScoreColor(score).split(' ')[0]}`}>
                        {score}
                      </p>
                      <p className="text-sm text-gray-600 capitalize">
                        {factor.replace('_', ' ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recommendations Tab */}
          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Weekly Budget Recommendations</h3>
              {analysis.recommendations.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">Great job! Your budget is well-balanced.</p>
                  <p className="text-sm text-gray-500">Keep up your current spending habits.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analysis.recommendations.map((recommendation, index) => (
                    <div key={index} className={`p-4 border rounded-lg ${
                      recommendation.impact === 'high' ? 'border-red-200 bg-red-50' :
                      recommendation.impact === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                      'border-green-200 bg-green-50'
                    }`}>
                      <div className="flex items-start gap-3 mb-3">
                        {getRecommendationIcon(recommendation.type)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold capitalize">
                              {recommendation.type} - {recommendation.category}
                            </h4>
                            <div className="flex items-center gap-2">
                              <Badge variant={recommendation.impact === 'high' ? 'destructive' : 'secondary'}>
                                {recommendation.impact} impact
                              </Badge>
                              <Badge variant="outline">
                                Priority #{recommendation.priority}
                              </Badge>
                            </div>
                          </div>
                          
                          <p className="text-gray-700 mb-3">{recommendation.reasoning}</p>
                          
                          <div className="flex items-center gap-4 mb-3 text-sm">
                            <span>Current: <strong>{formatCurrency(recommendation.currentAmount)}</strong></span>
                            {recommendation.type !== 'maintain' && (
                              <>
                                <ArrowDown className="h-4 w-4 text-gray-400" />
                                <span>Suggested: <strong>{formatCurrency(recommendation.suggestedAmount)}</strong></span>
                                <span className={`font-medium ${
                                  recommendation.suggestedAmount < recommendation.currentAmount 
                                    ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  ({recommendation.suggestedAmount < recommendation.currentAmount ? '-' : '+'}
                                  {formatCurrency(Math.abs(recommendation.suggestedAmount - recommendation.currentAmount))})
                                </span>
                              </>
                            )}
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium mb-2">Action Items:</p>
                            <ul className="text-sm space-y-1">
                              {recommendation.actionItems.map((item, itemIndex) => (
                                <li key={itemIndex} className="flex items-start gap-2">
                                  <span className="text-blue-500 mt-1">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Trends Tab */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Spending Trends (Last 4 Weeks)</h3>
              <div className="space-y-4">
                {analysis.trends.map((trend, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{trend.period}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold">{formatCurrency(trend.totalSpending)}</span>
                        <div className="flex items-center gap-1">
                          {trend.trend === 'up' && <ArrowUp className="h-4 w-4 text-red-500" />}
                          {trend.trend === 'down' && <ArrowDown className="h-4 w-4 text-green-500" />}
                          {trend.trend === 'stable' && <Minus className="h-4 w-4 text-gray-400" />}
                          <span className={`text-sm ${
                            trend.trend === 'up' ? 'text-red-600' :
                            trend.trend === 'down' ? 'text-green-600' :
                            'text-gray-600'
                          }`}>
                            {Math.abs(trend.trendPercentage).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {Object.entries(trend.categorySpending).map(([category, amount]) => (
                        <div key={category} className="text-sm">
                          <span className="text-gray-600">{category}:</span>
                          <span className="font-medium ml-1">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights Tab */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Weekly Insights</h3>
              <div className="space-y-4">
                {budgetAdvisor.getWeeklyInsights(expenses).map((insight, index) => (
                  <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800">{insight}</p>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-semibold mb-3">Category Performance</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(analysis.score.categoryScores).map(([category, score]) => (
                    <div key={category} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{category}</span>
                        <span className={`px-2 py-1 rounded text-sm ${getScoreColor(score)}`}>
                          {score}/100
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetAdvisorDashboard;