<?php

namespace App\Core;

class Session
{
    public static function start()
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    public static function set($key, $value)
    {
        self::start();
        $_SESSION[$key] = $value;
    }

    public static function get($key, $default = null)
    {
        self::start();
        return $_SESSION[$key] ?? $default;
    }

    public static function has($key)
    {
        self::start();
        return isset($_SESSION[$key]);
    }

    public static function remove($key)
    {
        self::start();
        unset($_SESSION[$key]);
    }

    public static function setFlash($key, $value)
    {
        self::start();
        $_SESSION['flash'][$key] = $value;
    }

    public static function getFlash($key, $default = null)
    {
        self::start();
        $value = $_SESSION['flash'][$key] ?? $default;
        unset($_SESSION['flash'][$key]);
        return $value;
    }

    public static function hasFlash($key)
    {
        self::start();
        return isset($_SESSION['flash'][$key]);
    }

    public static function destroy()
    {
        self::start();
        session_destroy();
    }
} 