# Noon Instalment Payment Portal

A React + Vite frontend design preview for the Noon Instalment customer payment link.

## Run locally

1. Install Node.js LTS if it is not already installed.
2. Open this folder in Visual Studio Code.
3. Open Terminal → New Terminal.
4. Run:

   ```bash
   npm install
   npm run dev
   ```

5. Open the local URL printed in the terminal (usually http://localhost:5173).

## Preview flow

- Enter `NOON123` to view the sample customer-details and payment-options screen.
- Any other code shows a demo verification error.

## Important

This is only a frontend design preview. Customer data, ID images, bank account details, receipt uploads, admin authentication, unique code verification, and live card payments are NOT connected. Do not enter real customer personal information. Before production, connect Supabase with server-side verification and Row Level Security, private file storage, and a supported payment gateway with verified server-side webhooks.
