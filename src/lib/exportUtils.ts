export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escape = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(filename.endsWith('.csv') ? filename : `${filename}.csv`, blob);
}

export function downloadExcel(filename: string, sheetTitle: string, headers: string[], rows: (string | number)[][]): void {
  const escXml = (s: string | number) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const headerCells = headers.map((h) => `<Cell><Data ss:Type="String">${escXml(h)}</Data></Cell>`).join('');
  const dataRows = rows
    .map(
      (row) =>
        `<Row>${row
          .map((cell) => {
            const isNum = typeof cell === 'number' && !Number.isNaN(cell);
            return `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${escXml(cell)}</Data></Cell>`;
          })
          .join('')}</Row>`
    )
    .join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="${escXml(sheetTitle.slice(0, 30))}">
  <Table>
   <Row>${headerCells}</Row>
   ${dataRows}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  triggerDownload(filename.endsWith('.xls') ? filename : `${filename}.xls`, blob);
}

export function exportHtmlToPrintPdf(title: string, bodyHtml: string): void {
  const container = document.createElement('div');
  container.className = 'print-export-sheet';
  container.innerHTML = `
    <div style="font-family: 'DM Sans', Arial, sans-serif; padding: 32px; color: #0f172a;">
      <div style="border-bottom: 2px solid #1e40af; padding-bottom: 12px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 20px; color: #1e40af;">THE ZONE OF CHEMISTRY</h1>
        <p style="margin: 4px 0 0; font-size: 12px; color: #475569;">Station Road / Chandmari, Motihari, Bihar · Director: S. K. Srivastav</p>
      </div>
      <h2 style="font-size: 16px; margin-bottom: 16px;">${title}</h2>
      ${bodyHtml}
    </div>
  `;
  const style = document.createElement('style');
  style.textContent = `
    @media print {
      body > *:not(.print-export-sheet) { display: none !important; }
      .print-export-sheet { display: block !important; position: static !important; }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(container);
  window.print();
  setTimeout(() => {
    document.body.removeChild(container);
    document.head.removeChild(style);
  }, 500);
}

export function downloadJsonBackup(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  triggerDownload(filename, blob);
}

function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
