export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { categorySchema, subcategorySchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      where: { companyId: session.user.companyId },
      include: {
        subcategories: {
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type } = body;

    if (type === "subcategory") {
      const validation = subcategorySchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.errors[0].message },
          { status: 400 }
        );
      }

      const subcategory = await prisma.subcategory.create({
        data: {
          name: validation.data.name,
          categoryId: validation.data.categoryId,
          companyId: session.user.companyId,
        },
        include: { category: true },
      });

      return NextResponse.json(subcategory, { status: 201 });
    } else {
      const validation = categorySchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.errors[0].message },
          { status: 400 }
        );
      }

      const category = await prisma.category.create({
        data: {
          name: validation.data.name,
          companyId: session.user.companyId,
        },
        include: { subcategories: true },
      });

      return NextResponse.json(category, { status: 201 });
    }
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "This name already exists in the same category/company" },
        { status: 409 }
      );
    }
    console.error("Error creating category:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    if (type === "subcategory") {
      await prisma.subcategory.delete({
        where: { id, companyId: session.user.companyId },
      });
    } else {
      await prisma.category.delete({
        where: { id, companyId: session.user.companyId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
