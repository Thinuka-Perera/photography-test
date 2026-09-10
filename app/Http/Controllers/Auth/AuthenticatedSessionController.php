<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        // Eagerly load the role so that subsequent middleware checks
        // in this same request cycle never hit a lazy-load failure.
        $user = $request->user();
        $user?->loadMissing('role');

        // Clear any stale "intended" URL that may point to a page the
        // user cannot access (e.g. from a previous 403 incident or a
        // bookmarked admin-only page).  This prevents the
        // login → intended → 403 → login redirect loop.
        $intended = $request->session()->pull('url.intended');

        if ($intended && $user) {
            // Only honour the intended URL if it's a simple, known-safe
            // path on this same domain.  Otherwise fall back to dashboard.
            $path = parse_url($intended, PHP_URL_PATH) ?? '/';
            $isSafe = str_starts_with($path, '/') && ! str_starts_with($path, '//');

            if ($isSafe) {
                return redirect($intended);
            }
        }

        if ($user && ! $user->canAccessPage('dashboard')) {
            $pages = config('access.pages', []);
            foreach ($pages as $page) {
                if (isset($page['href']) && $page['href'] !== '#' && $user->canAccessPage($page['key'])) {
                    return redirect($page['href']);
                }
            }
        }

        return redirect()->route('dashboard');
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
