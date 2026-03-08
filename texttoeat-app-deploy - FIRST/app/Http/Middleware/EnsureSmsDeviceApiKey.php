<?php

namespace App\Http\Middleware;

use App\Models\SmsGatewaySetting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSmsDeviceApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $apiKey = SmsGatewaySetting::getApiKey();
        if ($apiKey === null || $apiKey === '') {
            return $next($request);
        }

        $bearer = $request->bearerToken();
        $header = $request->header('X-API-Key');

        if (($bearer !== null && $bearer !== '' && $bearer === $apiKey)
            || ($header !== null && $header !== '' && $header === $apiKey)) {
            return $next($request);
        }

        return response()->json(['success' => false, 'error' => 'Unauthorized'], 401);
    }
}
