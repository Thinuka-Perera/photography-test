<?php

namespace App\Providers;

use App\Contracts\InventoryServiceInterface;
use App\Services\CartService;
use App\Services\InventoryService;
use App\Services\SaleNumberGenerator;
use App\Services\SaleService;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(
            InventoryServiceInterface::class,
            InventoryService::class
        );
        $this->app->singleton(CartService::class);
        $this->app->singleton(SaleNumberGenerator::class);

        $this->app->singleton(SaleService::class, function ($app) {
            return new SaleService(
                $app->make(CartService::class),
                $app->make(InventoryServiceInterface::class),
                $app->make(SaleNumberGenerator::class),
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Prefetch can request /build/assets/* before the symlink is ready on cPanel,
        // returning Laravel's HTML 404 (no DOCTYPE) and triggering Quirks Mode warnings.
        if (! $this->app->environment('production')) {
            Vite::prefetch(concurrency: 3);
        }
    }
}
