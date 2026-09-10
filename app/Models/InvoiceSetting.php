<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InvoiceSetting extends Model
{
    protected $fillable = [
        'shop_name',
        'tagline',
        'show_tagline',
        'phone',
        'show_phone',
        'email',
        'show_email',
        'address',
        'show_address',
        'bank_account_no',
        'account_name',
        'bank_details',
    ];

    protected $casts = [
        'show_tagline' => 'boolean',
        'show_phone' => 'boolean',
        'show_email' => 'boolean',
        'show_address' => 'boolean',
    ];

    /**
     * Get the singleton invoice settings record.
     * (There should only ever be one row.)
     *
     * Falls back to ShopSetting values so that edits made on the
     * Settings page are automatically reflected on invoices.
     */
    public static function getSettings(): self
    {
        $settings = self::first();

        if ($settings) {
            // Sync empty fields with ShopSetting values
            $shopName    = ShopSetting::get('shop_name');
            $shopPhone   = ShopSetting::get('shop_phone');
            $shopEmail   = ShopSetting::get('shop_email');
            $shopAddress = ShopSetting::get('shop_address');
            $bankAccNo   = ShopSetting::get('bank_account_no');
            $accName     = ShopSetting::get('account_name');
            $bankDetails = ShopSetting::get('bank_details');
            $paymentInfo = ShopSetting::get('invoice_payment_info');

            if ($shopName && $shopName !== '')    $settings->shop_name = $shopName;
            if ($shopPhone && $shopPhone !== '')  $settings->phone     = $shopPhone;
            if ($shopEmail && $shopEmail !== '')  $settings->email     = $shopEmail;
            if ($shopAddress && $shopAddress !== '') $settings->address = $shopAddress;
            if ((empty($settings->bank_account_no) || $settings->bank_account_no === '-') && $bankAccNo) {
                $settings->bank_account_no = $bankAccNo;
            }
            if ((empty($settings->account_name) || $settings->account_name === '-') && $accName) {
                $settings->account_name = $accName;
            }
            if ((empty($settings->bank_details) || $settings->bank_details === '-') && $bankDetails) {
                $settings->bank_details = $bankDetails;
            }
            if (empty($settings->invoice_payment_info) && $paymentInfo) {
                $settings->invoice_payment_info = $paymentInfo;
            }

            return $settings;
        }

        return self::create([
            'shop_name' => ShopSetting::get('shop_name') ?: 'Photography Shop',
            'tagline' => 'PHOTOGRAPHY',
            'show_tagline' => true,
            'phone' => ShopSetting::get('shop_phone') ?: '077 123 4567',
            'show_phone' => true,
            'email' => ShopSetting::get('shop_email') ?: 'info@photoshop.lk',
            'show_email' => true,
            'address' => ShopSetting::get('shop_address') ?: 'Shop Address',
            'show_address' => true,
            'bank_account_no' => ShopSetting::get('bank_account_no') ?: '',
            'account_name' => ShopSetting::get('account_name') ?: '',
            'bank_details' => ShopSetting::get('bank_details') ?: '',
        ]);
    }
}

