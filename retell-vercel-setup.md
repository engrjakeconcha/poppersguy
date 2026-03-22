# Retell Vercel Setup

This adds a Vercel serverless endpoint for the Retell custom function:

`/api/retell/poppersguy-ops`

After deployment, your full HTTPS URL will be:

`https://YOUR_VERCEL_DOMAIN/api/retell/poppersguy-ops`

Example:

`https://your-project.vercel.app/api/retell/poppersguy-ops`

## Files

- Function: [`/Users/mymacyou/Documents/delubots/storefront/api/retell/poppersguy-ops.js`](/Users/mymacyou/Documents/delubots/storefront/api/retell/poppersguy-ops.js)

## Required Vercel Environment Variables

- `RETELL_FUNCTION_AUTH_TOKEN`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ADMIN_GROUP_ID`

## Optional Environment Variables

- `TELEGRAM_ADMIN_IDS`
  Comma-separated fallback admin ids, used if no admin group id is set.
- `POPPERS_CATALOG_URL`
  Defaults to `https://jakeconcha.pythonanywhere.com/api/catalog/poppers`
- `POPPERS_PROMOS_JSON`
  JSON object of promo codes and peso discount values.
  Example: `{"WELCOME50":50,"VIP100":100}`
- `POPPERS_LOYALTY_BALANCES_JSON`
  JSON object of customer ids to loyalty balances for lightweight testing.
  Example: `{"5017398329":2000,"cust_123":1000}`

## What This Function Supports

- `get_catalog`
- `get_product`
- `update_cart`
- `get_cart`
- `quote_order`
- `submit_order`
- `create_support_ticket`
- `create_bulk_order_ticket`
- `submit_affiliate_enrollment`
- `get_rewards_info`
- `send_telegram`

## Current Limitation

- `track_order` and `track_latest_order` return `NOT_IMPLEMENTED` until you connect a persistent order store.

## Deploy Steps

1. In Vercel, create or import a project from the `storefront` folder.
2. Set the project root to `storefront`.
3. Add the environment variables above.
4. Deploy.
5. Copy your deployed URL:
   `https://YOUR_VERCEL_DOMAIN/api/retell/poppersguy-ops`

## Retell Auth Header

Use this in Retell when attaching the function:

- Header name: `Authorization`
- Header value: `Bearer YOUR_RETELL_FUNCTION_AUTH_TOKEN`

## Recommended Secret

Generate any long random secret for `RETELL_FUNCTION_AUTH_TOKEN`, for example:

`poppersguy_retell_2026_super_secret_token_change_me`

## Retell Function Config Values

- Function name: `poppersguy_ops`
- Method: `POST`
- URL: `https://YOUR_VERCEL_DOMAIN/api/retell/poppersguy-ops`
- Header:
  - `Authorization: Bearer YOUR_RETELL_FUNCTION_AUTH_TOKEN`

