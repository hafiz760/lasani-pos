interface PrintOptions {
  title: string
  content: string
  styles?: string
}

export const printContent = async ({
  title,
  content,
  styles = "",
}: PrintOptions) => {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body {
      font-family: "Courier New", monospace;
      padding: 4mm;
      margin: 0;
      font-size: 12px;
      line-height: 1.2;
      color: #000;
      background: #fff;
    }

    /* Alignment */
    .text-center { text-align: center; }
    .text-right { text-align: right; }

    /* Font sizes */
    .fs-lg { font-size: 16px; font-weight: bold; }
    .fs-md { font-size: 12px;  }
    .fs-sm { font-size: 10px; }
    .fs-xs { font-size: 9px; }

    .font-bold { font-weight: bold; }
    .uppercase { text-transform: uppercase; }

    /* Spacing */
    .mt-1 { margin-top: 2px; }
    .mt-2 { margin-top: 4px; }
    .mt-3 { margin-top: 6px; }
    .mb-2 { margin-bottom: 4px; }
    .mb-3 { margin-bottom: 6px; }
    .pt-2 { padding-top: 4px; }

    /* Borders (THERMAL SAFE) */
    .border-bottom {
      border-bottom: 1px dashed #000;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }

    .border-top {
      border-top: 1px dashed #000;
      padding-top: 4px;
      margin-top: 6px;
    }

    /* Flex */
    .flex {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    @media print {
      @page {
        size: 80mm auto;
        margin: 0;
      }
    }

    ${styles}
  </style>
</head>
<body>
  ${content.replace(/<svg[\s\S]*?<\/svg>/g, '') /* Strip any SVGs */}
</body>
</html>
`

  try {
    if (!window.api?.printer) {
      alert("Printer API not available")
      return
    }
    await window.api.printer.printReceipt(htmlContent)
  } catch (err) {
    console.error("Print failed:", err)
    alert("Print failed")
  }
}
