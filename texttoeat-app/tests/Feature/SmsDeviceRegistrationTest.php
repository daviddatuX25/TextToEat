<?php

namespace Tests\Feature;

use App\Models\OutboundSms;
use App\Models\SmsDevice;
use App\Models\SmsGatewaySetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SmsDeviceRegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        SmsGatewaySetting::query()->update(['api_key' => null]);
    }

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

        $response->assertStatus(422)
            ->assertJson(['success' => false])
            ->assertJsonStructure(['error']);
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

    public function test_register_with_new_dto_returns_device_id(): void
    {
        config(['firebase.sms_device_api_key' => null]);

        $response = $this->postJson('/api/sms/device/register', [
            'fcmToken' => 'fcm-new-dto',
            'deviceId' => 'android-device-123',
            'name' => 'Pixel',
            'brand' => 'Google',
            'model' => 'Pixel 8',
            'os' => 'Android 14',
            'appVersionCode' => 42,
            'simInfo' => [
                ['carrierName' => 'Carrier', 'displayName' => 'SIM 1', 'slotIndex' => 0, 'subscriptionId' => 1],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'registered' => true,
                'deviceId' => 'android-device-123',
                '_id' => 'android-device-123',
                'name' => 'Pixel',
                'heartbeatIntervalMinutes' => 15,
            ]);
        $this->assertDatabaseHas('sms_devices', [
            'device_id' => 'android-device-123',
            'device_token' => 'fcm-new-dto',
            'brand' => 'Google',
            'model' => 'Pixel 8',
        ]);
    }

    public function test_put_device_update(): void
    {
        config(['firebase.sms_device_api_key' => null]);

        $device = SmsDevice::create([
            'device_id' => 'dev-456',
            'device_token' => 'fcm-token-456',
            'name' => 'Old',
            'enabled' => true,
        ]);

        $response = $this->putJson("/api/sms/device/{$device->device_id}", [
            'name' => 'Updated Name',
            'enabled' => false,
        ]);

        $response->assertStatus(200)->assertJson(['ok' => true]);
        $device->refresh();
        $this->assertSame('Updated Name', $device->name);
        $this->assertFalse($device->enabled);
    }

    public function test_heartbeat_stores_payload_and_returns_name(): void
    {
        config(['firebase.sms_device_api_key' => null]);

        $device = SmsDevice::create([
            'device_id' => 'dev-heartbeat',
            'device_token' => 'fcm-heartbeat',
            'name' => 'Heartbeat Phone',
            'enabled' => true,
        ]);

        $response = $this->postJson("/api/sms/device/{$device->device_id}/heartbeat", [
            'batteryPercentage' => 85,
            'isCharging' => true,
            'networkType' => 'wifi',
            'memoryUsage' => 512,
            'storageUsage' => 1024,
            'simInfo' => [
                ['carrierName' => 'Telco', 'subscriptionId' => 2],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJson(['fcmTokenUpdated' => false, 'name' => 'Heartbeat Phone']);
        $device->refresh();
        $this->assertNotNull($device->last_heartbeat_at);
        $this->assertSame(85, $device->last_heartbeat_payload['batteryPercentage']);
        $this->assertSame('wifi', $device->last_heartbeat_payload['networkType']);
    }

    public function test_sms_status_sent_updates_outbound_sms(): void
    {
        config(['firebase.sms_device_api_key' => null]);

        $device = SmsDevice::create([
            'device_id' => 'dev-status',
            'device_token' => 'fcm-status',
            'enabled' => true,
        ]);
        $row = OutboundSms::create([
            'to' => '09123456789',
            'body' => 'Hi',
            'status' => 'pending',
        ]);

        $response = $this->postJson("/api/sms/device/{$device->device_id}/sms/status", [
            'smsId' => $row->id,
            'smsBatchId' => 'batch-1',
            'status' => 'SENT',
        ]);

        $response->assertStatus(200)->assertJson(['ok' => true]);
        $row->refresh();
        $this->assertSame('sent', $row->status);
        $this->assertNotNull($row->sent_at);
    }

    public function test_sms_status_delivered_sets_delivered_at(): void
    {
        config(['firebase.sms_device_api_key' => null]);

        $device = SmsDevice::create([
            'device_id' => 'dev-delivered',
            'device_token' => 'fcm-delivered',
            'enabled' => true,
        ]);
        $row = OutboundSms::create([
            'to' => '09123456789',
            'body' => 'Hi',
            'status' => 'sent',
            'sent_at' => now(),
        ]);

        $response = $this->postJson("/api/sms/device/{$device->device_id}/sms/status", [
            'smsId' => $row->id,
            'status' => 'DELIVERED',
        ]);

        $response->assertStatus(200);
        $row->refresh();
        $this->assertSame('delivered', $row->status);
        $this->assertNotNull($row->delivered_at);
    }

    public function test_sms_status_failed_sets_error(): void
    {
        config(['firebase.sms_device_api_key' => null]);

        $device = SmsDevice::create([
            'device_id' => 'dev-fail',
            'device_token' => 'fcm-fail',
            'enabled' => true,
        ]);
        $row = OutboundSms::create([
            'to' => '09123456789',
            'body' => 'Hi',
            'status' => 'pending',
        ]);

        $response = $this->postJson("/api/sms/device/{$device->device_id}/sms/status", [
            'smsId' => $row->id,
            'status' => 'FAILED',
            'errorCode' => 'NO_SERVICE',
            'errorMessage' => 'No network',
        ]);

        $response->assertStatus(200);
        $row->refresh();
        $this->assertSame('failed', $row->status);
        $this->assertSame('NO_SERVICE', $row->error_code);
        $this->assertSame('No network', $row->error_message);
    }

    public function test_put_device_returns_404_when_device_missing(): void
    {
        config(['firebase.sms_device_api_key' => null]);

        $response = $this->putJson('/api/sms/device/nonexistent-device-id', [
            'name' => 'Test',
        ]);

        $response->assertStatus(404)
            ->assertJson(['success' => false, 'error' => 'Device not found.']);
    }

    public function test_register_uses_app_generated_key_from_db_when_config_unset(): void
    {
        config(['firebase.sms_device_api_key' => null]);
        $setting = SmsGatewaySetting::first();
        $setting->update(['api_key' => 'app-generated-key-123']);

        $response = $this->postJson('/api/sms/device/register', [
            'token' => 'fcm-token-app-key',
            'name' => 'Phone',
        ]);
        $response->assertStatus(401);

        $response = $this->withHeaders(['X-API-Key' => 'app-generated-key-123'])
            ->postJson('/api/sms/device/register', [
                'token' => 'fcm-token-app-key',
                'name' => 'Phone',
            ]);
        $response->assertStatus(200)->assertJson(['registered' => true]);
        $this->assertDatabaseHas('sms_devices', ['device_token' => 'fcm-token-app-key']);
    }
}
