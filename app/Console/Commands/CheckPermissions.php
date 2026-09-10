<?php

namespace App\Console\Commands;

use App\Models\Role;
use Illuminate\Console\Command;

class CheckPermissions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'check:permissions {role_slug? : The role slug to check (e.g. admin, cashier)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verify and display all page permissions for existing roles in the system.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $roleSlug = $this->argument('role_slug');

        $query = Role::query()->orderBy('sort_order');
        if ($roleSlug) {
            $query->where('slug', $roleSlug);
        }

        $roles = $query->get();

        if ($roles->isEmpty()) {
            $this->error('No roles found.');
            return;
        }

        $pages = Role::pageKeys();
        $actions = ['view', 'create', 'edit', 'delete'];

        foreach ($roles as $role) {
            $this->info("\n=======================================================");
            $this->info(" 🛡️  ROLE: {$role->name} ({$role->slug})");
            $this->info("=======================================================");

            $headers = ['Feature', 'View', 'Create', 'Edit', 'Delete'];
            $rows = [];

            foreach ($pages as $page) {
                $row = [$page];
                foreach ($actions as $action) {
                    $hasAccess = $role->hasPermission($page, $action);
                    $row[] = $hasAccess ? '✅ Yes' : '❌ No';
                }
                $rows[] = $row;
            }

            $this->table($headers, $rows);
        }
        
        $this->info("\nRun 'php artisan check:permissions <role_slug>' to check a specific role.");
    }
}
