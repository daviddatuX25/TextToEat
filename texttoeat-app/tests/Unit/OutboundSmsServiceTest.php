<?php

namespace Tests\Unit;

use App\Models\OutboundSms;
use App\Models\SmsDevice;
use App\Services\OutboundSmsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Kreait\Firebase\Contract\Messaging;
use Kreait\Firebase\Messaging\CloudMessage;
use Mockery;
use Tests\TestCase;

class OutboundSmsServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_enqueue_and_send_fcm_sends_one_fcm_with_full_body_and_string_sms_id(): void
    {
        $device = SmsDevice::create([
            'device_id' => 'test-device',
            'device_token' => 'fcm-token-test',
            'enabled' => true,
        ]);

        $capturedMessage = null;
        $mockMessaging = Mockery::mock(Messaging::class);
        $mockMessaging->shouldReceive('send')
            ->once()
            ->with(Mockery::type(CloudMessage::class))
            ->andReturnUsing(function (CloudMessage $message) use (&$capturedMessage): void {
                $capturedMessage = $message;
            });

        $this->app->instance(Messaging::class, $mockMessaging);

        $service = app(OutboundSmsService::class);
        $body = "Hello\nThis is line two.\nFull message.";
        $result = $service->enqueueAndSendFcm('+639123456789', $body, 'sms', null);

        $this->assertSame(1, OutboundSms::count());
        $row = OutboundSms::first();
        $this->assertSame([$row->id], $result['ids']);
        $this->assertArrayHasKey('success', $result);
        if (! $result['success']) {
            $this->assertArrayHasKey('message', $result);
        }
        $this->assertSame($body, $row->body);
        $this->assertSame('+639123456789', $row->to);
        $this->assertSame($device->id, $row->sms_device_id);

        $this->assertNotNull($capturedMessage);
        $serialized = $capturedMessage->jsonSerialize();
        $this->assertArrayHasKey('data', $serialized);
        $data = $serialized['data'];
        $this->assertIsArray($data);
        $this->assertArrayHasKey('type', $data);
        $this->assertSame('smsData', $data['type']);
        $this->assertArrayHasKey('smsData', $data);
        $smsData = json_decode($data['smsData'], true);
        $this->assertIsArray($smsData);
        $this->assertArrayHasKey('smsId', $smsData);
        $this->assertIsString($smsData['smsId']);
        $this->assertSame((string) $row->id, $smsData['smsId']);
        $this->assertArrayHasKey('recipients', $smsData);
        $this->assertSame(['+639123456789'], $smsData['recipients']);
        $this->assertArrayHasKey('message', $smsData);
        $this->assertSame($body, $smsData['message']);
    }

    public function test_enqueue_and_send_fcm_empty_body_creates_no_row_and_sends_no_fcm(): void
    {
        SmsDevice::create([
            'device_id' => 'test-device',
            'device_token' => 'fcm-token-test',
            'enabled' => true,
        ]);

        $mockMessaging = Mockery::mock(Messaging::class);
        $mockMessaging->shouldNotReceive('send');

        $this->app->instance(Messaging::class, $mockMessaging);

        $service = app(OutboundSmsService::class);
        $result = $service->enqueueAndSendFcm('+639123456789', '  ', 'sms', null);

        $this->assertSame(['success' => true, 'ids' => []], $result);
        $this->assertSame(0, OutboundSms::count());
    }
}
