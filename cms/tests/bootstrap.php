<?php

// Tests run outside an HTTP entry point, so the framework's `FRONTPRESS_BOOT`
// guard wouldn't fire. Define it before autoloading any MD\* class so
// `defined('FRONTPRESS_BOOT') || exit;` in lib files lets the class load.
defined('FRONTPRESS_BOOT') || define('FRONTPRESS_BOOT', true);

require __DIR__ . '/../vendor/autoload.php';
