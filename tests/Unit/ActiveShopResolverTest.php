<?php

namespace Tests\Unit;

use App\Modules\Shops\Models\Shop;
use App\Modules\Shops\Services\ActiveShopResolver;
use App\Modules\Shops\Services\ShopService;
use Illuminate\Http\Request;
use PHPUnit\Framework\TestCase;

class ActiveShopResolverTest extends TestCase
{
    public function test_it_resolves_shop_from_post_payload_when_session_context_is_missing(): void
    {
        $shop = new Shop([
            'slug' => 'main-shop',
            'name' => 'Main Shop',
            'is_active' => true,
        ]);

        $shops = $this->createMock(ShopService::class);
        $shops->expects($this->once())
            ->method('findBySlug')
            ->with('main-shop')
            ->willReturn($shop);

        $resolver = new ActiveShopResolver($shops);
        $request = Request::create('/products/19/remove', 'POST', [
            'shop' => 'main-shop',
        ]);

        $resolved = $resolver->resolve($request, null);

        $this->assertSame($shop, $resolved);
    }
}