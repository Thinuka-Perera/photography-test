<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        // TODO: Sandaru adds role check here when roles are ready
        // return auth()->user()->can('create-sale');
        return true;
    }

    public function rules(): array
    {
        $paymentMethod = $this->input('payment.0.method');

        return [
            // ── Cart items ────────────────────────────────────────
            'cart' => ['required', 'array', 'min:1'],
            'cart.*.product_id' => ['required', 'integer', 'min:1'],
            'cart.*.product_name' => ['required', 'string', 'max:255'],
            'cart.*.product_sku' => ['nullable', 'string', 'max:100'],
            'cart.*.unit_price' => ['required', 'numeric', 'min:0.01'],
            'cart.*.quantity' => ['required', 'integer', 'min:1'],
            'cart.*.discount_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'cart.*.is_commissionable' => ['nullable', 'boolean'],

            // ── Payment(s) ────────────────────────────────────────
            // Always treated as an array — frontend sends:
            // [{ "method": "cash", "amount": 100.00 }]
            'payment' => ['required', 'array', 'min:1'],
            'payment.0.method' => ['required', 'in:cash,card,bank_transfer,credit,advance'],
            'payment.*.amount' => ['required', 'numeric', 'min:0.01'],
            'payment.*.reference_no' => ['nullable', 'string', 'max:100'],
            'payment.*.gateway' => ['nullable', 'string', 'max:50'],

            // ── Options ───────────────────────────────────────────
            'options.customer_id' => ['nullable', 'integer'],
            'options.editor_id' => ['nullable', 'integer'],
            'options.customer_name' => [
                Rule::requiredIf(in_array($paymentMethod, ['credit', 'advance'], true)),
                'nullable',
                'string',
                'max:255',
            ],
            'options.customer_phone' => [
                Rule::requiredIf(in_array($paymentMethod, ['credit', 'advance'], true)),
                'nullable',
                'string',
                'max:50',
            ],
            'options.reference_number' => ['nullable', 'string', 'max:100'],
            'options.bank_name' => ['nullable', 'string', 'max:100'],
            'options.front_officer_id' => [
                Rule::requiredIf(in_array($paymentMethod, ['credit', 'advance'], true)),
                'nullable',
                'integer',
                'exists:employees,id',
            ],
            'options.promise_date' => [
                Rule::requiredIf(in_array($paymentMethod, ['credit', 'advance'], true)),
                'nullable',
                'date',
                'after_or_equal:today',
            ],
            'options.cart_discount_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'options.tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'options.commission_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'options.commission_mode' => ['nullable', 'in:subtotal,net'],
            'options.notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'cart.required' => 'Cart cannot be empty.',
            'cart.min' => 'At least one item is required.',
            'cart.*.unit_price.min' => 'Product price must be greater than zero.',
            'cart.*.quantity.min' => 'Quantity must be at least 1.',
            'cart.*.discount_pct.max' => 'Item discount cannot exceed 100%.',
            'payment.required' => 'Payment information is required.',
            'payment.array' => 'Payment must be a valid array.',
            'payment.min' => 'At least one payment entry is required.',
            'payment.0.method.required' => 'Payment method is required.',
            'payment.0.method.in' => 'Payment method must be cash, card, bank transfer, credit, or advance.',
            'payment.*.amount.min' => 'Payment amount must be greater than zero.',
            'options.customer_name.required' => 'Customer name is required for credit and advance payments.',
            'options.customer_phone.required' => 'Customer phone is required for credit and advance payments.',
            'options.front_officer_id.required' => 'Front officer is required for credit and advance payments.',
            'options.promise_date.required' => 'Promise date is required for credit and advance payments.',
        ];
    }
}
