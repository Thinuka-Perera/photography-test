<?php
$file = 'config/access.php';
$content = file_get_contents($file);

$content = preg_replace_callback('/(\'href\'\s*=>\s*\'[^\']+\',)/', function($m) {
    $href = $m[1];
    if (str_contains($href, 'dashboard') || str_contains($href, 'reports') || str_contains($href, 'whatsapp') || str_contains($href, 'sales-history') || str_contains($href, 'purchase-history')) {
        return $href . "\n            'available_actions' => ['view'],";
    } else if (str_contains($href, 'settings') || str_contains($href, 'roles')) {
        return $href . "\n            'available_actions' => ['view', 'edit'],";
    } else {
        return $href . "\n            'available_actions' => ['view', 'create', 'edit', 'delete'],";
    }
}, $content);

file_put_contents($file, $content);
echo "Updated config/access.php\n";
