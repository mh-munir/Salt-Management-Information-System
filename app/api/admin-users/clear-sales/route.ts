import { connectDB, isMongoConnectionError } from "@/lib/db";
import { requireAuth, validateSameOrigin } from "@/lib/auth";
import Sale from "@/models/Sale";
import Transaction from "@/models/Transaction";
import Customer from "@/models/Customer";
import Supplier from "@/models/Supplier";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function POST(request: Request) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;

  const authResult = requireAuth(request, ["superadmin"]);
  if (authResult instanceof Response) return authResult;

  try {
    await connectDB();

    // Clear all sales data
    const [salesDeleted, transactionsDeleted, customersDeleted, suppliersDeleted] = await Promise.all([
      Sale.deleteMany({}),
      Transaction.deleteMany({}),
      Customer.deleteMany({}),
      Supplier.deleteMany({}),
    ]);

    return Response.json({
      message: "All sales, customer, and supplier data cleared successfully",
      deleted: {
        sales: salesDeleted.deletedCount,
        transactions: transactionsDeleted.deletedCount,
        customers: customersDeleted.deletedCount,
        suppliers: suppliersDeleted.deletedCount,
      },
    });
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return Response.json(
        { message: "Database connection error" },
        { status: 500 }
      );
    }

    console.error("Error clearing sales data:", error);
    return Response.json(
      { message: "Failed to clear sales data" },
      { status: 500 }
    );
  }
}