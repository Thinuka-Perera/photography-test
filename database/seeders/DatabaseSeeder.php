<?php

namespace Database\Seeders;

use App\Models\BillCategory;
use App\Models\Role;
use App\Models\User;
use App\Modules\Shops\Models\Shop;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeds shops, staff (roles + users), and bill categories.
 * Inventory (categories, products, variants) is left empty — add stock via the app.
 *
 * ─── Seeded login accounts (use Email + Password on the login page) ───
 *
 * | Name           | Email (login)          | Password       | Role / shop              |
 * |----------------|------------------------|----------------|--------------------------|
 * | Super Admin    | admin@possystem.lk     | admin.pos@     | super_admin — both shops |
 * | Studio Staff 1 | studio1@possystem.lk   | studio1.pos@   | studio_staff — Studio    |
 * | Studio Staff 2 | studio2@possystem.lk   | studio2.pos@   | studio_staff — Studio    |
 * | Lab Staff 1    | lab1@possystem.lk      | lab1.pos@      | lab_staff — Digital Lab  |
 * | Lab Staff 2    | lab2@possystem.lk      | lab2.pos@      | lab_staff — Digital Lab  |
 *
 * Run: php artisan db:seed
 *      php artisan migrate:fresh --seed
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Rename existing legacy shop slugs/names to generic ones
        $oldLabShop = Shop::query()->orWhere('slug', 'mr-arachchi-digital-lab')->orWhere('name', 'Mr. Arachchi Digital Colour Lab')->first();
        if ($oldLabShop) {
            $oldLabShop->update([
                'slug' => 'digital-lab',
                'name' => 'Digital Colour Lab',
            ]);
        }

        $oldStudioShop = Shop::query()->orWhere('slug', 'main')->orWhere('name', 'Mr. Arachchi Studio')->first();
        if ($oldStudioShop) {
            $oldStudioShop->update([
                'slug' => 'main',
                'name' => 'Photography Studio',
            ]);
        }

        /** @var Shop $studioShop */
        $studioShop = Shop::query()->where('slug', 'main')->first()
            ?? Shop::firstOrCreate(
                ['slug' => 'main'],
                [
                    'name' => 'Photography Studio',
                    'is_default' => true,
                    'is_active' => true,
                ],
            );

        $studioShop->forceFill([
            'name' => 'Photography Studio',
            'is_default' => true,
            'is_active' => true,
            'address' => null,
        ])->save();

        $labShop = Shop::query()->where('slug', 'digital-lab')->first()
            ?? Shop::firstOrCreate(
                ['slug' => 'digital-lab'],
                [
                    'name' => 'Digital Colour Lab',
                    'is_default' => false,
                    'is_active' => true,
                ],
            );

        $this->seedDefaultStaff($studioShop, $labShop);

        $this->call(RoleShiftSettingSeeder::class);

        $billCategoryRows = [
            ['name' => 'Enlargement', 'no_commission' => false],
            ['name' => 'Thank You Cards', 'no_commission' => false],
            ['name' => 'Collage', 'no_commission' => false],
            ['name' => 'Single Photo', 'no_commission' => false],
            ['name' => 'Old Photo Recreation', 'no_commission' => false],
            ['name' => 'Passport', 'no_commission' => true],
        ];

        foreach ([$studioShop, $labShop] as $shop) {
            foreach ($billCategoryRows as $data) {
                BillCategory::firstOrCreate(
                    [
                        'shop_id' => $shop->id,
                        'name' => $data['name'],
                    ],
                    [
                        ...$data,
                        'shop_id' => $shop->id,
                    ]
                );
            }
        }

        $this->command->info('Seeded shops, staff, and bill categories. (Inventory catalog is empty — add products in the app.)');
    }

    /**
     * Default roles, super admin, studio/lab staff, and shop_user links.
     * Login for shared emails: email + password picks the matching user.
     */
    private function seedDefaultStaff(Shop $studioShop, Shop $labShop): void
    {
        // Rename roles in-place if they exist with legacy slugs
        Role::where('slug', 'arachchi_studio_staff')->update(['slug' => 'studio_staff']);
        Role::where('slug', 'arachchi_lab_staff')->update(['slug' => 'lab_staff']);

        foreach (['admin', 'manager', 'inventory_officer', 'cashier', 'studio_staff', 'lab_staff'] as $slug) {
            $def = config("access.roles.{$slug}");
            if (! $def) {
                continue;
            }
            Role::updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $def['name'],
                    'description' => $def['description'] ?? null,
                    'permissions' => $def['permissions'] ?? [],
                    'sort_order' => match ($slug) {
                        'admin' => 20,
                        'manager' => 30,
                        'inventory_officer' => 45,
                        'cashier' => 50,
                        'studio_staff' => 60,
                        'lab_staff' => 61,
                        default => 99,
                    },
                ]
            );
        }

        $superAdminRoleId = Role::query()->where('slug', 'super_admin')->value('id');
        $studioRoleId = Role::query()->where('slug', 'studio_staff')->value('id');
        $labRoleId = Role::query()->where('slug', 'lab_staff')->value('id');

        // Rename/Update Super Admin in place to prevent constraint errors
        $superAdmin = User::where('email', 'admin@arachchi.possystem.lk')->first();
        if ($superAdmin) {
            $superAdmin->update([
                'email' => 'admin@possystem.lk',
                'name' => 'Super Admin',
                'password' => Hash::make('admin.pos@'),
            ]);
        } else {
            $superAdmin = User::updateOrCreate(
                ['email' => 'admin@possystem.lk'],
                [
                    'name' => 'Super Admin',
                    'password' => Hash::make('admin.pos@'),
                    'role_id' => $superAdminRoleId,
                    'last_shop_id' => $studioShop->id,
                ]
            );
        }

        // Seed corresponding employees so we can resolve them properly
        \App\Models\Employee::where('email', 'admin@arachchi.possystem.lk')->update([
            'email' => 'admin@possystem.lk',
        ]);

        \App\Models\Employee::updateOrCreate(
            ['shop_id' => $studioShop->id, 'name' => 'Super Admin'],
            [
                'email' => 'admin@possystem.lk',
                'role' => 'front_office',
                'job_role' => 'front_office',
                'status' => 'active',
            ]
        );

        // Update studio staff in-place
        $studioUsersMap = [
            'Buddhima' => ['name' => 'Studio Staff 1', 'email' => 'studio1@possystem.lk', 'password' => 'studio1.pos@'],
            'Shashini' => ['name' => 'Studio Staff 2', 'email' => 'studio2@possystem.lk', 'password' => 'studio2.pos@'],
        ];

        foreach ($studioUsersMap as $oldName => $newData) {
            $u = User::where('name', $oldName)->first();
            if ($u) {
                $u->update([
                    'name' => $newData['name'],
                    'email' => $newData['email'],
                    'password' => Hash::make($newData['password']),
                    'role_id' => $studioRoleId,
                ]);
            } else {
                User::updateOrCreate(
                    ['email' => $newData['email'], 'name' => $newData['name']],
                    [
                        'password' => Hash::make($newData['password']),
                        'role_id' => $studioRoleId,
                        'last_shop_id' => $studioShop->id,
                    ]
                );
            }

            \App\Models\Employee::where('name', $oldName)->update([
                'name' => $newData['name'],
                'email' => $newData['email'],
            ]);

            \App\Models\Employee::updateOrCreate(
                ['shop_id' => $studioShop->id, 'name' => $newData['name']],
                [
                    'email' => $newData['email'],
                    'role' => 'editor',
                    'job_role' => 'editor',
                    'status' => 'active',
                ]
            );
        }

        // Update lab staff in-place
        $labUsersMap = [
            'Hasini' => ['name' => 'Lab Staff 1', 'email' => 'lab1@possystem.lk', 'password' => 'lab1.pos@'],
            'Dilini' => ['name' => 'Lab Staff 2', 'email' => 'lab2@possystem.lk', 'password' => 'lab2.pos@'],
        ];

        foreach ($labUsersMap as $oldName => $newData) {
            $u = User::where('name', $oldName)->first();
            if ($u) {
                $u->update([
                    'name' => $newData['name'],
                    'email' => $newData['email'],
                    'password' => Hash::make($newData['password']),
                    'role_id' => $labRoleId,
                ]);
            } else {
                User::updateOrCreate(
                    ['email' => $newData['email'], 'name' => $newData['name']],
                    [
                        'password' => Hash::make($newData['password']),
                        'role_id' => $labRoleId,
                        'last_shop_id' => $labShop->id,
                    ]
                );
            }

            \App\Models\Employee::where('name', $oldName)->update([
                'name' => $newData['name'],
                'email' => $newData['email'],
            ]);

            \App\Models\Employee::updateOrCreate(
                ['shop_id' => $labShop->id, 'name' => $newData['name']],
                [
                    'email' => $newData['email'],
                    'role' => 'front_office',
                    'job_role' => 'front_office',
                    'status' => 'active',
                ]
            );
        }

        $superAdmin->shops()->syncWithoutDetaching([$studioShop->id, $labShop->id]);
    }
}
