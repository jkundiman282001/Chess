<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table): void {
            $table->string('board_light_color', 7)->nullable()->after('avatar_path');
            $table->string('board_dark_color', 7)->nullable()->after('board_light_color');
        });
    }

    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table): void {
            $table->dropColumn(['board_light_color', 'board_dark_color']);
        });
    }
};
