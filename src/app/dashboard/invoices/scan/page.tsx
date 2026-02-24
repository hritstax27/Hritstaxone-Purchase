"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  ScanLine,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Search,
  TrendingUp,
  TrendingDown,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";

interface ExtractedItem {
  category: string;
  description: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
}

interface ExtractedData {
  invoiceNumber: string;
  invoiceDate: string;
  vendorName: string;
  vendorGstin: string;
  vendorPhone: string;
  vendorAddress: string;
  items: ExtractedItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  cess: number;
  totalAmount: number;
  rawText: string;
}

interface VendorOption {
  id: string;
  name: string;
  gstin?: string;
  phone?: string;
}

interface CategoryOption {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
}

interface PriceChange {
  itemName: string;
  oldPrice: number;
  newPrice: number;
  lastDate: string;
  lastVendor: string;
  change: number;
  changePercent: number;
}

function ComboBox({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (val: string, id?: string) => void;
  options: { id: string; name: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setSearch(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <input
          type="text"
          className="input-field text-sm pr-8"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
          onClick={() => setOpen(!open)}
          tabIndex={-1}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {filtered.map((o) => (
            <button
              type="button"
              key={o.id}
              className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 hover:text-primary-700"
              onClick={() => {
                setSearch(o.name);
                onChange(o.name, o.id);
                setOpen(false);
              }}
            >
              {o.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ScanInvoicePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [imageUrl, setImageUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [vendorSearchText, setVendorSearchText] = useState("");
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([]);
  const [showPricePopup, setShowPricePopup] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const vendorDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(event.target as Node)) {
        setShowVendorDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const f = acceptedFiles[0];
      setFile(f);
      setExtractedData(null);
      if (f.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(f));
      } else {
        setPreviewUrl("");
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(vendorSearchText.toLowerCase())
  );

  function selectVendor(vendor: VendorOption) {
    setSelectedVendorId(vendor.id);
    setVendorSearchText(vendor.name);
    setShowVendorDropdown(false);
    if (extractedData) {
      setExtractedData({
        ...extractedData,
        vendorGstin: vendor.gstin || extractedData.vendorGstin || "",
        vendorPhone: vendor.phone || extractedData.vendorPhone || "",
      });
    }
  }

  function clearVendor() {
    setSelectedVendorId("");
    setVendorSearchText("");
  }

  // Build a lookup: subcategory name -> category name from existing data
  function getCategoryForItem(itemName: string): string {
    const lowerName = itemName.toLowerCase().trim();
    for (const cat of categories) {
      for (const sub of cat.subcategories) {
        if (sub.name.toLowerCase().trim() === lowerName ||
            lowerName.includes(sub.name.toLowerCase().trim()) ||
            sub.name.toLowerCase().trim().includes(lowerName)) {
          return cat.name;
        }
      }
    }
    return "Other";
  }

  async function handleScan() {
    if (!file) return;

    setScanning(true);
    setScanProgress(0);

    try {
      setScanProgress(10);
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/invoices/scan", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "Upload failed");
      }

      const { imageUrl: url } = await uploadRes.json();
      setImageUrl(url);
      setScanProgress(20);

      const [vendorsRes, categoriesRes] = await Promise.all([
        fetch("/api/vendors"),
        fetch("/api/categories"),
      ]);

      let loadedVendors: VendorOption[] = [];
      let loadedCategories: CategoryOption[] = [];

      if (vendorsRes.ok) {
        const vendorsData = await vendorsRes.json();
        loadedVendors = Array.isArray(vendorsData) ? vendorsData : [];
        setVendors(loadedVendors);
      }
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        loadedCategories = Array.isArray(categoriesData) ? categoriesData : [];
        setCategories(loadedCategories);
      }

      setScanProgress(30);
      toast.loading("Processing invoice with OCR...", { id: "ocr" });

      const Tesseract = await import("tesseract.js");
      setScanProgress(40);

      const worker = await Tesseract.createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setScanProgress(40 + Math.round(m.progress * 40));
          }
        },
      });

      await worker.setParameters({
        tessedit_pageseg_mode: 6 as any,
        preserve_interword_spaces: "1",
      });

      const { data: { text, confidence } } = await worker.recognize(file);
      await worker.terminate();
      setScanProgress(85);

      toast.dismiss("ocr");

      if (!text || text.trim().length < 5) {
        throw new Error("Could not extract text from the image. Please try a clearer image.");
      }

      console.log("OCR Raw Text:", text);
      console.log("OCR Confidence:", confidence);

      const parsed = parseOCRText(text, loadedCategories);
      setExtractedData(parsed);

      // Auto-match vendor
      if (parsed.vendorName) {
        setVendorSearchText(parsed.vendorName);
        const matchedVendor = loadedVendors.find((v) =>
          v.name.toLowerCase() === parsed.vendorName.toLowerCase() ||
          v.name.toLowerCase().includes(parsed.vendorName.toLowerCase()) ||
          parsed.vendorName.toLowerCase().includes(v.name.toLowerCase())
        );
        if (matchedVendor) {
          setSelectedVendorId(matchedVendor.id);
          setVendorSearchText(matchedVendor.name);
        }
      }

      setScanProgress(100);
      toast.success(`Invoice scanned! (${Math.round(confidence)}% confidence)`);
    } catch (error: any) {
      toast.dismiss("ocr");
      toast.error(error.message || "Scan failed. Please try again.");
      console.error("Scan error:", error);
    } finally {
      setScanning(false);
    }
  }

  function parseOCRText(text: string, cats: CategoryOption[]): ExtractedData {
    const rawText = text;
    const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

    // ====== GSTIN ======
    let vendorGstin = "";
    const gstinMatch = text.match(/([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][A-Z][0-9A-Z])/);
    if (gstinMatch) vendorGstin = gstinMatch[1].toUpperCase();

    // ====== PHONE ======
    let vendorPhone = "";
    const phoneMatch = text.match(/(?:Ph(?:one)?|Tel|Mob(?:ile)?|Contact)?\s*[:\-]?\s*(?:\+91[\s\-]?)?([6-9]\d{9})/i);
    if (phoneMatch) vendorPhone = phoneMatch[1];

    // ====== INVOICE NUMBER ======
    let invoiceNumber = "";
    const invPatterns = [
      /(?:Bill|Invoice|Receipt)\s*(?:#|No\.?|Num(?:ber)?)\s*[:\-]?\s*(\d[\w\-\/\.]*)/i,
      /(?:Bill|Invoice|Receipt)\s*(?:#|No\.?|Num(?:ber)?)\s*[:\-]?\s*([A-Z0-9][\w\-\/\.]+)/i,
    ];
    for (const pattern of invPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].length >= 1) {
        invoiceNumber = match[1].trim();
        break;
      }
    }
    if (!invoiceNumber) {
      invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
    }

    // ====== VENDOR NAME ======
    // Vendor name is typically the very first meaningful line(s) at the top
    let vendorName = "";
    const skipWords = /^(tax|invoice|bill\s*to|bill\s*no|receipt|date|gst|gstin|no\.?|ref|created|phone|tel|mob|fax|email|address|billing|ship|hsn|sac|s\.?no|item|description|particular|qty|quantity|rate|amount|total|sub|grand|cgst|sgst|igst|cess|discount|net|gross|round|balance|thank|page|www\.|http)/i;

    // Find where bill/invoice number line is
    let invoiceLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/(?:bill|invoice|receipt)\s*(?:#|no\.?|num)/i.test(lines[i])) {
        invoiceLineIdx = i;
        break;
      }
    }

    const vendorSearchLines = invoiceLineIdx > 0 ? lines.slice(0, invoiceLineIdx) : lines.slice(0, 6);
    for (const line of vendorSearchLines) {
      const clean = line.replace(/[^a-zA-Z\s]/g, "").trim();
      if (
        clean.length >= 3 &&
        !skipWords.test(clean) &&
        !/^\d+$/.test(line.trim()) &&
        !/^[0-9]{2}[A-Z]{5}/.test(line.trim()) &&
        !/^[6-9]\d{9}$/.test(line.replace(/\D/g, "")) &&
        !/^(volant|panjim|goa|mumbai|delhi|address)/i.test(clean) &&
        !/\d{6}/.test(line)
      ) {
        vendorName = line.replace(/[|].*$/, "").trim();
        vendorName = vendorName.replace(/\s*\d{4,}$/, "").trim();
        if (vendorName.length >= 2) break;
      }
    }

    // ====== ADDRESS ======
    let vendorAddress = "";
    for (const line of vendorSearchLines) {
      if (/\d{6}/.test(line) || /goa|mumbai|delhi|pune|bangalore|chennai|kolkata|hyderabad/i.test(line)) {
        vendorAddress = line.trim();
        break;
      }
    }

    // ====== DATE ======
    let invoiceDate = new Date().toISOString().split("T")[0];
    const dateContextPatterns = [
      /(?:Created\s*On|Invoice\s*Date|Bill\s*Date|Date)\s*[:\-]?\s*(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{2,4})/i,
      /(?:Created\s*On|Invoice\s*Date|Bill\s*Date|Date)\s*[:\-]?\s*(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{2,4})/i,
    ];

    let dateFound = false;
    for (const pattern of dateContextPatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          if (/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(match[2])) {
            const d = new Date(`${match[2]} ${match[1]}, ${match[3]}`);
            if (d && !isNaN(d.getTime()) && d.getFullYear() > 2000) {
              invoiceDate = fmtDateISO(d);
              dateFound = true;
              break;
            }
          } else {
            let year = parseInt(match[3]);
            if (year < 100) year += 2000;
            const day = parseInt(match[1]);
            const month = parseInt(match[2]);
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
              const d = new Date(year, month - 1, day);
              if (d && !isNaN(d.getTime())) {
                invoiceDate = fmtDateISO(d);
                dateFound = true;
                break;
              }
            }
          }
        } catch {}
      }
    }

    if (!dateFound) {
      const datePatterns = [
        /(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{4})/,
        /(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{2})\b/,
        /(\d{4})\s*[\-]\s*(\d{1,2})\s*[\-]\s*(\d{1,2})/,
      ];
      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          try {
            if (match[1].length === 4) {
              const d = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
              if (d && !isNaN(d.getTime())) { invoiceDate = fmtDateISO(d); break; }
            } else {
              let year = parseInt(match[3]);
              if (year < 100) year += 2000;
              const day = parseInt(match[1]);
              const month = parseInt(match[2]);
              if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                const d = new Date(year, month - 1, day);
                if (d && !isNaN(d.getTime())) { invoiceDate = fmtDateISO(d); break; }
              }
            }
          } catch {}
        }
      }
    }

    // ====== LINE ITEMS ======
    const items: ExtractedItem[] = [];

    // Find item section boundaries
    let itemStart = -1;
    let itemEnd = lines.length;
    for (let i = 0; i < lines.length; i++) {
      const low = lines[i].toLowerCase();
      if ((low.includes("item") || low.includes("particular")) &&
          (low.includes("qty") || low.includes("rate") || low.includes("amount") || low.includes("total"))) {
        itemStart = i + 1;
        continue;
      }
      if (itemStart > -1 && (
        /^total\s*items/i.test(low) || /^total\s*quantity/i.test(low) ||
        /^sub\s*total/i.test(low) || /^\s*cgst/i.test(low) || /^\s*sgst/i.test(low) ||
        /^grand\s*total/i.test(low) || /^thank/i.test(low) ||
        (/^total\s/i.test(low) && !/^total\s+\d/.test(low))
      )) {
        itemEnd = i;
        break;
      }
    }

    const itemLines = itemStart > -1 ? lines.slice(itemStart, itemEnd) : lines;
    const itemSkip = /^(s\.?no|sr|#|item|description|particular|hsn|qty|quantity|rate|amount|total\s*items|total\s*qty|sub\s*total|grand|cgst|sgst|igst|cess|tax|net|gross|discount|round|balance|thank|page|bill\s*to|bill\s*no|created|date|invoice|receipt|address|phone|tel|mob|gst\s*num|billing)/i;

    let pendingName = "";

    for (let i = 0; i < itemLines.length; i++) {
      const line = itemLines[i];
      if (itemSkip.test(line.trim())) continue;

      // Pattern: Name  Qty  Rate  Total  (separated by 2+ spaces or tabs)
      const m4 = line.match(/^(.+?)\s{2,}(\d+(?:\.\d+)?)\s*[\/\-]?\s*(\d[\d,]*(?:\.\d{1,2})?)\s+(\d[\d,]*(?:\.\d{1,2})?)\s*$/);
      if (m4) {
        const desc = (pendingName + " " + m4[1]).trim();
        pendingName = "";
        const qty = parseFloat(m4[2]);
        const rate = parseFloat(m4[3].replace(/,/g, ""));
        if (desc.length >= 2 && qty > 0 && rate > 0) {
          const cat = matchCategory(desc, cats);
          items.push({ category: cat, description: desc, quantity: qty, unitPrice: rate, gstRate: 0 });
          continue;
        }
      }

      // Pattern: Name Qty Rate Total (single space separated)
      const m4b = line.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s+(\d[\d,]*(?:\.\d{1,2})?)\s+(\d[\d,]*(?:\.\d{1,2})?)\s*$/);
      if (m4b) {
        const desc = (pendingName + " " + m4b[1]).trim();
        pendingName = "";
        const qty = parseFloat(m4b[2]);
        const rate = parseFloat(m4b[3].replace(/,/g, ""));
        const total = parseFloat(m4b[4].replace(/,/g, ""));
        if (desc.length >= 2 && qty > 0 && rate > 0 && Math.abs(qty * rate - total) <= total * 0.15 + 1) {
          const cat = matchCategory(desc, cats);
          items.push({ category: cat, description: desc, quantity: qty, unitPrice: rate, gstRate: 0 });
          continue;
        }
      }

      // Pattern with serial number
      const mSr = line.match(/^\d+[\.\)]\s*(.+?)\s+(\d+(?:\.\d+)?)\s+(\d[\d,]*(?:\.\d{1,2})?)\s+(\d[\d,]*(?:\.\d{1,2})?)\s*$/);
      if (mSr) {
        const desc = (pendingName + " " + mSr[1]).trim();
        pendingName = "";
        const qty = parseFloat(mSr[2]);
        const rate = parseFloat(mSr[3].replace(/,/g, ""));
        if (desc.length >= 2 && qty > 0 && rate > 0) {
          const cat = matchCategory(desc, cats);
          items.push({ category: cat, description: desc, quantity: qty, unitPrice: rate, gstRate: 0 });
          continue;
        }
      }

      // Pattern: Name  Qty  Total (2 numbers only)
      const m2 = line.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s+(\d[\d,]*(?:\.\d{1,2})?)\s*$/);
      if (m2) {
        const desc = (pendingName + " " + m2[1]).trim();
        pendingName = "";
        const num1 = parseFloat(m2[2]);
        const num2 = parseFloat(m2[3].replace(/,/g, ""));
        if (desc.length >= 2 && num1 > 0 && num2 > 0 && !/^(total|sub|grand|cgst|sgst|igst|cess|tax|balance|round)/i.test(desc)) {
          const cat = matchCategory(desc, cats);
          if (num1 <= num2 && num2 > num1) {
            items.push({ category: cat, description: desc, quantity: num1, unitPrice: Math.round((num2 / num1) * 100) / 100, gstRate: 0 });
          } else {
            items.push({ category: cat, description: desc, quantity: num1, unitPrice: num2, gstRate: 0 });
          }
          continue;
        }
      }

      // Line with only text - potential multiline item name
      const hasNoNumbers = !/\d{2,}/.test(line);
      if (hasNoNumbers && /^[a-zA-Z]/.test(line) && line.length < 40) {
        pendingName = (pendingName + " " + line).trim();
      } else if (pendingName && !hasNoNumbers) {
        // Try parsing this line as numbers for the pending name
        const numMatch = line.match(/^(\d+(?:\.\d+)?)\s+(\d[\d,]*(?:\.\d{1,2})?)\s+(\d[\d,]*(?:\.\d{1,2})?)\s*$/);
        if (numMatch) {
          const desc = pendingName;
          pendingName = "";
          const qty = parseFloat(numMatch[1]);
          const rate = parseFloat(numMatch[2].replace(/,/g, ""));
          if (desc.length >= 2 && qty > 0 && rate > 0) {
            const cat = matchCategory(desc, cats);
            items.push({ category: cat, description: desc, quantity: qty, unitPrice: rate, gstRate: 0 });
            continue;
          }
        }
      }
    }

    // ====== TOTALS ======
    let subtotal = 0, cgst = 0, sgst = 0, cess = 0, totalFromText = 0;

    const subtotalMatch = text.match(/sub\s*total\s*[:\-]?\s*[\u20B9₹]?\s*(\d[\d,]*(?:\.\d{1,2})?)/i);
    if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ""));

    const cgstMatch = text.match(/cgst\s*(?:@?\s*\d+(?:\.\d+)?%?)?\s*[:\-]?\s*[\u20B9₹]?\s*(\d[\d,]*(?:\.\d{1,2})?)/i);
    if (cgstMatch) cgst = parseFloat(cgstMatch[1].replace(/,/g, ""));

    const sgstMatch = text.match(/sgst\s*(?:@?\s*\d+(?:\.\d+)?%?)?\s*[:\-]?\s*[\u20B9₹]?\s*(\d[\d,]*(?:\.\d{1,2})?)/i);
    if (sgstMatch) sgst = parseFloat(sgstMatch[1].replace(/,/g, ""));

    const cessMatch = text.match(/cess\s*[:\-]?\s*[\u20B9₹]?\s*(\d[\d,]*(?:\.\d{1,2})?)/i);
    if (cessMatch) cess = parseFloat(cessMatch[1].replace(/,/g, ""));

    const totalPatterns = [
      /(?:grand\s*total|total\s*(?:amount|amt)?)\s*[:\-]?\s*[\u20B9₹]?\s*(\d[\d,]*(?:\.\d{1,2})?)/i,
      /^Total\s+(\d[\d,]*(?:\.\d{1,2})?)/im,
      /(?:balance)\s*[:\-]?\s*[\u20B9₹]?\s*(\d[\d,]*(?:\.\d{1,2})?)/i,
    ];
    for (const pattern of totalPatterns) {
      const match = text.match(pattern);
      if (match) {
        totalFromText = parseFloat(match[1].replace(/,/g, ""));
        if (totalFromText > 0) break;
      }
    }

    // Assign GST rate if we have subtotal and tax amounts
    if (subtotal > 0 && (cgst + sgst) > 0) {
      const gstPercent = Math.round(((cgst + sgst) / subtotal) * 100);
      for (const item of items) item.gstRate = gstPercent;
    }

    // Fallback: no items parsed
    if (items.length === 0 && totalFromText > 0) {
      const baseAmount = subtotal > 0 ? subtotal : totalFromText;
      items.push({
        category: "Other",
        description: vendorName ? `Purchase from ${vendorName}` : "Purchase (enter details manually)",
        quantity: 1,
        unitPrice: baseAmount,
        gstRate: subtotal > 0 && totalFromText > subtotal ? Math.round(((totalFromText - subtotal) / subtotal) * 100) : 0,
      });
    } else if (items.length === 0) {
      items.push({ category: "Other", description: "Item (enter details manually)", quantity: 1, unitPrice: 0, gstRate: 0 });
    }

    const itemsSubtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

    return {
      invoiceNumber,
      invoiceDate,
      vendorName,
      vendorGstin,
      vendorPhone,
      vendorAddress,
      items,
      subtotal: subtotal || itemsSubtotal,
      cgst,
      sgst,
      cess,
      totalAmount: totalFromText || itemsSubtotal,
      rawText,
    };
  }

  function matchCategory(itemName: string, cats: CategoryOption[]): string {
    const lowerName = itemName.toLowerCase().trim();
    for (const cat of cats) {
      for (const sub of cat.subcategories) {
        const subLower = sub.name.toLowerCase().trim();
        if (subLower === lowerName || lowerName.includes(subLower) || subLower.includes(lowerName)) {
          return cat.name;
        }
      }
    }
    return "Other";
  }

  function fmtDateISO(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function updateItem(index: number, field: string, value: any) {
    if (!extractedData) return;
    const newItems = [...extractedData.items];
    (newItems[index] as any)[field] = value;
    setExtractedData({ ...extractedData, items: newItems });
  }

  function addItem() {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      items: [...extractedData.items, { category: "Other", description: "", quantity: 1, unitPrice: 0, gstRate: 0 }],
    });
  }

  function removeItem(index: number) {
    if (!extractedData || extractedData.items.length <= 1) return;
    setExtractedData({ ...extractedData, items: extractedData.items.filter((_, i) => i !== index) });
  }

  async function checkPriceChanges(): Promise<PriceChange[]> {
    if (!extractedData) return [];
    const validItems = extractedData.items.filter((i) => i.description.trim() && i.unitPrice > 0);
    if (validItems.length === 0) return [];

    try {
      const res = await fetch("/api/invoices/price-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: validItems.map((i) => ({ description: i.description, unitPrice: i.unitPrice })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.changes || [];
      }
    } catch {}
    return [];
  }

  async function handleSave() {
    if (!extractedData) return;

    const validItems = extractedData.items.filter(
      (i) => i.description.trim() && i.quantity > 0 && i.unitPrice >= 0
    );
    if (validItems.length === 0) {
      toast.error("Please add at least one item with description and quantity");
      return;
    }
    if (!extractedData.invoiceNumber.trim()) {
      toast.error("Invoice number is required");
      return;
    }

    // Check price changes before saving
    setSaving(true);
    const changes = await checkPriceChanges();
    if (changes.length > 0) {
      setPriceChanges(changes);
      setShowPricePopup(true);
      setPendingSave(true);
      setSaving(false);
      return;
    }

    await doSave();
  }

  async function doSave() {
    if (!extractedData) return;
    setSaving(true);
    setShowPricePopup(false);

    const validItems = extractedData.items.filter(
      (i) => i.description.trim() && i.quantity > 0 && i.unitPrice >= 0
    );

    try {
      let vendorId = selectedVendorId || undefined;
      const vendorDisplayName = vendorSearchText.trim();

      if (!vendorId && vendorDisplayName.length >= 2) {
        const createRes = await fetch("/api/vendors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: vendorDisplayName,
            gstin: extractedData.vendorGstin || undefined,
            phone: extractedData.vendorPhone || undefined,
            address: extractedData.vendorAddress || undefined,
          }),
        });
        if (createRes.ok) {
          const newVendor = await createRes.json();
          vendorId = newVendor.id;
          toast.success(`New vendor "${vendorDisplayName}" created!`);
        }
      }

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: extractedData.invoiceNumber,
          invoiceDate: extractedData.invoiceDate,
          vendorId,
          items: validItems.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            gstRate: Number(item.gstRate),
            categoryName: item.category || "Other",
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const invoice = await res.json();
      toast.success("Invoice saved successfully!");
      router.push(`/dashboard/invoices/${invoice.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to save invoice");
    } finally {
      setSaving(false);
      setPendingSave(false);
    }
  }

  const itemsSubtotal = extractedData ? extractedData.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) : 0;
  const itemsGst = extractedData ? extractedData.items.reduce((s, i) => s + (i.quantity * i.unitPrice * i.gstRate) / 100, 0) : 0;
  const itemsTotal = itemsSubtotal + itemsGst;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scan Invoice</h1>
        <p className="text-gray-500 mt-1">Upload an invoice image to automatically extract data using OCR</p>
      </div>

      {/* Upload Area */}
      {!extractedData && (
        <div className="card p-8">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
              isDragActive ? "border-primary-500 bg-primary-50" : file ? "border-green-400 bg-green-50" : "border-gray-300 hover:border-primary-400 hover:bg-gray-50"
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex flex-col items-center gap-3">
                {previewUrl && <img src={previewUrl} alt="Invoice preview" className="max-h-48 rounded-lg border shadow-sm mb-2" />}
                <CheckCircle2 className="w-10 h-10 text-green-500" />
                <div>
                  <p className="font-semibold text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setFile(null); setPreviewUrl(""); }} className="text-red-500 hover:text-red-600 text-sm font-medium flex items-center gap-1">
                  <X className="w-4 h-4" /> Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="w-12 h-12 text-gray-400" />
                <div>
                  <p className="font-semibold text-gray-700">Drop your invoice here, or <span className="text-primary-600">browse</span></p>
                  <p className="text-sm text-gray-400 mt-1">Supports JPEG, PNG, WebP, PDF (max 10MB)</p>
                  <p className="text-xs text-gray-400 mt-1">Tip: Use clear, well-lit images for best OCR results</p>
                </div>
              </div>
            )}
          </div>

          {file && (
            <div className="mt-6 flex justify-center">
              <button onClick={handleScan} disabled={scanning} className="btn-primary flex items-center gap-2 px-8">
                {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanLine className="w-5 h-5" />}
                {scanning ? `Scanning... ${scanProgress}%` : "Scan & Extract Data"}
              </button>
            </div>
          )}

          {scanning && (
            <div className="mt-4 max-w-md mx-auto">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-primary-600 h-2 rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
              </div>
              <p className="text-center text-sm text-gray-500 mt-2">
                {scanProgress < 20 ? "Uploading file..." : scanProgress < 40 ? "Initializing OCR engine..." : scanProgress < 80 ? "Recognizing text from invoice..." : "Parsing invoice data..."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Extracted Data Review */}
      {extractedData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {previewUrl && (
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Invoice Image</h3>
                <img src={previewUrl} alt="Invoice" className="w-full rounded-lg border" />
              </div>
            )}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">OCR Raw Text</h3>
                <button onClick={() => setShowRawText(!showRawText)} className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
                  {showRawText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showRawText ? "Hide" : "Show"}
                </button>
              </div>
              {showRawText ? (
                <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg overflow-auto max-h-80 whitespace-pre-wrap font-mono">{extractedData.rawText}</pre>
              ) : (
                <p className="text-sm text-gray-500">Click &quot;Show&quot; to view the raw text extracted by OCR.</p>
              )}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-6">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <h2 className="font-semibold text-gray-900">Review Extracted Data</h2>
              <span className="badge bg-green-100 text-green-700 ml-2">OCR Complete</span>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 mb-6">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">Please review and correct the extracted data before saving. OCR may not capture all details accurately.</p>
            </div>

            {/* Header Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="label">Invoice Number *</label>
                <input type="text" className="input-field" value={extractedData.invoiceNumber} onChange={(e) => setExtractedData({ ...extractedData, invoiceNumber: e.target.value })} />
              </div>
              <div>
                <label className="label">Invoice Date *</label>
                <input type="date" className="input-field" value={extractedData.invoiceDate} onChange={(e) => setExtractedData({ ...extractedData, invoiceDate: e.target.value })} />
              </div>
              {/* Vendor Dropdown */}
              <div ref={vendorDropdownRef} className="relative">
                <label className="label">Vendor</label>
                <div className="relative">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" className="input-field pl-9 pr-8" placeholder="Search or type new vendor name..." value={vendorSearchText}
                      onChange={(e) => { setVendorSearchText(e.target.value); setSelectedVendorId(""); setShowVendorDropdown(true); }}
                      onFocus={() => setShowVendorDropdown(true)}
                    />
                    {vendorSearchText && (
                      <button onClick={clearVendor} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                    )}
                  </div>
                  {showVendorDropdown && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {filteredVendors.map((v) => (
                        <button key={v.id} onClick={() => selectVendor(v)}
                          className={`w-full text-left px-4 py-2.5 hover:bg-primary-50 text-sm transition-colors ${selectedVendorId === v.id ? "bg-primary-50 text-primary-700 font-medium" : "text-gray-700"}`}>
                          <span>{v.name}</span>
                          {v.gstin && <span className="text-xs text-gray-400 ml-2">({v.gstin})</span>}
                        </button>
                      ))}
                      {vendorSearchText.trim().length >= 2 && !filteredVendors.find((v) => v.name.toLowerCase() === vendorSearchText.toLowerCase()) && (
                        <div className="px-4 py-2.5 text-sm border-t border-gray-100">
                          <div className="flex items-center gap-2 text-green-600">
                            <Plus className="w-4 h-4" />
                            <span>New vendor &quot;<strong>{vendorSearchText}</strong>&quot; will be created on save</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {selectedVendorId && <p className="text-xs text-green-600 mt-1">Existing vendor selected</p>}
                {!selectedVendorId && vendorSearchText.trim().length >= 2 && <p className="text-xs text-amber-600 mt-1">New vendor will be auto-created on save</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="label">GSTIN</label>
                <input type="text" className="input-field text-sm" value={extractedData.vendorGstin} onChange={(e) => setExtractedData({ ...extractedData, vendorGstin: e.target.value })} placeholder="Vendor GSTIN" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input type="text" className="input-field text-sm" value={extractedData.vendorPhone} onChange={(e) => setExtractedData({ ...extractedData, vendorPhone: e.target.value })} placeholder="Vendor phone" />
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Line Items</h3>
                <button onClick={addItem} className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>
              <div className="overflow-visible">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-36">Category</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Item Name</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 w-20">Qty</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 w-28">Unit Price (&#8377;)</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 w-20">GST %</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 w-28">Total</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedData.items.map((item, i) => {
                      const lineTotal = item.quantity * item.unitPrice * (1 + item.gstRate / 100);
                      const catOptions = categories.map((c) => ({ id: c.id, name: c.name }));
                      const matchedCat = categories.find((c) => c.name.toLowerCase() === item.category.toLowerCase());
                      const itemOptions = (matchedCat ? matchedCat.subcategories : categories.flatMap((c) => c.subcategories)).map((s) => ({ id: s.id, name: s.name }));
                      return (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="px-3 py-2">
                            <ComboBox
                              value={item.category}
                              onChange={(name) => updateItem(i, "category", name)}
                              options={catOptions}
                              placeholder="Type or select category"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <ComboBox
                              value={item.description}
                              onChange={(name) => updateItem(i, "description", name)}
                              options={itemOptions}
                              placeholder="Type or select item"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input type="text" inputMode="decimal" className="input-field text-sm text-center [appearance:textfield]" value={item.quantity} onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d*$/.test(v)) updateItem(i, "quantity", v === "" ? 0 : parseFloat(v) || 0); }} />
                          </td>
                          <td className="px-3 py-2">
                            <input type="text" inputMode="decimal" className="input-field text-sm text-center [appearance:textfield]" value={item.unitPrice} onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d*$/.test(v)) updateItem(i, "unitPrice", v === "" ? 0 : parseFloat(v) || 0); }} />
                          </td>
                          <td className="px-3 py-2">
                            <input type="text" inputMode="decimal" className="input-field text-sm text-center [appearance:textfield]" value={item.gstRate} onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d*$/.test(v)) updateItem(i, "gstRate", v === "" ? 0 : parseFloat(v) || 0); }} />
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-sm whitespace-nowrap">&#8377;{lineTotal.toFixed(2)}</td>
                          <td className="px-1 py-2">
                            <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 p-1" title="Remove item"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-72 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal:</span><span className="font-medium">&#8377;{itemsSubtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">GST:</span><span className="font-medium">&#8377;{itemsGst.toFixed(2)}</span></div>
                {extractedData.cess > 0 && <div className="flex justify-between"><span className="text-gray-500">CESS:</span><span className="font-medium">&#8377;{extractedData.cess.toFixed(2)}</span></div>}
                <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Total:</span><span>&#8377;{itemsTotal.toFixed(2)}</span></div>
                {extractedData.totalAmount > 0 && Math.abs(extractedData.totalAmount - itemsTotal) > 1 && (
                  <div className="flex justify-between text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    <span>Invoice Total (OCR):</span><span className="font-medium">&#8377;{extractedData.totalAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button onClick={() => { setExtractedData(null); setFile(null); setPreviewUrl(""); setSelectedVendorId(""); setVendorSearchText(""); }} className="btn-secondary">Scan Another</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Saving..." : "Save Invoice"}
            </button>
          </div>
        </div>
      )}

      {/* Price Change Popup */}
      {showPricePopup && priceChanges.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Price Changes Detected</h2>
                <p className="text-sm text-gray-500">The following items have different prices compared to their last purchase</p>
              </div>
            </div>

            <div className="overflow-x-auto mb-6">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Item</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Old Price</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">Vendor</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">Date</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">New Price</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {priceChanges.map((pc, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{pc.itemName}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">{formatCurrency(pc.oldPrice)}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-500">{pc.lastVendor || "—"}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-500">{pc.lastDate ? new Date(pc.lastDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "---"}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(pc.newPrice)}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className={`inline-flex items-center gap-1 font-semibold ${pc.change > 0 ? "text-red-600" : "text-green-600"}`}>
                          {pc.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {pc.change > 0 ? "+" : ""}{formatCurrency(pc.change)} ({pc.changePercent > 0 ? "+" : ""}{pc.changePercent.toFixed(1)}%)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowPricePopup(false); setPendingSave(false); }} className="btn-secondary">Cancel</button>
              <button onClick={doSave} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
