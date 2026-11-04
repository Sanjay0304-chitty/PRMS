# Password recovery setup

The same email-code flow applies to all email domains. Demo addresses without a working inbox should use documented test credentials or controlled administrator support; there is no reset bypass.

Set these values in the backend local `.env` (never commit the file):

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_FROM="PRMS <your-sender@gmail.com>"
SMTP_USER=your-sender@gmail.com
SMTP_PASSWORD=
```

For the existing Gmail SMTP transport, the sender must supply a Google App Password locally. Do not use an ordinary Google account password or put the App Password in chat, screenshots or source control. App Password availability depends on the Google account; consult https://support.google.com/mail/answer/185833 . Gmail SMTP server details: https://developers.google.com/workspace/gmail/imap/imap-smtp .

Restart the backend after changing environment settings. Verify using an active test account with an inbox you control: request a code, confirm delivery, enter it, then use a strong matching password. Test final password changes only on a dedicated test account.

Codes expire five minutes after issuance. The verified reset permission uses the same expiry, is bound to the email and is single-use. Resending invalidates previous codes and reset permissions. Five incorrect guesses invalidate the code. Recovery state is held in memory, so backend restarts invalidate pending codes. The UI offers a 30-second resend cooldown; the auth routes also use server-side rate limiting.

Current scope: outgoing SMTP needs a valid sender credential. Builds and mocked delivery tests do not prove real inbox delivery. Successful resets clear the stored refresh token; existing access tokens follow their configured lifetime.
