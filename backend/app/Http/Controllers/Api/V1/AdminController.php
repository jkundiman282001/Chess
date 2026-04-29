<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CosmeticItem;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    private const ASSET_KEYS = ['board', 'pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];

    public function users(Request $request): JsonResponse
    {
        $search = $request->string('search')->toString();

        $users = User::query()
            ->with('profile')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($innerQuery) use ($search): void {
                    $innerQuery
                        ->where('username', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->orderBy('id')
            ->get();

        return response()->json([
            'users' => $users->map(fn (User $user) => $this->formatUser($user))->all(),
        ]);
    }

    public function updateUser(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'is_admin' => ['required', 'boolean'],
            'is_active' => ['required', 'boolean'],
            'soft_currency' => ['required', 'integer', 'min:0'],
        ]);

        $user->forceFill([
            'is_admin' => $validated['is_admin'],
            'is_active' => $validated['is_active'],
        ])->save();

        $profile = $user->profile()->firstOrCreate();
        $profile->soft_currency = $validated['soft_currency'];
        $profile->save();

        return response()->json([
            'message' => "{$user->username} updated.",
            'user' => $this->formatUser($user->fresh()->load('profile')),
        ]);
    }

    public function cosmetics(): JsonResponse
    {
        $items = CosmeticItem::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json([
            'items' => $items->map(fn (CosmeticItem $item) => $this->formatCosmetic($item))->all(),
        ]);
    }

    public function storeCosmetic(Request $request): JsonResponse
    {
        $validated = $request->validate($this->cosmeticRules());

        $item = CosmeticItem::query()->create($this->mapCosmeticPayload($validated));

        return response()->json([
            'message' => "{$item->name} created.",
            'item' => $this->formatCosmetic($item),
        ], 201);
    }

    public function updateCosmetic(Request $request, CosmeticItem $cosmetic): JsonResponse
    {
        $validated = $request->validate($this->cosmeticRules($cosmetic->id));

        $cosmetic->forceFill($this->mapCosmeticPayload($validated))->save();

        return response()->json([
            'message' => "{$cosmetic->name} updated.",
            'item' => $this->formatCosmetic($cosmetic->fresh()),
        ]);
    }

    private function cosmeticRules(?int $ignoreId = null): array
    {
        return [
            'slug' => ['required', 'string', 'max:255', Rule::unique('cosmetic_items', 'slug')->ignore($ignoreId)],
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', Rule::in(['board', 'piece_set', 'bundle'])],
            'rarity' => ['required', 'string', 'max:24'],
            'description' => ['nullable', 'string', 'max:1000'],
            'price_soft_currency' => ['required', 'integer', 'min:0'],
            'sort_order' => ['required', 'integer', 'min:0'],
            'is_active' => ['required', 'boolean'],
            'preview' => ['nullable', 'array'],
            'preview.primary' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'preview.secondary' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'preview.banner' => ['nullable', 'string', 'max:3000000'],
            'assets' => ['nullable', 'array'],
            'assets.*' => ['nullable', 'string', 'max:3000000'],
        ];
    }

    private function mapCosmeticPayload(array $validated): array
    {
        $assets = $validated['assets'] ?? null;

        if (! in_array(($validated['category'] ?? null), ['piece_set', 'bundle'], true)) {
            $assets = null;
        } elseif (is_array($assets)) {
            $assets = array_intersect_key($assets, array_flip(self::ASSET_KEYS));
        }

        $preview = [
            'primary' => $validated['preview']['primary'] ?? '#b58863',
            'secondary' => $validated['preview']['secondary'] ?? '#f0d9b5',
        ];

        if (! empty($validated['preview']['banner'])) {
            $preview['banner'] = $validated['preview']['banner'];
        }

        return [
            'slug' => $validated['slug'],
            'name' => $validated['name'],
            'category' => $validated['category'],
            'rarity' => $validated['rarity'],
            'description' => $validated['description'] ?? null,
            'price_soft_currency' => $validated['price_soft_currency'],
            'sort_order' => $validated['sort_order'],
            'is_active' => $validated['is_active'],
            'preview' => $preview,
            'assets' => $assets,
        ];
    }

    private function formatUser(User $user): array
    {
        $profile = $user->profile ?? $user->profile()->firstOrCreate();

        return [
            'id' => $user->id,
            'username' => $user->username,
            'name' => $user->name,
            'email' => $user->email,
            'is_admin' => $user->is_admin,
            'is_active' => $user->is_active,
            'soft_currency' => $profile->soft_currency,
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }

    private function formatCosmetic(CosmeticItem $item): array
    {
        return [
            'id' => $item->id,
            'slug' => $item->slug,
            'name' => $item->name,
            'category' => $item->category,
            'rarity' => $item->rarity,
            'description' => $item->description,
            'price_soft_currency' => $item->price_soft_currency,
            'sort_order' => $item->sort_order,
            'is_active' => $item->is_active,
            'preview' => $item->preview,
            'assets' => $item->assets,
        ];
    }
}
