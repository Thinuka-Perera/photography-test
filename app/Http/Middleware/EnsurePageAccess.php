<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class EnsurePageAccess
{
    public function handle(Request $request, Closure $next, string $pageKey): Response
    {
        $user = $request->user();

        // ── Guard 1: No authenticated user ──────────────────────────
        // Session may have expired or been garbage-collected on shared
        // hosting.  Redirect to login instead of showing a raw 403 that
        // breaks the Inertia SPA shell and traps the user.
        if (! $user) {
            // Forget the "intended" URL so the next login lands on the
            // dashboard instead of looping back to a page that might
            // 403 again.
            $request->session()->forget('url.intended');

            return redirect()->route('login');
        }

        // ── Guard 2: User lacks permission for this page ────────────
        if (! $user->canAccessPage($pageKey)) {
            Log::warning('EnsurePageAccess denied', [
                'user_id'  => $user->id,
                'email'    => $user->email,
                'role'     => $user->role?->slug ?? 'no-role',
                'page_key' => $pageKey,
                'url'      => $request->fullUrl(),
            ]);

            // If the user can at least reach the dashboard, send them
            // there with a flash message instead of a raw 403.
            if ($pageKey !== 'dashboard' && $user->canAccessPage('dashboard')) {
                return redirect()->route('dashboard')
                    ->with('error', 'You do not have access to this page.');
            }

            abort(403, 'You do not have access to this page.');
        }

        return $next($request);
    }
}
