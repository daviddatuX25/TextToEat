<?php

namespace App\Http\Controllers;

use App\Models\ActionLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class UsersController extends Controller
{
    public function index(): Response
    {
        $users = User::query()
            ->orderByRaw('name IS NULL, name ASC')
            ->orderBy('username')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'username' => $u->username,
                'role' => $u->role ?? 'staff',
                'created_at' => $u->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Users', [
            'users' => $users,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'username' => ['required', 'string', 'max:191', 'alpha_dash', 'unique:users,username'],
            'name' => ['nullable', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['nullable', 'string', 'in:staff,admin'],
        ]);

        $role = 'staff';
        if ($request->user()->isAdmin() || $request->user()->isSuperAdmin()) {
            $requestedRole = $validated['role'] ?? 'staff';
            // Prevent non-superadmins from creating superadmin accounts
            if ($requestedRole === 'superadmin' && !$request->user()->isSuperAdmin()) {
                $requestedRole = 'staff';
            }
            $role = $requestedRole;
        }

        $user = User::create([
            'username' => $validated['username'],
            'name' => $validated['name'] ?? null,
            'password' => Hash::make($validated['password']),
            'role' => $role,
        ]);

        ActionLog::create([
            'user_id' => $request->user()->id,
            'action' => 'user_created',
            'model' => 'User',
            'model_id' => $user->id,
            'payload' => ['username' => $user->username, 'role' => $user->role],
        ]);

        return redirect()->back()->with('success', 'User created.');
    }

    public function resetPassword(Request $request, User $user): RedirectResponse
    {
        if (! $request->user()->isSuperAdmin() && $user->isSuperAdmin()) {
            return redirect()->back()->with('error', 'Only a super administrator can reset a super administrator\'s password.');
        }

        $user->update(['password' => Hash::make('Password1!')]);

        ActionLog::create([
            'user_id' => $request->user()->id,
            'action' => 'password_reset',
            'model' => 'User',
            'model_id' => $user->id,
            'payload' => ['reason' => 'admin_reset'],
        ]);

        return redirect()->back()->with(
            'success',
            'Password for ' . $user->username . ' reset to default (Password1!). Remind them to change it from Account.'
        );
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($request->user()->id === $user->id) {
            return redirect()->back()->with('error', 'You cannot deactivate your own account.');
        }

        if (! $request->user()->isSuperAdmin() && $user->isAdmin()) {
            return redirect()->back()->with('error', 'Only a super administrator can deactivate administrators.');
        }

        if ($user->isAdmin() && User::whereIn('role', ['admin', 'superadmin'])->count() <= 1) {
            return redirect()->back()->with('error', 'Cannot deactivate the last admin.');
        }

        ActionLog::create([
            'user_id' => $request->user()->id,
            'action' => 'user_deactivated',
            'model' => 'User',
            'model_id' => $user->id,
            'payload' => ['username' => $user->username],
        ]);

        $user->delete();

        return redirect()->back()->with('success', 'Account deactivated.');
    }
}
