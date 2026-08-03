/**
 * Apple Wallet .pkpass generator
 *
 * SETUP REQUIRED:
 * 1. Join Apple Developer Program ($99/yr) at developer.apple.com
 * 2. Create a Pass Type ID (e.g. pass.com.yourcarwash.loyalty)
 * 3. Generate and download a Pass Type ID certificate
 * 4. Convert .p12 to .pem:
 *    openssl pkcs12 -in cert.p12 -out signerCert.pem -clcerts -nokeys
 *    openssl pkcs12 -in cert.p12 -out signerKey.pem -nocerts -nodes
 * 5. Download WWDR cert: https://www.apple.com/certificateauthority/
 * 6. Place all .pem files in backend/certs/apple/
 */

const { PKPass } = require("passkit-generator");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const STAMPS_REQUIRED = 5;

async function generateApplePass(customer) {
  const certsDir = path.join(__dirname, "../certs/apple");

  // Check if certs exist — gracefully skip if not configured
  if (!fs.existsSync(path.join(certsDir, "signerCert.pem"))) {
    throw new Error(
      "Apple Wallet certificates not configured. " +
      "See backend/certs/apple/ and .env.example for setup instructions."
    );
  }

  const pass = await PKPass.from(
    {
      model: path.join(__dirname, "../pass-templates/carwash.pass"),
      certificates: {
        wwdr: fs.readFileSync(path.join(certsDir, "wwdr.pem")),
        signerCert: fs.readFileSync(path.join(certsDir, "signerCert.pem")),
        signerKey: fs.readFileSync(path.join(certsDir, "signerKey.pem")),
        signerKeyPassphrase: process.env.APPLE_KEY_PASSPHRASE,
      },
    },
    {
      serialNumber: customer.id,
      description: "Car Wash Loyalty Card",
      organizationName: "Your Car Wash",
      passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID,
      teamIdentifier: process.env.APPLE_TEAM_ID,
    }
  );

  // Barcode — QR code encoding the card URL
  pass.setBarcodes({
    message: `${process.env.FRONTEND_URL}/card/${customer.qr_token}`,
    format: "PKBarcodeFormatQR",
    messageEncoding: "iso-8859-1",
  });

  // Stamp count on the front of the card
  pass.primaryFields.push({
    key: "stamps",
    label: "STAMPS",
    value: `${customer.stamp_count} / ${STAMPS_REQUIRED}`,
  });

  pass.secondaryFields.push({
    key: "name",
    label: "CUSTOMER",
    value: customer.name,
  });

  if (customer.stamp_count >= STAMPS_REQUIRED) {
    pass.auxiliaryFields.push({
      key: "reward",
      label: "REWARD",
      value: "FREE WASH AVAILABLE!",
    });
  }

  return pass.getAsBuffer();
}

module.exports = { generateApplePass };
