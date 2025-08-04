# Bank Email Automation - Cron Job Setup

## Overview
This system automatically processes bank transaction emails and logs them to Google Sheets. Here are different ways to set up automated processing.

## 1. Vercel Cron Jobs (Recommended for Vercel deployments)

Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-bank-emails",
      "schedule": "0 */2 * * *"
    }
  ]
}
```

This runs every 2 hours.

## 2. GitHub Actions

Create `.github/workflows/process-bank-emails.yml`:

```yaml
name: Process Bank Emails
on:
  schedule:
    - cron: '0 */2 * * *'  # Every 2 hours
  workflow_dispatch:  # Manual trigger

jobs:
  process-emails:
    runs-on: ubuntu-latest
    steps:
      - name: Process Bank Emails
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            -d '{}' \
            "${{ secrets.APP_URL }}/api/cron/process-bank-emails"
```

## 3. Traditional Cron Job

Add to your server's crontab:

```bash
# Edit crontab
crontab -e

# Add this line (runs every 2 hours)
0 */2 * * * curl -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourapp.com/api/cron/process-bank-emails
```

## 4. Cloud Function (AWS Lambda, Google Cloud Functions, etc.)

Deploy the following function:

```javascript
exports.processBankEmails = async (event, context) => {
  const response = await fetch('https://yourapp.com/api/cron/process-bank-emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  
  return response.json();
};
```

## Environment Variables

Add these to your deployment environment:

```bash
CRON_SECRET=your_secure_random_string
BANK_EMAIL=noreply@bank.com
EXPENSES_SPREADSHEET_ID=your_sheets_id
EXPENSES_SHEET_NAME=Expenses
EXPENSE_LABEL=Expense Logged
```

## Manual Testing

Test the cron endpoint manually:

```bash
curl -X POST \
  -H "Authorization: Bearer your_cron_secret" \
  -H "Content-Type: application/json" \
  https://yourapp.com/api/cron/process-bank-emails
```

## Monitoring

The system logs all activities. Check your application logs for:
- `🤖 [CRON] Processing bank emails...`
- `✅ [CRON] Processed X transactions...`
- `🚨 [CRON] Errors occurred:...`

## Security Notes

1. **Use HTTPS** for all cron endpoints
2. **Rotate CRON_SECRET** regularly
3. **Use service accounts** for production (not user OAuth)
4. **Monitor logs** for unauthorized access attempts
5. **Set up alerts** for processing failures

## Troubleshooting

### Authentication Issues
- Ensure Google OAuth tokens are valid
- Consider using service account for automated processing
- Check that required scopes are granted

### Email Parsing Issues
- Check email format matches expected patterns
- Update regex patterns in `bankEmailProcessor.ts`
- Enable debug logging for email content

### Sheet Access Issues
- Verify spreadsheet ID is correct
- Ensure sheet name exists
- Check that service account has edit permissions

## Expected Sheet Format

Your Google Sheet should have these columns in order:

| A (Date) | B (Merchant) | C (Amount) | D (Description) | E (Transaction ID) |
|----------|--------------|------------|-----------------|-------------------|
| 2024-01-15 | GROCERY STORE | 45.500 | GROCERY STORE - Transaction... | 2024-01-15_45.5_GROCERYSTORE |

The first row should contain headers.