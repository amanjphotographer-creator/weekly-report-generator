const crypto = require("crypto");
const QRCode = require("qrcode");

function generateQrToken() {
  return crypto.randomBytes(24).toString("hex");
}

async function generateQrDataUrl(token, baseUrl) {
  const cardUrl = `${baseUrl}/card/${token}`;
  return QRCode.toDataURL(cardUrl, {
    width: 300,
    margin: 2,
    color: { dark: "#0A1628", light: "#FFFFFF" },
  });
}

async function generateQrBuffer(token, baseUrl) {
  const cardUrl = `${baseUrl}/card/${token}`;
  return QRCode.toBuffer(cardUrl, {
    width: 300,
    margin: 2,
    color: { dark: "#0A1628", light: "#FFFFFF" },
  });
}

module.exports = { generateQrToken, generateQrDataUrl, generateQrBuffer };
