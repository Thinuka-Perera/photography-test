<?php

namespace App\Http\Controllers;

use App\Models\BillCategory;
use App\Models\RoleShiftSetting;
use App\Models\ShopSetting;
use App\Modules\Shops\Models\Shop;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SettingsController extends Controller
{
    public function index()
    {
        $activeShop = $this->resolveActiveShop();
        $settings = ShopSetting::all_settings($activeShop?->id);
        $settings['bill_prefix'] = $activeShop?->bill_prefix ?? 'BILL';
        
        $counter = DB::table('bill_counters')
            ->where('shop_id', $activeShop?->id)
            ->where('date', '00000000')
            ->first();
        $settings['bill_next_number'] = $counter ? (int) $counter->next_number : 1;
        $itemTypes = Schema::hasTable('bill_categories')
            ? (function () use ($activeShop) {
                $query = BillCategory::query()
                    ->orderByDesc('is_active')
                    ->orderBy('name');

                if (Schema::hasColumn('bill_categories', 'shop_id') && $activeShop?->exists) {
                    $query->where('shop_id', $activeShop->id);
                }

                return $query->get([
                    'id',
                    'name',
                    'default_description',
                    'no_commission',
                    'is_active',
                ]);
            })()
            : collect();

        if ($activeShop?->exists) {
            RoleShiftSetting::ensureDefaultsForShop($activeShop->id);
        }

        return Inertia::render('Settings/Index', [
            'settings' => $settings,
            'itemTypes' => $itemTypes,
            'roleShiftSettings' => RoleShiftSetting::listForShop($activeShop?->id),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $shopId = $this->activeShopId();
        $this->normalizeBooleanFields($request);

        try {
            $validated = $request->validate([
            'shop_name'            => 'nullable|string|max:255',
            'shop_address'         => 'nullable|string|max:500',
            'shop_phone'           => 'nullable|string|max:50',
            'shop_email'           => 'nullable|email|max:255',
            'tax_rate'             => 'nullable|numeric|min:0|max:100',
            'currency'             => 'nullable|string|max:10',
            'invoice_prefix'       => 'nullable|string|max:20',
            'bill_prefix'          => 'nullable|string|max:20|alpha_dash',
            'bill_next_number'     => 'nullable|integer|min:1',
            'invoice_note'         => 'nullable|string|max:500',
            'invoice_terms'        => 'nullable|string|max:1000',
            'invoice_payment_info' => 'nullable|string|max:1000',
            'invoice_paper_size'   => 'nullable|in:A4,80mm',
            'invoice_template'     => 'nullable|in:default,client_format',
            'auto_send_pdf'        => 'nullable|boolean',
            'low_stock_alert'      => 'nullable|boolean',
            'invoice_approval'     => 'nullable|boolean',

            // Branding & Footer
            'shop_website'         => 'nullable|string|max:255',
            'shop_facebook'        => 'nullable|string|max:255',
            'shop_instagram'       => 'nullable|string|max:255',
            'shop_whatsapp'        => 'nullable|string|max:20',
            'shop_hotline'         => 'nullable|string|max:50',
            'shop_footer_text'     => 'nullable|string|max:1000',
            'shop_tagline'         => 'nullable|string|max:255',

            // Bank Details
            'bank_account_no'      => 'nullable|string|max:255',
            'account_name'         => 'nullable|string|max:255',
            'bank_details'         => 'nullable|string|max:255',

            // Logo — max 8MB; allow SVG (not covered by `image` rule)
            'shop_logo' => ['nullable', 'file', 'mimes:jpeg,png,jpg,gif,webp,svg', 'max:8192'],
        ], [
            'shop_logo.file' => 'Please choose a valid logo file to upload.',
            'shop_logo.mimes' => 'Logo must be a JPEG, PNG, GIF, WebP, or SVG image.',
            'shop_logo.max' => 'File size exceeds the 8MB limit.',
        ]);
        } catch (ValidationException $e) {
            return back()
                ->withInput()
                ->withErrors($e->errors())
                ->with('error', collect($e->errors())->flatten()->first() ?? 'Invalid settings data.');
        }

        if ($request->hasFile('shop_logo')) {
            $logoError = $this->persistShopLogo($request->file('shop_logo'), $shopId);
            if ($logoError !== null) {
                return back()->withInput()->with('error', $logoError);
            }
        }

        $shop = $this->resolveActiveShop();
        if ($shop && $request->has('bill_prefix')) {
            $shop->update([
                'bill_prefix' => strtoupper(trim((string) ($request->input('bill_prefix') ?? '')))
            ]);
        }

        if ($request->has('bill_next_number')) {
            $nextVal = (int) $request->input('bill_next_number');
            if ($nextVal >= 1) {
                DB::table('bill_counters')
                    ->updateOrInsert(
                        [
                            'shop_id' => $shopId,
                            'date' => '00000000'
                        ],
                        [
                            'next_number' => $nextVal,
                            'updated_at' => now()
                        ]
                    );
            }
        }

        $settingsToSave = collect($validated)->except(['shop_logo', 'bill_prefix', 'bill_next_number']);
        foreach ($settingsToSave as $key => $value) {
            ShopSetting::set($key, is_bool($value) ? ($value ? '1' : '0') : ($value ?? ''), $shopId);
        }

        $message = $request->hasFile('shop_logo')
            ? 'Logo updated successfully!'
            : 'Settings saved successfully.';

        return back()->with('success', $message);
    }

    // ── Delete Logo ───────────────────────────────────────────────────────
    public function deleteLogo(): RedirectResponse
    {
        $shopId = $this->activeShopId();
        $logo = ShopSetting::get('shop_logo', null, $shopId);

        if ($logo && Storage::disk('public')->exists($logo)) {
            Storage::disk('public')->delete($logo);
        }

        ShopSetting::set('shop_logo', '', $shopId);

        return back()->with('success', 'Logo removed successfully.');
    }

    private function activeShopId(): int
    {
        $shop = $this->resolveActiveShop();
        abort_unless($shop?->exists, 404);

        return (int) $shop->id;
    }

    private function normalizeBooleanFields(Request $request): void
    {
        foreach (['auto_send_pdf', 'low_stock_alert', 'invoice_approval'] as $field) {
            if (! $request->has($field)) {
                continue;
            }

            $request->merge([
                $field => filter_var(
                    $request->input($field),
                    FILTER_VALIDATE_BOOLEAN,
                    FILTER_NULL_ON_FAILURE,
                ) ?? false,
            ]);
        }
    }

    /**
     * Store logo on the public disk and persist path for the active shop.
     *
     * @return string|null Error message, or null on success.
     */
    private function persistShopLogo(UploadedFile $file, int $shopId): ?string
    {
        if (! $file->isValid()) {
            return 'Logo upload failed: '.$file->getErrorMessage();
        }

        try {
            $oldLogo = ShopSetting::get('shop_logo', null, $shopId);
            if ($oldLogo && Storage::disk('public')->exists($oldLogo)) {
                Storage::disk('public')->delete($oldLogo);
            }

            Storage::disk('public')->makeDirectory('shop/logos');

            $path = $file->store('shop/logos', 'public');

            if (! $path) {
                return 'Logo could not be saved to storage. Please try again.';
            }

            ShopSetting::set('shop_logo', $path, $shopId);
        } catch (\Throwable $e) {
            report($e);

            return 'Could not save the logo. Check that storage is linked (php artisan storage:link) and writable.';
        }

        return null;
    }

    private function resolveActiveShop(): ?Shop
    {
        if (app()->bound(Shop::class)) {
            $bound = app(Shop::class);
            if ($bound instanceof Shop && $bound->exists) {
                return $bound;
            }
        }

        return Shop::query()
            ->when(
                Schema::hasColumn('shops', 'is_default'),
                fn ($query) => $query->orderByDesc('is_default')
            )
            ->when(
                Schema::hasColumn('shops', 'is_active'),
                fn ($query) => $query->where('is_active', true)
            )
            ->orderBy('id')
            ->first();
    }
}