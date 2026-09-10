<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventPayment;
use App\Models\PhotographyPackage;
use App\Models\ShopSetting;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * EventController
 *
 * Full CRUD for photography events.
 *
 * Scope in this module:
 *   - Create and manage event records for weddings, parties, and corporate shoots
 *   - Track event details, schedule, status, and notes
 *
 * Explicitly out of scope here:
 *   - Employee assignment / staffing allocation
 *   - Responsibility tracking per employee
 *
 * Those pieces are intentionally left open for a separate team-owned workflow.
 */
class EventController extends Controller
{
    public function index(Request $request): Response
    {
        $activeShop = app(\App\Modules\Shops\Models\Shop::class);
        $year = (int) ($request->input('year') ?: now()->year);
        $month = (int) ($request->input('month') ?: now()->month);
        $sortDirection = $request->input('year_sort') === 'asc' ? 'asc' : 'desc';
        $weddingListYear = (int) ($request->input('wedding_list_year') ?: $year);
        $weddingListDate = $request->input('wedding_list_date');

        $eventsQuery = Event::forShop($activeShop->id)
            ->when($request->boolean('wedding_only', false), function ($query) {
                $query->where('event_type', 'wedding');
            })
            ->when($year > 0, function ($query) use ($year) {
                $query->whereYear('event_date', $year);
            })
            ->when($month >= 1 && $month <= 12, function ($query) use ($month) {
                $query->whereMonth('event_date', $month);
            })
            ->orderBy('event_date', $sortDirection)
            ->latest('id')
            ->paginate(10);
        $events = $eventsQuery->withQueryString();

        $driver = DB::getDriverName();
        if ($driver === 'sqlite') {
            $weddingMonthlyBreakdown = Event::forShop($activeShop->id)
                ->where('event_type', 'wedding')
                ->whereYear('event_date', $year)
                ->selectRaw("CAST(strftime('%m', event_date) AS INTEGER) as month_number")
                ->selectRaw('COUNT(*) as total')
                ->groupBy(DB::raw("strftime('%m', event_date)"))
                ->orderBy('month_number')
                ->get();
        } else {
            $weddingMonthlyBreakdown = Event::forShop($activeShop->id)
                ->where('event_type', 'wedding')
                ->whereYear('event_date', $year)
                ->selectRaw('MONTH(event_date) as month_number')
                ->selectRaw('COUNT(*) as total')
                ->groupBy('month_number')
                ->orderBy('month_number')
                ->get();
        }

        $calendarStart = Carbon::create($year, $month, 1)->startOfMonth();
        $calendarEnd = $calendarStart->copy()->endOfMonth();

        $weddingCalendarEvents = Event::forShop($activeShop->id)
            ->where('event_type', 'wedding')
            ->whereBetween('event_date', [$calendarStart->toDateString(), $calendarEnd->toDateString()])
            ->orderBy('event_date')
            ->get(['id', 'title', 'client_name', 'event_date', 'location', 'status', 'notes']);

        $availableWeddingYears = Event::forShop($activeShop->id)
            ->where('event_type', 'wedding')
            ->selectRaw($driver === 'sqlite' ? 'CAST(strftime("%Y", event_date) AS INTEGER) as year' : 'YEAR(event_date) as year')
            ->whereNotNull('event_date')
            ->orderByDesc('year')
            ->pluck('year')
            ->values();

        $weddingEventsList = Event::forShop($activeShop->id)
            ->where('event_type', 'wedding')
            ->when($weddingListYear > 0, function ($query) use ($weddingListYear) {
                $query->whereYear('event_date', $weddingListYear);
            })
            ->when(! empty($weddingListDate), function ($query) use ($weddingListDate) {
                $query->whereDate('event_date', $weddingListDate);
            })
            ->withSum('payments as received_amount', 'amount')
            ->orderBy('event_date')
            ->paginate(10, ['id', 'title', 'client_name', 'event_date', 'location', 'status', 'total_amount', 'notes'])
            ->through(function (Event $event) {
                $totalAmount = round((float) ($event->total_amount ?? 0), 2);
                $receivedAmount = round((float) ($event->received_amount ?? 0), 2);
                $balanceAmount = max(0, round($totalAmount - $receivedAmount, 2));

                $this->markCompletedIfFullyPaid($event, $totalAmount, $receivedAmount);

                return [
                    'id' => $event->id,
                    'title' => $event->title,
                    'client_name' => $event->client_name,
                    'event_date' => $event->event_date,
                    'location' => $event->location,
                    'status' => $event->fresh()->status,
                    'notes' => $event->notes,
                    'total_amount' => $totalAmount,
                    'received_amount' => $receivedAmount,
                    'balance_amount' => $balanceAmount,
                ];
            })
            ->withQueryString();

        $stats = [
            'total' => Event::forShop($activeShop->id)->count(),
            'upcoming' => Event::forShop($activeShop->id)->whereDate('event_date', '>=', today())->count(),
            'confirmed' => Event::forShop($activeShop->id)->where('status', 'confirmed')->count(),
            'completed' => Event::forShop($activeShop->id)->where('status', 'completed')->count(),
        ];

        return Inertia::render('Photography/Events/Index', [
            'events' => $events,
            'stats' => $stats,
            'weddingMonthlyBreakdown' => $weddingMonthlyBreakdown,
            'weddingCalendarEvents' => $weddingCalendarEvents,
            'weddingEventsList' => $weddingEventsList,
            'availableWeddingYears' => $availableWeddingYears,
            'filters' => [
                'year' => $year,
                'month' => $month,
                'year_sort' => $sortDirection,
                'wedding_only' => $request->boolean('wedding_only', false),
                'wedding_list_year' => $weddingListYear,
                'wedding_list_date' => $weddingListDate,
            ],
        ]);
    }

    public function create(): Response
    {
        $activeShop = app(\App\Modules\Shops\Models\Shop::class);
        $packageOptions = PhotographyPackage::forShop($activeShop->id)
            ->where('event_type', 'like', '%wedding%')
            ->whereIn('status', ['draft', 'active'])
            ->orderByDesc('updated_at')
            ->get(['id', 'name', 'category', 'total_price', 'services', 'deliverables', 'notes', 'status']);

        return Inertia::render('Photography/Events/Create', [
            'packageOptions' => $packageOptions,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'event_type' => ['required', Rule::in(['wedding', 'party', 'corporate_shoot', 'other'])],
            'client_name' => ['required', 'string', 'max:255'],
            'client_phone' => ['nullable', 'string', 'max:50'],
            'event_date' => ['required', 'date'],
            'location' => ['nullable', 'string', 'max:255'],
            'wedding_location' => ['nullable', 'string', 'max:255'],
            'saloon_location' => ['nullable', 'string', 'max:255'],
            'photo_shoot_location' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::in(['draft', 'confirmed', 'in_progress', 'completed', 'cancelled'])],
            'expected_guests' => ['nullable', 'integer', 'min:1'],
            'total_amount' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'custom_sections' => ['nullable', 'array'],
            'custom_sections.*.title' => ['nullable', 'string', 'max:255'],
            'custom_sections.*.rows' => ['nullable', 'array'],
            'photography_packages' => ['nullable', 'array'],
            'videography_packages' => ['nullable', 'array'],
        ]);

        $data['shop_id'] = app(\App\Modules\Shops\Models\Shop::class)->id;
        Event::create($data);

        return redirect()
            ->route('photography.events.index')
            ->with('success', 'Event created successfully.');
    }

    public function show(Event $event): Response
    {
        $event->load(['payments' => function ($query) {
            $query->orderByDesc('paid_on')->orderByDesc('id');
        }]);

        $totalAmount = (float) ($event->total_amount ?? 0);
        $receivedAmount = (float) $event->payments->sum('amount');
        $balanceAmount = max(0, $totalAmount - $receivedAmount);

        return Inertia::render('Photography/Events/Show', [
            'event' => $event,
            'paymentSummary' => [
                'total_amount' => round($totalAmount, 2),
                'received_amount' => round($receivedAmount, 2),
                'balance_amount' => round($balanceAmount, 2),
                'payment_status' => $receivedAmount <= 0
                    ? 'pending_advance'
                    : ($balanceAmount > 0 ? 'partially_paid' : 'fully_paid'),
            ],
        ]);
    }

    public function edit(Event $event): Response
    {
        $activeShop = app(\App\Modules\Shops\Models\Shop::class);
        $packageOptions = PhotographyPackage::forShop($activeShop->id)
            ->where('event_type', 'like', '%wedding%')
            ->whereIn('status', ['draft', 'active'])
            ->orderByDesc('updated_at')
            ->get(['id', 'name', 'category', 'total_price', 'services', 'deliverables', 'notes', 'status']);

        return Inertia::render('Photography/Events/Edit', [
            'event' => $event,
            'packageOptions' => $packageOptions,
        ]);
    }

    public function update(Request $request, Event $event): RedirectResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'event_type' => ['required', Rule::in(['wedding', 'party', 'corporate_shoot', 'other'])],
            'client_name' => ['required', 'string', 'max:255'],
            'client_phone' => ['nullable', 'string', 'max:50'],
            'event_date' => ['required', 'date'],
            'location' => ['nullable', 'string', 'max:255'],
            'wedding_location' => ['nullable', 'string', 'max:255'],
            'saloon_location' => ['nullable', 'string', 'max:255'],
            'photo_shoot_location' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::in(['draft', 'confirmed', 'in_progress', 'completed', 'cancelled'])],
            'expected_guests' => ['nullable', 'integer', 'min:1'],
            'total_amount' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'custom_sections' => ['nullable', 'array'],
            'custom_sections.*.title' => ['nullable', 'string', 'max:255'],
            'custom_sections.*.rows' => ['nullable', 'array'],
            'photography_packages' => ['nullable', 'array'],
            'videography_packages' => ['nullable', 'array'],
        ]);

        $event->update($data);

        return redirect()
            ->route('photography.events.show', $event)
            ->with('success', 'Event updated successfully.');
    }

    public function destroy(Event $event): RedirectResponse
    {
        $event->delete();

        return redirect()
            ->route('photography.events.index')
            ->with('success', 'Event deleted successfully.');
    }

    public function updateStatus(Request $request, Event $event): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['draft', 'confirmed', 'in_progress', 'completed', 'cancelled'])],
        ]);

        $event->update(['status' => $validated['status']]);

        $receivedAmount = (float) $event->payments()->sum('amount');
        $totalAmount = round((float) ($event->total_amount ?? 0), 2);
        $this->markCompletedIfFullyPaid($event, $totalAmount, $receivedAmount);

        return back()->with('success', 'Event status updated successfully.');
    }

    public function storePayment(Request $request, Event $event): RedirectResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', Rule::in(['cash', 'card', 'bank_transfer', 'online', 'other'])],
            'paid_on' => ['required', 'date'],
            'reference_no' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        EventPayment::create([
            'shop_id' => $event->shop_id,
            'event_id' => $event->id,
            'amount' => $validated['amount'],
            'payment_method' => $validated['payment_method'],
            'paid_on' => $validated['paid_on'],
            'reference_no' => $validated['reference_no'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'recorded_by' => $request->user()?->id,
        ]);

        $receivedAmount = (float) $event->payments()->sum('amount');
        $totalAmount = round((float) ($event->total_amount ?? 0), 2);
        $markedCompleted = $this->markCompletedIfFullyPaid($event, $totalAmount, $receivedAmount);

        return redirect()
            ->route('photography.events.show', $event)
            ->with(
                'success',
                $markedCompleted
                    ? 'Wedding payment recorded successfully. Event marked as completed.'
                    : 'Wedding payment recorded successfully.'
            );
    }

    private function markCompletedIfFullyPaid(Event $event, float $totalAmount, float $receivedAmount): bool
    {
        if (in_array($event->status, ['completed', 'cancelled'], true)) {
            return false;
        }

        if ($totalAmount <= 0 || $receivedAmount + 0.009 < $totalAmount) {
            return false;
        }

        $event->update(['status' => 'completed']);

        return true;
    }

    public function printPayment(Event $event, EventPayment $payment)
    {
        if ((int) $payment->event_id !== (int) $event->id || (int) $payment->shop_id !== (int) $event->shop_id) {
            abort(404);
        }

        $shopName = ShopSetting::get('shop_name', 'Photography Shop');
        $shopPhone = ShopSetting::get('shop_phone', '');
        $shopAddress = ShopSetting::get('shop_address', '');
        $shopLogo = ShopSetting::get('shop_logo', '');

        return view('events.payment-receipt', [
            'event' => $event,
            'payment' => $payment,
            'shopName' => $shopName,
            'shopPhone' => $shopPhone,
            'shopAddress' => $shopAddress,
            'shopLogo' => $shopLogo,
        ]);
    }
}
