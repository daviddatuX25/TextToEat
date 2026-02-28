<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MenuItemImageService
{
    private const MAX_WIDTH = 800;

    private const MAX_HEIGHT = 600;

    private const JPEG_QUALITY = 82;

    private const DISK = 'public';

    private const DIRECTORY = 'menu-items';

    /**
     * Process uploaded image: resize, compress, store on public disk.
     * Returns the public URL to store in menu_items.image_url, or null on failure.
     */
    public function processUpload(UploadedFile $file): ?string
    {
        $path = $file->getRealPath();
        $image = $this->loadImage($path, $file->getMimeType());
        if (! $image) {
            return null;
        }

        $resized = $this->resize($image, self::MAX_WIDTH, self::MAX_HEIGHT);
        if (! $resized) {
            $this->destroy($image);

            return null;
        }

        $filename = Str::random(16).'.jpg';
        $relativePath = self::DIRECTORY.'/'.$filename;
        $fullPath = Storage::disk(self::DISK)->path($relativePath);

        $dir = dirname($fullPath);
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $saved = imagejpeg($resized, $fullPath, self::JPEG_QUALITY);
        $this->destroy($resized);
        if ($resized !== $image) {
            $this->destroy($image);
        }

        if (! $saved) {
            return null;
        }

        return Storage::disk(self::DISK)->url($relativePath);
    }

    /**
     * Delete an image by its stored URL (e.g. from menu_items.image_url).
     */
    public function deleteByUrl(?string $url): void
    {
        if (! $url || ! str_contains($url, '/storage/')) {
            return;
        }
        $relativePath = Str::after($url, '/storage/');
        Storage::disk(self::DISK)->delete($relativePath);
    }

    /**
     * @return resource|null
     */
    private function loadImage(string $path, string $mimeType)
    {
        switch ($mimeType) {
            case 'image/jpeg':
            case 'image/jpg':
                return @imagecreatefromjpeg($path);
            case 'image/png':
                $img = @imagecreatefrompng($path);
                if ($img) {
                    imagealphablending($img, true);
                    imagesavealpha($img, true);
                }
                return $img;
            case 'image/webp':
                return @imagecreatefromwebp($path);
            default:
                return null;
        }
    }

    /**
     * @param resource $image
     * @return resource|null
     */
    private function resize($image, int $maxWidth, int $maxHeight)
    {
        $width = imagesx($image);
        $height = imagesy($image);
        if ($width <= 0 || $height <= 0) {
            return null;
        }

        $ratio = min($maxWidth / $width, $maxHeight / $height, 1.0);
        $newWidth = (int) round($width * $ratio);
        $newHeight = (int) round($height * $ratio);

        if ($newWidth >= $width && $newHeight >= $height) {
            return $image;
        }

        $resized = imagecreatetruecolor($newWidth, $newHeight);
        if (! $resized) {
            return null;
        }

        $ok = imagecopyresampled(
            $resized, $image,
            0, 0, 0, 0,
            $newWidth, $newHeight, $width, $height
        );
        if (! $ok) {
            imagedestroy($resized);
            return null;
        }

        return $resized;
    }

    /**
     * @param resource $image
     */
    private function destroy($image): void
    {
        if (is_resource($image)) {
            imagedestroy($image);
        }
    }
}
