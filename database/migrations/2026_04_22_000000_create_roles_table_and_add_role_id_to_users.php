<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('description')->nullable();
            $table->json('permissions')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        $roles = config('access.roles', []);

        foreach ($roles as $slug => $roleDefinition) {
            DB::table('roles')->insert([
                'name' => $roleDefinition['name'],
                'slug' => $slug,
                'description' => $roleDefinition['description'] ?? null,
                'permissions' => json_encode($roleDefinition['permissions'] ?? []),
                'sort_order' => array_search($slug, array_keys($roles), true) + 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('role_id')
                ->nullable()
                ->after('email_verified_at')
                ->constrained('roles')
                ->nullOnDelete();
        });

        $roleIds = DB::table('roles')->pluck('id', 'slug');
        $superAdminRoleId = $roleIds['super_admin'] ?? null;
        $adminRoleId = $roleIds['admin'] ?? $superAdminRoleId;

        $assignedSuperAdmin = false;

        DB::table('users')
            ->orderBy('id')
            ->get(['id', 'email'])
            ->each(function (object $user) use (&$assignedSuperAdmin, $superAdminRoleId, $adminRoleId) {
                $roleId = $adminRoleId;

                if (! $assignedSuperAdmin || $user->email === 'admin@local') {
                    $roleId = $superAdminRoleId ?? $adminRoleId;
                    $assignedSuperAdmin = true;
                }

                DB::table('users')
                    ->where('id', $user->id)
                    ->update(['role_id' => $roleId]);
            });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('role_id');
        });

        Schema::dropIfExists('roles');
    }
};
