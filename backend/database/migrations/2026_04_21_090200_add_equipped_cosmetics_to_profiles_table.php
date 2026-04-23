<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table): void {
            $table->foreignId('equipped_board_cosmetic_id')->nullable()->after('avatar_path')->constrained('cosmetic_items')->nullOnDelete();
            $table->foreignId('equipped_piece_cosmetic_id')->nullable()->after('equipped_board_cosmetic_id')->constrained('cosmetic_items')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('equipped_board_cosmetic_id');
            $table->dropConstrainedForeignId('equipped_piece_cosmetic_id');
        });
    }
};
