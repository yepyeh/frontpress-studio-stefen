<?php

declare(strict_types=1);

use FrontPress\Updater;
use PHPUnit\Framework\TestCase;

defined('FRONTPRESS_BOOT') || define('FRONTPRESS_BOOT', true);

/**
 * Covers the directory-prefix path through Updater::apply() — exercising the
 * starter dirs that landed in the manifest. We can't reach GitHub from a
 * unit test, so the suite builds a fake "release" ZIP locally and calls
 * apply() with a file:// URL via a subclass that bypasses the host
 * allowlist.
 */
class UpdaterTest extends TestCase
{
    private string $root;
    private string $backupDir;

    protected function setUp(): void
    {
        $this->root      = sys_get_temp_dir() . '/fp_updater_' . uniqid();
        $this->backupDir = $this->root . '/site/backups';
        mkdir($this->root . '/cms', 0755, true);
        mkdir($this->backupDir, 0755, true);

        file_put_contents($this->root . '/cms/VERSION', '0.0.1');
        file_put_contents($this->root . '/cms/manifest.json', json_encode([
            'repo' => 'krstivoja/frontpress-studio',
            'core' => [
                'cms/VERSION',
                'cms/starters/debug-twig/',
            ],
        ]));

        // Pre-existing local file we want to verify gets backed up.
        mkdir($this->root . '/cms/starters/debug-twig/templates', 0755, true);
        file_put_contents(
            $this->root . '/cms/starters/debug-twig/templates/post.twig',
            'OLD VERSION',
        );
    }

    protected function tearDown(): void
    {
        $this->rrmdir($this->root);
    }

    public function testDirectoryPrefixExtractsEveryFileUnderIt(): void
    {
        // Build a release ZIP that mimics a GitHub zipball: top-level folder
        // wraps cms/.
        $zipPath = $this->root . '/release.zip';
        $z = new ZipArchive();
        $z->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        $z->addEmptyDir('frontpress-studio-1.0/');
        $z->addFromString('frontpress-studio-1.0/cms/VERSION', '1.0.0');
        $z->addFromString('frontpress-studio-1.0/cms/manifest.json', json_encode([
            'repo' => 'krstivoja/frontpress-studio',
            'core' => [
                'cms/VERSION',
                'cms/starters/debug-twig/',
            ],
        ]));
        $z->addFromString('frontpress-studio-1.0/cms/starters/debug-twig/theme.json', '{"name":"Debug (Twig)"}');
        $z->addFromString('frontpress-studio-1.0/cms/starters/debug-twig/templates/post.twig', 'NEW post');
        $z->addFromString('frontpress-studio-1.0/cms/starters/debug-twig/templates/page.twig', 'NEW page');
        $z->addFromString('frontpress-studio-1.0/cms/starters/debug-twig/templates/_header.twig', 'NEW header');
        $z->close();

        $updater = new class ($this->root) extends Updater {
            // file:// URLs would be rejected by the production host check;
            // open the gate just for the test.
            public static function isAllowedZipUrl(string $url): bool { return true; }
        };

        $result = $updater->apply('file://' . $zipPath, $this->backupDir);
        $this->assertTrue($result['ok'], $result['error'] ?? '');

        // New files arrived.
        $this->assertSame('NEW post', file_get_contents($this->root . '/cms/starters/debug-twig/templates/post.twig'));
        $this->assertSame('NEW page', file_get_contents($this->root . '/cms/starters/debug-twig/templates/page.twig'));
        $this->assertSame('NEW header', file_get_contents($this->root . '/cms/starters/debug-twig/templates/_header.twig'));
        $this->assertSame('{"name":"Debug (Twig)"}', file_get_contents($this->root . '/cms/starters/debug-twig/theme.json'));
        $this->assertSame('1.0.0', file_get_contents($this->root . '/cms/VERSION'));

        // Pre-existing file was backed up.
        $backups = glob($this->backupDir . '/pre-update-*.zip') ?: [];
        $this->assertCount(1, $backups);
        $bak = new ZipArchive();
        $bak->open($backups[0]);
        $this->assertNotFalse($bak->locateName('cms/starters/debug-twig/templates/post.twig'));
        $this->assertSame('OLD VERSION', $bak->getFromName('cms/starters/debug-twig/templates/post.twig'));
        $bak->close();
    }

    private function rrmdir(string $dir): void
    {
        if (!is_dir($dir)) return;
        $iter = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST,
        );
        foreach ($iter as $f) {
            $f->isDir() ? rmdir($f->getPathname()) : unlink($f->getPathname());
        }
        rmdir($dir);
    }
}
