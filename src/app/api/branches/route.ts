import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const companyUsers = await prisma.companyUser.findMany({
      where: { userId },
      include: {
        company: true,
      },
      orderBy: { company: { name: "asc" } },
    });

    return NextResponse.json(
      companyUsers.map((cu) => ({
        id: cu.company.id,
        name: cu.company.name,
        gstin: cu.company.gstin,
        address: cu.company.address,
        phone: cu.company.phone,
        email: cu.company.email,
        role: cu.role,
      }))
    );
  } catch (error) {
    console.error("Error fetching branches:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { name, gstin, address, phone, email } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: "Branch name is required (min 2 characters)" }, { status: 400 });
    }

    const company = await prisma.company.create({
      data: {
        name: name.trim(),
        gstin: gstin || null,
        address: address || null,
        phone: phone || null,
        email: email || null,
      },
    });

    await prisma.companyUser.create({
      data: {
        userId,
        companyId: company.id,
        role: "owner",
      },
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("Error creating branch:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
