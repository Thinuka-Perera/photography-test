<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        // Session expired / garbage-collected — redirect to login,
        // not a raw 403 that breaks the Inertia shell.
        if (! $user) {
            $request->session()->forget('url.intended');

            return redirect()->route('login');
        }

        if (! $user->hasAnyRole($roles)) {
            Log::warning('EnsureRole denied', [
                'user_id'        => $user->id,
                'email'          => $user->email,
                'role'           => $user->role?->slug ?? 'no-role',
                'required_roles' => $roles,
                'url'            => $request->fullUrl(),
            ]);

            if ($user->canAccessPage('dashboard')) {
                return redirect()->route('dashboard')
                    ->with('error', 'You do not have permission to access this area.');
            }

            abort(403, 'You do not have permission to access this area.');
        }

        return $next($request);
    }
}
