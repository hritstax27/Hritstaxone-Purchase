type ClassValue = string | number | boolean | undefined | null | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  return inputs
    .flat()
    .filter((x) => typeof x === "string" && x.trim())
    .join(" ");
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    reviewed: "bg-blue-100 text-blue-700",
    approved: "bg-green-100 text-green-700",
    pushed_to_tally: "bg-purple-100 text-purple-700",
    paid: "bg-emerald-100 text-emerald-700",
    pending: "bg-yellow-100 text-yellow-700",
    processing: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}

export function generateTallyXML(invoice: any): string {
  const items = invoice.items || [];
  const itemEntries = items
    .map(
      (item: any) => `
        <ALLINVENTORYENTRIES.LIST>
          <STOCKITEMNAME>${escapeXml(item.description)}</STOCKITEMNAME>
          <RATE>${item.unitPrice}/${item.unit || "pcs"}</RATE>
          <ACTUALQTY>${item.quantity} ${item.unit || "pcs"}</ACTUALQTY>
          <AMOUNT>${item.totalAmount}</AMOUNT>
        </ALLINVENTORYENTRIES.LIST>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Purchase" ACTION="Create">
            <DATE>${new Date(invoice.invoiceDate).toISOString().split("T")[0].replace(/-/g, "")}</DATE>
            <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXml(invoice.invoiceNumber)}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${escapeXml(invoice.vendor?.name || "Unknown Vendor")}</PARTYLEDGERNAME>
            <BASICBASEPARTYNAME>${escapeXml(invoice.vendor?.name || "Unknown Vendor")}</BASICBASEPARTYNAME>
            ${invoice.vendor?.gstin ? `<PARTYGSTIN>${escapeXml(invoice.vendor.gstin)}</PARTYGSTIN>` : ""}
            <EFFECTIVEDATE>${new Date(invoice.invoiceDate).toISOString().split("T")[0].replace(/-/g, "")}</EFFECTIVEDATE>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(invoice.vendor?.name || "Unknown Vendor")}</LEDGERNAME>
              <AMOUNT>-${invoice.totalAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Purchase Account</LEDGERNAME>
              <AMOUNT>${invoice.subtotal}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            ${
              invoice.taxAmount > 0
                ? `<ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>GST Input</LEDGERNAME>
              <AMOUNT>${invoice.taxAmount}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`
                : ""
            }
            ${itemEntries}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

function escapeXml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function calculateInvoiceTotals(
  items: { quantity: number; unitPrice: number; gstRate: number }[]
) {
  let subtotal = 0;
  let taxAmount = 0;

  for (const item of items) {
    const lineTotal = item.quantity * item.unitPrice;
    const gst = (lineTotal * item.gstRate) / 100;
    subtotal += lineTotal;
    taxAmount += gst;
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round((subtotal + taxAmount) * 100) / 100,
  };
}
