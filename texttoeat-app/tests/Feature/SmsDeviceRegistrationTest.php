<?php

namespace Tests\Feature;

use App\Models\OutboundSms;
use App\Models\SmsDevice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SmsDeviceRegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_device_stores_token(): void
    {
        config(['firebase.sms_device_api_key' => null]);

        $response = $this->postJson('/api/sms/device/register', [
            'token' => 'fcm-token-abc123',
            'name' => 'My Phone',
        ]);

        $response->assertStatus(200)
            ->assertJson(['registered' => true]);

        $this->assertDatabaseHas('sms_devices', [
            'device_token' => 'fcm-token-abc123',
            'name' => 'My Phone',
        ]);
    }

    public function test_register_device_updates_existing_token(): void
    {
        config(['firebase.sms_device_api_key' => null]);

        SmsDevice::create([
            'device_token' => 'fcm-token-xyz',
            'name' => 'Old Name',
        ]);

        $response = $this->postJson('/api/sms/device/register', [
            'token' => 'fcm-token-xyz',
            'name' => 'New Name',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('sms_devices', [
            'device_token' => 'fcm-token-xyz',
            'name' => 'New Name',
        ]);
        $this->assertSame(1, SmsDevice::count());
    }

    public function test_register_requires_token(): void
    {
        config(['firebase.sms_device_api_key' => null]);

        $response = $this->postJson('/api/sms/device/register', [
            'name' => 'No Token',
        ]);

        $response->assertStatus(422);
    }

    public function test_register_returns_401_when_api_key_required_and_missing(): void
    {
        config(['firebase.sms_device_api_key' => 'secret-key']);

        $response = $this->postJson('/api/sms/device/register', [
            'token' => 'fcm-token',
            'name' => 'Phone',
        ]);

        $response->assertStatus(401);
    }

    public function test_register_returns_200_with_bearer_token(): void
    {
        config(['firebase.sms_device_api_key' => 'secret-key']);

        $response = $this->withToken('secret-key')
            ->postJson('/api/sms/device/register', [
                'token' => 'fcm-token-bearer',
                'name' => 'Phone',
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('sms_devices', ['device_token' => 'fcm-token-bearer']);
    }

    public function test_register_returns_200_with_x_api_key_header(): void
    {
        config(['firebase.sms_device_api_key' => 'secret-key']);

        $response = $this->withHeaders(['X-API-Key' => 'secret-key'])
            ->postJson('/api/sms/device/register', [
                'token' => 'fcm-token-header',
                'name' => 'Phone',
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('sms_devices', ['device_token' => 'fcm-token-header']);
    }

    public function test_mark_sent_updates_pending_row(): void
    {
        config(['firebase.sms_device_api_key' => null]);

        $row = OutboundSms::create([
            'to' => '09123456789',
            'body' => 'Hello',
            'status' => 'pending',
        ]);

        $response = $this->postJson('/api/sms/outbound/mark-sent', [
            'id' => $row->id,
            'status' => 'sent',
        ]);

        $response->assertStatus(200)
            ->assertJson(['ok' => true]);

        $row->refresh();
        $this->assertSame('sent', $row->status);
        $this->assertNotNull($row->sent_at);
    }

    public function test_mark_sent_failed_sets_failure_reason(): void
    {
        config(['firebase.sms_device_api_key' => null]);

        $row = OutboundSms::create([
            'to' => '09123456789',
            'body' => 'Hello',
            'status' => 'pending',
        ]);

        $response = $this->postJson('/api/sms/outbound/mark-sent', [
            'id' => $row->id,
            'status' => 'failed',
            'reason' => 'no_service',
        ]);

        $response->assertStatus(200);

        $row->refresh();
        $this->assertSame('failed', $row->status);
        $this->assertSame('no_service', $row->failure_reason);
    }

    public function test_mark_sent_requires_reason_when_failed(): void
    {
        config(['firebase.sms_device_api_key' => null]);

        $row = OutboundSms::create([
            'to' => '09123456789',
            'body' => 'Hello',
            'status' => 'pending',
        ]);

        $response = $this->postJson('/api/sms/outbound/mark-sent', [
            'id' => $row->id,
            'status' => 'failed',
        ]);

        $response->assertStatus(422);
    }

    public function test_mark_sent_batch_updates_multiple_rows(): void
    {
        config(['firebase.sms_device_api_key' => null]);

        $row1 = OutboundSms::create(['to' => '09111111111', 'body' => 'A', 'status' => 'pending']);
        $row2 = OutboundSms::create(['to' => '09222222222', 'body' => 'B', 'status' => 'pending']);

        $response = $this->postJson('/api/sms/outbound/mark-sent', [
            'items' => [
                ['id' => $row1->id, 'status' => 'sent'],
                ['id' => $row2->id, 'status' => 'failed', 'reason' => 'timeout'],
            ],
        ]);

        $response->assertStatus(200);

        $row1->refresh();
        $row2->refresh();
        $this->assertSame('sent', $row1->status);
        $this->assertSame('failed', $row2->status);
        $this->assertSame('timeout', $row2->failure_reason);
    }

    public function test_mark_sent_returns_401_when_api_key_required_and_missing(): void
    {
        config(['firebase.sms_device_api_key' => 'secret-key']);

        $row = OutboundSms::create([
            'to' => '09123456789',
            'body' => 'Hello',
            'status' => 'pending',
        ]);

        $response = $this->postJson('/api/sms/outbound/mark-sent', [
            'id' => $row->id,
            'status' => 'sent',
        ]);

        $response->assertStatus(401);
    }
}
