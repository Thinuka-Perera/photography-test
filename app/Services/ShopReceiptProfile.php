<?php

namespace App\Services;

use App\Models\ShopSetting;
use App\Modules\Shops\Models\Shop;
use Illuminate\Support\Facades\Storage;

/**
 * Builds receipt/header shop details for the currently active Shop.
 * Merges Shop model fields with per-shop ShopSetting values.
 */
class ShopReceiptProfile
{
    /** @var list<string> */
    private const GENERIC_SHOP_LABELS = [
        'photography shop',
        'photography studio',
        'mr arachchi photography',
    ];

    /**
     * @return array{
     *     id: int,
     *     slug: string,
     *     name: string,
     *     shop_name: string,
     *     address: string,
     *     shop_address: string,
     *     phone: string,
     *     shop_phone: string,
     *     shop_hotline: string,
     *     shop_whatsapp: string,
     *     shop_logo: string|null,
     *     shop_logo_url: string|null,
     *     is_default: bool,
     * }
     */
    public static function forShop(Shop $shop): array
    {
        $shopId = (int) $shop->id;

        $settingName = trim((string) ShopSetting::get('shop_name', '', $shopId));
        $displayName = self::resolveDisplayName($shop, $settingName);

        $settingAddress = trim((string) ShopSetting::get('shop_address', '', $shopId));
        $modelAddress = trim((string) ($shop->address ?? ''));
        $address = $settingAddress !== '' ? $settingAddress : $modelAddress;

        $hotline = trim((string) ShopSetting::get('shop_hotline', '', $shopId));
        $settingPhone = trim((string) ShopSetting::get('shop_phone', '', $shopId));
        $modelPhone = trim((string) ($shop->phone ?? ''));
        $phone = $hotline !== '' ? $hotline : ($settingPhone !== '' ? $settingPhone : $modelPhone);

        $whatsapp = trim((string) ShopSetting::get('shop_whatsapp', '', $shopId));
        $logoPath = ShopSetting::get('shop_logo', null, $shopId);
        $logoPath = is_string($logoPath) && $logoPath !== '' ? $logoPath : null;

        return [
            'id' => $shopId,
            'slug' => (string) $shop->slug,
            'name' => $displayName,
            'shop_name' => $displayName,
            'address' => $address,
            'shop_address' => $address,
            'phone' => $phone,
            'shop_phone' => $settingPhone !== '' ? $settingPhone : $modelPhone,
            'shop_hotline' => $phone,
            'shop_whatsapp' => $whatsapp,
            'shop_logo' => $logoPath,
            'shop_logo_url' => $logoPath ? self::publicLogoUrl($logoPath) : null,
            'is_default' => (bool) ($shop->is_default ?? false),
        ];
    }

    /**
     * Flat shopInfo payload for bill print components.
     *
     * @return array<string, mixed>
     */
    public static function asShopInfo(Shop $shop): array
    {
        $profile = self::forShop($shop);
        $allSettings = ShopSetting::all_settings($shop->id);

        return array_merge($allSettings, [
            'shop_name' => $profile['shop_name'],
            'phone' => $profile['phone'],
            'shop_phone' => $profile['shop_phone'],
            'address' => $profile['address'],
            'shop_address' => $profile['shop_address'],
            'shop_whatsapp' => $profile['shop_whatsapp'],
            'shop_hotline' => $profile['shop_hotline'],
            'shop_logo' => $profile['shop_logo'],
            'shop_logo_url' => $profile['shop_logo_url'],
            'invoice_template' => $allSettings['invoice_template'] ?? 'default',
            'invoice_payment_info' => $allSettings['invoice_payment_info'] ?? ($allSettings['payment_info'] ?? ''),
            'payment_info' => $allSettings['invoice_payment_info'] ?? ($allSettings['payment_info'] ?? ''),
            'bank_account_no' => $allSettings['bank_account_no'] ?? ($allSettings['bankAccount'] ?? ''),
            'account_name' => $allSettings['account_name'] ?? ($allSettings['accountName'] ?? ''),
            'bank_details' => $allSettings['bank_details'] ?? ($allSettings['bankDetails'] ?? ''),
            'invoice_terms' => $allSettings['invoice_terms'] ?? ($allSettings['termsConditions'] ?? ''),
        ]);
    }

    private static function resolveDisplayName(Shop $shop, string $settingName): string
    {
        if ($settingName !== '' && ! self::isGenericShopLabel($settingName)) {
            return $settingName;
        }

        $modelName = trim((string) ($shop->name ?? ''));
        if ($modelName !== '') {
            return $modelName;
        }

        return $settingName !== '' ? $settingName : 'Shop';
    }

    private static function isGenericShopLabel(string $value): bool
    {
        return in_array(strtolower(trim($value)), self::GENERIC_SHOP_LABELS, true);
    }

    private static function publicLogoUrl(string $logoPath): string
    {
        $normalized = ltrim(preg_replace('#^/?storage/#', '', $logoPath), '/');

        return '/storage/'.$normalized;
    }
}
