<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "--- BILLS ---" . PHP_EOL;
foreach(DB::table('bills')->orderBy('id', 'desc')->limit(5)->get() as $b) {
    echo "ID={$b->id}, NO={$b->bill_number}, DATE={$b->created_at}, SUB={$b->subtotal}, DISC={$b->after_discount}" . PHP_EOL;
}

echo "--- BILL ITEMS ---" . PHP_EOL;
foreach(DB::table('bill_items')->whereIn('bill_id', [115, 116, 117, 118])->get() as $bi) {
    echo "BILL_ID={$bi->bill_id}, DESC={$bi->description}, QTY={$bi->quantity}" . PHP_EOL;
}

echo "--- DEALER COMMISSIONS ---" . PHP_EOL;
foreach(DB::table('dealer_commissions')->orderBy('id', 'desc')->limit(5)->get() as $d) {
    echo "ID={$d->id}, BILL={$d->bill_id}, DEALER={$d->dealer_id}, AMT={$d->commission_amt}, DATE={$d->commission_date}, PAID={$d->is_paid}, LEDGER={$d->ledger_entry_id}" . PHP_EOL;
}

echo "--- SALARY LEDGER ENTRIES ---" . PHP_EOL;
foreach(DB::table('salary_ledger_entries')->orderBy('id', 'desc')->limit(10)->get() as $l) {
    echo "ID={$l->id}, PROFILE={$l->salary_profile_id}, TITLE={$l->title}, AMT={$l->amount}, DATE={$l->entry_date}" . PHP_EOL;
}

echo "--- SALARY PROFILES ---" . PHP_EOL;
foreach(DB::table('salary_profiles')->orderBy('id', 'desc')->limit(5)->get() as $p) {
    echo "ID={$p->id}, EMP={$p->employee_id}, MONTH={$p->month}" . PHP_EOL;
}

echo "--- EMPLOYEES ---" . PHP_EOL;
foreach(DB::table('employees')->where('id', 1)->get() as $e) {
    echo "ID={$e->id}, NAME={$e->name}, DEFAULT_COMM={$e->default_commission_pct}, JOB={$e->job_role}, ROLE={$e->role}" . PHP_EOL;
}

echo "--- PRODUCTS ---" . PHP_EOL;
foreach(DB::table('products')->get() as $pr) {
    echo "ID={$pr->id}, NAME={$pr->name}, CAT={$pr->category_id}" . PHP_EOL;
}

echo "--- CATEGORIES ---" . PHP_EOL;
foreach(DB::table('categories')->get() as $cat) {
    echo "ID={$cat->id}, NAME={$cat->name}" . PHP_EOL;
}

echo "--- BILL CATEGORIES ---" . PHP_EOL;
foreach(DB::table('bill_categories')->get() as $bcat) {
    echo "ID={$bcat->id}, NAME={$bcat->name}, NO_COMM={$bcat->no_commission}" . PHP_EOL;
}

