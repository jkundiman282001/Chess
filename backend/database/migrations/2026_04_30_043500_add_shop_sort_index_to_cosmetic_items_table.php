<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cosmetic_items', function (Blueprint $table): void {
            $table->index(['is_active', 'sort_order', 'id'], 'cosmetic_items_active_sort_idx');
        });
    }

    public function down(): void
    {
        Schema::table('cosmetic_items', function (Blueprint $table): void {
            $table->dropIndex('cosmetic_items_active_sort_idx');
        });
    }
};
