<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Add image column to Products Table
 *
 * Adds an optional `image` column to the products table.
 * This stores the relative file path of the product's main image
 * (e.g. "products/photo-frame.jpg") in the storage/app/public disk.
 *
 * The image is uploaded per PRODUCT (not per variant).
 * All variants of a product share the same parent product image.
 *
 * Image storage: Laravel's public disk → storage/app/public/products/
 * Public URL:    /storage/products/filename.jpg  (after php artisan storage:link)
 */
return new class extends Migration
{
    /**
     * Run the migration.
     * Adds the 'image' column after 'uom'.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Nullable — not all products need an image on creation.
            // Stores relative path: "products/photo-frame.jpg"
            $table->string('image')->nullable()->after('uom');
        });
    }

    /**
     * Reverse the migration.
     * Drops the 'image' column if it exists.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('image');
        });
    }
};
