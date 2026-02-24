import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".xlsx") && !file.name.endsWith(".xls") && !file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "Please upload an Excel (.xlsx, .xls) or CSV file" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "The file contains no data rows" },
        { status: 400 }
      );
    }

    // Detect column names (case-insensitive)
    const firstRow = rows[0];
    const keys = Object.keys(firstRow);

    const categoryCol = keys.find((k) =>
      /^category$/i.test(k.trim())
    ) || keys.find((k) => /category/i.test(k.trim())) || keys[0];

    const subcategoryCol = keys.find((k) =>
      /^(sub\s*category|subcategory|item)$/i.test(k.trim())
    ) || keys.find((k) => /sub|item/i.test(k.trim())) || keys[1];

    if (!categoryCol) {
      return NextResponse.json(
        { error: "Could not find a 'Category' column in the file. Expected columns: Category, Subcategory (or Item)" },
        { status: 400 }
      );
    }

    const companyId = session.user.companyId;
    let categoriesCreated = 0;
    let subcategoriesCreated = 0;
    let skipped = 0;

    // Group data by category
    const categoryMap: Record<string, Set<string>> = {};
    for (const row of rows) {
      const catName = String(row[categoryCol] || "").trim();
      if (!catName) continue;

      if (!categoryMap[catName]) {
        categoryMap[catName] = new Set();
      }

      if (subcategoryCol) {
        const subName = String(row[subcategoryCol] || "").trim();
        if (subName) {
          categoryMap[catName].add(subName);
        }
      }
    }

    for (const [catName, subNamesSet] of Object.entries(categoryMap)) {
      // Upsert category
      let category;
      try {
        category = await prisma.category.upsert({
          where: {
            name_companyId: { name: catName, companyId },
          },
          update: {},
          create: { name: catName, companyId },
        });
        categoriesCreated++;
      } catch {
        skipped++;
        continue;
      }

      // Create subcategories
      const subNamesArr = Array.from(subNamesSet);
      for (const subName of subNamesArr) {
        try {
          await prisma.subcategory.upsert({
            where: {
              name_categoryId_companyId: {
                name: subName,
                categoryId: category.id,
                companyId,
              },
            },
            update: {},
            create: {
              name: subName,
              categoryId: category.id,
              companyId,
            },
          });
          subcategoriesCreated++;
        } catch {
          skipped++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      categoriesCreated,
      subcategoriesCreated,
      skipped,
      totalRows: rows.length,
    });
  } catch (error) {
    console.error("Excel upload error:", error);
    return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
  }
}
