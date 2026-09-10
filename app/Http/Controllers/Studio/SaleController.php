<?php

namespace App\Http\Controllers\Studio;

use App\Exceptions\InsufficientStockException;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSaleRequest;
use App\Models\Bill;
use App\Models\Sale;
use App\Services\SaleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class SaleController extends Controller
{
    public function __construct(private SaleService $saleService) {}

    /**
     * Transaction history page.
     */
    public function index(Request $request): Response
    {
        $activeShop = app(\App\Modules\Shops\Models\Shop::class);
        $isAdmin = $request->user()->hasAnyRole(['super_admin', 'admin']);

        $query = Bill::forShop($activeShop->id)
            ->where('status', '!=', 'reclaimed')
            ->with(['creditBill'])
            ->when($isAdmin, function ($q) {
                return $q->with(['items.category', 'items.stockItem.variant.product.category', 'editor:id,name']);
            }, function ($q) {
                return $q->with(['items.category', 'items.stockItem.variant.product.category', 'editor:id,name']);
            })
            ->when($request->date_from, fn($q) =>
                $q->whereDate('created_at', '>=', $request->date_from))
            ->when($request->date_to, fn($q) =>
                $q->whereDate('created_at', '<=', $request->date_to))
            ->when($request->method, fn($q) =>
                $q->where('payment_method', $request->method))
            ->when($request->search, fn($q) =>
                $q->where(function ($sub) use ($request) {
                    $sub->where('bill_number', 'like', '%' . $request->search . '%')
                        ->orWhere('customer_name', 'like', '%' . $request->search . '%');
                }));

        if ($request->filled('status')) {
            $statusFilter = $request->status;
            $today = \Illuminate\Support\Carbon::today()->toDateString();

            if ($statusFilter === 'settled') {
                $query->where(function ($q) {
                    $q->where(function ($creditSub) {
                        $creditSub->whereIn('payment_method', ['credit', 'advance'])
                            ->where(function ($cs) {
                                $cs->whereHas('creditBill', function ($cb) {
                                    $cb->where('status', 'settled')
                                      ->orWhere('balance_amount', '<=', 0);
                                })->orWhere(function ($noCb) {
                                    $noCb->whereDoesntHave('creditBill')
                                         ->where('balance_due', '<=', 0);
                                });
                            });
                    })->orWhere(function ($nonCreditSub) {
                        $nonCreditSub->whereNotIn('payment_method', ['credit', 'advance'])
                            ->where('status', 'settled');
                    });
                });
            } elseif ($statusFilter === 'overdue') {
                $query->whereIn('payment_method', ['credit', 'advance'])
                    ->whereHas('creditBill', function ($q) use ($today) {
                        $q->where('status', '!=', 'settled')
                          ->where('balance_amount', '>', 0)
                          ->whereNotNull('promise_date')
                          ->whereDate('promise_date', '<', $today);
                    });
            } elseif ($statusFilter === 'outstanding') {
                $query->whereIn('payment_method', ['credit', 'advance'])
                    ->where(function ($q) use ($today) {
                        $q->whereHas('creditBill', function ($sub) use ($today) {
                            $sub->where('status', '!=', 'settled')
                                ->where('balance_amount', '>', 0)
                                ->where(function ($p) use ($today) {
                                    $p->whereNull('promise_date')
                                      ->orWhereDate('promise_date', '>=', $today);
                                });
                        })->orWhere(function ($sub) {
                            $sub->whereDoesntHave('creditBill')
                                ->where('balance_due', '>', 0);
                        });
                    });
            } else {
                $query->where('status', $statusFilter);
            }
        }

        $transactions = $query->orderByDesc('created_at')
            ->paginate(25)
            ->withQueryString();

        $transactions->setCollection(
            $transactions->getCollection()->map(function ($b) use ($isAdmin) {
                $profit = null;
                if ($isAdmin) {
                    $totalCost = $b->items->sum(function ($item) {
                        $cost = $item->cost ?? ($item->stockItem?->variant?->cost_price ?? 0);
                        return (float) $cost * (float) $item->quantity;
                    });
                    $profit = (float) ($b->after_discount ?? 0) - $totalCost;
                }

                return [
                    'id' => $b->id,
                    'bill_number' => $b->bill_number,
                    'customer_name' => $b->customer_name ?? 'Walk-in',
                    'total_amount' => (float) ($b->after_discount ?? 0),
                    'paid_amount' => (float) ($b->paid_amount ?? 0),
                    'balance_due' => (float) ($b->balance_due ?? 0),
                    'payment_method' => $b->payment_method,
                    'status' => $b->effective_status,
                    'items_count' => $b->items->count(),
                    'editor' => $b->editor ? [
                        'id' => $b->editor->id,
                        'name' => $b->editor->name,
                    ] : null,
                    'created_at' => optional($b->created_at)->toIso8601String(),
                    'profit' => $profit,
                ];
            })
        );

        return Inertia::render('Studio/Sales/Index', [
            'sales' => $transactions,
            'filters' => $request->only([
                'date_from', 'date_to', 'method', 'search', 'status',
            ]),
            'canViewProfit' => $isAdmin,
        ]);
    }

    /**
     * Single sale detail page.
     */
    public function show(Sale $sale): Response
    {
        return Inertia::render('Studio/Sales/Show', [
            'sale' => $sale->load(['items', 'payments', 'refunds']),
        ]);
    }

    /**
     * Finalize a sale from POS.
     *
     * Note: payment is now always an array from the request.
     * SaleService->recordPayments() handles both single and split.
     */
    public function store(StoreSaleRequest $request)
    {
        try {
            $sale = $this->saleService->finalizeSale(
                cartItems: $request->validated('cart'),
                paymentData: $request->validated('payment'),
                cashierId: auth()->id(),
                options: $request->validated('options') ?? [],
            );

            $sale->loadMissing([
                'cashier:id,name',
                'editor:id,name',
            ]);

            return redirect()->route('studio.pos.index')->with([
                'success' => 'Sale completed successfully.',
                'receipt' => [
                    'sale_number' => $sale->sale_number,
                    'completed_at' => optional($sale->completed_at)->toIso8601String(),
                    'cashier_name' => $sale->cashier?->name,
                    'editor_name' => $sale->editor?->name,
                    'subtotal' => round((float) $sale->subtotal, 2),
                    'discount_amount' => round((float) $sale->discount_amount, 2),
                    'tax_amount' => round((float) $sale->tax_amount, 2),
                    'total_amount' => round((float) $sale->total_amount, 2),
                    'items' => $sale->items->map(fn($item) => [
                        'id' => $item->id,
                        'name' => $item->product_name,
                        'sku' => $item->product_sku,
                        'qty' => $item->quantity,
                        'unit_price' => $item->unit_price,
                        'line_total' => $item->line_total,
                    ]),
                    'payments' => $sale->payments->map(fn($p) => [
                        'id' => $p->id,
                        'method' => $p->method,
                        'amount' => $p->amount,
                    ]),
                ],
            ]);
        } catch (InsufficientStockException $e) {
            // Stock ran out between cart load and finalization
            return back()->withErrors([
                'stock' => $e->getMessage(),
            ])->with('error', 'Stock unavailable. Please update your cart.');
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors([
                'cart' => $e->getMessage(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Sale finalization failed', [
                'request_id' => request()->header('X-Request-ID'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'cashier' => auth()->id(),
                'cart' => $request->validated('cart'),
            ]);

            return back()->with('error', 'Sale could not be completed. Please try again.');
        }
    }
}
