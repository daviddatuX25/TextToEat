<?php

namespace Tests\Feature;

use App\Models\OutboundSms;
use App\Models\SmsDevice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SmsDeviceLogsTest extends TestCase
{
    use RefreshDatabase;

    public function test_device_logs_page_shows_only_logs_for_that_device(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        $this->actingAs($user);

        $deviceA = SmsDevice::create([
            'device_id' => 'dev-a',
            'device_token' => 'token-a',
            'enabled' => true,
        ]);
        $deviceB = SmsDevice::create([
            'device_id' => 'dev-b',
            'device_token' => 'token-b',
            'enabled' => true,
        ]);

        $rowA1 = OutboundSms::create([
            'to' => '09123456781',
            'body' => 'From A1',
            'status' => 'pending',
            'sms_device_id' => $deviceA->id,
        ]);
        $rowA2 = OutboundSms::create([
            'to' => '09123456782',
            'body' => 'From A2',
            'status' => 'sent',
            'sms_device_id' => $deviceA->id,
        ]);
        $rowB1 = OutboundSms::create([
            'to' => '09999999999',
            'body' => 'From B1',
            'status' => 'failed',
            'sms_device_id' => $deviceB->id,
        ]);

        $response = $this->get("/portal/sms-devices/{$deviceA->device_id}/logs");

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('SmsDeviceLogs')
            ->where('device.device_id', $deviceA->device_id)
            ->has('logs.data', 2)
            ->where('logs.data.0.id', $rowA2->id)
            ->where('logs.data.1.id', $rowA1->id)
        );
    }
}

