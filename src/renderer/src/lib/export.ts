import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function exportToExcel(data: any[], fileName: string, sheetName: string = 'Sheet1') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    if (data.length > 0) {
        // Add headers
        const headers = Object.keys(data[0]);
        worksheet.addRow(headers);

        // Add rows
        data.forEach(item => {
            const values = Object.values(item).map(val =>
                typeof val === 'object' ? JSON.stringify(val) : val
            );
            worksheet.addRow(values);
        });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${fileName}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
}

export function exportToPDF(data: any[], fileName: string, title: string) {
    const doc = new jsPDF();

    doc.text(title, 14, 15);

    if (data.length > 0) {
        const headers = [Object.keys(data[0])];
        const rows = data.map(item => Object.values(item).map(val =>
            typeof val === 'object' ? JSON.stringify(val) : String(val)
        ));

        autoTable(doc, {
            head: headers,
            body: rows,
            startY: 20,
            theme: 'grid',
            headStyles: { fillColor: [42, 126, 251] }
        });
    }

    doc.save(`${fileName}.pdf`);
}
