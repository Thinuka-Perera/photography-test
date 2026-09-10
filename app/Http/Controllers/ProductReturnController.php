<?php

namespace App\Http\Controllers;

use App\Contracts\InventoryServiceInterface;
use App\Models\ProductReturn;
use App\Models\ProductReturnItem;
use App\Models\Bill;
use App\Models\BillItem;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Employee;
use App\Modules\Shops\Models\Shop;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class ProductReturnController extends Controller
{
    public function __construct(
        private InventoryServiceInterface $inventoryService
    ) {}

    /**
     * Display a listing of return transactions.
     */
    public function index(Request $request): Response
    {
        $activeShop = app(Shop::class);
        
        $query = ProductReturn::forShop($activeShop->id)
            ->with(['processedBy:id,name', 'items'])
            ->orderByDesc('created_at');

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('return_number', 'like', "%{$search}%")
                  ->orWhere('customer_name', 'like', "%{$search}%")
                  ->orWhere('customer_phone', 'like', "%{$search}%");
            });
        }

        $returns = $query->paginate(15)->withQueryString();

        return Inertia::render('Finance/Returns', [
            'returns' => $returns,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Search for existing sales and invoices.
     */
    public function searchTransaction(Request $request)
    {
        $q = $request->query('query');
        if (strlen($q) < 2) {
            return response()->json([]);
        }

        $activeShop = app(Shop::class);

        // Search Bills (POS Sales)
        $sales = Bill::forShop($activeShop->id)
            ->where(function($query) use ($q) {
                $query->where('bill_number', 'like', "%{$q}%")
                      ->orWhere('customer_name', 'like', "%{$q}%")
                      ->orWhere('customer_phone', 'like', "%{$q}%");
            })
            ->with(['items.stockItem.variant'])
            ->limit(10)
            ->get()
            ->map(function($bill) {
                $returnedQuantities = DB::table('product_return_items')
                    ->join('product_returns', 'product_return_items.product_return_id', '=', 'product_returns.id')
                    ->where('product_returns.sale_id', $bill->id)
                    ->where('product_returns.status', 'completed')
                    ->groupBy('product_return_items.product_id')
                    ->select('product_return_items.product_id', DB::raw('SUM(quantity) as total_returned'))
                    ->pluck('total_returned', 'product_id');

                $items = $bill->items->map(function($item) use ($returnedQuantities) {
                    $variantId = $item->stockItem ? $item->stockItem->variant_id : null;
                    if (!$variantId) {
                        return null; // Skip non-stock items
                    }

                    $alreadyReturned = $returnedQuantities[$variantId] ?? 0;
                    return [
                        'id' => $item->id,
                        'product_id' => $variantId,
                        'product_name' => $item->description,
                        'product_sku' => $item->stockItem?->variant?->sku ?? '',
                        'unit_price' => $item->quantity > 0 ? round((float)($item->line_total / $item->quantity), 2) : (float)$item->unit_price,
                        'original_quantity' => (int)$item->quantity,
                        'already_returned' => (int)$alreadyReturned,
                        'refundable_quantity' => max(0, (int)$item->quantity - (int)$alreadyReturned),
                    ];
                })->filter()->values();

                return [
                    'id' => 'sale_' . $bill->id,
                    'sale_id' => $bill->id,
                    'invoice_id' => null,
                    'number' => $bill->bill_number,
                    'customer_name' => $bill->customer_name ?? 'Walk-in',
                    'customer_phone' => $bill->customer_phone,
                    'date' => $bill->created_at->toIso8601String(),
                    'items' => $items,
                    'total_amount' => (float)($bill->after_discount ?? 0),
                ];
            });

        // Search Invoices
        $invoices = Invoice::forShop($activeShop->id)
            ->where(function($query) use ($q) {
                $query->where('invoice_number', 'like', "%{$q}%")
                      ->orWhere('customer_name', 'like', "%{$q}%")
                      ->orWhere('customer_phone', 'like', "%{$q}%");
            })
            ->with(['items'])
            ->limit(10)
            ->get()
            ->map(function($invoice) {
                $returnedQuantities = DB::table('product_return_items')
                    ->join('product_returns', 'product_return_items.product_return_id', '=', 'product_returns.id')
                    ->where('product_returns.invoice_id', $invoice->id)
                    ->where('product_returns.status', 'completed')
                    ->groupBy('product_return_items.product_id')
                    ->select('product_return_items.product_id', DB::raw('SUM(quantity) as total_returned'))
                    ->pluck('total_returned', 'product_id');

                $items = $invoice->items->map(function($item) use ($returnedQuantities) {
                    $productId = $item->product_id;
                    if (!$productId && $item->product_sku) {
                        $productId = DB::table('product_variants')->where('sku', $item->product_sku)->value('id');
                    }

                    $alreadyReturned = $productId ? ($returnedQuantities[$productId] ?? 0) : 0;
                    return [
                        'id' => $item->id,
                        'product_id' => $productId,
                        'product_name' => $item->description,
                        'product_sku' => $item->product_sku,
                        'unit_price' => $item->quantity > 0 ? round((float)($item->line_total / $item->quantity), 2) : (float)$item->unit_price,
                        'original_quantity' => (int)$item->quantity,
                        'already_returned' => (int)$alreadyReturned,
                        'refundable_quantity' => max(0, (int)$item->quantity - (int)$alreadyReturned),
                    ];
                });

                return [
                    'id' => 'invoice_' . $invoice->id,
                    'sale_id' => $invoice->sale_id,
                    'invoice_id' => $invoice->id,
                    'number' => $invoice->invoice_number,
                    'customer_name' => $invoice->customer_name ?? 'Walk-in',
                    'customer_phone' => $invoice->customer_phone,
                    'date' => $invoice->created_at->toIso8601String(),
                    'items' => $items->values(),
                    'total_amount' => (float)$invoice->total_amount,
                ];
            });

        return response()->json($sales->toBase()->merge($invoices));
    }

    /**
     * Store a new product return.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'transaction_type' => 'required|in:sale,invoice',
            'transaction_id' => 'required|integer',
            'reason' => 'required|string|max:500',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|integer',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        $activeShop = app(Shop::class);
        $userId = auth()->id();

        try {
            $productReturn = DB::transaction(function() use ($validated, $activeShop, $userId) {
                $saleId = $validated['transaction_type'] === 'sale' ? $validated['transaction_id'] : null;
                $invoiceId = $validated['transaction_type'] === 'invoice' ? $validated['transaction_id'] : null;

                $customerName = '';
                $customerPhone = null;
                $customerId = null;
                $originalNumber = '';

                // Verify base transaction and fetch customer/number details
                if ($saleId) {
                    $bill = Bill::forShop($activeShop->id)->findOrFail($saleId);
                    $customerId = $bill->customer_id;
                    $customerName = $bill->customer_name;
                    $customerPhone = $bill->customer_phone;
                    $originalNumber = $bill->bill_number;
                } else {
                    $invoice = Invoice::forShop($activeShop->id)->findOrFail($invoiceId);
                    $customerId = $invoice->customer_id;
                    $customerName = $invoice->customer_name;
                    $customerPhone = $invoice->customer_phone;
                    $originalNumber = $invoice->invoice_number;
                }

                // Generate Return Number
                $todayStr = date('Ymd');
                $prefix = "RET-{$todayStr}-";
                $lastReturn = ProductReturn::where('return_number', 'like', "{$prefix}%")
                    ->orderBy('id', 'desc')
                    ->first();
                $nextSeq = 1;
                if ($lastReturn) {
                    $lastSeq = (int) substr($lastReturn->return_number, -4);
                    $nextSeq = $lastSeq + 1;
                }
                $returnNumber = sprintf("%s%04d", $prefix, $nextSeq);

                // Initialize total return amount
                $totalReturnAmount = 0.00;
                $returnItems = [];

                foreach ($validated['items'] as $itemData) {
                    $prodId = $itemData['product_id'];
                    $qtyToReturn = (int)$itemData['quantity'];
                    $unitPrice = (float)$itemData['unit_price'];

                    // Validation counter
                    $originalQuantity = 0;
                    $alreadyReturned = 0;
                    $productName = '';
                    $productSku = '';

                    if ($saleId) {
                        $billItem = BillItem::where('bill_id', $saleId)
                            ->whereHas('stockItem', function ($query) use ($prodId) {
                                $query->where('variant_id', $prodId);
                            })
                            ->first();
                        
                        if (!$billItem) {
                            throw new \InvalidArgumentException("Product not found on this sale transaction.");
                        }

                        $originalQuantity = (int)$billItem->quantity;
                        $productName = $billItem->description;
                        $productSku = DB::table('product_variants')->where('id', $prodId)->value('sku');

                        $alreadyReturned = DB::table('product_return_items')
                            ->join('product_returns', 'product_return_items.product_return_id', '=', 'product_returns.id')
                            ->where('product_returns.sale_id', $saleId)
                            ->where('product_returns.status', 'completed')
                            ->where('product_return_items.product_id', $prodId)
                            ->sum('quantity');

                    } else {
                        // For invoice, mapping might be by product_id or sku matches
                        $invoiceItem = InvoiceItem::where('invoice_id', $invoiceId)
                            ->where(function($query) use ($prodId) {
                                if ($prodId) {
                                    $query->where('product_id', $prodId);
                                } else {
                                    $query->whereRaw('0 = 1');
                                }
                            })
                            ->first();

                        if (!$invoiceItem && $prodId) {
                            $variantSku = DB::table('product_variants')->where('id', $prodId)->value('sku');
                            if ($variantSku) {
                                $invoiceItem = InvoiceItem::where('invoice_id', $invoiceId)
                                    ->where('product_sku', $variantSku)
                                    ->first();
                            }
                        }

                        if (!$invoiceItem) {
                            throw new \InvalidArgumentException("Product not found on this invoice transaction.");
                        }

                        $originalQuantity = $invoiceItem->quantity;
                        $productName = $invoiceItem->description;
                        $productSku = $invoiceItem->product_sku;

                        $alreadyReturned = DB::table('product_return_items')
                            ->join('product_returns', 'product_return_items.product_return_id', '=', 'product_returns.id')
                            ->where('product_returns.invoice_id', $invoiceId)
                            ->where('product_returns.status', 'completed')
                            ->where('product_return_items.product_id', $prodId)
                            ->sum('quantity');
                    }

                    if (($alreadyReturned + $qtyToReturn) > $originalQuantity) {
                        throw new \InvalidArgumentException(
                            "Cannot return more than originally purchased. Quantity originally purchased: {$originalQuantity}, already returned: {$alreadyReturned}, trying to return: {$qtyToReturn}."
                        );
                    }

                    $lineTotal = round($qtyToReturn * $unitPrice, 2);
                    $totalReturnAmount += $lineTotal;

                    // Queue for insertion/updates
                    $returnItems[] = [
                        'product_id' => $prodId,
                        'product_name' => $productName,
                        'product_sku' => $productSku,
                        'quantity' => $qtyToReturn,
                        'unit_price' => $unitPrice,
                        'line_total' => $lineTotal,
                    ];
                }

                // Create main return order
                $productReturn = ProductReturn::create([
                    'shop_id' => $activeShop->id,
                    'return_number' => $returnNumber,
                    'sale_id' => $saleId,
                    'invoice_id' => $invoiceId,
                    'customer_id' => $customerId,
                    'customer_name' => $customerName,
                    'customer_phone' => $customerPhone,
                    'total_amount' => $totalReturnAmount,
                    'reason' => $validated['reason'],
                    'processed_by' => $userId,
                    'status' => 'completed',
                ]);

                // Create items & restore inventory
                foreach ($returnItems as $item) {
                    $productReturn->items()->create($item);

                    if ($item['product_id']) {
                        $this->inventoryService->restoreStock(
                            $activeShop->id,
                            $item['product_id'],
                            $item['quantity']
                        );
                    }
                }

                return $productReturn;
            });

            return redirect()->route('finance.returns.index')
                ->with('success', "Product Return {$productReturn->return_number} created successfully.");

        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage())->withInput();
        } catch (\Throwable $e) {
            Log::error("Product return store failed", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return back()->with('error', "Failed to record product return: " . $e->getMessage())->withInput();
        }
    }

    /**
     * Delete a product return transaction and reverse stock adjustments.
     */
    public function destroy(ProductReturn $productReturn)
    {
        $activeShop = app(Shop::class);

        try {
            DB::transaction(function() use ($productReturn, $activeShop) {
                // Eagerly load items relation to prevent N+1 and reference issues after deletion
                $productReturn->load('items');

                // Revert stock restoration: deduct the quantity restored when return was recorded
                foreach ($productReturn->items as $item) {
                    if ($item->product_id) {
                        $this->inventoryService->deductStock(
                            $activeShop->id,
                            $item->product_id,
                            $item->quantity
                        );
                    }
                }

                // Delete the main return order (cascade delete handles items)
                $productReturn->delete();
            });

            return redirect()->route('finance.returns.index')
                ->with('success', "Product Return {$productReturn->return_number} deleted successfully.");

        } catch (\Throwable $e) {
            Log::error("Product return delete failed", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return back()->with('error', "Failed to delete product return: " . $e->getMessage());
        }
    }
}
