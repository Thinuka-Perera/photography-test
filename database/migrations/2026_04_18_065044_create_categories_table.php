<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Create Categories Table
 *
 * This table stores the top-level groupings for all products in the system.
 * It differentiates between "frame" type items (e.g. Photo Frames with size/grade variants)
 * and "general" type items (e.g. Inks, Papers, Tapes) that do not have size/grade variants.
 *
 * This separation drives the toggle UI on the Inventory page:
 *   - type = 'frame'   → shown in the Frame Grid View (with Size & Grade filters)
 *   - type = 'general' → shown in the General Stock List View
 */
return new class extends Migration
{
    /**
     * Run the migration.
     * Creates the 'categories' table with the following columns:
     *   - id           : Auto-incrementing primary key
     *   - name         : Display name of the category (e.g. "Photo Frames", "Inks")
     *   - type         : Enum distinguishing frames from general stock
     *   - created_at   : Timestamp when the category was first added
     *   - updated_at   : Timestamp of the last update to the category record
     */
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');                                      // e.g. "Photo Frames", "Inks", "Paper"
            $table->enum('type', ['frame', 'general'])->default('general'); // Controls which UI view this category belongs to
            $table->timestamps();
        });
    }

    /**
     * Reverse the migration.
     * Drops the 'categories' table if it exists.
     * Note: All related 'products' records will also be deleted due to cascadeOnDelete on the FK.
     */
    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
