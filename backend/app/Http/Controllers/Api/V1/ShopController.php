<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\ShopService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use RuntimeException;

class ShopController extends Controller
{
    public function __construct(private readonly ShopService $shopService) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('profile.equippedBoardCosmetic', 'profile.equippedPieceCosmetic');
        $this->shopService->ensureStarterCosmetics($user);

        $items = $this->shopService->catalogItems();

        return response()->json($this->shopService->formatCatalog($user, $items));
    }

    public function purchase(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'slug' => ['required', 'string', Rule::exists('cosmetic_items', 'slug')],
        ]);

        $user = $request->user()->loadMissing('profile.equippedBoardCosmetic', 'profile.equippedPieceCosmetic');

        try {
            $result = $this->shopService->purchase($user, $validated['slug']);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json($result, 201);
    }

    public function equip(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'slug' => ['required', 'string', Rule::exists('cosmetic_items', 'slug')],
        ]);

        $user = $request->user()->loadMissing('profile.equippedBoardCosmetic', 'profile.equippedPieceCosmetic');

        try {
            $result = $this->shopService->equip($user, $validated['slug']);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json($result);
    }

    public function unequip(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'slug' => ['required', 'string', Rule::exists('cosmetic_items', 'slug')],
        ]);

        $user = $request->user()->loadMissing('profile.equippedBoardCosmetic', 'profile.equippedPieceCosmetic');

        try {
            $result = $this->shopService->unequip($user, $validated['slug']);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json($result);
    }
}
