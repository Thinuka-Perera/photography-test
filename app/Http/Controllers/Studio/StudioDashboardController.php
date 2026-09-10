<?php

namespace App\Http\Controllers\Studio;

use App\Http\Controllers\Controller;
use App\Models\Bill;
use App\Models\Category;
use App\Models\ProductVariant;
use App\Modules\Shops\Models\Shop;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StudioDashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $shop = app(Shop::class);
        $shopId = $shop->id;

        $today = now()->toDateString();
        $yesterday = now()->subDay()->toDateString();

        $printJobsToday = Bill::forShop($shopId)->whereDate('created_at', $today)->count();
        $printJobsYesterday = Bill::forShop($shopId)->whereDate('created_at', $yesterday)->count();

        $activeSkus = ProductVariant::forShop($shopId)->count();

        $readyForPickup = Bill::forShop($shopId)->where('status', 'ready')->count();

        $queueBills = Bill::forShop($shopId)
            ->whereIn('status', ['processing', 'ready'])
            ->with(['items' => fn ($q) => $q->orderBy('id')->limit(3)])
            ->orderByDesc('updated_at')
            ->limit(12)
            ->get()
            ->map(function (Bill $bill) {
                $type = $bill->items->isNotEmpty()
                    ? $bill->items->pluck('description')->filter()->take(2)->implode(' · ')
                    : 'Studio order';

                return [
                    'id' => $bill->id,
                    'order_no' => $bill->bill_number,
                    'customer' => $bill->customer_name ?: 'Walk-in',
                    'type' => $type,
                    'status' => ucfirst(str_replace('_', ' ', (string) $bill->status)),
                    'eta' => optional($bill->updated_at)?->diffForHumans() ?? '—',
                ];
            })
            ->values()
            ->all();

        $categoryGroups = Category::forShop($shopId)
            ->withCount('products')
            ->orderBy('name')
            ->limit(12)
            ->get()
            ->map(fn (Category $cat) => [
                'title' => $cat->name,
                'description' => $cat->type === 'frame'
                    ? 'Frame catalogue · '.$cat->products_count.' product'.($cat->products_count === 1 ? '' : 's')
                    : 'General stock · '.$cat->products_count.' product'.($cat->products_count === 1 ? '' : 's'),
            ])
            ->values()
            ->all();

        return Inertia::render('Machines/Index', [
            'summary' => [
                [
                    'label' => 'Print jobs today',
                    'value' => (string) $printJobsToday,
                    'icon' => 'printer',
                    'tone' => 'text-sky-500 bg-sky-100 dark:bg-sky-900/30',
                    'sub' => $this->dayOverDayLabel($printJobsToday, $printJobsYesterday),
                ],
                [
                    'label' => 'Active SKUs',
                    'value' => (string) $activeSkus,
                    'icon' => 'boxes',
                    'tone' => 'text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30',
                    'sub' => 'Variants in this shop',
                ],
                [
                    'label' => 'Ready for pickup',
                    'value' => (string) $readyForPickup,
                    'icon' => 'package',
                    'tone' => 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30',
                    'sub' => 'Bills marked ready',
                ],
            ],
            'productionQueue' => $queueBills,
            'productGroups' => $categoryGroups,
        ]);
    }

    private function dayOverDayLabel(int $today, int $yesterday): string
    {
        if ($yesterday === 0 && $today === 0) {
            return 'Same as yesterday';
        }
        if ($yesterday === 0) {
            return 'First activity today';
        }
        $pct = (int) round((($today - $yesterday) / $yesterday) * 100);
        if ($pct === 0) {
            return 'Same as yesterday';
        }

        return ($pct > 0 ? '+' : '').$pct.'% vs yesterday';
    }
}
