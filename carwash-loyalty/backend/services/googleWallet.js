/**
 * Google Wallet Loyalty Card JWT generator
 *
 * SETUP REQUIRED:
 * 1. Go to console.cloud.google.com, create a project
 * 2. Enable the "Google Wallet API"
 * 3. Create a Service Account, download JSON key
 * 4. Go to pay.google.com/business/console
 * 5. Create a Loyalty Card class and note your Issuer ID
 * 6. Share the Wallet Object Issuer permission with your service account
 * 7. Fill in GOOGLE_* variables in .env
 */

const jwt = require("jsonwebtoken");
require("dotenv").config();

const STAMPS_REQUIRED = 5;

function generateGoogleWalletUrl(customer) {
  if (!process.env.GOOGLE_WALLET_ISSUER_ID) {
    throw new Error(
      "Google Wallet not configured. " +
      "See .env.example for GOOGLE_WALLET_* setup instructions."
    );
  }

  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const classId = `${issuerId}.carwash_loyalty`;
  const objectId = `${issuerId}.customer_${customer.id}`;

  const loyaltyObject = {
    id: objectId,
    classId,
    state: "ACTIVE",
    heroImage: {
      sourceUri: { uri: `${process.env.FRONTEND_URL}/images/wallet-hero.png` },
      contentDescription: { defaultValue: { language: "en-US", value: "Car Wash Loyalty" } },
    },
    textModulesData: [
      {
        header: "STAMPS",
        body: `${customer.stamp_count} of ${STAMPS_REQUIRED} collected`,
        id: "stamps",
      },
    ],
    loyaltyPoints: {
      balance: { int: customer.stamp_count },
      label: "Stamps",
    },
    accountId: customer.id,
    accountName: customer.name,
    barcode: {
      type: "QR_CODE",
      value: `${process.env.FRONTEND_URL}/card/${customer.qr_token}`,
      alternateText: customer.qr_token,
    },
  };

  const payload = {
    iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: [process.env.FRONTEND_URL],
    payload: {
      loyaltyObjects: [loyaltyObject],
    },
  };

  const token = jwt.sign(payload, process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, {
    algorithm: "RS256",
  });

  return `https://pay.google.com/gp/v/save/${token}`;
}

module.exports = { generateGoogleWalletUrl };
