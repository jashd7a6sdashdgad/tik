'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { expenseIntelligence, SmartExpense, ExpenseInsight } from '@/lib/expenseIntelligence';
import { receiptProcessor, ReceiptData } from '@/lib/receiptProcessor';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  PieChart,
  BarChart3,
  Upload,
  FileText,
  Camera,
  Zap,
  Target,
  Calendar,
  Tag,
  Brain,
  Eye,
  Wallet
} from 'lucide-react';

interface ExpenseAnalytics {
  totalExpenses: number;
  totalAmount: number;
  categoryBreakdown: Record<string, number>;
  averageExpense: number;
  budgetUtilization: Record<string, { used: number; budget: number; percentage: number }>;
  insights: ExpenseInsight[];
  anomalyCount: number;
  recurringExpenses: number;
}

interface Props {
  expenses: SmartExpense[];
  onRefresh: () => void;
}

export default function ExpenseInsightsDashboard({ expenses, onRefresh }: Props) {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  
  const [analytics, setAnalytics] = useState<ExpenseAnalytics | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<ExpenseInsight | null>(null);
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);

  useEffect(() => {
    if (expenses.length > 0) {
      const smartExpenses = expenseIntelligence.batchClassifyExpenses(expenses);
      const analyticsData = expenseIntelligence.exportExpenseAnalytics(smartExpenses);
      setAnalytics(analyticsData);
    }
  }, [expenses]);

  const handleReceiptUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsProcessingReceipt(true);
    try {
      const fileArray = Array.from(files);
      const processedReceipts = await receiptProcessor.processMultipleReceipts(fileArray);
      setReceipts(prev => [...prev, ...processedReceipts]);
      
      // Convert receipts to expenses and trigger refresh
      const newExpenses = processedReceipts.map(receipt => 
        receiptProcessor.exportReceiptToExpense(receipt)
      );
      
      // Here you would typically save these to your backend
      console.log('New expenses from receipts:', newExpenses);
      onRefresh();
    } catch (error) {
      console.error('Error processing receipts:', error);
    } finally {
      setIsProcessingReceipt(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend': return TrendingUp;
      case 'anomaly': return AlertTriangle;
      case 'saving_opportunity': return Lightbulb;
      case 'budget_alert': return Target;
      case 'recurring_payment': return Calendar;
      default: return Eye;
    }
  };

  const getInsightColor = (impact: string) => {
    switch (impact) {
      case 'positive': return 'text-green-600 bg-green-50 border-green-200';
      case 'negative': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const formatCurrency = (amount: number) => `${amount.toFixed(2)} OMR`;

  if (!analytics) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-20 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Expense Intelligence Dashboard</h2>
          <p className="text-gray-600">AI-powered insights and analytics for your spending</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowReceiptUpload(!showReceiptUpload)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Camera className="h-4 w-4" />
            Upload Receipt
          </Button>
          <Button onClick={onRefresh} className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Analyze Expenses
          </Button>
        </div>
      </div>

      {/* Receipt Upload Section */}
      {showReceiptUpload && (
        <Card className="border-dashed border-2 border-blue-300 bg-blue-50">
          <CardContent className="p-6">
            <div className="text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-blue-600" />
              <h3 className="text-lg font-semibold mb-2">Upload Receipt for AI Processing</h3>
              <p className="text-gray-600 mb-4">
                Upload photos of your receipts and let AI extract expense data automatically
              </p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleReceiptUpload(e.target.files)}
                className="hidden"
                id="receipt-upload"
                disabled={isProcessingReceipt}
              />
              <label
                htmlFor="receipt-upload"
                className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer ${
                  isProcessingReceipt ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isProcessingReceipt ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Choose Receipt Images
                  </>
                )}
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Expenses</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(analytics.totalAmount)}</p>
                <p className="text-xs text-blue-600">{analytics.totalExpenses} transactions</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Average Expense</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(analytics.averageExpense)}</p>
                <p className="text-xs text-green-600">per transaction</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">AI Insights</p>
                <p className="text-2xl font-bold text-yellow-900">{analytics.insights.length}</p>
                <p className="text-xs text-yellow-600">recommendations</p>
              </div>
              <Brain className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Anomalies Detected</p>
                <p className="text-2xl font-bold text-purple-900">{analytics.anomalyCount}</p>
                <p className="text-xs text-purple-600">unusual expenses</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Utilization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Budget Utilization
          </CardTitle>
          <CardDescription>Track spending against budget limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(analytics.budgetUtilization).map(([category, data]) => (
              <div key={category} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">{category}</span>
                  <span className="text-sm text-gray-600">
                    {formatCurrency(data.used)} / {formatCurrency(data.budget)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      data.percentage > 100
                        ? 'bg-red-500'
                        : data.percentage > 80
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(data.percentage, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className={`font-medium ${
                    data.percentage > 100
                      ? 'text-red-600'
                      : data.percentage > 80
                      ? 'text-yellow-600'
                      : 'text-green-600'
                  }`}>
                    {data.percentage.toFixed(1)}% used
                  </span>
                  {data.percentage > 100 && (
                    <span className="text-red-600 font-medium">
                      Over budget by {formatCurrency(data.used - data.budget)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              AI Insights & Recommendations
            </CardTitle>
            <CardDescription>Smart analysis of your spending patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.insights.slice(0, 5).map((insight, index) => {
                const IconComponent = getInsightIcon(insight.type);
                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${getInsightColor(insight.impact)}`}
                    onClick={() => setSelectedInsight(insight)}
                  >
                    <div className="flex items-start gap-3">
                      <IconComponent className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{insight.title}</h4>
                        <p className="text-xs mt-1 opacity-90">{insight.description}</p>
                        {insight.suggestedAction && (
                          <p className="text-xs mt-2 font-medium">
                            💡 {insight.suggestedAction}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs opacity-75">
                            Confidence: {Math.round(insight.confidence * 100)}%
                          </span>
                          {insight.actionable && (
                            <span className="text-xs bg-white bg-opacity-50 px-2 py-0.5 rounded-full">
                              Actionable
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Spending by Category
            </CardTitle>
            <CardDescription>Distribution of expenses across categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.categoryBreakdown)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8)
                .map(([category, amount]) => {
                  const percentage = (amount / analytics.totalAmount) * 100;
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-900">{category}</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {formatCurrency(amount)} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Processed Receipts */}
      {receipts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Processed Receipts
            </CardTitle>
            <CardDescription>
              AI-extracted data from uploaded receipt images
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {receipts.slice(0, 6).map((receipt) => (
                <div key={receipt.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">
                      {receipt.merchantName || 'Unknown Merchant'}
                    </span>
                    <span className="text-lg font-bold text-green-600">
                      {formatCurrency(receipt.total || 0)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Date: {receipt.date?.toLocaleDateString() || 'N/A'}</p>
                    <p>Category: {receipt.category || 'General'}</p>
                    <p>Confidence: {Math.round((receipt.confidence || 0) * 100)}%</p>
                    {receipt.items && (
                      <p>Items: {receipt.items.length} detected</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Insight Modal */}
      {selectedInsight && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {React.createElement(getInsightIcon(selectedInsight.type), { className: "h-5 w-5" })}
                  {selectedInsight.title}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedInsight(null)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-700">{selectedInsight.description}</p>
                
                {selectedInsight.suggestedAction && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h4 className="font-semibold text-blue-900 mb-1">Recommended Action</h4>
                    <p className="text-blue-800 text-sm">{selectedInsight.suggestedAction}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Type: {selectedInsight.type.replace('_', ' ')}</span>
                  <span>Confidence: {Math.round(selectedInsight.confidence * 100)}%</span>
                </div>

                {selectedInsight.data && (
                  <div className="bg-gray-50 border rounded-lg p-3">
                    <h4 className="font-semibold text-gray-900 mb-2">Additional Data</h4>
                    <pre className="text-xs text-gray-700 overflow-auto">
                      {JSON.stringify(selectedInsight.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}