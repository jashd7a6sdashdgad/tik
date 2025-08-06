'use client';

import { useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
import ImageUpload from './ImageUpload';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon } from 'lucide-react';

export default function AddExpenseForm({ onAdded }: { onAdded: () => void }) {
  const { language } = useSettings();
  const { t } = useTranslation(language);
  
  const [from, setFrom] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [debitAmount, setDebitAmount] = useState('');
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');
  const [availableBalance, setAvailableBalance] = useState('');
  const [id, setId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [receiptImage, setReceiptImage] = useState<{
    file: File;
    previewUrl: string;
    fileName: string;
  } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [processingOCR, setProcessingOCR] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const categories = [
    { key: 'food', value: 'Food' },
    { key: 'transportation', value: 'Transportation' },
    { key: 'business', value: 'Business' },
    { key: 'medical', value: 'Medical' },
    { key: 'entertainment', value: 'Entertainment' },
    { key: 'shopping', value: 'Shopping' },
    { key: 'utilities', value: 'Utilities' },
    { key: 'travel', value: 'Travel' },
    { key: 'education', value: 'Education' },
    { key: 'general', value: 'General' }
  ];

  // Handle image selection and OCR processing via optimized base64 data
  const handleImageSelected = async (base64: string, mimeType: string, fileName: string) => {
    console.log('🖼️ Processing image:', { fileName, mimeType, base64Length: base64.length });
    
    // Ensure base64 string is properly formatted
    let cleanBase64 = base64;
    if (!base64.startsWith('data:')) {
      cleanBase64 = `data:${mimeType};base64,${base64}`;
    }
    
    // Extract and validate base64 data
    let base64Data: string;
    try {
      base64Data = cleanBase64.split(',')[1];
      if (!base64Data || base64Data.length === 0) {
        throw new Error('Invalid base64 format - no data found');
      }
      
      // Validate base64 string
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
        throw new Error('Invalid base64 characters detected');
      }
      
      // Test base64 decoding
      const testDecode = atob(base64Data.slice(0, 100)); // Test first 100 chars
      console.log('✅ Base64 validation successful, decoded length:', testDecode.length);
      
    } catch (validationError) {
      console.error('❌ Base64 validation failed:', validationError);
      setImageError('Invalid image format. Please try a different image.');
      setProcessingOCR(false);
      return;
    }
    
    // Convert to File for local preview
    try {
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const file = new File([byteArray], fileName, { type: mimeType });
    
      setReceiptImage({ 
        file, 
        previewUrl: cleanBase64, 
        fileName 
      });
      setImageError(null);
      setProcessingOCR(true);
      
      console.log('📤 Sending image to N8n for OCR processing...', {
        fileName,
        mimeType,
        base64Length: base64Data.length,
        fileSizeKB: Math.round(byteArray.length / 1024)
      });
    
    // Send data to N8n for OCR processing with improved error handling
    try {
      let result;
      
      // Use optimized base64 method with proper formatting
      const response = await fetch('/api/n8n/webhook', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          type: 'expense_ocr',
          action: 'extract_data',
          data: {
            image: base64Data, // Send clean base64 without data URL prefix
            imageBase64: base64Data, // Alternative field name for compatibility
            fileName: fileName,
            mimeType: mimeType,
            fileSize: byteArray.length,
            timestamp: new Date().toISOString(),
            context: 'expense_receipt_ocr',
            autoFill: true,
            // OCR prompt for AI processing
            prompt: `What's in this image? and get all of these parameters please

Please fill in description and either credit or debit amount

Source,
Credit Amount or
Debit Amount,
Category,
Description.

ok so t for the credet and debit try to anylize if its credet or debit then and same with debit 

ONLY WRITE THE INFORMATION DO NOT EKNOLEDGE MNE

for example respond like this:

Source is basicly source

C means credit and D means debit so like: D 123 C 123

there is 10 options for category:
Food,
Transportation,
Business,
Medical,
Entertainment,
Shopping,
Utilities,
Travel,
Education,
General.

AND ONLY GIVE OUT ONE ANSWER FOR ONE PRODUCT IF THERE IS MORE THEN MAKE MORE THAT ONE BREAKDOWN

Description is the name that will be displayed 

ONLY WRITE THE INFORMATION DO NOT EKNOLEDGE MNE AND DO NOT SAY STUF LIKE THIS:

Here's the breakdown

Ok Sure 

I got it

HEre the answer you are looking for.`,
            // Additional metadata for N8n processing
            imageMetadata: {
              width: 0, // Will be detected by N8n
              height: 0, // Will be detected by N8n
              format: mimeType.split('/')[1],
              sizeKB: Math.round(byteArray.length / 1024)
            }
          }
        })
      });

      console.log('📡 N8n response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ N8n API error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`N8n API failed (${response.status}): ${errorText.slice(0, 200)}`);
      }

      result = await response.json();
      console.log('✅ N8n response received:', result);
      
      // Auto-fill form fields with extracted data
      if (result && result.success && result.data) {
        const responseText = result.data.response || result.data.message || result.data.text || '';
        console.log('🎯 Parsing AI OCR response:', responseText);
        
        // Parse the specific format: "C 18.000\nGeneral\nPAYMENT RECEIVED - THANK YOU"
        const lines = responseText.split('\n').filter(line => line.trim());
        
        if (lines.length >= 3) {
          // Parse first line for credit/debit amount
          const amountLine = lines[0].trim();
          const amountMatch = amountLine.match(/^([CD])\s+(\d+(?:\.\d+)?)$/);
          
          if (amountMatch) {
            const [, type, amount] = amountMatch;
            if (type === 'C') {
              setCreditAmount(amount);
              setDebitAmount('');
            } else if (type === 'D') {
              setDebitAmount(amount);
              setCreditAmount('');
            }
          }
          
          // Parse second line for category
          const categoryText = lines[1].trim();
          const validCategory = categories.find(cat => 
            cat.value.toLowerCase() === categoryText.toLowerCase()
          );
          if (validCategory) {
            setCategory(validCategory.value);
          }
          
          // Parse third line for description
          const descriptionText = lines[2].trim();
          if (descriptionText) {
            setDescription(descriptionText);
          }
          
          console.log('✅ Parsed OCR data:', {
            type: amountMatch?.[1],
            amount: amountMatch?.[2],
            category: categoryText,
            description: descriptionText
          });
          
          setAutoFilled(true);
          
          // Focus on form for user to verify
          setTimeout(() => {
            const descriptionInput = document.querySelector('input[placeholder*="description"]') as HTMLInputElement;
            if (descriptionInput) {
              descriptionInput.focus();
            }
          }, 500);
        } else {
          console.warn('⚠️ Unexpected OCR response format:', responseText);
          setImageError('OCR data format unexpected. Please fill form manually.');
        }
        
      } else {
        console.warn('⚠️ OCR extraction failed or no data returned. Response:', result);
        
        // Check if it's a configuration issue
        if (result?.message?.includes('N8n webhook URL not configured')) {
          setImageError('OCR service not configured. Image saved, please fill the form manually.');
        } else {
          setImageError('OCR processing failed. Image saved, please fill the form manually.');
        }
        
        // Still allow manual entry with the image attached
        console.log('📝 User can still fill form manually with image attached');
      }
      
    } catch (error) {
      console.error('❌ Failed to process receipt image:', error);
      
      // Provide detailed error message based on error type
      let errorMessage = 'Failed to process image: ';
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage += 'Network connection issue. Check your connection and try again.';
        } else if (error.message.includes('404')) {
          errorMessage += 'OCR service not found. Image saved, fill form manually.';
        } else if (error.message.includes('500')) {
          errorMessage += 'Server error. Try again or fill form manually.';
        } else if (error.message.includes('N8n API failed')) {
          errorMessage += 'OCR service error. Image saved, fill form manually.';
        } else {
          errorMessage += `${error.message}. Image saved, fill form manually.`;
        }
      } else {
        errorMessage += 'Unknown error. Image saved, fill form manually.';
      }
      
      setImageError(errorMessage);
      
      // Even if OCR fails, the image is still attached for reference
      console.log('📷 Image still available for manual processing');
      
    } finally {
      setProcessingOCR(false);
    }
    
    } catch (conversionError) {
      console.error('❌ Base64 conversion error:', conversionError);
      setImageError('Failed to process image format. Please try a different image.');
      setProcessingOCR(false);
    }
  };

  // Handle image upload error
  const handleImageError = (error: string) => {
    setImageError(error);
  };

  // Remove image and clear form
  const removeImage = () => {
    setReceiptImage(null);
    setImageError(null);
    setProcessingOCR(false);
    setAutoFilled(false);
    
    // Clear auto-filled data to start fresh
    setFrom('');
    setCreditAmount('');
    setDebitAmount('');
    setCategory('General');
    setAvailableBalance('');
    setId('');
  };

  async function submitExpense(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null); // Clear any previous errors
    
    if (!description || (!creditAmount && !debitAmount)) {
      setFormError('Please fill in description and either credit or debit amount');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/sheets/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          creditAmount: creditAmount ? parseFloat(creditAmount) : undefined,
          debitAmount: debitAmount ? parseFloat(debitAmount) : undefined,
          category,
          description,
          availableBalance: availableBalance ? parseFloat(availableBalance) : undefined,
          id,
          receiptImage: receiptImage ? {
            fileName: receiptImage.fileName,
            fileSize: receiptImage.file.size,
            uploaded: true // Indicate image was already uploaded as file
          } : null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setFrom('');
        setCreditAmount('');
        setDebitAmount('');
        setCategory('General');
        setDescription('');
        setAvailableBalance('');
        setId('');
        setReceiptImage(null);
        setImageError(null);
        setFormError(null);
        onAdded();
      } else {
        setFormError(t('failedToAddExpense') + ': ' + data.message);
      }
    } catch (error) {
      setFormError(t('errorAddingExpense'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submitExpense} className="p-6 bg-white rounded-lg shadow-lg w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-black">{t('addNewExpense')}</h2>
        {autoFilled && (
          <div className="flex items-center text-green-600 text-sm font-medium">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Auto-filled from receipt
          </div>
        )}
      </div>
      
      {autoFilled && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800 text-sm">
            <strong>Receipt processed successfully!</strong> All fields have been filled automatically. 
            Please add a description and verify the details before submitting.
          </p>
        </div>
      )}

      {/* Form Error Message */}
      {formError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm font-medium">
            {formError}
          </p>
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="From (Bank/Source)"
          value={from}
          onChange={e => {
            setFrom(e.target.value);
            setFormError(null); // Clear error when user types
          }}
          className="p-3 border rounded-md w-full text-black"
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <input
          type="number"
          step="0.01"
          placeholder="Credit Amount"
          value={creditAmount}
          onChange={e => {
            setCreditAmount(e.target.value);
            setFormError(null); // Clear error when user types
          }}
          className="p-3 border rounded-md w-full text-black"
          disabled={loading}
        />
        <input
          type="number"
          step="0.01"
          placeholder="Debit Amount"
          value={debitAmount}
          onChange={e => {
            setDebitAmount(e.target.value);
            setFormError(null); // Clear error when user types
          }}
          className="p-3 border rounded-md w-full text-black"
          disabled={loading}
        />
      </div>

      <div className="mb-4">
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="p-3 border rounded-md w-full text-black bg-white"
          disabled={loading}
        >
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>{t(cat.key)}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder={t('description')}
          value={description}
          onChange={e => {
            setDescription(e.target.value);
            setFormError(null); // Clear error when user types
          }}
          className="p-3 border rounded-md w-full text-black"
          disabled={loading}
          required
        />
      </div>

      <div className="mb-4">
        <input
          type="number"
          step="0.01"
          placeholder="Available Balance"
          value={availableBalance}
          onChange={e => setAvailableBalance(e.target.value)}
          className="p-3 border rounded-md w-full text-black"
          disabled={loading}
        />
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="ID/Link (Optional)"
          value={id}
          onChange={e => setId(e.target.value)}
          className="p-3 border rounded-md w-full text-black"
          disabled={loading}
        />
      </div>

      {/* Receipt Image Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-black">Receipt Image</label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowImageUpload(true)}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <ImageIcon className="h-4 w-4" />
            <span>Image</span>
          </Button>
        </div>

        {/* Image Preview */}
        {receiptImage && (
          <div className="relative mb-2">
            <img
              src={receiptImage.previewUrl}
              alt="Receipt preview"
              className="w-full h-32 object-cover rounded border"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
              disabled={processingOCR}
            >
              ×
            </button>
            
            {/* OCR Processing Indicator */}
            {processingOCR && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                <div className="text-white text-sm font-medium flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Extracting data...
                </div>
              </div>
            )}
            
            <div className="text-xs text-black mt-1">
              {receiptImage.fileName}
              {processingOCR && <span className="text-blue-600 ml-2">Processing...</span>}
            </div>
          </div>
        )}

        {/* Image Error */}
        {imageError && (
          <div className="text-red-600 text-sm mb-2">
            {imageError}
          </div>
        )}
      </div>

      <div className="flex space-x-3 mt-6">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loading ? t('adding') : t('addExpense')}
        </button>
      </div>

      {/* Image Upload Modal */}
      {showImageUpload && (
        <ImageUpload
          onImageSelected={handleImageSelected}
          onError={handleImageError}
          onClose={() => setShowImageUpload(false)}
          maxSizeMB={10}
        />
      )}
    </form>
  );
}