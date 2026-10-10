This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Registration receipts

After registration, the captain sees an on-screen receipt with a QR code and receives a simple text receipt by email when the server SMTP settings below are configured. Email delivery is best-effort, so a failed receipt email does not undo a saved registration. The email includes the registration ID and roster names/game names, and excludes student IDs and COR documents. Use the receipt ID on the site's Check Registration page to verify the entry. Supabase Auth separately sends signup confirmation and password reset emails using its Authentication email settings.

For Gmail SMTP, set these server-only environment variables in `.env.local` for local development and in Vercel for deployments. Never prefix these names with `NEXT_PUBLIC_`:

```text
RECEIPT_SMTP_USER=your-sender@gmail.com
RECEIPT_SMTP_PASSWORD=your-google-app-password
RECEIPT_SMTP_HOST=smtp.gmail.com
RECEIPT_SMTP_PORT=587
RECEIPT_SMTP_FROM_EMAIL=your-sender@gmail.com
RECEIPT_SMTP_FROM_NAME=NU Wizards Tournament Hub
```

The sender address should match the Gmail account used for SMTP. These settings are separate from the SMTP settings configured in Supabase Auth.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
