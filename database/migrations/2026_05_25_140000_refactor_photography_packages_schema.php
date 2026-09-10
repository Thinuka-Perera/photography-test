<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('photography_packages', function (Blueprint $table) {
            if (! Schema::hasColumn('photography_packages', 'category')) {
                $table->string('category', 100)->default('General')->after('name');
            }
        });

        $packages = DB::table('photography_packages')->get(['id', 'services', 'event_type', 'category']);

        foreach ($packages as $package) {
            $services = json_decode($package->services ?? '[]', true);
            if (! is_array($services)) {
                $services = [];
            }

            $normalizedServices = array_values(array_filter(array_map(static function ($service) {
                if (is_string($service)) {
                    $name = trim($service);

                    return $name === '' ? null : ['name' => $name];
                }

                if (! is_array($service)) {
                    return null;
                }

                $name = trim((string) ($service['name'] ?? ''));

                return $name === '' ? null : ['name' => $name];
            }, $services)));

            $category = trim((string) ($package->category ?? ''));
            if ($category === '' || $category === 'General') {
                $category = trim((string) ($package->event_type ?? '')) ?: 'General';
            }

            DB::table('photography_packages')->where('id', $package->id)->update([
                'services' => json_encode($normalizedServices),
                'category' => $category,
            ]);
        }

        Schema::table('photography_packages', function (Blueprint $table) {
            if (Schema::hasColumn('photography_packages', 'client_name')) {
                $table->dropIndex(['client_name']);
                $table->dropColumn('client_name');
            }

            if (Schema::hasColumn('photography_packages', 'base_price')) {
                $table->dropColumn('base_price');
            }

            if (Schema::hasColumn('photography_packages', 'adjustment_amount')) {
                $table->dropColumn('adjustment_amount');
            }

            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::table('photography_packages', function (Blueprint $table) {
            if (! Schema::hasColumn('photography_packages', 'client_name')) {
                $table->string('client_name')->nullable()->after('name');
                $table->index('client_name');
            }

            if (! Schema::hasColumn('photography_packages', 'base_price')) {
                $table->decimal('base_price', 12, 2)->default(0)->after('deliverables');
            }

            if (! Schema::hasColumn('photography_packages', 'adjustment_amount')) {
                $table->decimal('adjustment_amount', 12, 2)->default(0)->after('base_price');
            }

            if (Schema::hasColumn('photography_packages', 'category')) {
                $table->dropIndex(['category']);
                $table->dropColumn('category');
            }
        });
    }
};
