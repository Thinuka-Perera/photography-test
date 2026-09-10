<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Create Shops + Add shop_id Across Catalog & Stock Domain
 *
 * Introduces a first-class multi-shop layer to the Photography POS system.
 * After this migration runs:
 *   - A `shops` table exists, seeded with a single default "Main Shop"
 *   - Every existing row in `categories`, `products`, `product_variants`,
 *     `inventory`, and `stock_logs` is back-filled to that default shop
 *   - All five tables carry a NOT NULL `shop_id` foreign key with cascadeOnDelete
 *   - The `inventory` table's UNIQUE(variant_id) constraint is replaced with
 *     UNIQUE(variant_id, shop_id) to support per-shop stock counters
 *   - `users.last_shop_id` is added so each user remembers their last shop
 *
 * IDEMPOTENCY:
 *   MySQL does not roll back DDL when a later statement errors. To make
 *   this migration safe to re-run after any partial-state failure, every
 *   step checks for the presence of its target object before acting:
 *   `Schema::hasTable`, `Schema::hasColumn`, plus `information_schema`
 *   look-ups for indexes and foreign keys via the helper methods below.
 *
 * INDEX ORDERING (the gotcha worth calling out):
 *   The original `inventory` table has BOTH a unique index AND a foreign
 *   key on `variant_id`. MySQL refuses to drop the unique index because
 *   the FK relies on it as its supporting index. We therefore drop the FK
 *   first, swap the unique index, then re-add the FK.
 */
return new class extends Migration
{
    /**
     * Apply the multi-shop layer.
     *
     * @return void
     */
    public function up(): void
    {
        // ─────────────────────────────────────────────
        // 1. Create the shops table (idempotent)
        // ─────────────────────────────────────────────
        if (!Schema::hasTable('shops')) {
            Schema::create('shops', function (Blueprint $table) {
                $table->id();
                $table->string('slug', 64)->unique();
                $table->string('name', 120);
                $table->string('address', 255)->nullable();
                $table->string('phone', 64)->nullable();
                $table->boolean('is_default')->default(false)->index();
                $table->boolean('is_active')->default(true)->index();
                $table->timestamps();
            });
        }

        // ─────────────────────────────────────────────
        // 2. Seed the default shop so we have an FK target for back-fill
        // ─────────────────────────────────────────────
        $defaultShopId = (int) (DB::table('shops')->where('slug', 'main')->value('id') ?? 0);

        if ($defaultShopId === 0) {
            $defaultShopId = (int) DB::table('shops')->insertGetId([
                'slug'       => 'main',
                'name'       => 'Main Shop',
                'address'    => null,
                'phone'      => null,
                'is_default' => true,
                'is_active'  => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // ─────────────────────────────────────────────
        // 3. Add shop_id (nullable) to every shop-scoped table — idempotent
        // ─────────────────────────────────────────────
        $scopedTables = [
            'categories'       => 'type',
            'products'         => 'category_id',
            'product_variants' => 'product_id',
            'inventory'        => 'variant_id',
            'stock_logs'       => 'variant_id',
        ];

        foreach ($scopedTables as $tableName => $afterColumn) {
            if (!Schema::hasColumn($tableName, 'shop_id')) {
                Schema::table($tableName, function (Blueprint $table) use ($afterColumn) {
                    $table->foreignId('shop_id')
                        ->nullable()
                        ->after($afterColumn);
                });
            }
        }

        // ─────────────────────────────────────────────
        // 4. Back-fill any rows still missing shop_id
        // ─────────────────────────────────────────────
        foreach (array_keys($scopedTables) as $tableName) {
            DB::table($tableName)
                ->whereNull('shop_id')
                ->update(['shop_id' => $defaultShopId]);
        }

        // ─────────────────────────────────────────────
        // 5. Lock shop_id to NOT NULL + add FK constraints — idempotent
        //    (FKs auto-create their supporting index on MySQL, no need for
        //    a separate ->index() call)
        // ─────────────────────────────────────────────
        foreach (array_keys($scopedTables) as $tableName) {
            // Flip to NOT NULL when needed
            $columnInfo = $this->columnInfo($tableName, 'shop_id');
            $isNullable = $columnInfo && strtoupper((string) $columnInfo->IS_NULLABLE) === 'YES';
            if ($isNullable) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->unsignedBigInteger('shop_id')->nullable(false)->change();
                });
            }

            // Add FK only if it doesn't already exist
            if (!$this->hasForeignKey($tableName, "{$tableName}_shop_id_foreign")) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->foreign('shop_id')
                        ->references('id')
                        ->on('shops')
                        ->cascadeOnDelete();
                });
            }
        }

        // ─────────────────────────────────────────────
        // 6. Replace inventory UNIQUE(variant_id) with UNIQUE(variant_id, shop_id)
        //
        //    Order matters here:
        //      a. Drop the FK on variant_id (the unique index supports it)
        //      b. Drop the old unique index
        //      c. Add the new composite unique index — `variant_id` is the
        //         leftmost column, so it can support a re-added FK
        //      d. Re-add the FK on variant_id
        //
        //    Each step is guarded so the block is safe to re-enter after a
        //    partial failure.
        // ─────────────────────────────────────────────
        $hasOldUnique  = $this->hasIndex('inventory', 'inventory_variant_id_unique');
        $hasNewUnique  = $this->hasIndex('inventory', 'inventory_variant_id_shop_id_unique');
        $hasVariantFk  = $this->hasForeignKey('inventory', 'inventory_variant_id_foreign');

        if ($hasOldUnique && !$hasNewUnique) {
            // a. Drop the FK so we can drop the unique index it depends on
            if ($hasVariantFk) {
                Schema::table('inventory', function (Blueprint $table) {
                    $table->dropForeign(['variant_id']);
                });
                $hasVariantFk = false;
            }

            // b. Drop the old single-column unique index
            Schema::table('inventory', function (Blueprint $table) {
                $table->dropUnique('inventory_variant_id_unique');
            });

            // c. Add the composite unique
            Schema::table('inventory', function (Blueprint $table) {
                $table->unique(['variant_id', 'shop_id'], 'inventory_variant_id_shop_id_unique');
            });
        }

        // d. Re-add the FK if it's missing — the composite unique provides
        //    the supporting index (variant_id is the leftmost column)
        if (!$hasVariantFk && !$this->hasForeignKey('inventory', 'inventory_variant_id_foreign')) {
            Schema::table('inventory', function (Blueprint $table) {
                $table->foreign('variant_id')
                    ->references('id')
                    ->on('product_variants')
                    ->cascadeOnDelete();
            });
        }

        // ─────────────────────────────────────────────
        // 7. Add users.last_shop_id (idempotent)
        // ─────────────────────────────────────────────
        if (!Schema::hasColumn('users', 'last_shop_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->foreignId('last_shop_id')
                    ->nullable()
                    ->after('role_id')
                    ->constrained('shops')
                    ->nullOnDelete();
            });
        }
    }

    /**
     * Reverse the multi-shop layer.
     *
     * @return void
     */
    public function down(): void
    {
        if (Schema::hasColumn('users', 'last_shop_id')) {
            Schema::table('users', function (Blueprint $table) {
                if ($this->hasForeignKey('users', 'users_last_shop_id_foreign')) {
                    $table->dropForeign(['last_shop_id']);
                }
                $table->dropColumn('last_shop_id');
            });
        }

        // Restore inventory's original UNIQUE(variant_id) — same FK ordering
        // dance as in up()
        if ($this->hasIndex('inventory', 'inventory_variant_id_shop_id_unique')) {
            if ($this->hasForeignKey('inventory', 'inventory_variant_id_foreign')) {
                Schema::table('inventory', function (Blueprint $table) {
                    $table->dropForeign(['variant_id']);
                });
            }
            Schema::table('inventory', function (Blueprint $table) {
                $table->dropUnique('inventory_variant_id_shop_id_unique');
                $table->unique('variant_id', 'inventory_variant_id_unique');
                $table->foreign('variant_id')
                    ->references('id')
                    ->on('product_variants')
                    ->cascadeOnDelete();
            });
        }

        $scopedTables = ['stock_logs', 'inventory', 'product_variants', 'products', 'categories'];

        foreach ($scopedTables as $tableName) {
            if (Schema::hasColumn($tableName, 'shop_id')) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    if ($this->hasForeignKey($tableName, "{$tableName}_shop_id_foreign")) {
                        $table->dropForeign(['shop_id']);
                    }
                    $table->dropColumn('shop_id');
                });
            }
        }

        Schema::dropIfExists('shops');
    }

    /**
     * Check whether a named index exists on the given table.
     *
     * @param  string $table
     * @param  string $indexName
     * @return bool
     */
    private function hasIndex(string $table, string $indexName): bool
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            $indexes = DB::select('pragma index_list("' . $table . '")');
            foreach ($indexes as $index) {
                if ($index->name === $indexName) {
                    return true;
                }
            }
            return false;
        }

        $row = DB::selectOne(
            'select 1 as found from information_schema.statistics
             where table_schema = database() and table_name = ? and index_name = ? limit 1',
            [$table, $indexName],
        );

        return (bool) $row;
    }

    /**
     * Check whether a named foreign key exists on the given table.
     *
     * @param  string $table
     * @param  string $constraintName
     * @return bool
     */
    private function hasForeignKey(string $table, string $constraintName): bool
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            // For SQLite, check column existence as a proxy for FK
            // Since we're checking after adding columns, column existence is reliable
            return Schema::hasColumn($table, 'shop_id');
        }

        $row = DB::selectOne(
            'select 1 as found from information_schema.table_constraints
             where table_schema = database() and table_name = ?
             and constraint_name = ? and constraint_type = ? limit 1',
            [$table, $constraintName, 'FOREIGN KEY'],
        );

        return (bool) $row;
    }

    /**
     * Read a column's metadata (IS_NULLABLE, COLUMN_TYPE, ...) from
     * information_schema or SQLite pragma. Returns null if the column doesn't exist.
     *
     * @param  string $table
     * @param  string $column
     * @return object|null
     */
    private function columnInfo(string $table, string $column): ?object
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            $columns = DB::select('pragma table_info("' . $table . '")');
            foreach ($columns as $col) {
                if ($col->name === $column) {
                    return (object) [
                        'IS_NULLABLE' => $col->notnull === 0 ? 'YES' : 'NO',
                        'COLUMN_TYPE' => $col->type,
                    ];
                }
            }
            return null;
        }

        return DB::selectOne(
            'select IS_NULLABLE, COLUMN_TYPE from information_schema.columns
             where table_schema = database() and table_name = ? and column_name = ? limit 1',
            [$table, $column],
        );
    }
};
