const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

// Integrant Brand Colors
const BRAND = {
  orange: { r: 247/255, g: 148/255, b: 29/255 },  // #F7941D
  cyan: { r: 0/255, g: 184/255, b: 230/255 },     // #00B8E6
  cream: { r: 0.99, g: 0.97, b: 0.94 },
  white: { r: 1, g: 1, b: 1 },
  darkGray: { r: 0.15, g: 0.15, b: 0.15 },
  gray: { r: 0.35, g: 0.35, b: 0.35 },
  lightGray: { r: 0.55, g: 0.55, b: 0.55 },
};

async function generateCertificatePDF(options) {
  const {
    certificateId,
    employee,
    tier,
    template,
    sender,
    customMessage,
    achievementDescription,
    period,
    companyName = 'Integrant',
    companyLogoPath = null,
    signatureName,
    signatureTitle,
  } = options;
  
  // Create PDF document (A4 landscape - classic certificate style)
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // A4 landscape
  
  const { width, height } = page.getSize();
  
  // Load fonts
  const titleFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const titleItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bodyBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Cream/off-white background
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(BRAND.cream.r, BRAND.cream.g, BRAND.cream.b)
  });
  
  // Outer border (thick orange)
  const outerMargin = 25;
  const borderWidth = 6;
  page.drawRectangle({
    x: outerMargin,
    y: outerMargin,
    width: width - (outerMargin * 2),
    height: height - (outerMargin * 2),
    borderColor: rgb(BRAND.orange.r, BRAND.orange.g, BRAND.orange.b),
    borderWidth: borderWidth,
  });
  
  // Inner decorative border (thin cyan)
  const innerMargin = outerMargin + 12;
  page.drawRectangle({
    x: innerMargin,
    y: innerMargin,
    width: width - (innerMargin * 2),
    height: height - (innerMargin * 2),
    borderColor: rgb(BRAND.cyan.r, BRAND.cyan.g, BRAND.cyan.b),
    borderWidth: 1,
  });
  
  let yPosition = height - 80;
  
  // Try to embed company logo if provided
  let logoEmbedded = false;
  if (companyLogoPath) {
    try {
      const logoFullPath = path.join(__dirname, '..', '..', companyLogoPath.replace(/^\//, ''));
      if (fs.existsSync(logoFullPath)) {
        const logoBytes = fs.readFileSync(logoFullPath);
        let logoImage;
        
        if (logoFullPath.toLowerCase().endsWith('.png')) {
          logoImage = await pdfDoc.embedPng(logoBytes);
        } else if (logoFullPath.toLowerCase().endsWith('.jpg') || logoFullPath.toLowerCase().endsWith('.jpeg')) {
          logoImage = await pdfDoc.embedJpg(logoBytes);
        }
        
        if (logoImage) {
          const logoMaxHeight = 50;
          const logoMaxWidth = 200;
          const logoAspect = logoImage.width / logoImage.height;
          let logoHeight = logoMaxHeight;
          let logoWidth = logoHeight * logoAspect;
          
          if (logoWidth > logoMaxWidth) {
            logoWidth = logoMaxWidth;
            logoHeight = logoWidth / logoAspect;
          }
          
          page.drawImage(logoImage, {
            x: (width - logoWidth) / 2,
            y: yPosition - logoHeight + 10,
            width: logoWidth,
            height: logoHeight,
          });
          
          yPosition -= logoHeight + 20;
          logoEmbedded = true;
        }
      }
    } catch (err) {
      console.error('Error embedding logo:', err);
    }
  }
  
  // If no logo, add some spacing
  if (!logoEmbedded) {
    yPosition -= 10;
  }
  
  // Main title: "CERTIFICATE OF RECOGNITION"
  const mainTitle = 'CERTIFICATE OF RECOGNITION';
  const mainTitleSize = 38;
  const mainTitleWidth = titleFont.widthOfTextAtSize(mainTitle, mainTitleSize);
  page.drawText(mainTitle, {
    x: (width - mainTitleWidth) / 2,
    y: yPosition,
    size: mainTitleSize,
    font: titleFont,
    color: rgb(BRAND.orange.r, BRAND.orange.g, BRAND.orange.b)
  });
  
  // Decorative lines under title
  yPosition -= 18;
  const lineWidth = 280;
  // Top line (orange)
  page.drawLine({
    start: { x: (width - lineWidth) / 2, y: yPosition },
    end: { x: (width + lineWidth) / 2, y: yPosition },
    thickness: 2,
    color: rgb(BRAND.orange.r, BRAND.orange.g, BRAND.orange.b)
  });
  // Bottom line (cyan)
  page.drawLine({
    start: { x: (width - lineWidth) / 2, y: yPosition - 4 },
    end: { x: (width + lineWidth) / 2, y: yPosition - 4 },
    thickness: 1,
    color: rgb(BRAND.cyan.r, BRAND.cyan.g, BRAND.cyan.b)
  });
  
  // "This certifies that"
  yPosition -= 45;
  const certifiesText = 'This certifies that';
  const certifiesWidth = titleItalic.widthOfTextAtSize(certifiesText, 16);
  page.drawText(certifiesText, {
    x: (width - certifiesWidth) / 2,
    y: yPosition,
    size: 16,
    font: titleItalic,
    color: rgb(BRAND.gray.r, BRAND.gray.g, BRAND.gray.b)
  });
  
  // Employee name (large, bold)
  yPosition -= 50;
  const nameSize = 44;
  const nameWidth = titleFont.widthOfTextAtSize(employee.name, nameSize);
  page.drawText(employee.name, {
    x: (width - nameWidth) / 2,
    y: yPosition,
    size: nameSize,
    font: titleFont,
    color: rgb(BRAND.darkGray.r, BRAND.darkGray.g, BRAND.darkGray.b)
  });
  
  // Line under name
  yPosition -= 8;
  const nameLine = Math.min(nameWidth + 40, 380);
  page.drawLine({
    start: { x: (width - nameLine) / 2, y: yPosition },
    end: { x: (width + nameLine) / 2, y: yPosition },
    thickness: 1,
    color: rgb(BRAND.orange.r, BRAND.orange.g, BRAND.orange.b)
  });
  
  // "has been recognized as"
  yPosition -= 35;
  const recognizedText = 'has been recognized as';
  const recognizedWidth = titleItalic.widthOfTextAtSize(recognizedText, 16);
  page.drawText(recognizedText, {
    x: (width - recognizedWidth) / 2,
    y: yPosition,
    size: 16,
    font: titleItalic,
    color: rgb(BRAND.gray.r, BRAND.gray.g, BRAND.gray.b)
  });
  
  // Tier name (large, colored)
  yPosition -= 45;
  const tierColor = parseColor(tier.color) || BRAND.cyan;
  const tierSize = 34;
  const tierText = tier.name.toUpperCase();
  const tierNameWidth = titleFont.widthOfTextAtSize(tierText, tierSize);
  page.drawText(tierText, {
    x: (width - tierNameWidth) / 2,
    y: yPosition,
    size: tierSize,
    font: titleFont,
    color: rgb(tierColor.r, tierColor.g, tierColor.b)
  });
  
  // Period (if provided)
  if (period) {
    yPosition -= 28;
    const periodText = `for ${period}`;
    const periodWidth = bodyFont.widthOfTextAtSize(periodText, 14);
    page.drawText(periodText, {
      x: (width - periodWidth) / 2,
      y: yPosition,
      size: 14,
      font: bodyFont,
      color: rgb(BRAND.lightGray.r, BRAND.lightGray.g, BRAND.lightGray.b)
    });
  }
  
  // Achievement description / tier description
  const description = achievementDescription || tier.description || '';
  if (description) {
    yPosition -= 30;
    const descLines = wrapText(description, titleItalic, 13, width - 180);
    descLines.forEach(line => {
      const lineWidth = titleItalic.widthOfTextAtSize(line, 13);
      page.drawText(line, {
        x: (width - lineWidth) / 2,
        y: yPosition,
        size: 13,
        font: titleItalic,
        color: rgb(BRAND.gray.r, BRAND.gray.g, BRAND.gray.b)
      });
      yPosition -= 18;
    });
  }
  
  // Custom message
  if (customMessage) {
    yPosition -= 8;
    const msgLines = wrapText(`"${customMessage}"`, titleItalic, 12, width - 180);
    msgLines.forEach(line => {
      const lineWidth = titleItalic.widthOfTextAtSize(line, 12);
      page.drawText(line, {
        x: (width - lineWidth) / 2,
        y: yPosition,
        size: 12,
        font: titleItalic,
        color: rgb(BRAND.lightGray.r, BRAND.lightGray.g, BRAND.lightGray.b)
      });
      yPosition -= 16;
    });
  }
  
  // Bottom section - Date and Signature
  const bottomY = 75;
  const leftX = 170;
  const rightX = width - 170;
  
  // Date section (left)
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Date line
  page.drawLine({
    start: { x: leftX - 70, y: bottomY + 22 },
    end: { x: leftX + 70, y: bottomY + 22 },
    thickness: 1,
    color: rgb(BRAND.darkGray.r, BRAND.darkGray.g, BRAND.darkGray.b)
  });
  
  // Date value
  const dateWidth = bodyFont.widthOfTextAtSize(dateStr, 11);
  page.drawText(dateStr, {
    x: leftX - dateWidth / 2,
    y: bottomY + 30,
    size: 11,
    font: bodyFont,
    color: rgb(BRAND.darkGray.r, BRAND.darkGray.g, BRAND.darkGray.b)
  });
  
  // "Date" label
  const dateLabelWidth = bodyFont.widthOfTextAtSize('Date', 10);
  page.drawText('Date', {
    x: leftX - dateLabelWidth / 2,
    y: bottomY + 8,
    size: 10,
    font: bodyFont,
    color: rgb(BRAND.lightGray.r, BRAND.lightGray.g, BRAND.lightGray.b)
  });
  
  // Signature section (right)
  // Signature line
  page.drawLine({
    start: { x: rightX - 80, y: bottomY + 22 },
    end: { x: rightX + 80, y: bottomY + 22 },
    thickness: 1,
    color: rgb(BRAND.darkGray.r, BRAND.darkGray.g, BRAND.darkGray.b)
  });
  
  // Signature name
  const sigName = signatureName || sender?.signature_name || sender?.name || '';
  if (sigName) {
    const sigNameWidth = bodyFont.widthOfTextAtSize(sigName, 11);
    page.drawText(sigName, {
      x: rightX - sigNameWidth / 2,
      y: bottomY + 30,
      size: 11,
      font: bodyFont,
      color: rgb(BRAND.darkGray.r, BRAND.darkGray.g, BRAND.darkGray.b)
    });
  }
  
  // Signature title (if provided) - in cyan, shown below line instead of "Authorized Signature"
  const sigTitle = signatureTitle || sender?.signature_title || '';
  if (sigTitle) {
    const sigTitleWidth = bodyFont.widthOfTextAtSize(sigTitle, 10);
    page.drawText(sigTitle, {
      x: rightX - sigTitleWidth / 2,
      y: bottomY + 8,
      size: 10,
      font: bodyFont,
      color: rgb(BRAND.cyan.r, BRAND.cyan.g, BRAND.cyan.b)
    });
  }
  
  // Certificate ID at very bottom center
  const certIdText = `Certificate ID: ${certificateId}`;
  const certIdWidth = bodyFont.widthOfTextAtSize(certIdText, 8);
  page.drawText(certIdText, {
    x: (width - certIdWidth) / 2,
    y: 38,
    size: 8,
    font: bodyFont,
    color: rgb(0.7, 0.7, 0.7)
  });
  
  // Save PDF
  const pdfBytes = await pdfDoc.save();
  
  // Ensure certificates directory exists
  const certsDir = path.join(__dirname, '..', '..', 'uploads', 'certificates');
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }
  
  const filename = `${certificateId}.pdf`;
  const filePath = path.join(certsDir, filename);
  fs.writeFileSync(filePath, pdfBytes);
  
  return `/uploads/certificates/${filename}`;
}

// Helper function to parse hex color
function parseColor(hex) {
  if (!hex) return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : null;
}

// Helper function to wrap text
function wrapText(text, font, fontSize, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

module.exports = { generateCertificatePDF };
