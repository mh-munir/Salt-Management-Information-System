import { connectDB, isMongoConnectionError } from "@/lib/db";
import { requireAuth, validateSameOrigin } from "@/lib/auth";
import Cost from "@/models/Cost";
import Customer from "@/models/Customer";
import Product from "@/models/Product";
import Sale from "@/models/Sale";
import Supplier from "@/models/Supplier";
import Transaction from "@/models/Transaction";

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

    const [salesDeleted, transactionsDeleted, customersDeleted, suppliersDeleted, costsDeleted, productsDeleted] =
      await Promise.all([
        Sale.deleteMany({}),
        Transaction.deleteMany({}),
        Customer.deleteMany({}),
        Supplier.deleteMany({}),
        Cost.deleteMany({}),
        Product.deleteMany({}),
      ]);

    return Response.json({
      message: "All business data removed successfully.",
      deleted: {
        sales: salesDeleted.deletedCount,
        transactions: transactionsDeleted.deletedCount,
        customers: customersDeleted.deletedCount,
        suppliers: suppliersDeleted.deletedCount,
        costs: costsDeleted.deletedCount,
        products: productsDeleted.deletedCount,
      },
    });
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return Response.json({ message: "Database connection error" }, { status: 500 });
    }

    console.error("Error resetting all data:", error);
    return Response.json({ message: "Failed to reset all data." }, { status: 500 });
  }
}
