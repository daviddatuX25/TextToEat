<?php

namespace Tests\Unit;

use App\Support\MenuManualResetWindow;
use PHPUnit\Framework\TestCase;

class MenuManualResetWindowTest extends TestCase
{
    public function test_same_day_inclusive_window(): void
    {
        $this->assertTrue(MenuManualResetWindow::hourIsWithinWindow(4, 4, 11));
        $this->assertTrue(MenuManualResetWindow::hourIsWithinWindow(11, 4, 11));
        $this->assertFalse(MenuManualResetWindow::hourIsWithinWindow(3, 4, 11));
        $this->assertFalse(MenuManualResetWindow::hourIsWithinWindow(12, 4, 11));
    }

    public function test_single_hour_window(): void
    {
        $this->assertTrue(MenuManualResetWindow::hourIsWithinWindow(5, 5, 5));
        $this->assertFalse(MenuManualResetWindow::hourIsWithinWindow(4, 5, 5));
    }

    public function test_overnight_window(): void
    {
        $this->assertTrue(MenuManualResetWindow::hourIsWithinWindow(23, 22, 6));
        $this->assertTrue(MenuManualResetWindow::hourIsWithinWindow(0, 22, 6));
        $this->assertTrue(MenuManualResetWindow::hourIsWithinWindow(6, 22, 6));
        $this->assertFalse(MenuManualResetWindow::hourIsWithinWindow(12, 22, 6));
    }
}
