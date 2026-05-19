<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

defined('FRONTPRESS_BOOT') || define('FRONTPRESS_BOOT', true);
require_once __DIR__ . '/../lib/template_helpers.php';

/**
 * Covers the resolution order in `partial()` — specifically the .html
 * fallback that powers the visual editor (theme authors author static
 * blocks in GrapesJS; templates pull them in with partial('hero')).
 */
class PartialTest extends TestCase
{
    private string $themeDir;
    private ?string $prevTemplateDir = null;

    protected function setUp(): void
    {
        $this->themeDir = sys_get_temp_dir() . '/fp_partial_' . uniqid();
        mkdir($this->themeDir, 0755, true);
        $this->prevTemplateDir = $GLOBALS['fp_template_dir'] ?? null;
        $GLOBALS['fp_template_dir'] = $this->themeDir;
    }

    protected function tearDown(): void
    {
        $this->rrmdir($this->themeDir);
        if ($this->prevTemplateDir === null) {
            unset($GLOBALS['fp_template_dir']);
        } else {
            $GLOBALS['fp_template_dir'] = $this->prevTemplateDir;
        }
    }

    public function testResolvesHtmlPartialVerbatim(): void
    {
        file_put_contents($this->themeDir . '/_hero.html', '<section class="hero">Static</section>');

        $output = $this->capture(fn () => partial('hero'));
        $this->assertSame('<section class="hero">Static</section>', $output);
    }

    public function testHtmlPartialIgnoresVars(): void
    {
        // .html is static — passed vars should never appear in the output.
        file_put_contents($this->themeDir . '/_hero.html', '<h1>Plain</h1>');

        $output = $this->capture(fn () => partial('hero', ['who' => 'Marko']));
        $this->assertSame('<h1>Plain</h1>', $output);
        $this->assertStringNotContainsString('Marko', $output);
    }

    public function testPhpPartialStillWinsOverHtml(): void
    {
        // When both exist, PHP gets priority — .html is the last fallback.
        file_put_contents($this->themeDir . '/_hero.php',  '<?= "PHP" ?>');
        file_put_contents($this->themeDir . '/_hero.html', '<i>HTML</i>');

        $output = $this->capture(fn () => partial('hero'));
        $this->assertSame('PHP', $output);
    }

    public function testComponentsHtmlIsPickedUp(): void
    {
        mkdir($this->themeDir . '/components', 0755, true);
        file_put_contents($this->themeDir . '/components/hero.html', '<div>Component</div>');

        $output = $this->capture(fn () => partial('hero'));
        $this->assertSame('<div>Component</div>', $output);
    }

    public function testRejectsTraversal(): void
    {
        $this->expectException(RuntimeException::class);
        partial('../etc/passwd');
    }

    private function capture(callable $fn): string
    {
        ob_start();
        try { $fn(); } finally { return (string)ob_get_clean(); }
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
