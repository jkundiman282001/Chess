<?php

namespace Database\Seeders;

use App\Models\CosmeticItem;
use Illuminate\Database\Seeder;

class CosmeticItemSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            [
                'slug' => 'classic-starter-bundle',
                'name' => 'Classic Starter Bundle',
                'category' => 'bundle',
                'rarity' => 'starter',
                'description' => 'Default tournament board with classic readable pieces.',
                'price_soft_currency' => 0,
                'sort_order' => 10,
                'preview' => ['primary' => '#b58863', 'secondary' => '#f0d9b5'],
                'assets' => null,
            ],
            [
                'slug' => 'midnight-marble-bundle',
                'name' => 'Midnight Marble Bundle',
                'category' => 'bundle',
                'rarity' => 'rare',
                'description' => 'A sharp black-and-stone board paired with polished dark pieces.',
                'price_soft_currency' => 500,
                'sort_order' => 20,
                'preview' => ['primary' => '#30343f', 'secondary' => '#d9d2c3'],
                'assets' => null,
            ],
            [
                'slug' => 'ember-gold-bundle',
                'name' => 'Ember Gold Bundle',
                'category' => 'bundle',
                'rarity' => 'epic',
                'description' => 'Warm gold board tones with a ceremonial premium set.',
                'price_soft_currency' => 900,
                'sort_order' => 30,
                'preview' => ['primary' => '#6f2a1b', 'secondary' => '#d5a54b'],
                'assets' => null,
            ],
        ];

        foreach ($items as $item) {
            CosmeticItem::query()->updateOrCreate(
                ['slug' => $item['slug']],
                $item,
            );
        }
    }
}
