<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Account', [
            'user' => [
                'name' => $user->name,
                'username' => $user->username,
                'role' => $user->role ?? 'staff',
            ],
        ]);
    }

    public function updateAccount(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:191', 'alpha_dash', 'unique:users,username,' . $request->user()->id],
        ]);

        $request->user()->update([
            'name' => $validated['name'] ?? null,
            'username' => $validated['username'],
        ]);

        return redirect()->back()->with('success', 'Account updated.');
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (! Hash::check($validated['current_password'], $request->user()->password)) {
            return redirect()->back()->withErrors(['current_password' => 'The current password is incorrect.']);
        }

        $request->user()->update([
            'password' => Hash::make($validated['password']),
        ]);

        return redirect()->back()->with('success', 'Password updated.');
    }
}
