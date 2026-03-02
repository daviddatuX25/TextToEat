<?php

use App\Http\Controllers\Auth\LoginController;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

$basePath = dirname(__DIR__);
$webRoutes = $basePath.'/routes/web.php';
if (! is_file($webRoutes)) {
    throw new RuntimeException(
        'Routes file not found at: '.$basePath.'/routes/web.php. '
        .'Ensure the Laravel app root (where bootstrap/ and routes/ live) is correct. '
        .'If using Docker, check that the app is mounted so routes/ exists.'
    );
}

return Application::configure(basePath: $basePath)
    ->withRouting(
        channels: __DIR__.'/../routes/channels.php',
        web: $webRoutes,
        api: $basePath.'/routes/api.php',
        commands: $basePath.'/routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);
        $middleware->alias([
            'admin' => \App\Http\Middleware\EnsureUserIsAdmin::class,
            'superadmin' => \App\Http\Middleware\EnsureUserIsSuperAdmin::class,
            'sms.device.api' => \App\Http\Middleware\EnsureSmsDeviceApiKey::class,
        ]);
        Authenticate::redirectUsing(fn ($request) => route('login'));
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/sms/*') && $request->expectsJson()) {
                $errors = $e->errors();
                $first = reset($errors);
                $message = is_array($first) ? implode(' ', $first) : $e->getMessage();
                if ($message === null || $message === '') {
                    $message = $e->getMessage();
                }

                return response()->json(['success' => false, 'error' => $message], 422);
            }
        });
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/sms/*') && $request->expectsJson()) {
                return response()->json(['success' => false, 'error' => 'Device not found.'], 404);
            }
        });
    })->create();
