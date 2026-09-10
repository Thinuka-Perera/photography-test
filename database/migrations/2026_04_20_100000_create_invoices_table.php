<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Thinuka's Invoice table.
     * Designed to integrate with:
     *   - sales table (Piyara)          → sale_id FK
     *   - quotations table (Sahan)       → quotation_id FK
     *   - users table (Sandaru/existing) → employee_id FK  ← CORE REQUIREMENT
     *   - users table                    → created_by FK
     */
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();

            // ── Auto-generated invoice number ─────────────────────────────
            // Format: INV-PH-0001 (Photography), INV-ST-0001 (Studio)
            $table->string('invoice_number', 30)->unique();

            // ── Source linkages (both optional — invoice can be standalone) ─
            $table->unsignedBigInteger('sale_id')->nullable();
            // Piyara's sales table — safe loose reference (no cascade)
            // Null = invoice created manually (not from POS sale)

            $table->unsignedBigInteger('quotation_id')->nullable();
            // Sahan's quotations table — loose reference
            // Null = invoice not from a quotation

            // ── Customer info ─────────────────────────────────────────────
            $table->unsignedBigInteger('customer_id')->nullable();
            // Sandaru's customers table (doesn't exist yet) — loose ref
            // Walk-in customers allowed

            $table->string('customer_name');
            // Snapshot of customer name at invoice time
            // So even if customer record changes, invoice stays accurate

            $table->string('customer_phone', 30)->nullable();

            // ── CORE REQUIREMENT: Employee who handled the work ───────────
            $table->unsignedBigInteger('employee_id')->nullable();
            // FK to users table (Sandaru will expand users → employees)
            // "Handled By: [Employee Name]" shown on invoice view
            // nullable = auto-generated invoices from POS may not have editor

            $table->foreign('employee_id')->references('id')->on('users')->nullOnDelete();

            // ── Module classification ─────────────────────────────────────
            $table->enum('module', ['photography', 'studio', 'general'])->default('general');
            // photography = from quotation/event workflow
            // studio      = from POS sale or wholesale order
            // general     = manually created

            // ── Financial snapshot ────────────────────────────────────────
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);
            // All DECIMAL(12,2) — never FLOAT for money

            $table->decimal('tax_rate', 5, 2)->default(0);
            // Snapshot of tax rate at time of invoice (e.g. 10.00 = 10%)
            // Stored so historical invoices don't change if settings change

            // ── Status lifecycle ──────────────────────────────────────────
            $table->enum('status', [
                'draft',
                'sent',
                'awaiting_payment',
                'paid',
                'partially_paid',
                'refunded',
                'cancelled',
            ])->default('draft');
            // draft           = created, not sent yet
            // sent            = shared via WhatsApp or email
            // awaiting_payment= customer acknowledged, payment pending
            // paid            = full payment received
            // partially_paid  = part payment received
            // refunded        = full refund processed
            // cancelled       = voided

            // ── Notes ─────────────────────────────────────────────────────
            $table->text('notes')->nullable();

            // ── Due date ──────────────────────────────────────────────────
            $table->date('due_date')->nullable();

            // ── Audit trail ───────────────────────────────────────────────
            $table->foreignId('created_by')->constrained('users');
            // Who created this invoice (logged-in user at creation time)

            $table->timestamps();

            // ── Indexes for common queries ────────────────────────────────
            $table->index('status');
            $table->index('module');
            $table->index('employee_id');
            $table->index('customer_id');
            $table->index('sale_id');
            $table->index('quotation_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};