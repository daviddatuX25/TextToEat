<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSmsDeviceApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $apiKey = config('firebase.sms_device_api_key');
        if ($apiKey === null || $apiKey === '') {
            return $next($request);
        }

        $bearer = $request->bearerToken();
        $header = $request->header('X-API-Key');

        if (($bearer !== null && $bearer !== '' && $bearer === $apiKey)
            || ($header !== null && $header !== '' && $header === $apiKey)) {
            return $next($request);
        }

        abort(401, 'Unauthorized');
    }
}
