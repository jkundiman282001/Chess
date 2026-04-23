<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table): void {
            $table->json('daily_missions')->nullable()->after('board_theme_presets');
            $table->json('achievements')->nullable()->after('daily_missions');
        });
    }

    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table): void {
            $table->dropColumn([
                'daily_missions',
                'achievements',
            ]);
        });
    }
};
