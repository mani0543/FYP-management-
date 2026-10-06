import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';

interface ApprovalMeta {
  approvedByName: string;
  approvedAt: string;
  signatureUrl?: string;
  signatureDataUrl?: string;
  stampUrl?: string;
  stampDataUrl?: string;
  comments?: string;
}

/**
 * Resolves an image asset (from data URL or local /api/files/download/... path) into a Buffer + format ('png' | 'jpg' | null)
 */
async function resolveImageBytes(
  url?: string,
  dataUrl?: string
): Promise<{ bytes: Uint8Array; format: 'png' | 'jpg' } | null> {
  try {
    if (dataUrl && dataUrl.startsWith('data:image/')) {
      const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        const buf = Buffer.from(match[2], 'base64');
        if (buf.length > 4 && buf[0] === 0x89 && buf[1] === 0x50) {
          return { bytes: new Uint8Array(buf), format: 'png' };
        }
        if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8) {
          return { bytes: new Uint8Array(buf), format: 'jpg' };
        }
      }
    }

    if (url && url.startsWith('data:image/')) {
      const match = url.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        const buf = Buffer.from(match[2], 'base64');
        if (buf.length > 4 && buf[0] === 0x89 && buf[1] === 0x50) {
          return { bytes: new Uint8Array(buf), format: 'png' };
        }
        if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8) {
          return { bytes: new Uint8Array(buf), format: 'jpg' };
        }
      }
    }

    if (url && url.includes('/api/files/download/')) {
      const after = url.split('/api/files/download/')[1];
      if (after) {
        const segs = after.split('/');
        const rawFolder = decodeURIComponent(segs[0]).replace(/^fyp-/, 'fyp/');
        const rawFilename = decodeURIComponent(segs.slice(1).join('/'));
        const filePath = path.resolve(process.cwd(), 'uploads', rawFolder, rawFilename);
        if (fs.existsSync(filePath)) {
          const buf = fs.readFileSync(filePath);
          if (buf.length > 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
            return { bytes: new Uint8Array(buf), format: 'png' };
          }
          if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8) {
            return { bytes: new Uint8Array(buf), format: 'jpg' };
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not resolve signature/stamp image bytes:', err);
  }
  return null;
}

/**
 * Safely embeds an image into pdfDoc with a try/catch so non-standard or WebP images renamed to .png never crash PDF generation
 */
async function safeEmbedImage(
  pdfDoc: PDFDocument,
  imgData: { bytes: Uint8Array; format: 'png' | 'jpg' } | null
): Promise<any | null> {
  if (!imgData) return null;
  try {
    return imgData.format === 'png'
      ? await pdfDoc.embedPng(imgData.bytes)
      : await pdfDoc.embedJpg(imgData.bytes);
  } catch {
    try {
      return imgData.format === 'png'
        ? await pdfDoc.embedJpg(imgData.bytes)
        : await pdfDoc.embedPng(imgData.bytes);
    } catch {
      return null;
    }
  }
}

/**
 * Resolves the raw file buffer and extension for a Document record
 */
export function resolveDocumentRawBuffer(doc: any): {
  buffer: Buffer | null;
  ext: string;
  diskFilePath: string | null;
  downloadName: string;
} {
  let rawBuffer: Buffer | null = null;
  let diskFilePath: string | null = null;
  let ext = '';

  if (doc.fileName) {
    ext = path.extname(doc.fileName).toLowerCase();
  }

  if (doc.cloudinaryUrl && doc.cloudinaryUrl.includes('/api/files/download/')) {
    const after = doc.cloudinaryUrl.split('/api/files/download/')[1];
    if (after) {
      const segs = after.split('/');
      const rawFolder = decodeURIComponent(segs[0]).replace(/^fyp-/, 'fyp/');
      const rawFilename = decodeURIComponent(segs.slice(1).join('/'));
      if (!ext) {
        ext = path.extname(rawFilename).toLowerCase();
      }
      const candidatePath = path.resolve(process.cwd(), 'uploads', rawFolder, rawFilename);
      if (fs.existsSync(candidatePath)) {
        diskFilePath = candidatePath;
        rawBuffer = fs.readFileSync(candidatePath);
      }
    }
  }

  if (!rawBuffer && doc.fileDataUrl && doc.fileDataUrl.startsWith('data:')) {
    const match = doc.fileDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const mime = match[1];
      rawBuffer = Buffer.from(match[2], 'base64');
      if (!ext) {
        if (mime === 'application/pdf') ext = '.pdf';
        else if (mime.includes('wordprocessingml')) ext = '.docx';
        else if (mime === 'application/msword') ext = '.doc';
        else if (mime.includes('presentationml')) ext = '.pptx';
      }
    }
  }

  if (!ext && rawBuffer && rawBuffer.length > 4) {
    if (rawBuffer.subarray(0, 4).toString() === '%PDF') ext = '.pdf';
    else if (rawBuffer[0] === 0x50 && rawBuffer[1] === 0x4b) ext = '.docx';
  }

  if (!ext) ext = '.pdf';

  const baseTitle = (doc.title || 'FYP_Document').replace(/[^a-zA-Z0-9_-]/g, '_');
  const downloadName =
    doc.fileName && path.extname(doc.fileName)
      ? doc.fileName
      : `${baseTitle}${ext}`;

  return { buffer: rawBuffer, ext, diskFilePath, downloadName };
}

const ENDORSEMENT_PAGE_MARKER = 'FYP_OFFICIAL_ENDORSEMENT_PAGE_V1';

/**
 * Appends a dedicated Official Signature & Seal page to the end of a PDF document
 * so 100% of the original PDF's pages, fonts, margins, and alignment remain completely untouched!
 */
export async function stampPdfBuffer(
  pdfBytes: Uint8Array | Buffer,
  docMeta: {
    title: string;
    type: string;
    semesterNumber: number;
    supervisorApproval?: ApprovalMeta;
    coordinatorApproval?: ApprovalMeta;
  }
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

  // If the last page was already our appended endorsement page, remove it before re-adding updated signatures
  const pages = pdfDoc.getPages();
  if (pages.length > 1) {
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();
    // We tag our appended page with exact custom height 841.91
    if (Math.abs(width - 595.28) < 0.1 && Math.abs(height - 841.91) < 0.05) {
      pdfDoc.removePage(pages.length - 1);
    }
  }

  // Append a clean A4 Endorsement Page at the end so original document pages are never altered or overlapped
  const sigPage = pdfDoc.addPage([595.28, 841.91]);
  const { width, height } = sigPage.getSize();

  const sup = docMeta.supervisorApproval;
  const coord = docMeta.coordinatorApproval;

  // Outer border
  sigPage.drawRectangle({
    x: 32,
    y: height - 310,
    width: width - 64,
    height: 260,
    color: rgb(0.98, 0.99, 1),
    borderColor: rgb(0.12, 0.25, 0.68),
    borderWidth: 1.5,
  });

  // Top Header Bar
  sigPage.drawRectangle({
    x: 32,
    y: height - 82,
    width: width - 64,
    height: 32,
    color: rgb(0.12, 0.25, 0.68),
  });

  sigPage.drawText(
    `UNIVERSITY FYP OFFICIAL DIGITAL ENDORSEMENT & SEAL — SEMESTER ${docMeta.semesterNumber}`,
    {
      x: 46,
      y: height - 70,
      size: 10,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    }
  );

  sigPage.drawText(`Document: ${String(docMeta.title || 'FYP Deliverable').substring(0, 75)} (${docMeta.type})`, {
    x: 46,
    y: height - 104,
    size: 9,
    font: helveticaBold,
    color: rgb(0.15, 0.2, 0.35),
  });

  const boxTopY = height - 120;
  const boxBottomY = height - 295;
  const leftColX = 46;
  const midX = width / 2;
  const rightColX = midX + 12;

  // Left Column: Supervisor Endorsement
  sigPage.drawText('1. FACULTY SUPERVISOR DIGITAL ENDORSEMENT', {
    x: leftColX,
    y: boxTopY - 12,
    size: 8.5,
    font: helveticaBold,
    color: rgb(0.12, 0.25, 0.68),
  });

  if (sup) {
    sigPage.drawText(`Signed By: ${sup.approvedByName}`, {
      x: leftColX,
      y: boxTopY - 28,
      size: 8.5,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    sigPage.drawText(`Verified Date: ${new Date(sup.approvedAt).toLocaleString()}`, {
      x: leftColX,
      y: boxTopY - 42,
      size: 7.5,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });

    const supImgData = await resolveImageBytes(sup.signatureUrl, sup.signatureDataUrl);
    const embeddedSupImg = await safeEmbedImage(pdfDoc, supImgData);
    if (embeddedSupImg) {
      sigPage.drawImage(embeddedSupImg, {
        x: leftColX,
        y: boxBottomY + 25,
        width: 130,
        height: 45,
      });
    } else {
      sigPage.drawText(sup.approvedByName, {
        x: leftColX + 4,
        y: boxBottomY + 42,
        size: 15,
        font: timesItalic,
        color: rgb(0.12, 0.23, 0.54),
      });
      sigPage.drawLine({
        start: { x: leftColX, y: boxBottomY + 34 },
        end: { x: leftColX + 145, y: boxBottomY + 34 },
        thickness: 1.2,
        color: rgb(0.12, 0.23, 0.54),
      });
    }
    sigPage.drawText('Digitally Signed & Endorsed by Supervisor', {
      x: leftColX,
      y: boxBottomY + 12,
      size: 7,
      font: helvetica,
      color: rgb(0.3, 0.4, 0.6),
    });
  } else {
    sigPage.drawText('Status: Pending Supervisor Digital Signature', {
      x: leftColX,
      y: boxTopY - 45,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  // Divider line
  sigPage.drawLine({
    start: { x: midX - 4, y: boxBottomY + 8 },
    end: { x: midX - 4, y: boxTopY - 4 },
    thickness: 1,
    color: rgb(0.82, 0.86, 0.94),
  });

  // Right Column: Coordinator Signature & Official Department Seal
  sigPage.drawText('2. COORDINATOR SIGNATURE & DEPARTMENT SEAL', {
    x: rightColX,
    y: boxTopY - 12,
    size: 8.5,
    font: helveticaBold,
    color: rgb(0.12, 0.25, 0.68),
  });

  if (coord) {
    sigPage.drawText(`Verified By: ${coord.approvedByName}`, {
      x: rightColX,
      y: boxTopY - 28,
      size: 8.5,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    sigPage.drawText(`Date: ${new Date(coord.approvedAt).toLocaleString()} (LOCKED)`, {
      x: rightColX,
      y: boxTopY - 42,
      size: 7.5,
      font: helvetica,
      color: rgb(0.05, 0.45, 0.25),
    });

    const coordSigData = await resolveImageBytes(coord.signatureUrl, coord.signatureDataUrl);
    const embeddedCoordSig = await safeEmbedImage(pdfDoc, coordSigData);
    if (embeddedCoordSig) {
      sigPage.drawImage(embeddedCoordSig, {
        x: rightColX,
        y: boxBottomY + 25,
        width: 110,
        height: 42,
      });
    } else {
      sigPage.drawText(coord.approvedByName, {
        x: rightColX + 2,
        y: boxBottomY + 42,
        size: 14,
        font: timesItalic,
        color: rgb(0.12, 0.23, 0.54),
      });
      sigPage.drawLine({
        start: { x: rightColX, y: boxBottomY + 34 },
        end: { x: rightColX + 115, y: boxBottomY + 34 },
        thickness: 1.2,
        color: rgb(0.12, 0.23, 0.54),
      });
    }

    const stampX = rightColX + 125;
    const coordStampData = await resolveImageBytes(coord.stampUrl, coord.stampDataUrl);
    const embeddedStamp = await safeEmbedImage(pdfDoc, coordStampData);
    if (embeddedStamp) {
      sigPage.drawImage(embeddedStamp, {
        x: stampX,
        y: boxBottomY + 22,
        width: 105,
        height: 46,
      });
    } else {
      sigPage.drawRectangle({
        x: stampX,
        y: boxBottomY + 24,
        width: 110,
        height: 42,
        borderColor: rgb(0.11, 0.3, 0.85),
        borderWidth: 1.8,
        color: rgb(0.95, 0.97, 1),
      });
      sigPage.drawText('CS & SE DEPARTMENT', {
        x: stampX + 10,
        y: boxBottomY + 51,
        size: 7,
        font: helveticaBold,
        color: rgb(0.11, 0.3, 0.85),
      });
      sigPage.drawText('OFFICIAL FYP SEAL', {
        x: stampX + 14,
        y: boxBottomY + 39,
        size: 7,
        font: helveticaBold,
        color: rgb(0.11, 0.3, 0.85),
      });
      sigPage.drawText('APPROVED & LOCKED', {
        x: stampX + 16,
        y: boxBottomY + 29,
        size: 6,
        font: helvetica,
        color: rgb(0.05, 0.45, 0.25),
      });
    }
  } else {
    sigPage.drawText('Status: Awaiting Coordinator Official Seal', {
      x: rightColX,
      y: boxTopY - 45,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  const modifiedBytes = await pdfDoc.save();
  return Buffer.from(modifiedBytes);
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Appends an Official Digital Signature & Departmental Stamp block at the very end of a .docx Word file
 * without touching any existing paragraphs, fonts, styles, or alignment!
 */
export async function stampDocxBuffer(
  docxBytes: Uint8Array | Buffer,
  docMeta: {
    title: string;
    type: string;
    semesterNumber: number;
    supervisorApproval?: ApprovalMeta;
    coordinatorApproval?: ApprovalMeta;
  }
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(docxBytes);
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) {
    return Buffer.from(docxBytes);
  }

  let xml = await docXmlFile.async('string');
  xml = xml.replace(/<!-- FYP_DIGITAL_ENDORSEMENT_START -->[\s\S]*?<!-- FYP_DIGITAL_ENDORSEMENT_END -->/g, '');

  const sup = docMeta.supervisorApproval;
  const coord = docMeta.coordinatorApproval;

  const supLine1 = sup
    ? `SIGNED BY SUPERVISOR: ${escapeXml(sup.approvedByName)}`
    : 'SUPERVISOR SIGNATURE: Pending';
  const supLine2 = sup
    ? `Digital Signature: [ ${escapeXml(sup.approvedByName)} ] | Date: ${escapeXml(new Date(sup.approvedAt).toLocaleString())}`
    : '';
  const supLine3 = sup?.comments ? `Remarks: ${escapeXml(sup.comments)}` : '';

  const coordLine1 = coord
    ? `STAMPED & LOCKED BY COORDINATOR: ${escapeXml(coord.approvedByName)}`
    : 'COORDINATOR OFFICIAL STAMP: Pending';
  const coordLine2 = coord
    ? `Official Seal: [ CS & SE DEPT OFFICIAL FYP SEAL — APPROVED ] | Date: ${escapeXml(new Date(coord.approvedAt).toLocaleString())}`
    : '';
  const coordLine3 = coord?.comments ? `Remarks: ${escapeXml(coord.comments)}` : '';

  const endorsementXml = `<!-- FYP_DIGITAL_ENDORSEMENT_START -->
<w:p>
  <w:pPr><w:pBdr><w:top w:val="single" w:sz="12" w:space="6" w:color="1D4ED8"/></w:pBdr></w:pPr>
  <w:r><w:rPr><w:b/><w:color w:val="1D4ED8"/><w:sz w:val="20"/></w:rPr><w:t>OFFICIAL UNIVERSITY FYP DIGITAL SIGNATURE &amp; DEPARTMENTAL SEAL (SEMESTER ${docMeta.semesterNumber})</w:t></w:r>
</w:p>
<w:p>
  <w:r><w:rPr><w:b/><w:color w:val="1E3A8A"/><w:sz w:val="18"/></w:rPr><w:t>${supLine1}</w:t></w:r>
</w:p>
${
  supLine2
    ? `<w:p><w:r><w:rPr><w:i/><w:color w:val="1E3A8A"/><w:sz w:val="16"/></w:rPr><w:t>${supLine2}</w:t></w:r></w:p>`
    : ''
}
${
  supLine3
    ? `<w:p><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>${supLine3}</w:t></w:r></w:p>`
    : ''
}
<w:p>
  <w:r><w:rPr><w:b/><w:color w:val="047857"/><w:sz w:val="18"/></w:rPr><w:t>${coordLine1}</w:t></w:r>
</w:p>
${
  coordLine2
    ? `<w:p><w:r><w:rPr><w:b/><w:color w:val="1D4ED8"/><w:sz w:val="16"/></w:rPr><w:t>${coordLine2}</w:t></w:r></w:p>`
    : ''
}
${
  coordLine3
    ? `<w:p><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>${coordLine3}</w:t></w:r></w:p>`
    : ''
}
<!-- FYP_DIGITAL_ENDORSEMENT_END -->`;

  if (xml.includes('<w:sectPr')) {
    const lastSectIndex = xml.lastIndexOf('<w:sectPr');
    xml = xml.slice(0, lastSectIndex) + endorsementXml + xml.slice(lastSectIndex);
  } else if (xml.includes('</w:body>')) {
    xml = xml.replace('</w:body>', `${endorsementXml}</w:body>`);
  }

  zip.file('word/document.xml', xml);
  const updatedBuf = await zip.generateAsync({ type: 'nodebuffer' });
  return updatedBuf;
}

/**
 * Automatically embeds the Supervisor Signature and/or Coordinator Signature + Stamp
 * directly into the uploaded file on disk AND updates doc.fileDataUrl in the database.
 */
export async function applyEmbeddedSignaturesToDocument(doc: any): Promise<{ fileDataUrl?: string }> {
  try {
    const { buffer: rawBuffer, ext, diskFilePath } = resolveDocumentRawBuffer(doc);
    if (!rawBuffer) {
      return {};
    }

    const isPdf = ext === '.pdf' || (rawBuffer.length > 4 && rawBuffer.subarray(0, 4).toString() === '%PDF');
    const isDocx = ext === '.docx' || (rawBuffer.length > 4 && rawBuffer[0] === 0x50 && rawBuffer[1] === 0x4b);

    let updatedBuffer: Buffer | null = null;
    let mimeType = 'application/pdf';

    if (isPdf) {
      updatedBuffer = await stampPdfBuffer(rawBuffer, {
        title: doc.title,
        type: doc.type,
        semesterNumber: doc.semesterNumber,
        supervisorApproval: doc.supervisorApproval,
        coordinatorApproval: doc.coordinatorApproval,
      });
      mimeType = 'application/pdf';
    } else if (isDocx) {
      updatedBuffer = await stampDocxBuffer(rawBuffer, {
        title: doc.title,
        type: doc.type,
        semesterNumber: doc.semesterNumber,
        supervisorApproval: doc.supervisorApproval,
        coordinatorApproval: doc.coordinatorApproval,
      });
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    if (updatedBuffer) {
      if (diskFilePath) {
        fs.writeFileSync(diskFilePath, updatedBuffer);
      }
      const newFileDataUrl = `data:${mimeType};base64,${updatedBuffer.toString('base64')}`;
      return { fileDataUrl: newFileDataUrl };
    }
  } catch (err) {
    console.warn('Error embedding signature/stamp into document file:', err);
  }
  return {};
}
