/**
 * Generates an Excel-compatible XML (SpreadsheetML) string.
 * This format supports basic styling (bold, colors) and number formatting.
 */
export function generateExcelReport(
  data: {
    from: string;
    to: string;
    summary: {
      totalBookings: number;
      totalRevenue: number;
      avgBookingValue: number;
      confirmedBookings: number;
      cancelledBookings: number;
    };
    bookings: any[];
  }
) {
  const { from, to, summary, bookings } = data;

  const xmlHeader = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="18" ss:Color="#1E293B" ss:Bold="1"/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="12" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#EA580C" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="SubHeader">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#475569" ss:Bold="1"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Currency">
   <NumberFormat ss:Format="&quot;₹&quot;#,##0"/>
  </Style>
  <Style ss:ID="Date">
   <NumberFormat ss:Format="Short Date"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Financial Report">
  <Table ss:ExpandedColumnCount="10" ss:ExpandedRowCount="${bookings.length + 20}" x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="15">
   <Column ss:Width="100"/>
   <Column ss:Width="150"/>
   <Column ss:Width="100"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   
   <Row ss:AutoFitHeight="0" ss:Height="30">
    <Cell ss:StyleID="Title"><Data ss:Type="String">Bookal Financial Report</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Period: ${from} to ${to}</Data></Cell>
   </Row>
   <Row ss:Index="5">
    <Cell ss:StyleID="SubHeader"><Data ss:Type="String">SUMMARY</Data></Cell>
    <Cell ss:StyleID="SubHeader"><Data ss:Type="String">VALUE</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Total Bookings</Data></Cell>
    <Cell><Data ss:Type="Number">${summary.totalBookings}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Total Revenue</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${summary.totalRevenue}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Avg Booking Value</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${summary.avgBookingValue}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Confirmed</Data></Cell>
    <Cell><Data ss:Type="Number">${summary.confirmedBookings}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Cancelled</Data></Cell>
    <Cell><Data ss:Type="Number">${summary.cancelledBookings}</Data></Cell>
   </Row>

   <Row ss:Index="12" ss:Height="20">
    <Cell ss:StyleID="Header"><Data ss:Type="String">Booking Ref</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Customer</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Phone</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Date</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Start</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">End</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Amount</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Status</Data></Cell>
   </Row>
   ${bookings
     .map(
       (b) => `
   <Row>
    <Cell><Data ss:Type="String">${b.bookingRef}</Data></Cell>
    <Cell><Data ss:Type="String">${b.customerName}</Data></Cell>
    <Cell><Data ss:Type="String">${b.phoneNumbers?.[0] || ""}</Data></Cell>
    <Cell ss:StyleID="Date"><Data ss:Type="String">${b.bookingDate}</Data></Cell>
    <Cell><Data ss:Type="String">${b.startTime}</Data></Cell>
    <Cell><Data ss:Type="String">${b.endTime}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${b.totalAmount}</Data></Cell>
    <Cell><Data ss:Type="String">${b.status}</Data></Cell>
   </Row>`
     )
     .join("")}
  </Table>
 </Worksheet>
</Workbook>`;

  return xmlHeader;
}

/**
 * Triggers a browser download of the Excel file.
 */
export function downloadExcelFile(xmlContent: string, filename: string) {
  // On Web, use standard Blob/URL APIs
  const blob = new Blob([xmlContent], { type: "application/vnd.ms-excel" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
