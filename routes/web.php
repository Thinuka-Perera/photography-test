<?php

use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\PackageController;
use App\Http\Controllers\Payroll\EditorCommissionController;
use App\Http\Controllers\PayrollController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\QuotationController;
use App\Http\Controllers\Reports\SaleReportController;
use App\Http\Controllers\RoleAccessController;
use App\Http\Controllers\SalaryLedgerEntryController;
use App\Http\Controllers\Settings\BillCategoryController;
use App\Http\Controllers\Settings\RoleShiftSettingController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\Studio\BillController;
use App\Http\Controllers\Studio\CreditBillController;
use App\Http\Controllers\Studio\PosController;
use App\Http\Controllers\Studio\SaleController;
use App\Http\Controllers\Studio\StudioDashboardController;
use App\Http\Controllers\UserManagementController;
use App\Http\Controllers\ProductReturnController;
use App\Models\Bill;
use App\Models\Sale;
use App\Models\ShopSetting;
use App\Modules\Shops\Http\Controllers\ShopController;
use App\Modules\Shops\Models\Shop;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

if (! function_exists('compatUpdateRoute')) {
    function compatUpdateRoute(string $uri, array $action): void
    {
        Route::post(rtrim($uri, '/').'/update', $action);
    }
}

if (! function_exists('compatDeleteRoute')) {
    function compatDeleteRoute(string $uri, array $action): void
    {
        Route::post(rtrim($uri, '/').'/delete', $action);
    }
}

Route::get('/', function () {
    return redirect()->route('login');
});

Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'verified', 'page:dashboard'])
    ->name('dashboard');

Route::redirect('/studio/bills', '/studio/pos');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    compatUpdateRoute('/profile', [ProfileController::class, 'update']);
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    compatDeleteRoute('/profile', [ProfileController::class, 'destroy']);

    // ── Shops (multi-shop layer) ─────────────────────────────────────────────
    // Switching the active shop is allowed for any authenticated user — gating
    // happens at the data layer (each user only ever sees their own shop's data).
    Route::post('/shops/active/{shop:slug}', [ShopController::class, 'setActive'])
        ->name('shops.active.set');

    // The shops landing page + admin CRUD live behind the `shops` page key.
    Route::middleware('page:shops')->group(function () {
        Route::get('/shops', [ShopController::class, 'index'])->name('shops.index');

        Route::middleware('role:super_admin,admin')->group(function () {
            Route::post('/shops', [ShopController::class, 'store'])->name('shops.store');
            Route::put('/shops/{shop:slug}', [ShopController::class, 'update'])->name('shops.update');
            compatUpdateRoute('/shops/{shop:slug}', [ShopController::class, 'update']);
            Route::delete('/shops/{shop:slug}', [ShopController::class, 'destroy'])->name('shops.destroy');
            compatDeleteRoute('/shops/{shop:slug}', [ShopController::class, 'destroy']);
        });
    });

    Route::get('/studio', StudioDashboardController::class)
        ->middleware('page:studio-dashboard')
        ->name('studio.dashboard');



    Route::prefix('photography')->name('photography.')->middleware('page:event-management')->group(function () {
        Route::resource('events', EventController::class);
        compatUpdateRoute('events/{event}', [EventController::class, 'update']);
        compatDeleteRoute('events/{event}', [EventController::class, 'destroy']);
        Route::post('events/{event}/status', [EventController::class, 'updateStatus'])->name('events.status.update');
        compatUpdateRoute('events/{event}/status', [EventController::class, 'updateStatus']);
        Route::post('events/{event}/payments', [EventController::class, 'storePayment'])->name('events.payments.store');
        Route::get('events/{event}/payments/{payment}/print', [EventController::class, 'printPayment'])->name('events.payments.print');
    });

    Route::middleware('page:quotations')->group(function () {
        Route::get('/photography/quotations', [QuotationController::class, 'index'])
            ->name('photography.quotations');
        Route::post('/photography/quotations', [QuotationController::class, 'store'])
            ->name('photography.quotations.store');
        Route::put('/photography/quotations/{quotation}', [QuotationController::class, 'update'])
            ->name('photography.quotations.update');
        compatUpdateRoute('/photography/quotations/{quotation}', [QuotationController::class, 'update']);
        Route::delete('/photography/quotations/{quotation}', [QuotationController::class, 'destroy'])
            ->name('photography.quotations.destroy');
        compatDeleteRoute('/photography/quotations/{quotation}', [QuotationController::class, 'destroy']);
        Route::post('/photography/quotations/{quotation}/prepare-whatsapp', [QuotationController::class, 'prepareWhatsapp'])
            ->name('photography.quotations.prepare-whatsapp');
        Route::post('/photography/quotations/{quotation}/convert-to-invoice', [InvoiceController::class, 'convertFromQuotation'])
            ->name('photography.quotations.convert-to-invoice');
    });

    Route::middleware('page:packages')->group(function () {
        Route::get('/photography/packages', [PackageController::class, 'index'])
            ->name('photography.packages');
        Route::post('/photography/packages', [PackageController::class, 'store'])
            ->name('photography.packages.store');
        Route::put('/photography/packages/{package}', [PackageController::class, 'update'])
            ->name('photography.packages.update');
        compatUpdateRoute('/photography/packages/{package}', [PackageController::class, 'update']);
        Route::delete('/photography/packages/{package}', [PackageController::class, 'destroy'])
            ->name('photography.packages.destroy');
        compatDeleteRoute('/photography/packages/{package}', [PackageController::class, 'destroy']);
    });

    Route::middleware('page:inventory')->group(function () {
        Route::resource('products', ProductController::class);
        Route::post('/products/update', [ProductController::class, 'updatePost'])
            ->name('products.update.post');
        Route::post('/products/remove', [ProductController::class, 'destroyPost'])
            ->name('products.destroy.post');
        Route::post('/products/{product}/update', [ProductController::class, 'update']);
        Route::post('/products/{product}/delete', [ProductController::class, 'destroy']);
        Route::post('/products/{product}/remove', [ProductController::class, 'destroy']);
        Route::post('/products/import-preview', [ProductController::class, 'importPreview'])->name('products.import.preview');
        Route::post('/products/import-submit', [ProductController::class, 'importSubmit'])->name('products.import.submit');
        Route::get('/inventory', [InventoryController::class, 'index'])->name('inventory.index');
        Route::post('/inventory/stock-in', [InventoryController::class, 'stockIn'])->name('inventory.stockIn');
        Route::post('/inventory/stock-out', [InventoryController::class, 'stockOut'])->name('inventory.stockOut');
        Route::post('/inventory/shipment', [InventoryController::class, 'storeShipment'])->name('inventory.shipment.store');
        Route::get('/inventory/logs/{variant}', [InventoryController::class, 'logs'])->name('inventory.logs');
    });

    Route::middleware('page:stock-tracking')->group(function () {
        Route::get('/inventory/stock', [InventoryController::class, 'stock'])->name('inventory.stock');
    });

    Route::middleware('page:purchase-history')->group(function () {
        Route::get('/inventory/purchases', [InventoryController::class, 'purchases'])->name('inventory.purchases');
    });

    Route::middleware('page:categories')->group(function () {
        Route::resource('categories', CategoryController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::post('/categories/update', [CategoryController::class, 'updatePost']);
        Route::post('/categories/delete', [CategoryController::class, 'destroyPost']);
        compatUpdateRoute('/categories/{category}', [CategoryController::class, 'update']);
        compatDeleteRoute('/categories/{category}', [CategoryController::class, 'destroy']);
    });

    Route::middleware('page:employees')->group(function () {
        Route::get('/employees', [EmployeeController::class, 'index'])
            ->name('employees.index');
        Route::get('/employees/birthdays', [EmployeeController::class, 'birthdays'])
            ->name('employees.birthdays');
        Route::post('/employees', [EmployeeController::class, 'store'])
            ->name('employees.store');
        Route::post('/employees/update', [EmployeeController::class, 'updatePost']);
        Route::post('/employees/delete', [EmployeeController::class, 'destroyPost']);
        Route::put('/employees/{employee}', [EmployeeController::class, 'update'])
            ->name('employees.update');
        compatUpdateRoute('/employees/{employee}', [EmployeeController::class, 'update']);
        Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy'])
            ->name('employees.destroy');
        compatDeleteRoute('/employees/{employee}', [EmployeeController::class, 'destroy']);
    });

    Route::middleware('page:attendance')->group(function () {
        Route::get('/attendance', [AttendanceController::class, 'index'])
            ->name('attendance.index');
        Route::post('/attendance', [AttendanceController::class, 'store'])
            ->name('attendance.store');
        Route::post('/attendance/update', [AttendanceController::class, 'updatePost']);
        Route::post('/attendance/delete', [AttendanceController::class, 'destroyPost']);
        Route::put('/attendance/{attendance}', [AttendanceController::class, 'update'])
            ->name('attendance.update');
        compatUpdateRoute('/attendance/{attendance}', [AttendanceController::class, 'update']);
        Route::delete('/attendance/{attendance}', [AttendanceController::class, 'destroy'])
            ->name('attendance.destroy');
        compatDeleteRoute('/attendance/{attendance}', [AttendanceController::class, 'destroy']);
    });

    Route::middleware('page:salaries.view')->group(function () {
        Route::get('/payroll/salaries', [PayrollController::class, 'index'])
            ->name('payroll.salaries.index');

        // ── Editor Commissions Tab (Admin/Super Admin only) ──────────────
        Route::middleware('role:super_admin,admin')->group(function () {
            Route::get('/payroll/editor-commissions', [EditorCommissionController::class, 'index'])
                ->name('payroll.editor-commissions.index');
            Route::post('/payroll/editor-commissions/{commission}/mark-paid', [EditorCommissionController::class, 'markPaid'])
                ->name('payroll.editor-commissions.mark-paid');
            Route::post('/payroll/editor-commissions/batch-mark-paid', [EditorCommissionController::class, 'batchMarkPaid'])
                ->name('payroll.editor-commissions.batch-mark-paid');
        });
    });

    Route::middleware('page:salaries.create')->group(function () {
        Route::post('/payroll/salaries', [PayrollController::class, 'store'])
            ->name('payroll.salaries.store');
    });

    Route::middleware('page:salaries.edit')->group(function () {
        Route::put('/payroll/salaries/{salaryProfile}', [PayrollController::class, 'update'])
            ->name('payroll.salaries.update');
        compatUpdateRoute('/payroll/salaries/{salaryProfile}', [PayrollController::class, 'update']);
        Route::post('/payroll/salaries/{salaryProfile}/pay', [PayrollController::class, 'pay'])
            ->name('payroll.salaries.pay');
        Route::post('/payroll/salaries/{salaryProfile}/ledger', [SalaryLedgerEntryController::class, 'store'])
            ->name('payroll.ledger.store');
        Route::put('/payroll/ledger/{salaryLedgerEntry}', [SalaryLedgerEntryController::class, 'update'])
            ->name('payroll.ledger.update');
        compatUpdateRoute('/payroll/ledger/{salaryLedgerEntry}', [SalaryLedgerEntryController::class, 'update']);
    });

    Route::middleware('page:salaries.delete')->group(function () {
        Route::delete('/payroll/salaries/{salaryProfile}', [PayrollController::class, 'destroy'])
            ->name('payroll.salaries.destroy');
        compatDeleteRoute('/payroll/salaries/{salaryProfile}', [PayrollController::class, 'destroy']);
        Route::delete('/payroll/ledger/{salaryLedgerEntry}', [SalaryLedgerEntryController::class, 'destroy'])
            ->name('payroll.ledger.destroy');
        compatDeleteRoute('/payroll/ledger/{salaryLedgerEntry}', [SalaryLedgerEntryController::class, 'destroy']);
    });

    Route::middleware('page:customers')->group(function () {
        Route::get('/customers', [CustomerController::class, 'index'])->name('customers.index');
        Route::get('/customers/{customer}', [CustomerController::class, 'show'])->name('customers.show');
        Route::post('/customers', [CustomerController::class, 'store'])->name('customers.store');
        Route::put('/customers/{customer}', [CustomerController::class, 'update'])->name('customers.update');
        compatUpdateRoute('/customers/{customer}', [CustomerController::class, 'update']);
        Route::delete('/customers/{customer}', [CustomerController::class, 'destroy'])->name('customers.destroy');
        compatDeleteRoute('/customers/{customer}', [CustomerController::class, 'destroy']);
    });

    Route::get('/communication/whatsapp', function () {
        return Inertia::render('Pos/Index');
    })->middleware('page:whatsapp-hub')->name('communication.whatsapp');

    Route::middleware('page:settings')->group(function () {
        Route::get('/settings', [SettingsController::class, 'index'])
            ->name('settings.index');

        Route::post('/settings', [SettingsController::class, 'update'])
            ->name('settings.update');

        Route::delete('/settings/logo', [SettingsController::class, 'deleteLogo'])
            ->name('settings.logo.delete');
        compatDeleteRoute('/settings/logo', [SettingsController::class, 'deleteLogo']);

        Route::post('/settings/bill-categories', [BillCategoryController::class, 'store'])
            ->name('settings.bill-categories.store');
        Route::post('/settings/bill-categories/update', [BillCategoryController::class, 'updatePost']);
        Route::post('/settings/bill-categories/delete', [BillCategoryController::class, 'destroyPost']);
        Route::put('/settings/bill-categories/{billCategory}', [BillCategoryController::class, 'update'])
            ->name('settings.bill-categories.update');
        compatUpdateRoute('/settings/bill-categories/{billCategory}', [BillCategoryController::class, 'update']);
        Route::delete('/settings/bill-categories/{billCategory}', [BillCategoryController::class, 'destroy'])
            ->name('settings.bill-categories.destroy');
        compatDeleteRoute('/settings/bill-categories/{billCategory}', [BillCategoryController::class, 'destroy']);

        Route::middleware('role:super_admin,admin')->group(function () {
            Route::post('/settings/role-shifts', [RoleShiftSettingController::class, 'update'])
                ->name('settings.role-shifts.update');
        });
    });

    Route::middleware(['role:super_admin,admin', 'page:user-management'])->group(function () {
        Route::get('/users', [UserManagementController::class, 'index'])->name('users.index');
        Route::post('/users', [UserManagementController::class, 'store'])->name('users.store');
        Route::put('/users/{user}', [UserManagementController::class, 'update'])->name('users.update');
        compatUpdateRoute('/users/{user}', [UserManagementController::class, 'update']);
        Route::delete('/users/{user}', [UserManagementController::class, 'destroy'])->name('users.destroy');
        compatDeleteRoute('/users/{user}', [UserManagementController::class, 'destroy']);
    });

    Route::middleware(['role:super_admin,admin', 'page:role-access'])->group(function () {
        Route::get('/roles/access', [RoleAccessController::class, 'index'])->name('roles.access.index');
        Route::post('/roles/access', [RoleAccessController::class, 'store'])->name('roles.access.store');
        Route::put('/roles/access/{role}', [RoleAccessController::class, 'update'])->name('roles.access.update');
        compatUpdateRoute('/roles/access/{role}', [RoleAccessController::class, 'update']);
        Route::delete('/roles/access/{role}', [RoleAccessController::class, 'destroy'])->name('roles.access.destroy');
        compatDeleteRoute('/roles/access/{role}', [RoleAccessController::class, 'destroy']);
    });

    Route::middleware('verified')->group(function () {

        // ── Studio POS (Piyara's module — DO NOT CHANGE) ─────────────────
        Route::prefix('studio')->name('studio.')->group(function () {
            Route::get('/pos', [PosController::class, 'index'])
                ->middleware('page:studio-pos')
                ->name('pos.index');
            Route::post('/pos/commit', [BillController::class, 'store'])
                ->middleware('page:studio-pos')
                ->name('pos.commit');
            Route::get('/sales', [SaleController::class, 'index'])
                ->middleware('page:sales-history')
                ->name('sales.index');
            Route::get('/sales/{sale}', [SaleController::class, 'show'])
                ->middleware('page:sales-history')
                ->name('sales.show');
            Route::post('/sales', [SaleController::class, 'store'])
                ->middleware('page:studio-pos')
                ->name('sales.store');
            Route::post('/customers/quick-store', [CustomerController::class, 'storeFromPos'])
                ->middleware('page:studio-pos')
                ->name('customers.quick-store');
            Route::get('/credit-management', [CreditBillController::class, 'index'])
                ->middleware('page:credit-management')
                ->name('credit-management.index');
            Route::get('/credit-management/search-advance', [CreditBillController::class, 'searchAdvanceBill'])
                ->name('credit-management.search-advance');
            Route::post('/credit-management/{creditBill}/payment', [CreditBillController::class, 'recordPayment'])
                ->middleware('page:credit-management')
                ->name('credit-management.payment');

            // ── Bills (Phase 2 — Piyara's module extension) ──────────────
            Route::get('/bills', [BillController::class, 'index'])
                ->middleware('page:studio-bills')
                ->name('bills.index');
            Route::get('/bills/create', [BillController::class, 'create'])
                ->middleware('page:studio-bills')
                ->name('bills.create');
            Route::post('/bills', [BillController::class, 'store'])
                ->middleware('page:studio-bills')
                ->name('bills.store');
            Route::get('/bills/{bill}/pos-flash', [BillController::class, 'posFlash'])
                ->middleware('page:studio-pos')
                ->name('bills.pos-flash');
            Route::get('/bills/{bill}', [BillController::class, 'show'])
                ->middleware('page:studio-bills')
                ->name('bills.show');
            Route::get('/bills/{bill}/print', [BillController::class, 'printView'])
                ->middleware('page:studio-bills')
                ->name('bills.print');
            Route::get('/bills/{bill}/edit', [BillController::class, 'edit'])
                ->middleware('page:studio-bills')
                ->name('bills.edit');
            Route::put('/bills/{bill}', [BillController::class, 'update'])
                ->middleware('page:studio-bills')
                ->name('bills.update');
            compatUpdateRoute('/bills/{bill}', [BillController::class, 'update']);
            Route::patch('/bills/{bill}/status', [BillController::class, 'updateStatus'])
                ->middleware('page:studio-bills')
                ->name('bills.updateStatus');
            compatUpdateRoute('/bills/{bill}/status', [BillController::class, 'updateStatus']);
            Route::delete('/bills/{bill}', [BillController::class, 'destroy'])
                ->name('bills.destroy');
            compatDeleteRoute('/bills/{bill}', [BillController::class, 'destroy']);
            Route::post('/bills/{bill}/pay-balance', [BillController::class, 'payBalance'])
                ->middleware('page:studio-bills')
                ->name('bills.payBalance');
            Route::post('/bills/{bill}/complete', [BillController::class, 'complete'])
                ->middleware('page:studio-bills')
                ->name('bills.complete');
        });

        // ── Reports (Piyara's module — DO NOT CHANGE) ────────────────────
        Route::prefix('reports')->name('reports.')->group(function () {
            Route::get('/daily', [SaleReportController::class, 'daily'])
                ->middleware('page:daily-sales-report')
                ->name('daily');
            Route::post('/daily/expenses', [SaleReportController::class, 'storeExpense'])
                ->middleware('page:daily-sales-report-expenses')
                ->name('daily.expenses.store');
            Route::put('/daily/expenses/{expense}', [SaleReportController::class, 'updateExpense'])
                ->middleware('page:daily-sales-report-expenses')
                ->name('daily.expenses.update');
            compatUpdateRoute('/daily/expenses/{expense}', [SaleReportController::class, 'updateExpense']);
            Route::delete('/daily/expenses/{expense}', [SaleReportController::class, 'destroyExpense'])
                ->middleware('page:daily-sales-report-expenses')
                ->name('daily.expenses.destroy');
            compatDeleteRoute('/daily/expenses/{expense}', [SaleReportController::class, 'destroyExpense']);
            Route::get('/products', [\App\Http\Controllers\Reports\ProductReportController::class, 'index'])
                ->middleware('page:product-reports')
                ->name('products');
            Route::get('/custom-entries', [\App\Http\Controllers\Reports\CustomEntryReportController::class, 'index'])
                ->middleware('page:custom-entry-reports')
                ->name('custom-entries');
            Route::patch('/custom-entries/{billItem}/cost', [\App\Http\Controllers\Reports\CustomEntryReportController::class, 'updateCost'])
                ->middleware('page:custom-entry-reports')
                ->name('custom-entries.cost.update');
            compatUpdateRoute('/custom-entries/{billItem}/cost', [\App\Http\Controllers\Reports\CustomEntryReportController::class, 'updateCost']);
        });

        // ── Finance — Thinuka's module ────────────────────────────────────
        Route::prefix('finance')->name('finance.')->group(function () {

            // Invoices — full CRUD
            Route::get('/invoices', [InvoiceController::class, 'index'])
                ->middleware('page:invoices')
                ->name('invoices.index');
            Route::post('/invoices', [InvoiceController::class, 'store'])
                ->middleware('page:invoices')
                ->name('invoices.store');
            Route::get('/invoices/{invoice}/print', [InvoiceController::class, 'print'])
                ->middleware('page:invoices')
                ->name('invoices.print');
            Route::get('/invoices/{invoice}', [InvoiceController::class, 'show'])
                ->middleware('page:invoices')
                ->name('invoices.show');
            Route::put('/invoices/{invoice}', [InvoiceController::class, 'update'])
                ->middleware('page:invoices')
                ->name('invoices.update');
            compatUpdateRoute('/invoices/{invoice}', [InvoiceController::class, 'update']);
            Route::delete('/invoices/{invoice}', [InvoiceController::class, 'destroy'])
                ->middleware('page:invoices')
                ->name('invoices.destroy');
            compatDeleteRoute('/invoices/{invoice}', [InvoiceController::class, 'destroy']);

            Route::post('/invoices/{invoice}/refund', [InvoiceController::class, 'refund'])
                ->middleware('page:invoices')
                ->name('invoices.refund');

            // Convert quotation → invoice (integrates with Sahan's module)
            Route::post('/invoices/from-quotation/{quotation}', [InvoiceController::class, 'convertFromQuotation'])
                ->middleware('page:invoices')
                ->name('invoices.from-quotation');

            // Convert POS sale → invoice (integrates with Piyara's module)
            Route::post('/invoices/from-sale/{sale}', [InvoiceController::class, 'convertFromSale'])
                ->middleware('page:invoices')
                ->name('invoices.from-sale');


            // Product Returns management
            Route::get('/returns', [ProductReturnController::class, 'index'])
                ->middleware('page:returns')
                ->name('returns.index');
            Route::get('/returns/search-transaction', [ProductReturnController::class, 'searchTransaction'])
                ->middleware('page:returns')
                ->name('returns.search-transaction');
            Route::post('/returns', [ProductReturnController::class, 'store'])
                ->middleware('page:returns')
                ->name('returns.store');
            Route::delete('/returns/{productReturn}', [ProductReturnController::class, 'destroy'])
                ->middleware('page:returns.delete')
                ->name('returns.destroy');
            compatDeleteRoute('/returns/{productReturn}', [ProductReturnController::class, 'destroy']);
        });

        // ── Communication — WhatsApp Hub ──────────────────────────────────
        Route::prefix('communication')->name('communication.')->group(function () {
            Route::get('/whatsapp', function () {
                return inertia('Communication/WhatsAppHub', [
                    'settings' => ShopSetting::all_settings(),
                ]);
            })->middleware('page:whatsapp-hub')->name('whatsapp.index');

            Route::post('/whatsapp/settings', function (Request $request) {
                $data = $request->validate([
                    'whatsapp_api_key' => 'nullable|string|max:255',
                    'whatsapp_phone_number' => 'nullable|string|max:50',
                    'whatsapp_instance_id' => 'nullable|string|max:255',
                    'whatsapp_auto_send' => 'nullable|boolean',
                ]);
                foreach ($data as $key => $value) {
                    ShopSetting::set($key, $value ?? '');
                }

                return back()->with('success', 'WhatsApp settings saved.');
            })->name('whatsapp.settings');
        });
    });
});

require __DIR__.'/auth.php';
