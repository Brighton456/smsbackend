# SMS Backend on Vercel + Supabase

This project provides a Vercel-hosted backend that receives Supabase webhooks, uses an AI API to format professional branded SMS messages, queues them in Supabase, and exposes endpoints for an Android gateway (SMSSync) to deliver and confirm messages. It also includes a Next.js dashboard for monitoring, analytics, and resend workflows.

## Features

- **Webhook receiver** `/api/sms-webhook` with AI formatting and branding footer.
- **Queue management** in Supabase `sms_queue` table.
- **SMSSync endpoints** for fetching queued SMS and confirming delivery.
- **Dashboard** with queued/sent/failed lists, resend actions, and analytics.
- **Security** via API key or Supabase JWT and basic rate limiting.

## Environment Variables

Create `.env.local` in Vercel (or locally) with:

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
API_KEY=
NEXT_PUBLIC_BASE_URL=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-3.5-turbo
HF_API_KEY=
HF_MODEL=mistralai/Mistral-7B-Instruct-v0.2
```

Only one of `OPENAI_API_KEY` or `HF_API_KEY` is required. If none is set, a fallback formatter is used.

## Supabase Schema

Run the SQL in `supabase/schema.sql` to create `sms_queue`.

```
psql < supabase/schema.sql
```

## API Routes

### `POST /api/sms-webhook`
Receives Supabase triggers, formats the message, and queues SMS.

**Headers**
- `x-api-key` or `Authorization: Bearer <API_KEY>`
- or `Authorization: Bearer <Supabase JWT>`

**Payload example**
```
{
  "event": "withdrawal",
  "amount": "KES 2,500",
  "date": "2024-08-22",
  "phone": "+254712345678",
  "language": "English"
}
```

### `GET /api/get-sms`
Returns queued messages for SMSSync.

### `POST /api/confirm-sms`
```
{
  "id": "<sms id>",
  "success": true
}
```
If `success` is false, retry count increments and status changes to `failed` after 3 attempts.

### `POST /api/resend-sms`
```
{ "id": "<sms id>" }
```
Resets status to `queued` and `retry_count` to 0.

## Dashboard

Visit `/` to view analytics, queues, and resend failed messages. The dashboard uses `SUPABASE_SERVICE_ROLE_KEY`, so keep it server-side only.

## Connect Your Phone (SMSSync)

1. Install **SMSSync** on your Android phone and grant SMS permissions.
2. In SMSSync settings, set the **Server URL** to your Vercel deployment:
   - `https://<vercel-app>.vercel.app/api/get-sms`
3. Set the **Confirm URL** to:
   - `https://<vercel-app>.vercel.app/api/confirm-sms`
4. Add the header `x-api-key: <API_KEY>` (or use a Supabase JWT if configured).
5. Test by triggering a Supabase webhook. Messages should appear in the dashboard queued list and then confirm as sent/failed.

If you want to expose full endpoint URLs in the dashboard hero header, set `NEXT_PUBLIC_BASE_URL` (e.g., `https://<vercel-app>.vercel.app`).

## Supabase Webhook Setup

1. Create a Supabase trigger/edge function that POSTs your payload to:
   - `https://<vercel-app>.vercel.app/api/sms-webhook`
2. Include your API key header or Supabase JWT.

## SMSSync Flow

1. SMSSync polls `/api/get-sms` for queued messages.
2. SMSSync delivers SMS from the Android gateway.
3. SMSSync posts delivery results to `/api/confirm-sms`.

## Notes

- Two additional copies are queued for `0720363215` and `0768741104` for each customer SMS.
- Rate limiting is in-memory and intended as a basic guardrail for Vercel serverless functions.
