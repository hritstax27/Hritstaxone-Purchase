import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create demo user
  const hashedPassword = await bcrypt.hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@petpooja.com" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@petpooja.com",
      password: hashedPassword,
      role: "admin",
    },
  });

  // Create demo company
  const company = await prisma.company.create({
    data: {
      name: "Demo Trading Co.",
      gstin: "27AAAAA0000A1Z5",
      address: "123 Business Park, Mumbai, Maharashtra - 400001",
      phone: "+91 9876543210",
      email: "info@demotrading.com",
    },
  });

  // Link user to company
  await prisma.companyUser.create({
    data: {
      userId: user.id,
      companyId: company.id,
      role: "owner",
    },
  });

  // Create categories and subcategories
  const grains = await prisma.category.create({
    data: {
      name: "Grains",
      companyId: company.id,
    },
  });

  const oils = await prisma.category.create({
    data: {
      name: "Oils",
      companyId: company.id,
    },
  });

  const packaging = await prisma.category.create({
    data: {
      name: "Packaging",
      companyId: company.id,
    },
  });

  const dairy = await prisma.category.create({
    data: {
      name: "Dairy",
      companyId: company.id,
    },
  });

  const vegetables = await prisma.category.create({
    data: {
      name: "Vegetables",
      companyId: company.id,
    },
  });

  // Subcategories
  const subRice = await prisma.subcategory.create({
    data: { name: "Rice (Basmati)", categoryId: grains.id, companyId: company.id },
  });
  const subSugar = await prisma.subcategory.create({
    data: { name: "Sugar", categoryId: grains.id, companyId: company.id },
  });
  const subWheat = await prisma.subcategory.create({
    data: { name: "Wheat Flour", categoryId: grains.id, companyId: company.id },
  });
  const subCookingOil = await prisma.subcategory.create({
    data: { name: "Cooking Oil", categoryId: oils.id, companyId: company.id },
  });
  const subMustardOil = await prisma.subcategory.create({
    data: { name: "Mustard Oil", categoryId: oils.id, companyId: company.id },
  });
  const subBoxes = await prisma.subcategory.create({
    data: { name: "Cardboard Boxes (12x12)", categoryId: packaging.id, companyId: company.id },
  });
  const subPlastic = await prisma.subcategory.create({
    data: { name: "Plastic Bags", categoryId: packaging.id, companyId: company.id },
  });
  const subMilk = await prisma.subcategory.create({
    data: { name: "Milk", categoryId: dairy.id, companyId: company.id },
  });
  const subButter = await prisma.subcategory.create({
    data: { name: "Butter", categoryId: dairy.id, companyId: company.id },
  });
  const subOnion = await prisma.subcategory.create({
    data: { name: "Onion", categoryId: vegetables.id, companyId: company.id },
  });
  const subPotato = await prisma.subcategory.create({
    data: { name: "Potato", categoryId: vegetables.id, companyId: company.id },
  });

  // Create vendors
  const vendors = await Promise.all([
    prisma.vendor.create({
      data: {
        name: "Sharma Traders",
        gstin: "27BBBBB0000B1Z5",
        email: "sharma@traders.com",
        phone: "+91 9876543211",
        companyId: company.id,
      },
    }),
    prisma.vendor.create({
      data: {
        name: "Patel Packaging",
        gstin: "24CCCCC0000C1Z5",
        email: "patel@packaging.com",
        phone: "+91 9876543212",
        companyId: company.id,
      },
    }),
    prisma.vendor.create({
      data: {
        name: "Metro Utilities",
        email: "billing@metroutil.com",
        phone: "+91 9876543213",
        companyId: company.id,
      },
    }),
    prisma.vendor.create({
      data: {
        name: "Gupta Logistics",
        gstin: "27DDDDD0000D1Z5",
        email: "info@guptalog.com",
        phone: "+91 9876543214",
        companyId: company.id,
      },
    }),
  ]);

  // Create items (catalog)
  const items = await Promise.all([
    prisma.item.create({
      data: {
        name: "Rice (Basmati)",
        sku: "RICE-BAS-001",
        unit: "kg",
        category: "Grains",
        hsnCode: "1006",
        gstRate: 5,
        companyId: company.id,
      },
    }),
    prisma.item.create({
      data: {
        name: "Cooking Oil",
        sku: "OIL-COK-001",
        unit: "ltr",
        category: "Oils",
        hsnCode: "1507",
        gstRate: 5,
        companyId: company.id,
      },
    }),
    prisma.item.create({
      data: {
        name: "Cardboard Boxes (12x12)",
        sku: "PKG-BOX-012",
        unit: "pcs",
        category: "Packaging",
        hsnCode: "4819",
        gstRate: 18,
        companyId: company.id,
      },
    }),
    prisma.item.create({
      data: {
        name: "Sugar",
        sku: "SUG-WHT-001",
        unit: "kg",
        category: "Grains",
        hsnCode: "1701",
        gstRate: 5,
        companyId: company.id,
      },
    }),
  ]);

  // Create sample invoices with categories
  const inv1 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2026-001",
      invoiceDate: new Date("2026-02-01"),
      dueDate: new Date("2026-03-01"),
      vendorId: vendors[0].id,
      companyId: company.id,
      userId: user.id,
      subtotal: 25000,
      taxAmount: 1250,
      totalAmount: 26250,
      status: "approved",
      items: {
        create: [
          {
            description: "Rice (Basmati) - Premium",
            quantity: 200,
            unit: "kg",
            unitPrice: 80,
            gstRate: 5,
            gstAmount: 800,
            totalAmount: 16800,
            itemId: items[0].id,
            categoryId: grains.id,
            subcategoryId: subRice.id,
          },
          {
            description: "Cooking Oil - Refined",
            quantity: 50,
            unit: "ltr",
            unitPrice: 160,
            gstRate: 5,
            gstAmount: 400,
            totalAmount: 8400,
            itemId: items[1].id,
            categoryId: oils.id,
            subcategoryId: subCookingOil.id,
          },
        ],
      },
    },
  });

  const inv2 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2026-002",
      invoiceDate: new Date("2026-02-05"),
      vendorId: vendors[1].id,
      companyId: company.id,
      userId: user.id,
      subtotal: 5000,
      taxAmount: 900,
      totalAmount: 5900,
      status: "reviewed",
      items: {
        create: [
          {
            description: "Cardboard Boxes (12x12)",
            quantity: 100,
            unit: "pcs",
            unitPrice: 50,
            gstRate: 18,
            gstAmount: 900,
            totalAmount: 5900,
            itemId: items[2].id,
            categoryId: packaging.id,
            subcategoryId: subBoxes.id,
          },
        ],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2026-003",
      invoiceDate: new Date("2026-02-10"),
      vendorId: vendors[0].id,
      companyId: company.id,
      userId: user.id,
      subtotal: 15000,
      taxAmount: 750,
      totalAmount: 15750,
      status: "draft",
      items: {
        create: [
          {
            description: "Sugar - White",
            quantity: 300,
            unit: "kg",
            unitPrice: 50,
            gstRate: 5,
            gstAmount: 750,
            totalAmount: 15750,
            itemId: items[3].id,
            categoryId: grains.id,
            subcategoryId: subSugar.id,
          },
        ],
      },
    },
  });

  // Create stock entries
  await Promise.all([
    prisma.stockEntry.create({
      data: {
        itemId: items[0].id,
        companyId: company.id,
        type: "in",
        quantity: 200,
        unitPrice: 80,
        totalValue: 16000,
        reference: "INV-2026-001",
      },
    }),
    prisma.stockEntry.create({
      data: {
        itemId: items[1].id,
        companyId: company.id,
        type: "in",
        quantity: 50,
        unitPrice: 160,
        totalValue: 8000,
        reference: "INV-2026-001",
      },
    }),
    prisma.stockEntry.create({
      data: {
        itemId: items[2].id,
        companyId: company.id,
        type: "in",
        quantity: 100,
        unitPrice: 50,
        totalValue: 5000,
        reference: "INV-2026-002",
      },
    }),
  ]);

  // Create sample payouts
  await Promise.all([
    prisma.payout.create({
      data: {
        vendorId: vendors[0].id,
        companyId: company.id,
        userId: user.id,
        amount: 26250,
        paymentMethod: "bank_transfer",
        paymentRef: "UTR123456789",
        status: "completed",
        paymentDate: new Date("2026-02-15"),
        category: "vendor",
      },
    }),
    prisma.payout.create({
      data: {
        vendorId: vendors[1].id,
        companyId: company.id,
        userId: user.id,
        amount: 5900,
        paymentMethod: "upi",
        status: "pending",
        category: "vendor",
      },
    }),
    prisma.payout.create({
      data: {
        vendorId: vendors[2].id,
        companyId: company.id,
        userId: user.id,
        amount: 3500,
        paymentMethod: "bank_transfer",
        status: "pending",
        category: "utility",
        notes: "Electricity bill - February 2026",
      },
    }),
  ]);

  // Create activity logs
  await Promise.all([
    prisma.activity.create({
      data: {
        userId: user.id,
        action: "invoice_created",
        entityType: "invoice",
        entityId: inv1.id,
        details: "Invoice INV-2026-001 created for Sharma Traders",
      },
    }),
    prisma.activity.create({
      data: {
        userId: user.id,
        action: "invoice_approved",
        entityType: "invoice",
        entityId: inv1.id,
        details: "Invoice INV-2026-001 approved",
      },
    }),
    prisma.activity.create({
      data: {
        userId: user.id,
        action: "payout_completed",
        entityType: "payout",
        details: "Payout of ₹26,250 to Sharma Traders completed",
      },
    }),
    prisma.activity.create({
      data: {
        userId: user.id,
        action: "invoice_created",
        entityType: "invoice",
        entityId: inv2.id,
        details: "Invoice INV-2026-002 created for Patel Packaging",
      },
    }),
  ]);

  // Create sample sales for today
  const today = new Date();
  await Promise.all([
    prisma.sale.create({
      data: {
        amount: 2500,
        paymentMethod: "cash",
        description: "Counter sales - morning",
        companyId: company.id,
        userId: user.id,
        date: today,
      },
    }),
    prisma.sale.create({
      data: {
        amount: 3200,
        paymentMethod: "upi",
        description: "UPI payments - lunch",
        companyId: company.id,
        userId: user.id,
        date: today,
      },
    }),
    prisma.sale.create({
      data: {
        amount: 1800,
        paymentMethod: "swiggy",
        description: "Swiggy orders",
        orderNumber: "SWG-78234",
        companyId: company.id,
        userId: user.id,
        date: today,
      },
    }),
    prisma.sale.create({
      data: {
        amount: 2100,
        paymentMethod: "zomato",
        description: "Zomato orders",
        orderNumber: "ZMT-45123",
        companyId: company.id,
        userId: user.id,
        date: today,
      },
    }),
    prisma.sale.create({
      data: {
        amount: 950,
        paymentMethod: "card",
        description: "Card payment - dinner",
        companyId: company.id,
        userId: user.id,
        date: today,
      },
    }),
    prisma.sale.create({
      data: {
        amount: 450,
        paymentMethod: "cash",
        description: "Counter sale - evening",
        companyId: company.id,
        userId: user.id,
        date: today,
      },
    }),
  ]);

  console.log("Database seeded successfully!");
  console.log("---");
  console.log("Demo credentials:");
  console.log("  Email: demo@petpooja.com");
  console.log("  Password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
