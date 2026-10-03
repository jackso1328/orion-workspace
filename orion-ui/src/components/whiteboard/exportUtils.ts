import JSZip from 'jszip';
import PptxGenJS from 'pptxgenjs';
import { jsPDF } from 'jspdf';
import { Page, WhiteboardObject, ShapeObject, ArrowObject, FreehandObject, StickyObject, TextObject, ImageObject } from './types';
import { getStickyColor, getBoundingBox } from './utils';

function escapeHtml(unsafe: string) {
    return (unsafe || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function objectsToSvgString(objects: Record<string, WhiteboardObject>): string {
  const objList = Object.values(objects);
  if (objList.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600" style="background: #f8f9fa;"></svg>`;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  objList.forEach(obj => {
    const bb = getBoundingBox(obj);
    if (bb.minX < minX) minX = bb.minX;
    if (bb.minY < minY) minY = bb.minY;
    if (bb.maxX > maxX) maxX = bb.maxX;
    if (bb.maxY > maxY) maxY = bb.maxY;
  });

  const padding = 32;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  let svgContent = '';
  
  objList.sort((a, b) => a.zIndex - b.zIndex).forEach(obj => {
    svgContent += `<g transform="translate(${obj.x}, ${obj.y}) rotate(${obj.rotation || 0})">`;
    
    if (obj.type === 'rectangle') {
      const o = obj as ShapeObject;
      svgContent += `<rect width="${Math.max(1, o.width)}" height="${Math.max(1, o.height)}" rx="8" fill="${o.fillColor || 'none'}" stroke="${o.strokeColor}" stroke-width="${o.strokeWidth}" />`;
    } else if (obj.type === 'ellipse') {
      const o = obj as ShapeObject;
      svgContent += `<ellipse cx="${o.width/2}" cy="${o.height/2}" rx="${Math.max(1, o.width/2)}" ry="${Math.max(1, o.height/2)}" fill="${o.fillColor || 'none'}" stroke="${o.strokeColor}" stroke-width="${o.strokeWidth}" />`;
    } else if (obj.type === 'diamond') {
      const o = obj as ShapeObject;
      svgContent += `<polygon points="${o.width/2},0 ${o.width},${o.height/2} ${o.width/2},${o.height} 0,${o.height/2}" fill="${o.fillColor || 'none'}" stroke="${o.strokeColor}" stroke-width="${o.strokeWidth}" />`;
    } else if (obj.type === 'line') {
      const o = obj as ArrowObject;
      svgContent += `<line x1="0" y1="0" x2="${o.width}" y2="${o.height}" stroke="${o.strokeColor}" stroke-width="${o.strokeWidth}" />`;
    } else if (obj.type === 'arrow') {
      const o = obj as ArrowObject;
      const angle = Math.atan2(o.height, o.width) * 180 / Math.PI;
      svgContent += `<g><line x1="0" y1="0" x2="${o.width}" y2="${o.height}" stroke="${o.strokeColor}" stroke-width="${o.strokeWidth}" /><polygon points="0,0 -12,6 -12,-6" fill="${o.strokeColor}" transform="translate(${o.width}, ${o.height}) rotate(${angle})" /></g>`;
    } else if (obj.type === 'freehand') {
      const o = obj as FreehandObject;
      const points = o.points.map(p => `${p.x},${p.y}`).join(' ');
      svgContent += `<polyline points="${points}" fill="none" stroke="${o.strokeColor}" stroke-width="${o.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
    } else if (obj.type === 'sticky') {
      const o = obj as StickyObject;
      const colors = getStickyColor(o.colorVariant);
      svgContent += `<rect width="${Math.max(10, o.width)}" height="${Math.max(10, o.height)}" rx="4" fill="${colors.bg}" stroke="${colors.border}" stroke-width="1" />`;
      svgContent += `<foreignObject x="10" y="10" width="${Math.max(1, o.width - 20)}" height="${Math.max(1, o.height - 20)}">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width: 100%; height: 100%; font-size: 18px; font-family: sans-serif; color: #1e293b; overflow-wrap: break-word; overflow: hidden; margin: 0; padding: 0;">
          ${escapeHtml(o.text)}
        </div>
      </foreignObject>`;
    } else if (obj.type === 'text') {
      const o = obj as TextObject;
      svgContent += `<text x="0" y="24" font-size="${o.fontSize}" fill="${o.color}" font-family="sans-serif">${escapeHtml(o.text)}</text>`;
    } else if (obj.type === 'image') {
      const o = obj as ImageObject;
      svgContent += `<image href="${o.dataUrl}" width="${o.width}" height="${o.height}" preserveAspectRatio="none" />`;
    }
    
    svgContent += `</g>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width}" height="${height}" style="background: #f8f9fa;">${svgContent}</svg>`;
}

export async function exportToSvg(objects: Record<string, WhiteboardObject>): Promise<void> {
  const source = objectsToSvgString(objects);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, 'whiteboard.svg');
}

export async function getPngDataUrl(objects: Record<string, WhiteboardObject>): Promise<string> {
  return new Promise((resolve, reject) => {
    const source = objectsToSvgString(objects);
    const img = new Image();
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    // Parse dimensions from the SVG string
    const widthMatch = source.match(/width="([^"]+)"/);
    const heightMatch = source.match(/height="([^"]+)"/);
    const width = widthMatch ? parseFloat(widthMatch[1]) : 800;
    const height = heightMatch ? parseFloat(heightMatch[1]) : 600;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject('No context');
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      reject('Image load failed');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export async function exportToPng(objects: Record<string, WhiteboardObject>): Promise<void> {
  try {
    const dataUrl = await getPngDataUrl(objects);
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    await downloadBlob(blob, 'whiteboard.png');
  } catch (e) {
    console.error(e);
    alert('Failed to export PNG');
  }
}

export async function exportToZip(pages: Page[], onProgress?: (msg: string) => void): Promise<void> {
  const zip = new JSZip();
  try {
    const seenNames = new Set<string>();
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      if (onProgress) onProgress(`Exporting page ${i + 1} of ${pages.length}...`);
      
      let baseName = page.name.trim().replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (!baseName) baseName = 'Untitled';
      
      let finalName = baseName;
      let counter = 2;
      while (seenNames.has(finalName)) {
        finalName = `${baseName}-${counter}`;
        counter++;
      }
      seenNames.add(finalName);
      
      const prefix = (i + 1).toString().padStart(2, '0');
      const filename = `${prefix}-${finalName}.png`;
      
      const dataUrl = await getPngDataUrl(page.objects);
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      zip.file(filename, base64Data, { base64: true });
    }
    
    if (onProgress) onProgress('Zipping files...');
    const content = await zip.generateAsync({ type: 'blob' });
    await downloadBlob(content, 'whiteboard_pages.zip');
  } catch(e) {
    console.error(e);
    throw e;
  }
}

export async function exportToPptx(pages: Page[], onProgress?: (msg: string) => void): Promise<void> {
  try {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9'; // 13.333 x 7.5 inches
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      if (onProgress) onProgress(`Rendering slide ${i + 1} of ${pages.length}...`);
      
      const dataUrl = await getPngDataUrl(page.objects);
      
      // Calculate image dimensions to fit 16:9 while preserving aspect ratio
      const img = new Image();
      img.src = dataUrl;
      await new Promise(resolve => { img.onload = resolve; });
      
      const slideW = 13.333;
      const slideH = 7.5;
      const slideRatio = slideW / slideH;
      const imgRatio = img.width / Math.max(1, img.height);
      
      let w, h, x, y;
      if (imgRatio > slideRatio) {
        w = slideW;
        h = slideW / imgRatio;
        x = 0;
        y = (slideH - h) / 2;
      } else {
        h = slideH;
        w = slideH * imgRatio;
        y = 0;
        x = (slideW - w) / 2;
      }
      
      const slide = pptx.addSlide();
      slide.background = { color: 'F8F9FA' };
      slide.addImage({ data: dataUrl, x, y, w, h });
    }
    
    if (onProgress) onProgress('Generating presentation...');
    const blob = (await pptx.write({ outputType: 'blob' })) as Blob;
    await downloadBlob(blob, 'Orion-Whiteboard.pptx');
  } catch(e) {
    console.error(e);
    throw e;
  }
}

export async function exportToPdf(pages: Page[], onProgress?: (msg: string) => void): Promise<void> {
  try {
    let pdf: jsPDF | null = null;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      if (onProgress) onProgress(`Rendering PDF page ${i + 1} of ${pages.length}...`);
      
      const dataUrl = await getPngDataUrl(page.objects);
      const img = new Image();
      img.src = dataUrl;
      await new Promise(resolve => { img.onload = resolve; });
      
      const orientation = img.width > img.height ? 'landscape' : 'portrait';
      
      if (!pdf) {
        pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
      } else {
        pdf.addPage('a4', orientation);
      }
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const scale = Math.min(pdfWidth / img.width, pdfHeight / img.height);
      const finalW = img.width * scale;
      const finalH = img.height * scale;
      
      const x = (pdfWidth - finalW) / 2;
      const y = (pdfHeight - finalH) / 2;
      
      pdf.setFillColor(248, 249, 250);
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
      
      pdf.addImage(dataUrl, 'PNG', x, y, finalW, finalH);
    }
    
    if (pdf) {
      if (onProgress) onProgress('Generating PDF...');
      const blob = pdf.output('blob');
      await downloadBlob(blob, 'Orion-Whiteboard.pdf');
    }
  } catch(e) {
    console.error(e);
    throw e;
  }
}

async function downloadBlob(blob: Blob, filename: string) {
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (e: any) {
      if (e.name === 'AbortError') {
        return; // User cancelled
      }
      console.error('SaveFilePicker failed, falling back:', e);
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
