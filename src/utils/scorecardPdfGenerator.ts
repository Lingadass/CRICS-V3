import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TranslationDictionary } from '../i18n/translations';
import type { ExportScorecardData } from './scorecardExportUtils';

export interface PdfRowBound {
  pageNumber: number;
  topY: number;
  bottomY: number;
  pageBottomLimitY: number;
}

export interface GeneratedScorecardPdfResult {
  doc: jsPDF;
  pdfBytes: Uint8Array;
  blob: Blob;
  pageCount: number;
  rowBounds: PdfRowBound[];
}

export function generateScorecardPdfBytes(
  data: ExportScorecardData,
  t: TranslationDictionary,
  chartsImageDataUrl?: string
): GeneratedScorecardPdfResult {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const bottomMargin = 16;
  const pageBottomLimitY = pageHeight - bottomMargin;
  const rowBounds: PdfRowBound[] = [];

  const recordRow = (hookData: {
    section: string;
    column: { index: number };
    pageNumber: number;
    cell: { y: number; height: number };
  }) => {
    if (hookData.section === 'body' && hookData.column.index === 0) {
      rowBounds.push({
        pageNumber: hookData.pageNumber,
        topY: hookData.cell.y,
        bottomY: hookData.cell.y + hookData.cell.height,
        pageBottomLimitY,
      });
    }
  };

  // Page 1: Match Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(data.matchTitle, marginX, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${t.scorecards.datePrefix}: ${data.date}  |  ${t.scorecards.venuePrefix}: ${data.venue}  |  ${data.format}  |  ${t.scorecards.scorerLabel}: ${data.scorerName}`,
    marginX,
    25
  );
  doc.text(`${t.scorecards.tossPrefix}: ${data.tossText}`, marginX, 31);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(21, 128, 61);
  doc.text(`${t.scorecards.resultPrefix}: ${data.resultText}`, marginX, 38);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`${t.scorecards.potmLabel}: ${data.potmText}`, marginX, 44);

  let currentY = 50;

  data.innings.forEach((inn, idx) => {
    if (idx > 0) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(inn.headingText, marginX, currentY);
    currentY += 4;

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX, top: 16, bottom: bottomMargin },
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
      head: [[
        `${inn.battingTeamName} ${t.scorecards.battingSuffix}`,
        t.scorecards.statusCol,
        t.scorecards.runsCol,
        t.scorecards.ballsCol,
        t.scorecards.foursCol,
        t.scorecards.sixesCol,
        t.scorecards.srCol,
      ]],
      body: [
        ...inn.battingRows.map((b) => [
          b.batterName, b.statusText, String(b.runs), String(b.balls),
          String(b.fours), String(b.sixes), b.strikeRate,
        ]),
        [t.scorecards.extrasLabel, inn.extrasText, '', '', '', '', ''],
        [t.scorecards.totalLabel, inn.totalText, '', '', '', '', ''],
        ...(inn.didNotBatNames.length > 0
          ? [[t.scorecards.didNotBatLabel, inn.didNotBatText, '', '', '', '', '']]
          : []),
      ],
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
      bodyStyles: { textColor: [15, 23, 42], fontSize: 8.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didDrawCell: recordRow,
    });

    const last1 = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    currentY = (last1?.finalY ?? currentY + 20) + 6;

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX, top: 16, bottom: bottomMargin },
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
      head: [[
        `${inn.bowlingTeamName} ${t.scorecards.bowlingSuffix}`,
        t.scorecards.oversCol,
        t.scorecards.maidensCol,
        t.scorecards.runsCol,
        t.scorecards.wicketsCol,
        t.scorecards.econCol,
      ]],
      body: inn.bowlingRows.map((bw) => [
        bw.bowlerName, bw.overs, String(bw.maidens), String(bw.runs), String(bw.wickets), bw.economy,
      ]),
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
      bodyStyles: { textColor: [15, 23, 42], fontSize: 8.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didDrawCell: recordRow,
    });

    const last2 = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    currentY = (last2?.finalY ?? currentY + 20) + 6;

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX, top: 16, bottom: bottomMargin },
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
      head: [[t.scorecards.fallOfWickets]],
      body: inn.fallOfWickets.length > 0
        ? [[inn.fallOfWickets.map((f) => f.formattedText).join('  ·  ')]]
        : [[t.scorecards.noWicketsFell]],
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
      bodyStyles: { textColor: [15, 23, 42], fontSize: 8 },
      didDrawCell: recordRow,
    });

    const last3 = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    currentY = (last3?.finalY ?? currentY + 12) + 6;

    if (inn.partnerships.length > 0) {
      autoTable(doc, {
        startY: currentY,
        margin: { left: marginX, right: marginX, top: 16, bottom: bottomMargin },
        rowPageBreak: 'avoid',
        showHead: 'everyPage',
        head: [[t.scorecards.partnerships, `${t.scorecards.runsCol} (${t.scorecards.ballsCol})`]],
        body: inn.partnerships.map((pt) => [
          `${pt.batter1Name} & ${pt.batter2Name}`,
          `${pt.runs}${pt.isUnbroken ? '*' : ''} (${pt.balls}${t.scoring.ballsSuffix})`,
        ]),
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
        bodyStyles: { textColor: [15, 23, 42], fontSize: 8 },
        didDrawCell: recordRow,
      });
    }
  });

  if (chartsImageDataUrl) {
    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`${t.scorecards.manhattanChart} & ${t.scorecards.wormChart}`, marginX, 18);
    try {
      const imgProps = doc.getImageProperties(chartsImageDataUrl);
      const maxW = pageWidth - marginX * 2;
      const maxH = pageBottomLimitY - 26;
      const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
      doc.addImage(chartsImageDataUrl, 'PNG', marginX, 24, imgProps.width * ratio, imgProps.height * ratio);
    } catch {
      // Ignore invalid chart data URL in headless environments
    }
  }

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(t.scorecards.cricsFooter, marginX, pageHeight - 8);
    const pageLabel = t.scorecards.pageOfTpl
      .replace('{page}', String(p))
      .replace('{total}', String(totalPages));
    doc.text(pageLabel, pageWidth - marginX, pageHeight - 8, { align: 'right' });
  }

  const arrayBuffer = doc.output('arraybuffer');
  const pdfBytes = new Uint8Array(arrayBuffer);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });

  return { doc, pdfBytes, blob, pageCount: totalPages, rowBounds };
}
