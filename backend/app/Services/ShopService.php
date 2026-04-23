<?php

namespace App\Services;

use App\Models\CosmeticItem;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ShopService
{
    private const STARTER_BLACK_BUNDLE_SLUG = 'classic';

    private const STARTER_WHITE_BUNDLE_SLUG = 'classic2';

    public function defaultPieceSets(): array
    {
        $bundles = CosmeticItem::query()
            ->whereIn('slug', [self::STARTER_BLACK_BUNDLE_SLUG, self::STARTER_WHITE_BUNDLE_SLUG])
            ->get()
            ->keyBy('slug');

        return [
            'black' => $bundles->has(self::STARTER_BLACK_BUNDLE_SLUG)
                ? $this->formatEquippedItem($bundles[self::STARTER_BLACK_BUNDLE_SLUG])
                : null,
            'white' => $bundles->has(self::STARTER_WHITE_BUNDLE_SLUG)
                ? $this->formatEquippedItem($bundles[self::STARTER_WHITE_BUNDLE_SLUG])
                : null,
        ];
    }

    public function ensureStarterCosmetics(User $user): void
    {
        $profile = $user->profile()->firstOrCreate();
        $profile->loadMissing('equippedBoardCosmetic', 'equippedPieceCosmetic');

        $starterItems = CosmeticItem::query()
            ->whereIn('slug', [self::STARTER_BLACK_BUNDLE_SLUG, self::STARTER_WHITE_BUNDLE_SLUG])
            ->get()
            ->keyBy('slug');

        foreach ($starterItems as $item) {
            $user->userCosmetics()->firstOrCreate([
                'cosmetic_item_id' => $item->id,
            ]);
        }

        $updates = [];

        if ($starterItems->has(self::STARTER_BLACK_BUNDLE_SLUG)) {
            $equippedBoardInvalid =
                $profile->equipped_board_cosmetic_id === null ||
                $profile->equippedBoardCosmetic === null ||
                $profile->equippedBoardCosmetic->category !== 'bundle';

            $equippedPieceInvalid =
                $profile->equipped_piece_cosmetic_id === null ||
                $profile->equippedPieceCosmetic === null ||
                $profile->equippedPieceCosmetic->category !== 'bundle';

            if ($equippedBoardInvalid) {
                $updates['equipped_board_cosmetic_id'] = $starterItems[self::STARTER_BLACK_BUNDLE_SLUG]->id;
            }

            if ($equippedPieceInvalid) {
                $updates['equipped_piece_cosmetic_id'] = $starterItems[self::STARTER_BLACK_BUNDLE_SLUG]->id;
            }
        }

        if ($updates !== []) {
            $profile->forceFill($updates)->save();
            $profile->load('equippedBoardCosmetic', 'equippedPieceCosmetic');
        }
    }

    public function purchase(User $user, string $slug): array
    {
        return DB::transaction(function () use ($user, $slug): array {
            /** @var User $lockedUser */
            $lockedUser = User::query()
                ->whereKey($user->id)
                ->lockForUpdate()
                ->firstOrFail();

            $lockedUser->loadMissing('profile.equippedBoardCosmetic', 'profile.equippedPieceCosmetic');
            $this->ensureStarterCosmetics($lockedUser);

            $item = CosmeticItem::query()
                ->where('slug', $slug)
                ->where('is_active', true)
                ->firstOrFail();

            $owned = $lockedUser->userCosmetics()
                ->where('cosmetic_item_id', $item->id)
                ->exists();

            if ($owned) {
                throw new RuntimeException('You already own this cosmetic.');
            }

            $profile = $lockedUser->profile()->firstOrCreate();

            if ($profile->soft_currency < $item->price_soft_currency) {
                throw new RuntimeException('Not enough coins.');
            }

            $profile->decrement('soft_currency', $item->price_soft_currency);

            $lockedUser->userCosmetics()->create([
                'cosmetic_item_id' => $item->id,
            ]);

            return [
                'message' => "{$item->name} purchased.",
                ...$this->formatCatalog(
                    $lockedUser->fresh()->loadMissing('profile.equippedBoardCosmetic', 'profile.equippedPieceCosmetic'),
                    CosmeticItem::query()->where('is_active', true)->orderBy('sort_order')->orderBy('id')->get()
                ),
            ];
        });
    }

    public function equip(User $user, string $slug): array
    {
        return DB::transaction(function () use ($user, $slug): array {
            /** @var User $lockedUser */
            $lockedUser = User::query()
                ->whereKey($user->id)
                ->lockForUpdate()
                ->firstOrFail();

            $lockedUser->loadMissing('profile.equippedBoardCosmetic', 'profile.equippedPieceCosmetic');
            $this->ensureStarterCosmetics($lockedUser);

            $item = CosmeticItem::query()
                ->where('slug', $slug)
                ->where('is_active', true)
                ->firstOrFail();

            $owned = $lockedUser->userCosmetics()
                ->where('cosmetic_item_id', $item->id)
                ->exists();

            if (! $owned) {
                throw new RuntimeException('You do not own this cosmetic.');
            }

            $profile = $lockedUser->profile()->firstOrCreate();

            if ($item->category === 'board') {
                $profile->equipped_board_cosmetic_id = $item->id;
            }

            if ($item->category === 'piece_set') {
                $profile->equipped_piece_cosmetic_id = $item->id;
            }

            if ($item->category === 'bundle') {
                $profile->equipped_board_cosmetic_id = $item->id;
                $profile->equipped_piece_cosmetic_id = $item->id;
            }

            $profile->save();

            return [
                'message' => "{$item->name} equipped.",
                ...$this->formatCatalog(
                    $lockedUser->fresh()->loadMissing('profile.equippedBoardCosmetic', 'profile.equippedPieceCosmetic'),
                    CosmeticItem::query()->where('is_active', true)->orderBy('sort_order')->orderBy('id')->get()
                ),
            ];
        });
    }

    public function unequip(User $user, string $slug): array
    {
        return DB::transaction(function () use ($user, $slug): array {
            /** @var User $lockedUser */
            $lockedUser = User::query()
                ->whereKey($user->id)
                ->lockForUpdate()
                ->firstOrFail();

            $lockedUser->loadMissing('profile.equippedBoardCosmetic', 'profile.equippedPieceCosmetic');
            $this->ensureStarterCosmetics($lockedUser);

            $item = CosmeticItem::query()
                ->where('slug', $slug)
                ->where('is_active', true)
                ->firstOrFail();

            $profile = $lockedUser->profile()->firstOrCreate();

            if (
                $profile->equipped_board_cosmetic_id !== $item->id &&
                $profile->equipped_piece_cosmetic_id !== $item->id
            ) {
                throw new RuntimeException('This bundle is not currently equipped.');
            }

            $starterItems = CosmeticItem::query()
                ->whereIn('slug', [self::STARTER_BLACK_BUNDLE_SLUG, self::STARTER_WHITE_BUNDLE_SLUG])
                ->get()
                ->keyBy('slug');

            $profile->equipped_board_cosmetic_id = $starterItems[self::STARTER_BLACK_BUNDLE_SLUG]?->id;
            $profile->equipped_piece_cosmetic_id = $starterItems[self::STARTER_WHITE_BUNDLE_SLUG]?->id;
            $profile->save();

            return [
                'message' => "{$item->name} unequipped.",
                ...$this->formatCatalog(
                    $lockedUser->fresh()->loadMissing('profile.equippedBoardCosmetic', 'profile.equippedPieceCosmetic'),
                    CosmeticItem::query()->where('is_active', true)->orderBy('sort_order')->orderBy('id')->get()
                ),
            ];
        });
    }

    public function formatCatalog(User $user, Collection $items): array
    {
        $profile = $user->profile ?? $user->profile()->firstOrCreate();
        $ownedIds = $user->userCosmetics()->pluck('cosmetic_item_id')->all();

        return [
            'balance' => $profile->soft_currency,
            'equipped' => [
                'board' => $profile->equippedBoardCosmetic ? $this->formatEquippedItem($profile->equippedBoardCosmetic) : null,
                'piece_set' => $profile->equippedPieceCosmetic ? $this->formatEquippedItem($profile->equippedPieceCosmetic) : null,
            ],
            'items' => $items->map(function (CosmeticItem $item) use ($ownedIds, $profile): array {
                $isStarterBundle = in_array($item->slug, [self::STARTER_BLACK_BUNDLE_SLUG, self::STARTER_WHITE_BUNDLE_SLUG], true);
                $owned = $isStarterBundle || in_array($item->id, $ownedIds, true);
                $equipped = match ($item->category) {
                    'board' => $profile->equipped_board_cosmetic_id === $item->id,
                    'piece_set' => $profile->equipped_piece_cosmetic_id === $item->id,
                    'bundle' => $isStarterBundle || ($profile->equipped_board_cosmetic_id === $item->id && $profile->equipped_piece_cosmetic_id === $item->id),
                    default => false,
                };

                return [
                    'slug' => $item->slug,
                    'name' => $item->name,
                    'category' => $item->category,
                    'rarity' => $item->rarity,
                    'description' => $item->description,
                    'price_soft_currency' => $item->price_soft_currency,
                    'preview' => $item->preview,
                    'assets' => $item->assets,
                    'owned' => $owned,
                    'equipped' => $equipped,
                ];
            })->values()->all(),
        ];
    }

    private function formatEquippedItem(CosmeticItem $item): array
    {
        return [
            'slug' => $item->slug,
            'name' => $item->name,
            'category' => $item->category,
            'rarity' => $item->rarity,
            'description' => $item->description,
            'preview' => $item->preview,
            'assets' => $item->assets,
        ];
    }
}
