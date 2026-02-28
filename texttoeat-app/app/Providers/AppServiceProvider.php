<?php

namespace App\Providers;

use App\Contracts\MessengerSenderInterface;
use App\Contracts\SmsSenderInterface;
use App\Services\Channels\FacebookMessengerSender;
use App\Services\Channels\FcmSmsSender;
use App\Services\Channels\SimMessengerSender;
use App\Services\Channels\SimSmsSender;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(SmsSenderInterface::class, function () {
            return config('chatbot.channel_mode') === 'prod'
                ? $this->app->make(FcmSmsSender::class)
                : $this->app->make(SimSmsSender::class);
        });

        $this->app->bind(MessengerSenderInterface::class, function () {
            return config('chatbot.channel_mode') === 'prod'
                ? $this->app->make(FacebookMessengerSender::class)
                : $this->app->make(SimMessengerSender::class);
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
