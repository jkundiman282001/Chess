<?php

use App\Http\Controllers\Api\V1\AdminController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\GameController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\ShopController;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', function (): JsonResponse {
        return response()->json([
            'name' => config('app.name'),
            'status' => 'ok',
            'timestamp' => now()->toIso8601String(),
        ]);
    });

    Route::prefix('auth')->group(function (): void {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);

        Route::middleware('auth:sanctum')->group(function (): void {
            Route::get('/me', [AuthController::class, 'me']);
            Route::post('/logout', [AuthController::class, 'logout']);
        });
    });

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/profile', [ProfileController::class, 'show']);
        Route::patch('/profile', [ProfileController::class, 'update']);
        Route::get('/shop', [ShopController::class, 'index']);
        Route::get('/shop/{slug}', [ShopController::class, 'show']);
        Route::post('/shop/purchase', [ShopController::class, 'purchase']);
        Route::post('/shop/equip', [ShopController::class, 'equip']);
        Route::post('/shop/unequip', [ShopController::class, 'unequip']);

        Route::get('/games', [GameController::class, 'index']);
        Route::get('/games/open/casual', [GameController::class, 'openCasual']);
        Route::post('/games', [GameController::class, 'store']);
        Route::get('/games/{game:public_id}', [GameController::class, 'show']);
        Route::post('/games/{game:public_id}/join', [GameController::class, 'join']);
        Route::post('/games/{game:public_id}/moves', [GameController::class, 'storeMove']);
        Route::post('/games/{game:public_id}/resign', [GameController::class, 'resign']);
        Route::post('/games/{game:public_id}/hide', [GameController::class, 'hide']);
        Route::post('/games/{game:public_id}/unhide', [GameController::class, 'unhide']);
    });

    Route::prefix('admin')->middleware(['auth:sanctum', 'admin'])->group(function (): void {
        Route::get('/users', [AdminController::class, 'users']);
        Route::patch('/users/{user}', [AdminController::class, 'updateUser']);
        Route::get('/cosmetics', [AdminController::class, 'cosmetics']);
        Route::post('/cosmetics', [AdminController::class, 'storeCosmetic']);
        Route::patch('/cosmetics/{cosmetic}', [AdminController::class, 'updateCosmetic']);
    });
});
