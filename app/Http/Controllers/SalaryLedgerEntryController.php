<?php

namespace App\Http\Controllers;

use App\Models\SalaryLedgerEntry;
use App\Models\SalaryProfile;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SalaryLedgerEntryController extends Controller
{
    public function store(Request $request, SalaryProfile $salaryProfile): RedirectResponse
    {
        if ($salaryProfile->paid_at) {
            return back()->with('error', 'This salary profile is paid and the ledger is locked.');
        }

        $data = $this->validatePayload($request);

        if (!$this->isDateInProfileMonth($data['entry_date'], $salaryProfile)) {
            return back()->withErrors([
                'entry_date' => 'Entry date must be within the salary profile month.',
            ]);
        }

        SalaryLedgerEntry::create([
            ...$data,
            'salary_profile_id' => $salaryProfile->id,
        ]);

        return back()->with('success', 'Ledger entry added successfully.');
    }

    public function update(Request $request, SalaryLedgerEntry $salaryLedgerEntry): RedirectResponse
    {
        $salaryLedgerEntry->loadMissing('salaryProfile');

        if ($salaryLedgerEntry->salaryProfile?->paid_at) {
            return back()->with('error', 'This salary profile is paid and the ledger is locked.');
        }

        $data = $this->validatePayload($request);

        if (!$this->isDateInProfileMonth($data['entry_date'], $salaryLedgerEntry->salaryProfile)) {
            return back()->withErrors([
                'entry_date' => 'Entry date must be within the salary profile month.',
            ]);
        }

        $salaryLedgerEntry->update($data);

        return back()->with('success', 'Ledger entry updated successfully.');
    }

    public function destroy(SalaryLedgerEntry $salaryLedgerEntry): RedirectResponse
    {
        $salaryLedgerEntry->loadMissing('salaryProfile');

        if ($salaryLedgerEntry->salaryProfile?->paid_at) {
            return back()->with('error', 'This salary profile is paid and the ledger is locked.');
        }

        $salaryLedgerEntry->delete();

        return back()->with('success', 'Ledger entry deleted successfully.');
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'entry_date' => ['required', 'date'],
            'type' => ['required', Rule::in(['allowance', 'deduction'])],
            'title' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);
    }

    private function isDateInProfileMonth(string $entryDate, SalaryProfile $salaryProfile): bool
    {
        $entry = Carbon::parse($entryDate);
        $monthStart = Carbon::parse($salaryProfile->month)->startOfMonth();
        $monthEnd = $monthStart->copy()->endOfMonth();

        return $entry->betweenIncluded($monthStart, $monthEnd);
    }
}
