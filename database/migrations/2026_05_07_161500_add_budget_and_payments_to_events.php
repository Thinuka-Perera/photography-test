<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('events')) {
            Schema::table('events', function (Blueprint $table) {
                if (!Schema::hasColumn('events', 'total_amount')) {
                    $table->decimal('total_amount', 12, 2)->default(0)->after('expected_guests');
                }
            });
        }

        if (!Schema::hasTable('event_payments')) {
            Schema::create('event_payments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('shop_id');
                $table->unsignedBigInteger('event_id');
                $table->decimal('amount', 12, 2);
                $table->enum('payment_method', ['cash', 'card', 'bank_transfer', 'online', 'other'])->default('cash');
                $table->string('reference_no')->nullable();
                $table->text('notes')->nullable();
                $table->date('paid_on');
                $table->unsignedBigInteger('recorded_by')->nullable();
                $table->timestamps();

                $table->index(['shop_id', 'event_id']);
                $table->foreign('event_id')->references('id')->on('events')->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('event_payments')) {
            Schema::dropIfExists('event_payments');
        }

        if (Schema::hasTable('events')) {
            Schema::table('events', function (Blueprint $table) {
                if (Schema::hasColumn('events', 'total_amount')) {
                    $table->dropColumn('total_amount');
                }
            });
        }
    }
};
