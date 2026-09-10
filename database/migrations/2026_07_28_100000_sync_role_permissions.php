<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $roles = config('access.roles', []);

        foreach ($roles as $slug => $roleDefinition) {
            DB::table('roles')->updateOrInsert(
                ['slug' => $slug],
                [
                    'name' => $roleDefinition['name'],
                    'description' => $roleDefinition['description'] ?? null,
                    'permissions' => json_encode($roleDefinition['permissions'] ?? []),
                    'sort_order' => array_search($slug, array_keys($roles), true) + 1,
                    'updated_at' => now(),
                ]
            );
        }
    }

    public function down(): void
    {
    }
};
